export interface RenderContext {
    root?: Element;
    colors?: Map<string, Map<string, string>> | null;
}
/** Helpers capture one instance context, including delayed D3 callbacks. */
export declare function createMarkHelpers(context?: RenderContext): {
    pickCategoricalColors: (n: any, colors: any) => any;
    themeValue: (cssVar: any, fallback: any) => any;
    transitionSpec: (spec: any, previousSpec: any, { scrollDriven, d3 }?: {
        scrollDriven?: boolean | undefined;
    }) => {
        base: any;
        duration: number;
        ease: string;
        stagger: import("../types/index.js").StaggerSpec | number;
    };
    effectiveTransitionSpec: (spec?: {}) => Required<import("../types/index.js").TransitionSpec>;
    easeFor: (name: any, d3: any) => any;
    activeMarkLayer: (scene: any, mark: any, transition: any) => any;
    fadeLayers: (scene: any, activeMark: any, transition?: null, d3?: null) => void;
    staggerDelay: (spec: any, datum: any, index: any, override: any) => number;
    curveFor: (spec: any, d3: any) => any;
    drawPath: (selection: any, transition: any, d3: any) => void;
    fadeNonBarShapes: (chart: any) => void;
    fadeNonLineShapes: (chart: any) => void;
    fadeNonPointShapes: (chart: any) => void;
    fadeNonUnitShapes: (chart: any) => void;
    applyPlotClip: (chart: any, enabled: any) => void;
    drawTextBoard: (scene: any, spec: any) => void;
    drawUnsupported: (chart: any, spec: any, availableTypes?: never[]) => void;
    bandOrLinear: (rows: any, channel: any, range: any, d3: any) => any;
    quantitativeScale: (rows: any, channel: {} | undefined, range: any, d3: any) => any;
    position: (scale: any, value: any) => any;
    niceExtent: (rows: any, field: any, floor: any) => any[];
    quantitativeDomain: (rows: any, channel: {} | undefined, floor: any) => any;
    channelDomain: (rows: any, channel?: {}) => any;
    colorScale: (rows: any, channel: any, d3: any) => (row?: {}) => any;
    drawXAxis: (chart: any, scale: any, title: any, d3: any, transition?: any) => void;
    drawYAxis: (chart: any, scale: any, title: any, d3: any, transition?: any) => void;
    drawGrid: (chart: any, y: any, d3: any, transition?: any) => void;
    updateGrid: (chart: any, y: any, d3: any, transition?: any) => void;
    drawLegend: (chart: any, rows: any, channel: any, d3: any) => void;
    bindTooltip: (selection: any, spec: any, tooltip: any) => void;
    showTooltip: (tooltip: any, event: any, html: any) => void;
    moveTooltip: (tooltip: any, event: any) => void;
    hideTooltip: (tooltip: any) => void;
    markAxisInactive: (axisGroup: any) => void;
};
export declare const pickCategoricalColors: (n: any, colors: any) => any, themeValue: (cssVar: any, fallback: any) => any, transitionSpec: (spec: any, previousSpec: any, { scrollDriven, d3 }?: {
    scrollDriven?: boolean | undefined;
}) => {
    base: any;
    duration: number;
    ease: string;
    stagger: import("../types/index.js").StaggerSpec | number;
}, effectiveTransitionSpec: (spec?: {}) => Required<import("../types/index.js").TransitionSpec>, easeFor: (name: any, d3: any) => any, activeMarkLayer: (scene: any, mark: any, transition: any) => any, fadeLayers: (scene: any, activeMark: any, transition?: null, d3?: null) => void, staggerDelay: (spec: any, datum: any, index: any, override: any) => number, curveFor: (spec: any, d3: any) => any, drawPath: (selection: any, transition: any, d3: any) => void, fadeNonBarShapes: (chart: any) => void, fadeNonLineShapes: (chart: any) => void, fadeNonPointShapes: (chart: any) => void, fadeNonUnitShapes: (chart: any) => void, applyPlotClip: (chart: any, enabled: any) => void, drawTextBoard: (scene: any, spec: any) => void, drawUnsupported: (chart: any, spec: any, availableTypes?: never[]) => void, bandOrLinear: (rows: any, channel: any, range: any, d3: any) => any, quantitativeScale: (rows: any, channel: {} | undefined, range: any, d3: any) => any, position: (scale: any, value: any) => any, niceExtent: (rows: any, field: any, floor: any) => any[], quantitativeDomain: (rows: any, channel: {} | undefined, floor: any) => any, channelDomain: (rows: any, channel?: {}) => any, colorScale: (rows: any, channel: any, d3: any) => (row?: {}) => any, drawXAxis: (chart: any, scale: any, title: any, d3: any, transition?: any) => void, drawYAxis: (chart: any, scale: any, title: any, d3: any, transition?: any) => void, drawGrid: (chart: any, y: any, d3: any, transition?: any) => void, updateGrid: (chart: any, y: any, d3: any, transition?: any) => void, drawLegend: (chart: any, rows: any, channel: any, d3: any) => void, bindTooltip: (selection: any, spec: any, tooltip: any) => void, showTooltip: (tooltip: any, event: any, html: any) => void, moveTooltip: (tooltip: any, event: any) => void, hideTooltip: (tooltip: any) => void, markAxisInactive: (axisGroup: any) => void;
