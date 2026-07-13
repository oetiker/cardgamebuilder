<script lang="ts">
  import type { Card } from '../lib/types';
  import { store } from '../lib/store.svelte';
  import { drawCard } from '../lib/cardCanvas';
  import { ensureBitmaps } from '../lib/images';

  interface Props {
    card: Card;
    size?: number;
  }
  let { card, size = 240 }: Props = $props();

  let canvas: HTMLCanvasElement | undefined = $state();
  const dpr = typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1;

  $effect(() => {
    if (!canvas) return;
    const px = size * dpr;
    canvas.width = px;
    canvas.height = px;
    const ctx = canvas.getContext('2d')!;

    const s = store.deck.settings;
    // Touch the reactive inputs so this redraws on any relevant change.
    void [
      card.seed,
      card.symbols.length,
      s.cardBg,
      s.showLabels,
      s.maxRotationDeg,
      s.symbolScale,
      s.labelColor,
      s.cutLines,
      store.deck.symbols.map((y) => y.emoji || y.imageId || y.label).join('|'),
    ];

    const imageIds = card.symbols
      .map((i) => store.deck.symbols[i])
      .filter((y) => y && y.imageId)
      .map((y) => y!.imageId!);

    if (imageIds.length) {
      ensureBitmaps(imageIds).then(() => {
        if (canvas) drawCard(ctx, card, store.deck, px);
      });
    }
    drawCard(ctx, card, store.deck, px);
  });
</script>

<canvas
  bind:this={canvas}
  style="width:{size}px;height:{size}px"
  aria-label="Card preview"
></canvas>

<style>
  canvas {
    display: block;
    border-radius: 50%;
  }
</style>
