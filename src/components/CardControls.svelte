<script lang="ts">
  import { store, updateSettings, reshuffleAll } from '../lib/store.svelte';

  // Controls for how each individual card looks — its size and the arrangement
  // of symbols on it. Lives on the Deck screen next to the live card previews.
  const s = $derived(store.deck.settings);

  interface Props {
    showShuffle?: boolean;
  }
  let { showShuffle = true }: Props = $props();
</script>

<div class="rows">
  <div class="field">
    <label for="cw">Card width — {s.cardDiameterMm} mm</label>
    <input
      id="cw"
      type="range"
      min="45"
      max="120"
      step="1"
      value={s.cardDiameterMm}
      oninput={(e) => updateSettings({ cardDiameterMm: +(e.target as HTMLInputElement).value })}
    />
  </div>

  <div class="field">
    <label for="scl">Symbol size — {Math.round(s.symbolScale * 100)}%</label>
    <input
      id="scl"
      type="range"
      min="0.6"
      max="1.4"
      step="0.05"
      value={s.symbolScale}
      oninput={(e) => updateSettings({ symbolScale: +(e.target as HTMLInputElement).value })}
    />
  </div>

  <div class="field">
    <label for="rot">Symbol rotation — ±{s.maxRotationDeg}°</label>
    <input
      id="rot"
      type="range"
      min="0"
      max="180"
      step="5"
      value={s.maxRotationDeg}
      oninput={(e) => updateSettings({ maxRotationDeg: +(e.target as HTMLInputElement).value })}
    />
  </div>

  <div class="field">
    <label for="bg">Card background</label>
    <input
      id="bg"
      type="color"
      value={s.cardBg}
      oninput={(e) => updateSettings({ cardBg: (e.target as HTMLInputElement).value })}
    />
  </div>

  <div class="field checks">
    <label>
      <input
        type="checkbox"
        checked={s.showLabels}
        onchange={(e) => updateSettings({ showLabels: (e.target as HTMLInputElement).checked })}
      /> Show words
    </label>
    <label>
      <input
        type="checkbox"
        checked={s.cutLines}
        onchange={(e) => updateSettings({ cutLines: (e.target as HTMLInputElement).checked })}
      /> Cut outlines
    </label>
  </div>

  {#if showShuffle}
    <div class="field shuffle">
      <button onclick={reshuffleAll} title="Re-roll every card's symbol arrangement">
        🔀 Shuffle all layouts
      </button>
    </div>
  {/if}
</div>

<style>
  .rows {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 0.9rem;
    align-items: end;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  .field input[type='range'] {
    width: 100%;
  }
  .field.checks {
    gap: 0.5rem;
    justify-content: center;
  }
  .field.checks label {
    color: var(--text);
    display: flex;
    gap: 0.45rem;
    align-items: center;
  }
  .field.shuffle {
    justify-content: end;
  }
</style>
