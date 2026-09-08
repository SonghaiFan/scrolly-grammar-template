// ─── Seq — ordered state sequence with navigation ────────────────────────────
//
// A composition helper: state snapshots with a navigation cursor.
// Rendering is external; optional text bindings do access the DOM.
//
// Usage:
//   const sq = seq()
//     .data('weather', { url: '...' })
//     .view({ height: 400 })
//     .add(bar('weather').x('decade').y('count'), 'Hot days per decade')
//     .add(base.flip(), 'Flipped to horizontal');
//
//   const chart = await sl.chart(sq, { target: '#vis', d3, aq });
//   sq.bind({ chart, text: '#caption' });
//   btn.onclick = () => sq.next();

import { story, StoryBuilder } from './grammar/story.js';
import { cloneState } from 'scrollylite/composition';
import type { ViewSpec, StorySpec, ChartRuntime } from 'scrollylite/composition';

export interface SeqState {
  /** The view spec for this state */
  spec: ViewSpec;
  /** Narrative text / HTML fragment */
  text: string;
  /** Optional heading */
  title?: string;
  /** Zero-based position in the sequence */
  index: number;
}

type ViewLike = ViewSpec | { toSpec(): ViewSpec };

interface SeqEntry {
  viewSpec: ViewLike;
  text: string;
  title?: string;
}

interface SeqBinding {
  chart?: ChartRuntime;
  text?: Element;
}

export class Seq {
  private _entries: SeqEntry[] = [];
  private _cursor = -1;
  private _builder: StoryBuilder;
  private _bindings: SeqBinding[] = [];
  private _onChange?: (state: SeqState) => void;

  constructor() {
    this._builder = story();
  }

  // ── Spec building ──────────────────────────────────────────────────────────

  /** Register a named data source, same as story().data() */
  data(name: string, source: unknown): this {
    this._builder.data(name, source);
    return this;
  }

  /** Set view dimensions, same as story().view('main', opts) */
  view(opts: ViewSpec): this {
    this._builder.view('main', opts);
    return this;
  }

  /** Add a state: chart grammar object + optional narrative text */
  add(viewSpec: ViewLike, text = '', opts: { title?: string } = {}): this {
    const index = this._entries.length;
    viewSpec = cloneState(typeof (viewSpec as { toSpec?: () => ViewSpec }).toSpec === 'function'
      ? (viewSpec as { toSpec(): ViewSpec }).toSpec() : viewSpec);
    this._entries.push({ viewSpec, text, title: opts.title });
    this._builder.add(opts.title ?? `Step ${index + 1}`, viewSpec, { body: text });
    return this;
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  /** Total number of states */
  get length(): number {
    return this._entries.length;
  }

  /** Zero-based cursor position (-1 before first navigation) */
  get index(): number {
    return this._cursor;
  }

  /** Whether the cursor is at the last state */
  get atEnd(): boolean {
    return this.length > 0 && this._cursor >= this._entries.length - 1;
  }

  /** Whether the cursor is at the first state */
  get atStart(): boolean {
    return this.length > 0 && this._cursor <= 0;
  }

  /** Current state, or null before the first navigation */
  get current(): SeqState | null {
    return this._cursor >= 0 ? this._stateAt(this._cursor) : null;
  }

  /** Read state at position without moving the cursor */
  at(index: number): SeqState {
    return this._stateAt(this._boundedIndex(index));
  }

  /** Jump to position, notify all bindings, return the new state */
  goto(index: number): SeqState {
    this._cursor = this._boundedIndex(index);
    const state = this._stateAt(this._cursor);
    this._notify(state);
    return state;
  }

  /** Advance to the next state */
  next(): SeqState {
    return this.goto(this._cursor + 1);
  }

  /** Go back to the previous state */
  prev(): SeqState {
    return this.goto(this._cursor - 1);
  }

  // ── Binding ────────────────────────────────────────────────────────────────

  /**
   * Bind a chart and/or text element.
   * After binding, seq.next() / seq.goto() automatically drive both.
   *
   * @example
   * sq.bind({ chart, text: document.querySelector('#caption') });
   * sq.bind({ chart, text: '#caption' });  // CSS selector also accepted
   * btn.onclick = () => sq.next();
   */
  bind(bindings: { chart?: ChartRuntime; text?: Element | string }): this {
    const textEl =
      typeof bindings.text === 'string'
        ? document.querySelector(bindings.text)
        : (bindings.text ?? null);
    this._bindings.push({ chart: bindings.chart, text: textEl ?? undefined });
    return this;
  }

  /** Register a custom onChange handler */
  on(event: 'change', handler: (state: SeqState) => void): this {
    if (event === 'change') this._onChange = handler;
    return this;
  }

  /** Release references to all chart/text bindings; does not destroy charts. */
  unbind(): this {
    this._bindings = [];
    return this;
  }

  off(event: 'change'): this {
    if (event === 'change') this._onChange = undefined;
    return this;
  }

  // ── Compilation ────────────────────────────────────────────────────────────

  /**
   * Compile to a StorySpec.
   * Called internally by sl.chart(seq, opts) — you rarely need this directly.
   */
  toSpec(): StorySpec {
    return this._builder.toSpec();
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  /**
   * Sync cursor position without triggering notifications.
   * Called by sl.chart(seq, opts) to align cursor with chart's initialStep
   * so the first sq.next() advances to step 1 rather than step 0.
   */
  syncCursor(index: number): void {
    this._cursor = this.length ? this._boundedIndex(index) : -1;
  }

  private _boundedIndex(index: number): number {
    if (!this.length) throw new Error('Cannot navigate an empty Seq. Add a visualization first.');
    if (!Number.isSafeInteger(index)) throw new Error('Seq index must be a finite integer.');
    return Math.max(0, Math.min(index, this.length - 1));
  }

  private _stateAt(index: number): SeqState {
    const entry = this._entries[index];
    const spec =
      entry.viewSpec && typeof (entry.viewSpec as { toSpec?(): ViewSpec }).toSpec === 'function'
        ? (entry.viewSpec as { toSpec(): ViewSpec }).toSpec()
        : (entry.viewSpec as ViewSpec);
    return { spec: cloneState(spec), text: entry.text, title: entry.title, index };
  }

  private _notify(state: SeqState): void {
    for (const b of this._bindings) {
      if (b.chart) b.chart.to(state);            // polymorphic — accepts SeqState
      if (b.text) b.text.innerHTML = state.text ?? '';
    }
    this._onChange?.(state);
  }
}

/** Create a new state sequence builder */
export function seq(): Seq {
  return new Seq();
}
