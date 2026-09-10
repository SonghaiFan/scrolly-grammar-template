import type {
  ChartDeps,
  ChartType,
  ChartPlugin,
  CompilerContext,
  IntermediateSpec,
  MarginSpec,
  Renderer,
  SpecCompiler,
  StateOperations,
  TransitionPlan,
  ViewSpec
} from '../types/index.js';

export const DEFAULT_SCENES = ['selection', 'axis', 'detail', 'mapping'] as const;

export const DEFAULT_STATE_OPERATIONS: StateOperations = {
  selection: 'filter',
  axis: 'coordinate',
  detail: 'aggregate'
};

export interface ChartTypeConfig<S extends ViewSpec = ViewSpec> {
  key: string;
  transitionEvaluation?: 'cached' | 'reconstruct';
  scenes?: string[];
  stateOperations?: StateOperations;
  renderer?: Renderer<S>;
  createRenderer?: (deps: ChartDeps) => Renderer<S>;
  createChart?: (deps: ChartDeps) => ChartType<S>;
  prepareSpec?: (spec: S) => S;
  defaults?: { margin?: (spec: S) => Partial<MarginSpec> };
  inspect?: Record<string, unknown>;
  transition?: {
    plan?: (prev: S | null, next: S | null) => TransitionPlan;
    intermediateSpecs?: (prev: S, next: S) => IntermediateSpec<S>[];
    intermediateSpec?: (prev: S, next: S) => IntermediateSpec<S> | null;
  };
  createSpecCompiler?: (context: CompilerContext) => SpecCompiler;
}

export function defineChartType<S extends ViewSpec = ViewSpec>(
  config: ChartTypeConfig<S>
): ChartPlugin<S> {
  if (!config.key) throw new Error('Chart type plugin requires a key.');

  const { createSpecCompiler } = config;
  const scenes = uniqueStrings(config.scenes ?? [...DEFAULT_SCENES]);
  const stateOperations: StateOperations = { ...DEFAULT_STATE_OPERATIONS, ...(config.stateOperations ?? {}) };

  function createChartType(deps: ChartDeps): ChartType<S> {
    const chartType = config.createChart
      ? config.createChart(deps)
      : createRuntimeChartType(config, deps);

    return normalizeChartType<S>(
      {
        ...chartType,
        transitionEvaluation: config.transitionEvaluation ?? chartType.transitionEvaluation,
        key: chartType.key || config.key,
        scenes: chartType.scenes ?? scenes,
        stateOperations: { ...stateOperations, ...(chartType.stateOperations ?? {}) }
      },
      createSpecCompiler
    );
  }

  return {
    key: config.key,
    scenes,
    stateOperations,
    createChartType,
    ...(createSpecCompiler ? { createSpecCompiler } : {})
  };
}

export function identityPrepare<S extends ViewSpec>(spec: S): S {
  return spec;
}

export function emptyTransitionPlan(): TransitionPlan {
  return {};
}

export function defaultMargin(): Partial<MarginSpec> {
  return {};
}

export function normalizeChartType<S extends ViewSpec = ViewSpec>(
  chartType: Partial<ChartType<S>> & { key: string },
  createSpecCompiler?: ((context: CompilerContext) => SpecCompiler) | null
): ChartType<S> {
  const prepareSpec = chartType.prepareSpec ?? identityPrepare;
  const resolveTransitionPlan = chartType.resolveTransitionPlan ?? emptyTransitionPlan;
  const renderer = chartType.renderer;
  if (!renderer) throw new Error(`Chart type "${chartType.key}" must provide a renderer function.`);

  const scenes = uniqueStrings([...(chartType.scenes ?? DEFAULT_SCENES)]);
  const stateOperations: StateOperations = { ...DEFAULT_STATE_OPERATIONS, ...(chartType.stateOperations ?? {}) };

  return {
    inspect: {},
    ...chartType,
    scenes,
    stateOperations,
    renderer,
    prepareSpec,
    resolveTransitionPlan,
    intermediateSpecs: chartType.intermediateSpecs,
    intermediateSpec: chartType.intermediateSpec ?? null,
    defaultMargin: chartType.defaultMargin ?? defaultMargin,
    ...(createSpecCompiler ? { createSpecCompiler } : {})
  } as ChartType<S>;
}

// ─── Internal ─────────────────────────────────────────────────────────────────

function createRuntimeChartType<S extends ViewSpec>(
  config: ChartTypeConfig<S>,
  deps: ChartDeps
): Partial<ChartType<S>> & { key: string } {
  const renderer = config.createRenderer
    ? config.createRenderer(deps)
    : config.renderer;

  return {
    key: config.key,
    renderer,
    prepareSpec: config.prepareSpec ?? identityPrepare,
    resolveTransitionPlan: config.transition?.plan ?? emptyTransitionPlan,
    intermediateSpecs: config.transition?.intermediateSpecs,
    intermediateSpec: config.transition?.intermediateSpec,
    defaultMargin: config.defaults?.margin ?? defaultMargin,
    inspect: config.inspect ?? {},
    scenes: config.scenes,
    stateOperations: config.stateOperations
  };
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean).map(String))];
}
