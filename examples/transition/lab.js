import { bar } from '../../dist/bar.js';
import { transition } from '../../dist/transition-entry.js';
import { scenarios } from './scenarios.js';

const $ = selector => document.querySelector(selector);
const editor = $('#editor');
const picker = $('#scenario');
const chart = $('#chart');
const slider = $('#progress');
const status = $('#status');
const error = $('#error');
const autoRun = $('#auto-run');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const drafts = new Map();
let selected = scenarios.find(sample => sample.id === location.hash.slice(1)) ?? scenarios[0];
let change = null;
let timer = 0;
let version = 0;
let frame = 0;
let disposed = false;

for (const sample of scenarios) picker.add(new Option(sample.label, sample.id));
picker.value = selected.id;

function report(message, state = 'ready') {
  status.textContent = message;
  status.dataset.state = state;
}

function sync() {
  if (!change) return;
  slider.value = String(change.value);
  $('#value').value = change.value.toFixed(2);
}

function stop() {
  cancelAnimationFrame(frame);
  change?.pause();
  sync();
}

function seek(value) {
  stop();
  change?.progress(value);
  sync();
}

function play(to) {
  if (!change) return;
  stop();
  change.play({ from: change.value === to ? 1 - to : change.value, to, duration: 800 });
  const tick = () => {
    sync();
    if (!disposed && change && Math.abs(change.value - to) > 0.00001) frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
}

async function run({ resetProgress = false } = {}) {
  clearTimeout(timer);
  const request = ++version;
  stop();
  const progress = resetProgress ? 0 : Number(slider.value);
  report('Compiling', 'busy');
  error.hidden = true;
  let next = null;
  let target = null;
  try {
    const pair = await new AsyncFunction('bar', `"use strict";\n${editor.value}`)(bar);
    if (disposed || request !== version) return;
    if (!pair?.from || !pair?.to) throw new Error('Return { from, to } with two bar visualization states.');
    if ([pair.from, pair.to].some(view => (view.toSpec?.() ?? view).mark !== 'bar')) {
      throw new Error('This lab accepts bar states only.');
    }
    // Failed or stale runs cannot replace the last successful preview.
    target = document.createElement('div');
    target.className = 'candidate';
    chart.append(target);
    next = await transition(pair.from, pair.to, { target, d3: globalThis.d3, aq: globalThis.aq, height: 400 });
    if (disposed || request !== version) {
      next.destroy();
      target.remove();
      return;
    }
    next.progress(progress);
    const delta = JSON.stringify(next.delta, null, 2);
    change?.destroy();
    chart.replaceChildren(target);
    target.className = '';
    change = next;
    for (const control of document.querySelectorAll('.playback button, #progress')) control.disabled = false;
    $('#delta').textContent = delta;
    sync();
    report('Ready');
  } catch (cause) {
    next?.destroy();
    target?.remove();
    if (disposed || request !== version) return;
    error.textContent = `${cause instanceof Error ? cause.message : String(cause)}${change ? '\nShowing the last successful preview.' : ''}`;
    error.hidden = false;
    report('Error', 'error');
  }
}

function choose() {
  editor.value = drafts.get(selected.id) ?? selected.code;
  $('#description').textContent = selected.description;
  run({ resetProgress: true });
}

picker.addEventListener('change', () => {
  drafts.set(selected.id, editor.value);
  selected = scenarios.find(sample => sample.id === picker.value);
  history.replaceState(null, '', `#${selected.id}`);
  choose();
});
editor.addEventListener('input', () => {
  ++version;
  clearTimeout(timer);
  stop();
  drafts.set(selected.id, editor.value);
  report(autoRun.checked ? 'Waiting for input' : 'Edited · press Run', 'busy');
  if (autoRun.checked) timer = setTimeout(run, 450);
});
editor.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault();
    run();
  }
});
autoRun.addEventListener('change', () => {
  clearTimeout(timer);
  if (autoRun.checked) run();
});
$('#run').onclick = run;
$('#reset').onclick = () => { drafts.delete(selected.id); choose(); };
$('#play').onclick = () => play(1);
$('#reverse').onclick = () => play(0);
$('#pause').onclick = stop;
$('#start').onclick = () => seek(0);
$('#end').onclick = () => seek(1);
slider.oninput = () => seek(Number(slider.value));
let width = chart.clientWidth;
const observer = new ResizeObserver(() => {
  if (!chart.isConnected) {
    observer.disconnect();
    return;
  }
  if (chart.clientWidth === width) return;
  width = chart.clientWidth;
  change?.resize();
});
observer.observe(chart);
window.addEventListener('pagehide', () => {
  disposed = true;
  ++version;
  clearTimeout(timer);
  stop();
  observer.disconnect();
  change?.destroy();
});
choose();
