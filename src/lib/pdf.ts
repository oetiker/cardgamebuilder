// Compose the deck into a print-ready PDF: round cards laid out on a grid,
// each rasterised from the shared card renderer at the chosen DPI.

import type { Deck } from './types';
import { PAGE_DIMS } from './presets';
import { drawCard } from './cardCanvas';
import { ensureBitmaps } from './images';

const MM_PER_PT = 25.4 / 72; // 1 pt = 1/72 inch

export interface PageGrid {
  cols: number;
  rows: number;
  perPage: number;
  pageCount: number;
}

/** How many cards fit per page for the current settings (also used for the UI hint). */
export function computeGrid(deck: Deck): PageGrid {
  const s = deck.settings;
  const page = PAGE_DIMS[s.pageSize];
  const cell = s.cardDiameterMm + s.gutterMm;
  const cols = Math.max(1, Math.floor((page.w - 2 * s.marginMm + s.gutterMm) / cell));
  const rows = Math.max(1, Math.floor((page.h - 2 * s.marginMm + s.gutterMm) / cell));
  const perPage = cols * rows;
  const total = deck.cards.length;
  return { cols, rows, perPage, pageCount: Math.max(1, Math.ceil(total / perPage)) };
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1];
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export interface PdfProgress {
  (done: number, total: number): void;
}

export async function generatePdf(deck: Deck, onProgress?: PdfProgress): Promise<Blob> {
  // Lazy-load pdf-lib so it stays out of the initial app bundle.
  const { PDFDocument } = await import('pdf-lib');
  const s = deck.settings;
  const page = PAGE_DIMS[s.pageSize];

  // Make sure every uploaded picture is decoded before we rasterise.
  const imageIds = deck.symbols
    .filter((sy) => sy.kind === 'image' && sy.imageId)
    .map((sy) => sy.imageId!);
  await ensureBitmaps(imageIds);

  const pxPerCard = Math.round((s.cardDiameterMm / 25.4) * s.dpi);
  const canvas = document.createElement('canvas');
  canvas.width = pxPerCard;
  canvas.height = pxPerCard;
  const ctx = canvas.getContext('2d')!;

  const pdf = await PDFDocument.create();
  const grid = computeGrid(deck);
  const pageWpt = page.w / MM_PER_PT;
  const pageHpt = page.h / MM_PER_PT;
  const diaPt = s.cardDiameterMm / MM_PER_PT;
  const cellPt = (s.cardDiameterMm + s.gutterMm) / MM_PER_PT;

  // Centre the whole grid block on the page.
  const blockW = grid.cols * cellPt - s.gutterMm / MM_PER_PT;
  const blockH = grid.rows * cellPt - s.gutterMm / MM_PER_PT;
  const offX = (pageWpt - blockW) / 2;
  const offY = (pageHpt - blockH) / 2;

  let pdfPage = pdf.addPage([pageWpt, pageHpt]);
  let slot = 0;

  for (let i = 0; i < deck.cards.length; i++) {
    if (slot >= grid.perPage) {
      pdfPage = pdf.addPage([pageWpt, pageHpt]);
      slot = 0;
    }
    const col = slot % grid.cols;
    const row = Math.floor(slot / grid.cols);

    drawCard(ctx, deck.cards[i], deck, pxPerCard);
    const png = await pdf.embedPng(dataUrlToBytes(canvas.toDataURL('image/png')));

    const x = offX + col * cellPt;
    // PDF origin is bottom-left; rows fill top-to-bottom.
    const yTop = pageHpt - offY - row * cellPt;
    pdfPage.drawImage(png, { x, y: yTop - diaPt, width: diaPt, height: diaPt });

    slot++;
    onProgress?.(i + 1, deck.cards.length);
  }

  const bytes = await pdf.save();
  // Copy into a fresh ArrayBuffer-backed view so the Blob type is unambiguous.
  return new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
