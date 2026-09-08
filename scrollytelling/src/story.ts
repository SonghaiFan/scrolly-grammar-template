export { createChart, createPage, createStory } from './runtime.js';
export { story, StoryBuilder } from './grammar/story.js';
export { seq, Seq } from './seq.js';
export type { SeqState } from './seq.js';

import { createChart, createPage, createStory } from './runtime.js';
import { Seq as SeqClass } from './seq.js';
import type { ChartOptions, PageOptions, RuntimeOptions } from 'scrollylite/composition';

type AnyRecord = Record<string, unknown>;

function resolveSpec(input: SeqClass | AnyRecord): AnyRecord {
  return input instanceof SeqClass ? (input.toSpec() as AnyRecord) : input;
}

export async function chart(specOrSeq: SeqClass | AnyRecord, options: ChartOptions) {
  const runtime = await createChart(resolveSpec(specOrSeq), options);
  if (specOrSeq instanceof SeqClass && specOrSeq.length > 0) {
    const initialStep = typeof options['initialStep'] === 'number' ? options['initialStep'] as number : 0;
    specOrSeq.syncCursor(initialStep);
  }
  return runtime;
}

export async function render(specOrSeq: SeqClass | AnyRecord, options: RuntimeOptions) {
  const runtime = await createStory(resolveSpec(specOrSeq), options);
  if (specOrSeq instanceof SeqClass && specOrSeq.length > 0) specOrSeq.syncCursor(0);
  return runtime;
}

export function page(specOrSeq: SeqClass | AnyRecord, options: PageOptions = {}) {
  return createPage(resolveSpec(specOrSeq), options);
}

export type {
  ActionEvent,
  ChartOptions,
  ChartRuntime,
  PageOptions,
  PageRuntime,
  RuntimeOptions,
  ScrollRuntime,
  StoryRuntime
} from 'scrollylite/composition';
