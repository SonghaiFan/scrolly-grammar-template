import type { ChartDeps, ChartType, ViewSpec } from '../../types/index.js';
export interface BarSpec extends ViewSpec {
    mark: 'bar';
}
export declare function createBarChart(deps: ChartDeps): ChartType<BarSpec>;
