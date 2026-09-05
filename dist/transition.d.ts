import type { ViewSpec, DiffResult } from './types/index.js';
import type { RuntimeOptions } from './types.js';
import type { Visualization } from './core.js';
export type { Visualization } from './core.js';
export interface TransitionOptions extends RuntimeOptions {
    /** Named sources for visualizations that use .data("name"). */
    data?: Record<string, unknown>;
    height?: number;
}
export interface PlayOptions {
    /** Time for the complete 0–1 interval, in milliseconds. */
    duration?: number;
    from?: number;
    to?: number;
}
export interface VisualizationTransition {
    readonly from: ViewSpec;
    readonly to: ViewSpec;
    readonly delta: DiffResult;
    readonly view: Element;
    readonly value: number;
    /** Synchronously display a frame. Also pauses time-based playback. */
    progress(value: number): VisualizationTransition;
    /** Plays from 0 to 1 by default. Returns this controller for chaining. */
    play(options?: PlayOptions): VisualizationTransition;
    pause(): VisualizationTransition;
    /** Recompile at the container's current size/theme, retaining progress and data. */
    resize(): VisualizationTransition;
    destroy(): void;
}
/** Compile two same-idiom visualizations into a standalone, seekable transition. */
export declare function transition(from: Visualization, to: Visualization, options: TransitionOptions): Promise<VisualizationTransition>;
