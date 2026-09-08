<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as d3 from 'd3';

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

const props = defineProps({
  initial: { type: String, default: 'measure' },
  compact: { type: Boolean, default: false }
});

const samples = {
  measure: {
    label: 'Change measure',
    code: `const revenue = bar(rows)
  .x("category")
  .y("sales", { title: "Revenue" })
  .key("category")
  .color("#1c6ae4");

const profit = revenue
  .y("profit", { title: "Profit" })
  .color("#03a86c");

return { from: revenue, to: profit };`
  },
  filter: {
    label: 'Filter with where()',
    code: `const all = bar(rows)
  .x("category")
  .y("sales")
  .key("category");

const northOnly = all.where({ region: "North" });

return { from: all, to: northOnly };`
  },
  highlight: {
    label: 'Highlight a subset',
    code: `const all = bar(rows)
  .x("category")
  .y("sales")
  .key("category");

const focused = all.highlight(
  { category: "Software" },
  { dimOpacity: 0.12 }
);

return { from: all, to: focused };`
  },
  split: {
    label: 'Break down bars',
    code: `const detailed = bar(segments)
  .x("category")
  .y("sales")
  .key(["category", "segment"])
  .breakdown("segment", {
    color: ["#1c6ae4", "#fa4d1d"]
  });

const total = detailed.rollup();

return { from: total, to: detailed };`
  },
  flip: {
    label: 'Flip orientation',
    code: `const vertical = bar(rows)
  .x("category")
  .y("sales")
  .key("category");

const horizontal = vertical.flip({
  order: ["x", "y"]
});

return { from: vertical, to: horizontal };`
  },
  line: {
    label: 'Line idiom',
    code: `const sales = line(series)
  .x("quarter")
  .y("sales")
  .key("quarter")
  .curve("curveMonotoneX")
  .pointSize(4);

const profit = sales.y("profit");

return { from: sales, to: profit };`
  },
  point: {
    label: 'Point idiom',
    code: `const sales = point(series)
  .x("sales")
  .y("profit")
  .key("quarter")
  .radius(6);

const reordered = sales
  .x("profit")
  .y("sales")
  .color("#fa4d1d");

return { from: sales, to: reordered };`
  },
  unit: {
    label: 'Unit idiom',
    code: `const grid = unit(units)
  .value("count", { maxUnits: 80 })
  .label("team")
  .columns(10)
  .radius(4);

const grouped = grid.group("team", {
  color: "team"
});

return { from: grid, to: grouped };`
  },
  seq: {
    label: 'Seq cursor',
    code: `const revenue = bar(rows)
  .x("category")
  .y("sales")
  .key("category");
const profit = revenue.y("profit");

const states = seq()
  .add(revenue, "Revenue by category")
  .add(profit, "Profit by category");

return {
  from: states.at(0).spec,
  to: states.at(1).spec
};`
  },
  story: {
    label: 'Story composition',
    code: `const revenue = bar(rows)
  .x("category")
  .y("sales")
  .key("category");
const profit = revenue.y("profit");

const narrative = story()
  .title("Quarterly performance")
  .layout("floatToText")
  .add("Revenue", revenue)
  .add("Profit", profit)
  .toSpec();

return {
  from: narrative.steps[0].views.main,
  to: narrative.steps[1].views.main
};`
  }
};

const rows = [
  { category: 'Hardware', region: 'North', sales: 86, profit: 34 },
  { category: 'Software', region: 'South', sales: 64, profit: 49 },
  { category: 'Services', region: 'North', sales: 51, profit: 27 },
  { category: 'Support', region: 'South', sales: 39, profit: 18 }
];

const segments = [
  { category: 'Hardware', segment: 'Consumer', sales: 46 },
  { category: 'Hardware', segment: 'Business', sales: 40 },
  { category: 'Software', segment: 'Consumer', sales: 37 },
  { category: 'Software', segment: 'Business', sales: 27 },
  { category: 'Services', segment: 'Consumer', sales: 29 },
  { category: 'Services', segment: 'Business', sales: 22 },
  { category: 'Support', segment: 'Consumer', sales: 21 },
  { category: 'Support', segment: 'Business', sales: 18 }
];

const series = [
  { quarter: 'Q1', sales: 28, profit: 12 },
  { quarter: 'Q2', sales: 47, profit: 24 },
  { quarter: 'Q3', sales: 39, profit: 19 },
  { quarter: 'Q4', sales: 66, profit: 34 }
];

const units = [
  { team: 'Core', count: 18 },
  { team: 'Design', count: 12 },
  { team: 'Data', count: 15 }
];

const chartTarget = ref(null);
const initialSample = samples[props.initial] ? props.initial : 'measure';
const selected = ref(initialSample);
const code = ref(samples[initialSample].code);
const status = ref('Loading runtime');
const error = ref('');
const progress = ref(0.5);
const autoRun = ref(true);
const hasChange = ref(false);
const deltaText = ref('Waiting for a valid state pair.');

let api = null;
let aq = null;
let change = null;
let debounceTimer = 0;
let runVersion = 0;
let resizeObserver = null;
let visibilityObserver = null;
let animationFrame = 0;

const statusKind = computed(() => error.value ? 'error' : status.value === 'Ready' ? 'ready' : 'busy');

onMounted(() => {
  if (!('IntersectionObserver' in window)) {
    initialize();
    return;
  }
  visibilityObserver = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    visibilityObserver?.disconnect();
    visibilityObserver = null;
    initialize();
  }, { rootMargin: '240px' });
  visibilityObserver.observe(chartTarget.value.closest('.syntax-playground'));
});

async function initialize() {
  try {
    const [runtime, arquero] = await Promise.all([
      import('../../../dist/scrollylite.esm.js'),
      import('arquero')
    ]);
    api = runtime;
    aq = arquero;
    await nextTick();
    resizeObserver = new ResizeObserver(() => change?.resize());
    resizeObserver.observe(chartTarget.value);
    await runCode();
  } catch (cause) {
    showError(cause);
  }
}

onBeforeUnmount(() => {
  clearTimeout(debounceTimer);
  cancelAnimationFrame(animationFrame);
  visibilityObserver?.disconnect();
  resizeObserver?.disconnect();
  change?.destroy();
});

watch(code, () => {
  if (!autoRun.value || !api) return;
  clearTimeout(debounceTimer);
  status.value = 'Waiting for input';
  debounceTimer = window.setTimeout(runCode, 450);
});

function chooseSample() {
  code.value = samples[selected.value].code;
  if (!autoRun.value) runCode();
}

function reset() {
  code.value = samples[selected.value].code;
  if (!autoRun.value) runCode();
}

async function runCode() {
  if (!api || !chartTarget.value) return;
  const version = ++runVersion;
  clearTimeout(debounceTimer);
  cancelAnimationFrame(animationFrame);
  error.value = '';
  status.value = 'Compiling';

  try {
    const evaluate = new AsyncFunction(
      'bar', 'line', 'point', 'unit', 'delta', 'seq', 'story', 'rows', 'segments', 'series', 'units',
      `"use strict";\n${code.value}`
    );
    const result = await evaluate(
      api.bar, api.line, api.point, api.unit, api.delta, api.seq, api.story,
      structuredClone(rows), structuredClone(segments), structuredClone(series), structuredClone(units)
    );
    if (version !== runVersion) return;
    if (!result?.from || !result?.to) {
      throw new Error('Return an object with { from, to } visualization states.');
    }

    change?.destroy();
    change = null;
    hasChange.value = false;
    const nextChange = await api.transition(result.from, result.to, {
      target: chartTarget.value,
      d3,
      aq,
      height: 300
    });
    if (version !== runVersion) {
      nextChange.destroy();
      return;
    }
    change = nextChange;
    hasChange.value = true;
    change.progress(progress.value);
    deltaText.value = JSON.stringify({
      changed: change.delta.changed,
      deltas: change.delta.deltas,
      semantic: change.delta.semantic.deltas
    }, null, 2);
    status.value = 'Ready';
  } catch (cause) {
    if (version === runVersion) showError(cause);
  }
}

function showError(cause) {
  error.value = cause instanceof Error ? cause.message : String(cause);
  status.value = 'Error';
}

function setProgress(value) {
  progress.value = Math.max(0, Math.min(1, Number(value) || 0));
  change?.progress(progress.value);
}

function play(to) {
  if (!change) return;
  change.play({ duration: 800, from: change.value, to });
  cancelAnimationFrame(animationFrame);
  const update = () => {
    if (!change) return;
    progress.value = change.value;
    if (Math.abs(change.value - to) > 0.001) animationFrame = requestAnimationFrame(update);
  };
  animationFrame = requestAnimationFrame(update);
}

function handleEditorKeydown(event) {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault();
    runCode();
  }
  if (event.key === 'Tab') {
    event.preventDefault();
    const input = event.currentTarget;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    code.value = `${code.value.slice(0, start)}  ${code.value.slice(end)}`;
    nextTick(() => {
      input.selectionStart = input.selectionEnd = start + 2;
    });
  }
}
</script>

<template>
  <div class="syntax-playground" :class="{ 'is-compact': compact }">
    <div class="playground-toolbar">
      <label v-if="!compact">
        <span>Example</span>
        <select v-model="selected" aria-label="Syntax example" @change="chooseSample">
          <option v-for="(sample, key) in samples" :key="key" :value="key">{{ sample.label }}</option>
        </select>
      </label>
      <strong v-else class="playground-inline-title">{{ samples[selected].label }}</strong>
      <label class="playground-auto">
        <input v-model="autoRun" type="checkbox" @change="autoRun && runCode()" />
        Auto-run
      </label>
      <button type="button" @click="runCode">Run <kbd>⌘↵</kbd></button>
      <button type="button" @click="reset">Reset</button>
      <span class="playground-status" :data-kind="statusKind">{{ status }}</span>
    </div>

    <div class="playground-grid">
      <div class="playground-editor-pane">
        <div class="playground-pane-label">Editable JavaScript</div>
        <textarea
          v-model="code"
          class="playground-editor"
          aria-label="Editable ScrollyLite code"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          @keydown="handleEditorKeydown"
        ></textarea>
        <p class="playground-contract">Available: <code>bar</code>, <code>line</code>, <code>point</code>, <code>unit</code>, <code>delta</code>, <code>seq</code>, <code>story</code>, plus <code>rows</code>, <code>segments</code>, <code>series</code>, and <code>units</code>. End with <code>return { from, to };</code>.</p>
      </div>

      <div class="playground-output-pane">
        <div class="playground-pane-label">Live output · progress {{ progress.toFixed(2) }}</div>
        <div ref="chartTarget" class="playground-chart" aria-label="Editable syntax output"></div>
        <div v-if="error" class="playground-runtime-error" role="alert">{{ error }}</div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          :value="progress"
          :disabled="!hasChange"
          aria-label="Playground transition progress"
          @input="setProgress($event.target.valueAsNumber)"
        />
        <div class="playground-output-actions">
          <button type="button" :disabled="!hasChange" @click="play(1)">Play →</button>
          <button type="button" :disabled="!hasChange" @click="play(0)">← Reverse</button>
        </div>
        <details>
          <summary>Inspect computed delta</summary>
          <pre><code>{{ deltaText }}</code></pre>
        </details>
      </div>
    </div>
  </div>
</template>
