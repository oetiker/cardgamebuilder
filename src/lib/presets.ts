import type { DeckSize, DeckSettings, PageSizeName } from './types';

// Deck sizes worth offering. Order 6 is intentionally absent — no projective
// plane of order 6 exists, so no valid Dobble deck can be built for it.
export const DECK_SIZES: DeckSize[] = [
  { order: 2, symbolsPerCard: 3, cardCount: 7, symbolCount: 7, blurb: 'Tiny — great for toddlers' },
  { order: 3, symbolsPerCard: 4, cardCount: 13, symbolCount: 13, blurb: 'Small — early beginners' },
  { order: 4, symbolsPerCard: 5, cardCount: 21, symbolCount: 21, blurb: 'Compact deck' },
  { order: 5, symbolsPerCard: 6, cardCount: 31, symbolCount: 31, blurb: 'Medium deck' },
  { order: 7, symbolsPerCard: 8, cardCount: 57, symbolCount: 57, blurb: 'Classic Dobble size' },
  { order: 8, symbolsPerCard: 9, cardCount: 73, symbolCount: 73, blurb: 'Large deck' },
  { order: 9, symbolsPerCard: 10, cardCount: 91, symbolCount: 91, blurb: 'Extra large' },
];

export function sizeForOrder(order: number): DeckSize | undefined {
  return DECK_SIZES.find((s) => s.order === order);
}

export const PAGE_DIMS: Record<PageSizeName, { w: number; h: number }> = {
  A4: { w: 210, h: 297 },
  Letter: { w: 215.9, h: 279.4 },
};

export const DEFAULT_SETTINGS: DeckSettings = {
  cardDiameterMm: 85,
  pageSize: 'A4',
  marginMm: 8,
  gutterMm: 4,
  cutLines: true,
  showLabels: true,
  maxRotationDeg: 35,
  symbolScale: 1,
  cardBg: '#ffffff',
  labelColor: '#1c2536',
  dpi: 300,
};

// A friendly starter palette of emoji, grouped so "fill with samples" produces
// a themed-looking deck. Enough to cover the largest supported deck (91).
export const SAMPLE_EMOJI: string[] = [
  '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔',
  '🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞',
  '🐜','🦗','🕷','🦂','🐢','🐍','🦎','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬',
  '🐳','🐋','🦈','🐊','🐅','🐆','🦓','🦍','🐘','🦏','🦛','🐪','🐫','🦒','🦘','🐃',
  '🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝',
  '🍅','🥑','🥦','🥕','🌽','🌶','🥔','🍠','🥐','🍞','🧀','🥚','🍳','🥞','🧇',
];
