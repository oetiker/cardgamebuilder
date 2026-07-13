<script lang="ts">
  import { store, setOrder, generate, isGenerated, canGenerate, requiredSymbols, reshuffleCard, reshuffleAll } from '../lib/store.svelte';
  import { DECK_SIZES } from '../lib/presets';
  import CardFace from './CardFace.svelte';

  const need = $derived(requiredSymbols(store.deck.order));
  const have = $derived(store.deck.symbols.length);
  const generated = $derived(isGenerated());

  const selected = $derived(store.deck.cards.find((c) => c.id === store.ui.selectedCard) ?? null);

  function pick(order: number) {
    setOrder(order);
  }
</script>

<div class="wrap">
  <section class="card-surface panel">
    <h2>Deck size</h2>
    <p class="hint">Smaller decks use fewer symbols per card — easier for younger children.</p>
    <div class="sizes">
      {#each DECK_SIZES as sz (sz.order)}
        <button
          class="size"
          class:active={store.deck.order === sz.order}
          onclick={() => pick(sz.order)}
        >
          <span class="big">{sz.symbolsPerCard}</span>
          <span class="cap">per card</span>
          <span class="meta">{sz.cardCount} cards · {sz.symbolCount} symbols</span>
          <span class="blurb">{sz.blurb}</span>
        </button>
      {/each}
    </div>

    <div class="actions">
      {#if !canGenerate()}
        <span class="warn-text">Need {need} symbols (you have {have}).</span>
        <button onclick={() => (store.ui.view = 'vocab')}>Add symbols →</button>
      {:else if !generated}
        <span class="warn-text">Symbols or size changed — rebuild the deck.</span>
        <button class="primary" onclick={generate}>{store.deck.cards.length ? 'Regenerate' : 'Generate'} deck</button>
      {:else}
        <span class="ok-text">✓ {store.deck.cards.length} cards ready · every pair shares one symbol</span>
        <button onclick={reshuffleAll}>Shuffle all layouts</button>
        <button class="primary" onclick={() => (store.ui.view = 'print')}>Print / export →</button>
      {/if}
    </div>
  </section>

  {#if generated}
    <section class="cards">
      {#each store.deck.cards as card, i (card.id)}
        <button class="thumb card-surface" onclick={() => (store.ui.selectedCard = card.id)} title="Card {i + 1}">
          <CardFace {card} size={150} />
          <span class="idx">{i + 1}</span>
        </button>
      {/each}
    </section>
  {/if}
</div>

{#if selected}
  <div
    class="overlay"
    role="button"
    tabindex="0"
    onclick={() => (store.ui.selectedCard = null)}
    onkeydown={(e) => e.key === 'Escape' && (store.ui.selectedCard = null)}
  >
    <div class="modal card-surface" role="dialog" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={() => {}}>
      <CardFace card={selected} size={Math.min(420, Math.round((typeof window !== 'undefined' ? window.innerWidth : 460) * 0.8))} />
      <div class="modal-actions">
        <button onclick={() => selected && reshuffleCard(selected.id)}>🔀 Shuffle this card</button>
        <button onclick={() => (store.ui.selectedCard = null)}>Close</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .wrap { display: flex; flex-direction: column; gap: 1rem; }
  .panel { padding: 1.1rem 1.2rem; }
  h2 { margin: 0 0 0.2rem; font-size: 1.25rem; }
  .hint { color: var(--muted); margin: 0 0 0.9rem; font-size: 0.9rem; }
  .sizes { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.6rem; }
  .size { display: flex; flex-direction: column; align-items: flex-start; gap: 0.1rem; padding: 0.7rem 0.8rem; text-align: left; }
  .size.active { border-color: var(--accent); background: #24346a; }
  .size .big { font-size: 1.6rem; font-weight: 700; line-height: 1; }
  .size .cap { font-size: 0.72rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
  .size .meta { margin-top: 0.35rem; font-size: 0.8rem; color: var(--text); }
  .size .blurb { font-size: 0.76rem; color: var(--muted); }

  .actions { display: flex; align-items: center; gap: 0.8rem; flex-wrap: wrap; margin-top: 1rem; }
  .warn-text { color: var(--warn); }
  .ok-text { color: var(--accent-2); }

  .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 0.8rem; justify-items: center; }
  .thumb { position: relative; padding: 0.5rem; background: var(--panel); }
  .thumb .idx { position: absolute; top: 6px; left: 8px; font-size: 0.75rem; color: var(--muted); }

  .overlay { position: fixed; inset: 0; background: rgba(5, 8, 18, 0.75); display: grid; place-items: center; z-index: 50; padding: 1rem; }
  .modal { padding: 1rem; display: flex; flex-direction: column; align-items: center; gap: 1rem; }
  .modal-actions { display: flex; gap: 0.6rem; }
</style>
