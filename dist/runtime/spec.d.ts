import type { LayoutSpec, StepSpec, StorySpec } from '../types/index.js';
export { loadData, viewRows, domainTransforms } from './data.js';
type AnyRecord = Record<string, unknown>;
interface CompiledSpec extends StorySpec {
    data: Record<string, unknown>;
    views: Record<string, AnyRecord>;
    theme: AnyRecord;
    layout: LayoutSpec;
    steps: StepSpec[];
}
export declare function compileSpec(spec: Partial<StorySpec>): CompiledSpec;
export declare function storySignature(spec: StorySpec): Array<{
    index: number;
    id: string;
    title: string;
    transition: string[];
    action: string[];
}>;
