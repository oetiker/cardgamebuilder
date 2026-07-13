// Draw one card onto a 2D canvas context. This is the single source of truth
// for a card's appearance — the preview and the PDF both call it, guaranteeing
// what you print is what you saw.

import type { Card, Deck, CardSymbol } from './types';
import { layoutCard, type Placement } from './layout';
import { getBitmap } from './images';

const FONT_STACK =
  '"Segoe UI", "Helvetica Neue", Arial, "Apple Color Emoji", "Noto Color Emoji", sans-serif';

export function cardLayout(card: Card, deck: Deck): Placement[] {
  return layoutCard({
    count: card.symbols.length,
    seed: `${deck.id}:${card.id}:${card.seed}`,
    maxRotationRad: (deck.settings.maxRotationDeg * Math.PI) / 180,
    scale: deck.settings.symbolScale,
  });
}

export function drawCard(
  ctx: CanvasRenderingContext2D,
  card: Card,
  deck: Deck,
  sizePx: number,
): void {
  const s = deck.settings;
  const R = sizePx / 2;
  const rim = Math.max(1.5, sizePx * 0.012);

  ctx.clearRect(0, 0, sizePx, sizePx);
  ctx.save();

  // Card face
  ctx.beginPath();
  ctx.arc(R, R, R - rim, 0, Math.PI * 2);
  ctx.fillStyle = s.cardBg;
  ctx.fill();

  // Keep symbols inside the rim
  ctx.save();
  ctx.beginPath();
  ctx.arc(R, R, R - rim, 0, Math.PI * 2);
  ctx.clip();

  const placements = cardLayout(card, deck);
  const usable = R - rim;
  for (const p of placements) {
    const sym = deck.symbols[card.symbols[p.slot]];
    if (!sym) continue;
    const cx = R + p.x * usable;
    const cy = R + p.y * usable;
    const sr = p.r * usable;
    drawSymbol(ctx, sym, cx, cy, sr, p.rot, deck);
  }
  ctx.restore();

  // Cut line / border on top
  if (s.cutLines) {
    ctx.beginPath();
    ctx.arc(R, R, R - rim, 0, Math.PI * 2);
    ctx.lineWidth = rim;
    ctx.strokeStyle = '#c9d2e3';
    ctx.stroke();
  }
  ctx.restore();
}

function drawSymbol(
  ctx: CanvasRenderingContext2D,
  sym: CardSymbol,
  cx: number,
  cy: number,
  sr: number,
  rot: number,
  deck: Deck,
): void {
  const s = deck.settings;
  const hasLabel = s.showLabels && !!sym.label?.trim();
  // Reserve the lower slice of the symbol box for the caption.
  const labelH = hasLabel ? sr * 0.42 : 0;
  const artBox = (sr * 2 - labelH) * 0.92;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.translate(0, -labelH / 2);

  if (sym.kind === 'emoji' && sym.emoji) {
    ctx.font = `${artBox}px ${FONT_STACK}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sym.emoji, 0, artBox * 0.02);
  } else if (sym.kind === 'image' && sym.imageId) {
    const bmp = getBitmap(sym.imageId);
    if (bmp) {
      const scale = Math.min(artBox / bmp.width, artBox / bmp.height);
      const w = bmp.width * scale;
      const h = bmp.height * scale;
      ctx.drawImage(bmp, -w / 2, -h / 2, w, h);
    } else {
      // Placeholder while the bitmap loads / if it's missing.
      ctx.fillStyle = '#e3e8f2';
      ctx.beginPath();
      ctx.arc(0, 0, artBox / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (hasLabel) {
    const maxW = sr * 1.9;
    let fontPx = labelH * 0.82;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = s.labelColor;
    // Shrink to fit the available width.
    do {
      ctx.font = `600 ${fontPx}px ${FONT_STACK}`;
      if (ctx.measureText(sym.label!).width <= maxW || fontPx <= 5) break;
      fontPx *= 0.9;
    } while (true);
    ctx.fillText(sym.label!, 0, sr - labelH / 2, maxW);
  }

  ctx.restore();
}
