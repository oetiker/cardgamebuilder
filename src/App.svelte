<script lang="ts">
  import { store, resetDeck, exportDeckJson, importDeckJson, toast } from './lib/store.svelte';
  import { downloadBlob } from './lib/pdf';
  import VocabView from './components/VocabView.svelte';
  import CardsView from './components/CardsView.svelte';
  import PrintView from './components/PrintView.svelte';

  let menuOpen = $state(false);
  let helpOpen = $state(false);
  let importEl: HTMLInputElement | undefined = $state();

  const tabs = [
    { id: 'vocab', label: '1 · Vocabulary' },
    { id: 'cards', label: '2 · Deck' },
    { id: 'print', label: '3 · Print' },
  ] as const;

  async function doExport() {
    menuOpen = false;
    const json = await exportDeckJson();
    const name = store.deck.name.trim().replace(/[^\w-]+/g, '_') || 'cardgame';
    downloadBlob(new Blob([json], { type: 'application/json' }), `${name}.cardgame.json`);
  }

  async function onImport(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      await importDeckJson(await file.text());
      toast('Deck loaded.');
      store.ui.view = 'cards';
    } catch {
      toast('That file could not be read as a card game.');
    }
  }

  async function newDeck() {
    menuOpen = false;
    if (confirm('Start a new, empty deck? Your current deck will be replaced.')) {
      await resetDeck();
      store.ui.view = 'vocab';
    }
  }
</script>

<header class="topbar">
  <div class="brand">
    <span class="logo" aria-hidden="true">🎴</span>
    <input class="deck-name" bind:value={store.deck.name} aria-label="Deck name" />
  </div>

  <nav class="tabs">
    {#each tabs as t (t.id)}
      <button class="tab" class:active={store.ui.view === t.id} onclick={() => (store.ui.view = t.id)}>
        {t.label}
      </button>
    {/each}
  </nav>

  <div class="menu-wrap">
    <button class="ghost" onclick={() => (helpOpen = true)} title="How it works">?</button>
    <button class="ghost" onclick={() => (menuOpen = !menuOpen)} title="Menu">☰</button>
    {#if menuOpen}
      <div class="menu card-surface">
        <button onclick={newDeck}>New deck</button>
        <button onclick={() => { importEl?.click(); menuOpen = false; }}>Import…</button>
        <button onclick={doExport}>Export deck file</button>
      </div>
    {/if}
    <input bind:this={importEl} type="file" accept=".json,application/json" hidden onchange={onImport} />
  </div>
</header>

<main>
  {#if store.ui.view === 'vocab'}
    <VocabView />
  {:else if store.ui.view === 'cards'}
    <CardsView />
  {:else}
    <PrintView />
  {/if}
</main>

{#if store.ui.toast}
  <div class="toast card-surface">{store.ui.toast}</div>
{/if}

{#if helpOpen}
  <div class="overlay" role="button" tabindex="0" onclick={() => (helpOpen = false)} onkeydown={(e) => e.key === 'Escape' && (helpOpen = false)}>
    <div class="help card-surface" role="dialog" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={() => {}}>
      <h2>How it works</h2>
      <p>
        This makes your own <strong>Spot-It / Dobble</strong> style matching game. The magic:
        <em>any two cards always share exactly one picture</em> — players race to find it. Great for
        drilling vocabulary in a new language.
      </p>
      <ol>
        <li><strong>Vocabulary</strong> — add the pictures (emoji or your own uploads), optionally with the word.</li>
        <li><strong>Deck</strong> — choose a size. Fewer symbols per card is easier for younger kids. Generate.</li>
        <li><strong>Print</strong> — tune the card size and layout, then download a PDF to print, cut out, and play.</li>
      </ol>
      <p class="dim">
        Everything runs in your browser and works offline — you can install this app from your
        browser's menu. Your deck is saved automatically on this device; use Export to move it
        to another.
      </p>
      <button class="primary" onclick={() => (helpOpen = false)}>Got it</button>
    </div>
  </div>
{/if}

<style>
  .topbar {
    position: sticky; top: 0; z-index: 20;
    display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;
    padding: 0.6rem 1rem;
    background: rgba(15, 20, 36, 0.85);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--line);
  }
  .brand { display: flex; align-items: center; gap: 0.5rem; }
  .logo { font-size: 1.5rem; }
  .deck-name { font-size: 1.05rem; font-weight: 600; background: transparent; border: 1px solid transparent; padding: 0.3rem 0.5rem; max-width: 46vw; }
  .deck-name:hover { border-color: var(--line); }

  .tabs { display: flex; gap: 0.3rem; margin: 0 auto; }
  .tab { background: transparent; border-color: transparent; color: var(--muted); }
  .tab.active { color: var(--text); background: var(--panel); border-color: var(--line); }

  .menu-wrap { position: relative; display: flex; gap: 0.3rem; }
  .menu { position: absolute; right: 0; top: 110%; display: flex; flex-direction: column; padding: 0.4rem; gap: 0.2rem; min-width: 160px; z-index: 30; }
  .menu button { text-align: left; background: transparent; border-color: transparent; }
  .menu button:hover { background: var(--panel-2); }

  main { max-width: 1080px; margin: 0 auto; padding: 1.1rem 1rem 4rem; }

  .toast { position: fixed; left: 50%; bottom: 1.4rem; transform: translateX(-50%); padding: 0.7rem 1.1rem; z-index: 60; max-width: 90vw; text-align: center; }

  .overlay { position: fixed; inset: 0; background: rgba(5, 8, 18, 0.75); display: grid; place-items: center; z-index: 70; padding: 1rem; }
  .help { padding: 1.4rem 1.5rem; max-width: 520px; }
  .help h2 { margin-top: 0; }
  .help ol { padding-left: 1.1rem; line-height: 1.6; }
  .help .dim { color: var(--muted); font-size: 0.9rem; }
  em { color: var(--accent-2); font-style: normal; font-weight: 600; }

  @media (max-width: 620px) {
    .tabs { order: 3; width: 100%; margin: 0; justify-content: space-between; }
    .tab { flex: 1; }
    .deck-name { max-width: 40vw; }
  }
</style>
