import { diffViewStates } from '../grammar/diff.js';
import { specTransition } from '../spec-meta.js';
import { defaultTransition } from '../timing.js';
export function createDefaultTransitionPlan(previousSpec, nextSpec, options = {}) {
    if (!previousSpec || !nextSpec)
        return {};
    const diff = diffViewStates(previousSpec, nextSpec);
    const timing = defaultTransition({
        ...specTransition(previousSpec),
        ...specTransition(nextSpec)
    });
    const reason = options.reason || 'default-chart-transition';
    return {
        diff: diff.deltas.map(({ type, action, previous, next }) => ({ type, action, previous, next })),
        reason,
        steps: [{ changes: ['scale', 'axis', 'marks', 'exit', 'enter'] }],
        timing,
        totalDuration: (timing.duration ?? 0) + staggerMax(timing.stagger),
        enter: {
            mode: 'ordinary',
            reason
        },
        exit: {
            mode: 'ordinary',
            reason
        }
    };
}
function staggerMax(stagger) {
    if (stagger == null || typeof stagger !== 'object')
        return 0;
    const max = Number(stagger['max']);
    return Number.isFinite(max) ? max : 0;
}
