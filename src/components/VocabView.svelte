<script lang="ts">
  import { store, addEmoji, addImageFile, removeSymbol, updateSymbol, requiredSymbols, canGenerate, generate, toast } from '../lib/store.svelte';
  import { getBitmap, ensureBitmaps } from '../lib/images';
  import { SAMPLE_EMOJI, sizeForOrder } from '../lib/presets';

  let emojiInput = $state('');
  let labelInput = $state('');
  let fileEl: HTMLInputElement | undefined = $state();
  let paletteOpen = $state(false);

  const need = $derived(requiredSymbols(store.deck.order));
  const have = $derived(store.deck.symbols.length);
  const size = $derived(sizeForOrder(store.deck.order));

  // Keep thumbnails decoded.
  $effect(() => {
    ensureBitmaps(store.deck.symbols.filter((s) => s.imageId).map((s) => s.imageId!)).then(() => {
      thumbTick++;
    });
  });
  let thumbTick = $state(0);

  function submitEmoji() {
    const chars = [...emojiInput.trim()];
    if (!chars.length) return;
    // Treat each grapheme/emoji as one symbol unless a label was given.
    if (labelInput.trim() || chars.length === 1) {
      addEmoji(emojiInput.trim(), labelInput.trim());
    } else {
      for (const c of chars) addEmoji(c);
    }
    emojiInput = '';
    labelInput = '';
  }

  function fillWithSamples() {
    let i = 0;
    const used = new Set(store.deck.symbols.map((s) => s.emoji));
    while (store.deck.symbols.length < need && i < SAMPLE_EMOJI.length) {
      const e = SAMPLE_EMOJI[i++];
      if (!used.has(e)) addEmoji(e);
    }
    if (store.deck.symbols.length < need) toast('Ran out of sample emoji — add your own to reach the target.');
  }

  async function onFiles(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.files) return;
    const files = [...input.files];
    for (const f of files) {
      try {
        await addImageFile(f);
      } catch {
        toast(`Could not load ${f.name}`);
      }
    }
    input.value = '';
    thumbTick++;
  }

  function thumbUrl(imageId: string): string | undefined {
    void thumbTick;
    return getBitmap(imageId)?.src;
  }
</script>

<div class="wrap">
  <section class="card-surface panel">
    <div class="head">
      <h2>Vocabulary</h2>
      <div class="counter" class:ok={have >= need} class:short={have < need}>
        {have} / {need} symbols
        {#if size}<span class="sub">· {size.symbolsPerCard} per card · {size.cardCount} cards</span>{/if}
      </div>
    </div>
    <p class="hint">
      Add at least <strong>{need}</strong> symbols. Each becomes a picture the kids must spot.
      Any two cards will share exactly one.
    </p>

    <div class="add-row">
      <div class="field grow">
        <label for="emoji">Emoji <span class="dim">(use your keyboard's emoji picker, or paste several)</span></label>
        <input id="emoji" bind:value={emojiInput} placeholder="🐶 or 🐶🐱🐭…" onkeydown={(e) => e.key === 'Enter' && submitEmoji()} />
      </div>
      <div class="field">
        <label for="label">Word (optional)</label>
        <input id="label" bind:value={labelInput} placeholder="dog" onkeydown={(e) => e.key === 'Enter' && submitEmoji()} />
      </div>
      <button class="primary add-btn" onclick={submitEmoji}>Add</button>
    </div>

    <div class="tools">
      <button onclick={() => (paletteOpen = !paletteOpen)}>{paletteOpen ? 'Hide' : 'Pick from'} emoji palette</button>
      <button onclick={fillWithSamples}>Fill to {need} with samples</button>
      <button onclick={() => fileEl?.click()}>Upload pictures…</button>
      <input bind:this={fileEl} type="file" accept="image/*" multiple hidden onchange={onFiles} />
    </div>

    {#if paletteOpen}
      <div class="palette">
        {#each SAMPLE_EMOJI as e (e)}
          <button class="emoji-btn" onclick={() => addEmoji(e)} title="Add {e}">{e}</button>
        {/each}
      </div>
    {/if}
  </section>

  <section class="grid">
    {#each store.deck.symbols as sym (sym.id)}
      <div class="tile card-surface">
        <div class="art">
          {#if sym.kind === 'emoji'}
            <span class="emoji">{sym.emoji}</span>
          {:else if sym.imageId && thumbUrl(sym.imageId)}
            <img src={thumbUrl(sym.imageId)} alt={sym.label || 'symbol'} />
          {:else}
            <span class="emoji dim">🖼️</span>
          {/if}
        </div>
        <input
          class="tile-label"
          value={sym.label ?? ''}
          placeholder="word…"
          oninput={(e) => updateSymbol(sym.id, { label: (e.target as HTMLInputElement).value })}
        />
        <button class="del" title="Remove" onclick={() => removeSymbol(sym.id)} aria-label="Remove">✕</button>
      </div>
    {/each}

    {#if store.deck.symbols.length === 0}
      <div class="empty">No symbols yet. Add emoji, pick from the palette, or upload pictures above.</div>
    {/if}
  </section>

  <div class="footer-bar card-surface">
    <div>
      {#if canGenerate()}
        <span class="ok-text">Ready — you have enough symbols.</span>
      {:else}
        <span class="short-text">Add {need - have} more symbol{need - have === 1 ? '' : 's'} to build this deck.</span>
      {/if}
    </div>
    <button class="primary" disabled={!canGenerate()} onclick={() => { generate(); store.ui.view = 'cards'; }}>
      Generate deck →
    </button>
  </div>
</div>

<style>
  .wrap { display: flex; flex-direction: column; gap: 1rem; }
  .panel { padding: 1.1rem 1.2rem; }
  .head { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
  h2 { margin: 0; font-size: 1.25rem; }
  .counter { font-weight: 600; padding: 0.25rem 0.6rem; border-radius: 999px; background: var(--bg-2); }
  .counter.ok { color: var(--accent-2); }
  .counter.short { color: var(--warn); }
  .counter .sub { color: var(--muted); font-weight: 400; font-size: 0.8rem; }
  .hint { color: var(--muted); margin: 0.5rem 0 1rem; font-size: 0.9rem; }
  .add-row { display: flex; gap: 0.7rem; align-items: flex-end; flex-wrap: wrap; }
  .field { display: flex; flex-direction: column; gap: 0.3rem; }
  .field.grow { flex: 1 1 220px; }
  .field input { width: 100%; }
  .dim { color: var(--muted); font-weight: 400; }
  .add-btn { height: 40px; }
  .tools { display: flex; gap: 0.5rem; margin-top: 0.9rem; flex-wrap: wrap; }
  .palette { display: flex; flex-wrap: wrap; gap: 0.25rem; margin-top: 0.8rem; max-height: 190px; overflow: auto; padding: 0.4rem; background: var(--bg-2); border-radius: 10px; }
  .emoji-btn { font-size: 1.3rem; padding: 0.25rem 0.4rem; line-height: 1; border-color: transparent; background: transparent; }
  .emoji-btn:hover { background: var(--panel-2); }

  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 0.7rem; }
  .tile { position: relative; padding: 0.6rem; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
  .art { width: 100%; aspect-ratio: 1; display: grid; place-items: center; background: var(--bg-2); border-radius: 10px; overflow: hidden; }
  .art .emoji { font-size: 3rem; line-height: 1; }
  .art img { max-width: 100%; max-height: 100%; object-fit: contain; }
  .tile-label { width: 100%; text-align: center; font-size: 0.85rem; padding: 0.35rem; }
  .del { position: absolute; top: 4px; right: 4px; width: 26px; height: 26px; padding: 0; border-radius: 8px; background: rgba(0,0,0,0.35); color: var(--muted); }
  .del:hover { color: var(--danger); }
  .empty { grid-column: 1 / -1; color: var(--muted); text-align: center; padding: 2rem; }

  .footer-bar { position: sticky; bottom: 0.6rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.8rem 1rem; }
  .ok-text { color: var(--accent-2); }
  .short-text { color: var(--warn); }
</style>
