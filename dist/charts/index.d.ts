import type { ChartDeps, ChartType, ChartPlugin, CompilerContext, SpecCompiler, StateOperations, ViewSpec } from '../types/index.js';
export interface ChartTypeRegistry {
    register<S extends ViewSpec>(chartType: ChartType<S>): this;
    get<S extends ViewSpec = ViewSpec>(markOrSpec: string | ViewSpec): ChartType<S> | undefined;
    has(markOrSpec: string | ViewSpec): boolean;
    types(): string[];
}
export declare function createChartTypeRegistry(): ChartTypeRegistry;
export interface SpecCompilerEntry {
    compiler: SpecCompiler;
    scenes: string[];
    stateOperations: StateOperations;
}
export declare function registerChartModules(registry: ChartTypeRegistry, modules: Array<{
    plugin: ChartPlugin;
}>, deps?: ChartDeps): ChartTypeRegistry;
export declare function createSpecCompilerRegistry(modules: Array<{
    plugin: ChartPlugin;
}>, context?: CompilerContext): Record<string, SpecCompilerEntry>;
export declare function normalizeMarkRendererKey(markOrRenderer: unknown): string;
export declare function normalizeChartType(type: unknown): string;
export declare function resolveMarkRendererKey(viewSpec: ViewSpec): string;
export declare function resolveChartType(viewSpec: ViewSpec): string;
