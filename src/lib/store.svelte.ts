// Central reactive state: the deck, plus transient UI flags. The deck is
// autosaved to localStorage; uploaded pictures live in IndexedDB.

import type { Deck, CardSymbol, DeckSettings } from './types';
import { DEFAULT_SETTINGS, sizeForOrder } from './presets';
import { buildIncidence, assertValid } from './projective';
import {
  putImage,
  deleteImage,
  getImage,
  ensureBitmaps,
  fileToDataUrl,
  allImageIds,
} from './images';

const STORAGE_KEY = 'cardgamebuilder:deck:v1';

function uid(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function emptyDeck(): Deck {
  return {
    id: uid(),
    name: 'My matching game',
    order: 3,
    symbols: [],
    cards: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}

function loadDeck(): Deck {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Deck;
      // Merge in any settings added since the deck was saved.
      parsed.settings = { ...DEFAULT_SETTINGS, ...parsed.settings };
      return parsed;
    }
  } catch {
    /* fall through to a fresh deck */
  }
  return emptyDeck();
}

export type View = 'vocab' | 'cards' | 'print';

interface UIState {
  view: View;
  selectedCard: string | null;
  pdfBusy: boolean;
  pdfDone: number;
  pdfTotal: number;
  toast: string | null;
}

export const store = $state<{ deck: Deck; ui: UIState }>({
  deck: loadDeck(),
  ui: { view: 'vocab', selectedCard: null, pdfBusy: false, pdfDone: 0, pdfTotal: 0, toast: null },
});

// --- persistence -----------------------------------------------------------

let saveTimer: ReturnType<typeof setTimeout> | undefined;
function scheduleSave(): void {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store.deck));
    } catch {
      toast('Could not save — browser storage may be full.');
    }
  }, 350);
}

$effect.root(() => {
  $effect(() => {
    // Deep-read the deck so any change triggers an autosave.
    JSON.stringify(store.deck);
    scheduleSave();
  });
});

// Warm the bitmap cache for whatever images the saved deck references.
ensureBitmaps(store.deck.symbols.filter((s) => s.imageId).map((s) => s.imageId!));

let toastTimer: ReturnType<typeof setTimeout> | undefined;
export function toast(msg: string): void {
  store.ui.toast = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (store.ui.toast = null), 3200);
}

// --- derived helpers -------------------------------------------------------

export function requiredSymbols(order: number): number {
  return sizeForOrder(order)?.symbolCount ?? order * order + order + 1;
}

export function isGenerated(): boolean {
  const d = store.deck;
  return (
    d.cards.length > 0 &&
    d.generatedForOrder === d.order &&
    d.generatedSymbolCount === Math.min(d.symbols.length, requiredSymbols(d.order))
  );
}

export function canGenerate(): boolean {
  return store.deck.symbols.length >= requiredSymbols(store.deck.order);
}

// --- symbol editing --------------------------------------------------------

export function addEmoji(emoji: string, label = ''): void {
  const e = emoji.trim();
  if (!e) return;
  store.deck.symbols.push({ id: uid(), kind: 'emoji', emoji: e, label: label.trim() });
}

export function addEmojiBatch(emojis: string[]): void {
  for (const e of emojis) addEmoji(e);
}

export async function addImageFile(file: File): Promise<void> {
  const dataUrl = await fileToDataUrl(file);
  const imageId = uid();
  await putImage(imageId, dataUrl);
  await ensureBitmaps([imageId]);
  const label = file.name.replace(/\.[^.]+$/, '').slice(0, 24);
  store.deck.symbols.push({ id: uid(), kind: 'image', imageId, label });
}

export async function removeSymbol(id: string): Promise<void> {
  const idx = store.deck.symbols.findIndex((s) => s.id === id);
  if (idx < 0) return;
  const [removed] = store.deck.symbols.splice(idx, 1);
  if (removed.imageId) await deleteImage(removed.imageId);
  // Removing a symbol invalidates a generated deck.
  invalidate();
}

export function updateSymbol(id: string, patch: Partial<CardSymbol>): void {
  const s = store.deck.symbols.find((x) => x.id === id);
  if (s) Object.assign(s, patch);
}

export function invalidate(): void {
  store.deck.generatedForOrder = undefined;
  store.deck.generatedSymbolCount = undefined;
}

// --- generation ------------------------------------------------------------

export function setOrder(order: number): void {
  store.deck.order = order;
  invalidate();
}

export function generate(): void {
  const d = store.deck;
  const need = requiredSymbols(d.order);
  if (d.symbols.length < need) {
    toast(`Need ${need} symbols for this size — you have ${d.symbols.length}.`);
    return;
  }
  const inc = buildIncidence(d.order);
  assertValid(inc); // guarantees the every-pair-shares-one property
  let seed = 1;
  d.cards = inc.cards.map((symbols) => ({ id: uid(), symbols, seed: seed++ }));
  d.generatedForOrder = d.order;
  d.generatedSymbolCount = need;
  toast(`Generated ${d.cards.length} cards — every pair shares exactly one symbol.`);
}

export function reshuffleCard(cardId: string): void {
  const c = store.deck.cards.find((x) => x.id === cardId);
  if (c) c.seed = (c.seed * 1103515245 + 12345) >>> 0 || 1;
}

export function reshuffleAll(): void {
  for (const c of store.deck.cards) c.seed = (c.seed * 1103515245 + 12345) >>> 0 || 1;
}

// --- settings & deck lifecycle ---------------------------------------------

export function updateSettings(patch: Partial<DeckSettings>): void {
  Object.assign(store.deck.settings, patch);
}

export async function resetDeck(): Promise<void> {
  // Clear orphaned images too.
  for (const id of await allImageIds()) await deleteImage(id);
  store.deck = emptyDeck();
  store.ui.selectedCard = null;
}

// --- import / export (deck + embedded images) ------------------------------

export async function exportDeckJson(): Promise<string> {
  const images: Record<string, string> = {};
  for (const s of store.deck.symbols) {
    if (s.imageId) {
      const data = await getImage(s.imageId);
      if (data) images[s.imageId] = data;
    }
  }
  return JSON.stringify({ version: 1, deck: store.deck, images }, null, 2);
}

export async function importDeckJson(json: string): Promise<void> {
  const parsed = JSON.parse(json) as {
    deck: Deck;
    images?: Record<string, string>;
  };
  if (!parsed.deck) throw new Error('Not a card-game file.');
  if (parsed.images) {
    for (const [id, data] of Object.entries(parsed.images)) await putImage(id, data);
  }
  parsed.deck.settings = { ...DEFAULT_SETTINGS, ...parsed.deck.settings };
  store.deck = parsed.deck;
  await ensureBitmaps(store.deck.symbols.filter((s) => s.imageId).map((s) => s.imageId!));
  store.ui.selectedCard = null;
}
