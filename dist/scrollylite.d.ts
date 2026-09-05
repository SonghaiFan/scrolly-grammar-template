import { registerChartIdiom, registerChartModule, availableChartIdioms } from './runtime/chart-registry.js';
import type { AnyRecord, ChartOptions, ChartRuntime, PageOptions, PageRuntime, RuntimeOptions, StoryRuntime } from './types.js';
export { registerChartIdiom, registerChartModule, availableChartIdioms };
export declare function createTransitionSurface(from: any, to: any, options: any): {
    view: Element;
    commitMount(): void;
    rollbackMount(): void;
    progress(value: number): void;
    resize(): void;
    destroy(): void;
};
export declare function createStory(spec: AnyRecord, options: RuntimeOptions): Promise<StoryRuntime>;
/** Layout-only embedding; charts and navigation remain owned by the caller. */
export declare function createPage(spec: AnyRecord, options?: PageOptions): Promise<PageRuntime>;
/** Chart-only embedding, with discrete or externally supplied progress input. */
export declare function createChart(spec: AnyRecord, options: ChartOptions): Promise<ChartRuntime>;
