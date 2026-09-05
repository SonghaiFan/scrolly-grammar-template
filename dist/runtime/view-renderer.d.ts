import type { AnyRecord } from '../types.js';
import type { ChartIdiomRegistry } from '../charts/index.js';
/** Per-instance rendering pipeline, shared by standalone transitions and stories. */
export declare function createViewRenderer(idioms: ChartIdiomRegistry): {
    drawView: (node: any, viewSpec: AnyRecord, viewConfig: AnyRecord, datasets: AnyRecord, tooltip: Element, d3: AnyRecord, aq: AnyRecord, stepTransition?: AnyRecord, stepAction?: string[], options?: AnyRecord) => void;
    applyScrollAction: (node: any, viewSpec: any, progress: any, d3: any) => void;
    prepareScrollSourceState: (node: any, viewConfig: AnyRecord, datasets: AnyRecord, tooltip: Element, d3: AnyRecord, aq: AnyRecord, transitionSource?: AnyRecord) => void;
    compileTransitionSource: (viewSpec: import("../core.js").ViewSpec | null | undefined, stepTransition?: import("./view-compile.js").StepTransition) => import("./view-compile.js").CompileResult;
    renderVirtualScrollPhase: (scene: any, phaseIndex: any) => void;
    applyVirtualScrollSequence: (scene: any, progress: any) => boolean;
};
