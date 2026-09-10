import { availableChartTypes, registerChartType, registerChartModule } from 'visdelta/composition';
import type { AnyRecord, ChartOptions, ChartRuntime, PageOptions, PageRuntime, RuntimeOptions, StoryRuntime } from 'visdelta/composition';
export { registerChartType, registerChartModule, availableChartTypes };
export declare function createStory(spec: AnyRecord, options: RuntimeOptions): Promise<StoryRuntime>;
/** Layout-only embedding; charts and navigation remain owned by the caller. */
export declare function createPage(spec: AnyRecord, options?: PageOptions): Promise<PageRuntime>;
/** Chart-only embedding, with discrete or externally supplied progress input. */
export declare function createChart(spec: AnyRecord, options: ChartOptions): Promise<ChartRuntime>;
