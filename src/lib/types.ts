// Core data model, persisted to localStorage (images live separately in IndexedDB).

export type SymbolKind = 'emoji' | 'image';

export interface CardSymbol {
  id: string;
  kind: SymbolKind;
  /** For kind==='emoji': the emoji character(s). */
  emoji?: string;
  /** For kind==='image': the IndexedDB key of the stored picture. */
  imageId?: string;
  /** Optional word shown under the picture/emoji (the vocabulary term). */
  label?: string;
}

export interface Card {
  id: string;
  /** Indices into deck.symbols. Length === order + 1. */
  symbols: number[];
  /** Layout seed — bump to reshuffle just this card. */
  seed: number;
}

export type PageSizeName = 'A4' | 'Letter';

export interface DeckSettings {
  cardDiameterMm: number;
  pageSize: PageSizeName;
  marginMm: number;
  gutterMm: number;
  cutLines: boolean;
  showLabels: boolean;
  /** Max random rotation applied to each symbol, in degrees (0 = upright). */
  maxRotationDeg: number;
  /** Overall symbol size multiplier (0.6–1.4). */
  symbolScale: number;
  cardBg: string;
  labelColor: string;
  /** Print resolution for rasterized cards. */
  dpi: number;
}

export interface Deck {
  id: string;
  name: string;
  /** Projective-plane order q. Symbols/card = q+1, cards = q^2+q+1. */
  order: number;
  symbols: CardSymbol[];
  cards: Card[];
  settings: DeckSettings;
  /** Present when the deck has been generated for the current symbol set. */
  generatedForOrder?: number;
  generatedSymbolCount?: number;
}

export interface DeckSize {
  order: number;
  symbolsPerCard: number;
  cardCount: number;
  symbolCount: number;
  blurb: string;
}
