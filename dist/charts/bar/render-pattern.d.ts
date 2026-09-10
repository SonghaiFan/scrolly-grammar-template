export declare function createBarRenderKit(deps: any): {
    applyMarkSteps: (selection: any, steps: any, spec: any, markGeometry: any, baseAttrs: any) => any;
    axisTransition: (steps: any, part: any, d3: any) => any;
    baselineEnterPlan: typeof baselineEnterPlan;
    baselineExitPlan: typeof baselineExitPlan;
    barSelectionOpacity: typeof barSelectionOpacity;
    collapseLineage: typeof collapseLineage;
    renderBarJoin: (options: any) => void;
    renderBarSeams: ({ chart, path, startPath, draw }: {
        chart: any;
        path?: string | undefined;
        startPath?: any;
        draw?: boolean | undefined;
    }) => void;
    setRectGeometry: typeof setRectGeometry;
    splitLineage: typeof splitLineage;
    sourceBaselineExit: typeof sourceBaselineExit;
    steps: (chart: any, rendererOrientation: any, d3: any) => {
        ordered: any;
        duration: any;
        ease: any;
        stagger: any;
        transitionName: any;
    } | null;
};
export declare function setRectGeometry(selection: any, geometry: any): void;
export declare function collapseLineage(chart: any, parentField: any): {
    start(d: any): any;
} | null;
export declare function splitLineage(chart: any): boolean;
export declare function baselineEnterPlan(chart: any, from: any): any;
export declare function baselineExitPlan(chart: any, to: any): any;
export declare function sourceBaselineExit(selection: any, { horizontal, plan, value }?: {
    horizontal?: boolean | undefined;
    plan?: null | undefined;
    value?: null | undefined;
}): any;
export declare function barSelectionOpacity(row: any, spec?: {}, dimOpacity?: number): number;
