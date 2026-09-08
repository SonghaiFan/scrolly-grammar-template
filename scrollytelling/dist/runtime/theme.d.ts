import type { AnyRecord } from 'scrollylite/composition';
/** Inline variables belong to a target; external stylesheets remain document-wide. */
export declare function applyTheme(theme: AnyRecord | undefined, target: Element): Promise<() => void>;
