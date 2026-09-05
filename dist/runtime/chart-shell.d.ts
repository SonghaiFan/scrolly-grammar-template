import type { AnyRecord } from '../types.js';
export declare function renderChartShell(target: Element, spec: AnyRecord, viewId?: string): {
    root: Element;
    story: null;
    figure: HTMLElement;
    figureTitle: Element | null;
    markName: Element | null;
    steps: never[];
    navButtons: never[];
    progressFill: null;
    views: {
        [viewId]: HTMLDivElement;
    };
    tooltip: HTMLDivElement;
};
