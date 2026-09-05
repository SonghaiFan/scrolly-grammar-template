export interface DomFrame {
    restore(): void;
}
export declare function captureDomFrame(root: Element): DomFrame;
