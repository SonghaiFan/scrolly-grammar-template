export declare const VISDELTA_TRANSITION_NAME = "__visDeltaTransition";
export declare function installTransitionProgress(d3: any): void;
export declare function createSceneTransitionProgress(scene: any, options?: {}): {
    items: any[];
    compile(): {
        progress(value: any): void;
    };
    progress(value: any): void;
    destroy({ finish }?: {
        finish?: boolean | undefined;
    }): void;
};
export declare function clearSceneTransitionProgress(scene: any, { finish }?: {
    finish?: boolean | undefined;
}): void;
