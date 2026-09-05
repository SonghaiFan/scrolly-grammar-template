import type { ChartDeps, ChartIdiom, ChartPlugin, ViewSpec } from '../types/index.js';
export declare const chartRegistry: import("../charts/index.js").ChartIdiomRegistry;
export declare function registerChartIdiom(idiom: ChartIdiom<any>): void;
export declare function registerChartModule(module: {
    plugin: ChartPlugin<any>;
}): void;
export declare function snapshotChartRegistry(deps: ChartDeps): import("../charts/index.js").ChartIdiomRegistry;
export declare function availableChartIdioms(): string[];
export declare function transitionRegistry(spec: ViewSpec, deps?: ChartDeps): Promise<import("../charts/index.js").ChartIdiomRegistry>;
