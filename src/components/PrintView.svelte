<script lang="ts">
  import { store, updateSettings, isGenerated, generate, canGenerate, toast } from '../lib/store.svelte';
  import { computeGrid, generatePdf, downloadBlob } from '../lib/pdf';
  import { PAGE_DIMS } from '../lib/presets';
  import CardFace from './CardFace.svelte';

  const s = $derived(store.deck.settings);
  const grid = $derived(computeGrid(store.deck));
  const generated = $derived(isGenerated());
  const firstCard = $derived(store.deck.cards[0]);

  const qualities = [
    { dpi: 150, label: 'Draft (150 dpi)' },
    { dpi: 300, label: 'Print (300 dpi)' },
  ];

  async function exportPdf() {
    if (!generated) {
      if (canGenerate()) generate();
      else return toast('Generate the deck first (add more symbols).');
    }
    store.ui.pdfBusy = true;
    store.ui.pdfDone = 0;
    store.ui.pdfTotal = store.deck.cards.length;
    try {
      // Yield so the busy state paints before the heavy work.
      await new Promise((r) => setTimeout(r, 30));
      const blob = await generatePdf(store.deck, (done, total) => {
        store.ui.pdfDone = done;
        store.ui.pdfTotal = total;
      });
      const name = store.deck.name.trim().replace(/[^\w-]+/g, '_') || 'cardgame';
      downloadBlob(blob, `${name}.pdf`);
      toast('PDF downloaded.');
    } catch (err) {
      console.error(err);
      toast('PDF export failed — see console.');
    } finally {
      store.ui.pdfBusy = false;
    }
  }

  const pct = $derived(store.ui.pdfTotal ? Math.round((store.ui.pdfDone / store.ui.pdfTotal) * 100) : 0);
</script>

<div class="wrap">
  <section class="card-surface panel controls">
    <h2>Print settings</h2>

    <p class="hint">
      These control how cards are arranged on the printed page. To change how each
      card looks (size, symbols, colours), use the <strong>Deck</strong> tab.
    </p>

    <div class="rows">
      <div class="field">
        <label for="pg">Paper</label>
        <select id="pg" value={s.pageSize} onchange={(e) => updateSettings({ pageSize: (e.target as HTMLSelectElement).value as 'A4' | 'Letter' })}>
          <option value="A4">A4</option>
          <option value="Letter">US Letter</option>
        </select>
      </div>

      <div class="field">
        <label for="mar">Page margin — {s.marginMm} mm</label>
        <input id="mar" type="range" min="0" max="25" step="1" value={s.marginMm}
          oninput={(e) => updateSettings({ marginMm: +(e.target as HTMLInputElement).value })} />
      </div>

      <div class="field">
        <label for="gut">Gap between cards — {s.gutterMm} mm</label>
        <input id="gut" type="range" min="0" max="20" step="1" value={s.gutterMm}
          oninput={(e) => updateSettings({ gutterMm: +(e.target as HTMLInputElement).value })} />
      </div>

      <div class="field">
        <label for="q">Quality</label>
        <select id="q" value={s.dpi} onchange={(e) => updateSettings({ dpi: +(e.target as HTMLSelectElement).value })}>
          {#each qualities as q (q.dpi)}<option value={q.dpi}>{q.label}</option>{/each}
        </select>
      </div>
    </div>

    <div class="layout-note">
      {#if generated}
        {store.deck.cards.length} cards ({s.cardDiameterMm} mm each) → <strong>{grid.pageCount}</strong> page{grid.pageCount === 1 ? '' : 's'}
        ({grid.cols}×{grid.rows} per page on {s.pageSize} — {PAGE_DIMS[s.pageSize].w}×{PAGE_DIMS[s.pageSize].h} mm)
      {:else}
        Generate the deck first to enable export.
      {/if}
    </div>

    <div class="export">
      <button class="primary big" disabled={store.ui.pdfBusy || !generated} onclick={exportPdf}>
        {#if store.ui.pdfBusy}Rendering… {pct}%{:else}⬇ Download PDF{/if}
      </button>
      {#if store.ui.pdfBusy}
        <div class="bar"><div class="fill" style="width:{pct}%"></div></div>
      {/if}
    </div>
  </section>

  <section class="card-surface panel preview">
    <h2>Preview</h2>
    {#if firstCard}
      <div class="prev-card"><CardFace card={firstCard} size={300} /></div>
      <p class="cap">Card 1 of {store.deck.cards.length} · printed at {s.cardDiameterMm} mm</p>
    {:else}
      <p class="cap">No cards yet.</p>
    {/if}
  </section>
</div>

<style>
  .wrap { display: grid; grid-template-columns: 1fr; gap: 1rem; }
  @media (min-width: 820px) { .wrap { grid-template-columns: 1.3fr 1fr; align-items: start; } }
  .panel { padding: 1.1rem 1.2rem; }
  h2 { margin: 0 0 0.5rem; font-size: 1.25rem; }
  .hint { color: var(--muted); font-size: 0.9rem; margin: 0 0 1rem; }
  .hint strong { color: var(--text); }
  .rows { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 0.9rem; }
  .field { display: flex; flex-direction: column; gap: 0.35rem; }
  .field input[type="range"] { width: 100%; }
  .layout-note { margin-top: 1.1rem; padding: 0.7rem 0.9rem; background: var(--bg-2); border-radius: 10px; color: var(--muted); font-size: 0.9rem; }
  .layout-note strong { color: var(--text); }
  .export { margin-top: 1rem; }
  .big { font-size: 1.05rem; padding: 0.7rem 1.2rem; }
  .bar { margin-top: 0.7rem; height: 8px; background: var(--bg-2); border-radius: 999px; overflow: hidden; }
  .fill { height: 100%; background: linear-gradient(90deg, var(--accent), var(--accent-2)); transition: width 0.15s; }
  .preview { display: flex; flex-direction: column; align-items: center; }
  .prev-card { padding: 0.5rem; }
  .cap { color: var(--muted); font-size: 0.85rem; margin: 0.6rem 0 0; }
</style>
