import { createChartTypeRegistry, normalizeMarkRendererKey, registerChartModules } from '../charts/index.js';
import type { ChartModule } from '../charts/module.js';
import type { ChartDeps, ChartType, ChartPlugin, ViewSpec } from '../types/index.js';
import { CHART_RUNTIME_DEPS } from './chart-deps.js';

// Explicit registrations are shared for compatibility. Each transition takes a
// registry snapshot so a later registration cannot change its compiled frames.
export const chartRegistry = createChartTypeRegistry();
const factories = new Map<string, { chartType: ChartType<any>; plugin: ChartPlugin<any> }>();
const modules = new Map<string, ChartModule<any>>();

export function registerChartType(chartType: ChartType<any>): void {
  chartRegistry.register(chartType);
  factories.delete(chartRegistry.get(chartType.key)!.key);
}

export function registerChartModule(module: { plugin: ChartPlugin<any> } | ChartModule<any>): void {
  if ('plugin' in module) {
    registerChartModules(chartRegistry, [module], CHART_RUNTIME_DEPS);
    const chartType = chartRegistry.get(module.plugin.key)!;
    factories.set(chartType.key, { chartType, plugin: module.plugin });
    return;
  }
  const key = normalizeMarkRendererKey(module.key);
  if (!key) throw new Error('Chart module key is required.');
  modules.set(key, module);
}

function instantiate(key: string, deps: ChartDeps) {
  const chartType = chartRegistry.get(key);
  const factory = chartType && factories.get(chartType.key);
  return factory && factory.chartType === chartType ? factory.plugin.createChartType(deps) : chartType;
}

export function snapshotChartRegistry(deps: ChartDeps) {
  const registry = createChartTypeRegistry();
  for (const key of chartRegistry.types()) registry.register(instantiate(key, deps)!);
  return registry;
}

export function availableChartTypes(): string[] {
  return [...new Set([...modules.keys(), ...chartRegistry.types()])].sort();
}

export async function transitionRegistry(
  spec: ViewSpec,
  deps: ChartDeps = CHART_RUNTIME_DEPS,
  localModules: ChartModule<any>[] = []
) {
  const key = normalizeMarkRendererKey(spec.mark);
  let chartType: ChartType<any> | undefined = instantiate(key, deps);
  if (!chartType) {
    const module = localModules.find(candidate => normalizeMarkRendererKey(candidate.key) === key)
      ?? modules.get(key);
    if (!module) throw new Error(`Unsupported chart type: ${key}`);
    const loaded = await module.load();
    const pluginKey = normalizeMarkRendererKey(loaded.plugin.key);
    if (pluginKey !== key) {
      throw new Error(`Chart module "${key}" loaded plugin "${pluginKey}".`);
    }
    // Honor an explicit registration made while the module was loading.
    chartType = instantiate(key, deps) ?? loaded.plugin.createChartType(deps);
  }
  const registry = createChartTypeRegistry();
  if (!chartType) throw new Error(`Unsupported chart type: ${key}`);
  registry.register(chartType);
  return registry;
}
