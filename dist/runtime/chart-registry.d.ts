import type { ChartDeps, ChartType, ChartPlugin, ViewSpec } from '../types/index.js';
export declare const chartRegistry: import("../charts/index.js").ChartTypeRegistry;
export declare function registerChartType(chartType: ChartType<any>): void;
export declare function registerChartModule(module: {
    plugin: ChartPlugin<any>;
}): void;
export declare function snapshotChartRegistry(deps: ChartDeps): import("../charts/index.js").ChartTypeRegistry;
export declare function availableChartTypes(): string[];
export declare function transitionRegistry(spec: ViewSpec, deps?: ChartDeps): Promise<import("../charts/index.js").ChartTypeRegistry>;
