import { uniqueTokens } from 'scrollylite/composition';
import type { LayoutSpec, StepSpec, StorySpec } from 'scrollylite/composition';
import { normalizeScrollDriverConfig } from '../scroll-drivers/index.js';

type AnyRecord = Record<string, unknown>;

interface CompiledSpec extends StorySpec {
  data: Record<string, unknown>;
  views: Record<string, AnyRecord>;
  theme: AnyRecord;
  layout: LayoutSpec;
  steps: StepSpec[];
}

export function compileSpec(spec: Partial<StorySpec>): CompiledSpec {
  if (!spec || typeof spec !== 'object') {
    throw new Error('Scrollytelling requires a story spec object.');
  }

  const steps = Array.isArray(spec.steps) ? spec.steps : [];
  if (!steps.length) {
    throw new Error('Scrollytelling spec must contain at least one step.');
  }

  const layout: LayoutSpec = {
    offset: 0.55,
    nav: true,
    progress: true,
    scroll: {},
    ...(spec.layout || {}),
    preset: (spec.layout as AnyRecord)?.['preset'] as string || 'floatToText'
  } as LayoutSpec;
  (layout as AnyRecord)['scroll'] = normalizeScrollDriverConfig((layout as AnyRecord)['scroll'] as AnyRecord || {});

  const normalizedSteps = steps.map((step, index) => ({
    ...step,
    id: step.id || `step-${index + 1}`,
    transition: normalizeStepTransition(step.transition as AnyRecord | undefined),
    action: normalizeStepAction(step as AnyRecord, index),
    views: normalizeStepViews(step as AnyRecord)
  })) as StepSpec[];

  const viewData = collectViewDataSources(normalizedSteps);

  return {
    ...spec,
    data: { ...(spec.data || {} as AnyRecord), ...viewData.data },
    views: (spec.views || { main: {} }) as Record<string, AnyRecord>,
    theme: (spec.theme || {}) as AnyRecord,
    layout,
    steps: viewData.steps
  } as CompiledSpec;
}

export function storySignature(spec: StorySpec): Array<{ index: number; id: string; title: string; transition: string[]; action: string[] }> {
  return (spec.steps || []).map((step, index) => ({
    index,
    id: step.id!,
    title: step.title!,
    transition: ((step.transition as AnyRecord)?.['scene'] as string[]) || [],
    action: (step as AnyRecord)['action'] as string[] || []
  }));
}


function normalizeStepTransition(transition: AnyRecord = {}): { scene: string[] } {
  return { scene: uniqueTokens((transition['scene'] as unknown[]) || []) };
}

function normalizeStepAction(step: AnyRecord = {}, index = 0): string[] {
  const fallback = index === 0 ? ['step', 'tooltip', 'enter'] : ['step', 'tooltip'];
  const action = step['action'] as unknown[] | undefined;
  return uniqueTokens(action?.length ? action : fallback);
}

function normalizeStepViews(step: AnyRecord): Record<string, unknown> {
  if (step['views']) return step['views'] as Record<string, unknown>;
  if (step['view']) return { main: step['view'] };
  return {};
}

function collectViewDataSources(steps: StepSpec[]): { data: Record<string, unknown>; steps: StepSpec[] } {
  const data: Record<string, unknown> = {};
  // Deduplicate: same URL → same generated name, loaded only once
  const urlToName = new Map<string, string>();

  const normalizedSteps = steps.map((step, stepIndex) => ({
    ...step,
    views: Object.fromEntries(
      Object.entries((step as AnyRecord)['views'] as Record<string, AnyRecord> || {}).map(([viewId, viewSpec]) => {
        if (!(viewSpec?.['data'] as AnyRecord)?.['url']) return [viewId, viewSpec];

        const url = (viewSpec['data'] as AnyRecord)['url'] as string;
        const explicitName = (viewSpec['data'] as AnyRecord)['name'] as string | undefined;

        let name: string;
        if (explicitName) {
          name = explicitName;
        } else if (urlToName.has(url)) {
          name = urlToName.get(url)!;          // reuse existing name for same URL
        } else {
          name = `__data_${stepIndex + 1}_${viewId}`;
          urlToName.set(url, name);
        }

        data[name] = normalizeUrlDataSource(viewSpec['data'] as AnyRecord);
        return [viewId, { ...viewSpec, data: { name } }];
      })
    )
  })) as StepSpec[];
  return { data, steps: normalizedSteps };
}

function normalizeUrlDataSource(dataSpec: AnyRecord): AnyRecord {
  return {
    ...dataSpec,
    type: dataSpec['type'] || (dataSpec['format'] as AnyRecord | undefined)?.['type'] || dataTypeFromUrl(dataSpec['url'] as string)
  };
}

function dataTypeFromUrl(url = ''): string {
  return String(url).toLowerCase().endsWith('.json') ? 'json' : 'csv';
}
