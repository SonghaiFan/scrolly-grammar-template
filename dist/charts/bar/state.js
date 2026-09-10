import { specTransition } from '../../spec-meta.js';
import { diffViewStates } from '../../grammar/diff.js';
import { defaultTransition, stepDuration } from '../../timing.js';
import { normalizeMarkRendererKey } from '../index.js';
import { barCategoryChannel, barLayoutTransitionRoute, barMeasureChannel, barOffsetChannelName, barRendererKey, isSegmentLayout } from './layout/index.js';
import { semanticBarState } from './semantic.js';
export function resolveBarTransitionPlan(previousSpec, nextSpec) {
    const previous = barState(previousSpec);
    const next = barState(nextSpec);
    if (!previous || !next)
        return {};
    const diff = diffViewStates(previousSpec, nextSpec);
    const plan = {
        diff: diff.deltas.map(({ type, action, previous: p, next: n }) => ({
            type, action, previous: p, next: n
        }))
    };
    const crossesDetail = diff.hasDelta('bar.detail') || previous.hasDetail || next.hasDetail;
    if (crossesDetail) {
        plan.match = { mode: 'semantic', reason: 'detail-item-consistency' };
    }
    // Collapse: child → parent
    if (diff.hasDelta('bar.detail', 'remove') &&
        previous.hasDetail && next.hasAggregate && !next.hasDetail) {
        plan.enter = {
            mode: 'parent-child-lineage',
            from: 'child-bounds',
            target: 'parent',
            reason: 'detail-parent-child-lineage',
            parentKey: next.categoryField,
            childKey: [previous.categoryField, previous.segmentField].filter(Boolean),
            sourceLayout: previous.barLayout
        };
    }
    if (diff.hasDelta('bar.detail', 'remove') && previous.hasDetail) {
        const baseline = barBaselinePlan(previous.barLayout);
        plan.exit = {
            mode: 'baseline',
            to: baseline.name,
            baseline,
            source: 'child',
            reason: 'detail-exit-baseline',
            sourceOrientation: previous.orientation,
            sourceLayout: previous.barLayout,
            categoryKey: previous.categoryField,
            segmentKey: previous.segmentField,
            valueKey: previous.measureField
        };
    }
    // Split: parent → child
    if (diff.hasDelta('bar.detail', 'add') &&
        previous.hasAggregate && next.hasDetail && !previous.hasDetail) {
        plan.enter = {
            mode: 'parent-child-lineage',
            from: 'parent-bounds',
            target: 'child',
            reason: 'detail-parent-child-lineage',
            parentKey: previous.categoryField,
            childKey: [next.categoryField, next.segmentField].filter(Boolean),
            targetLayout: next.barLayout
        };
    }
    if (diff.hasDelta('bar.detail', 'add') && next.hasDetail && !plan.enter) {
        const baseline = barBaselinePlan(next.barLayout);
        plan.enter = {
            mode: 'baseline',
            from: baseline.name,
            baseline,
            target: 'child',
            reason: 'detail-enter-baseline',
            targetLayout: next.barLayout,
            categoryKey: next.categoryField,
            segmentKey: next.segmentField,
            valueKey: next.measureField
        };
    }
    const layoutChanged = diff.hasDelta('bar.layout');
    const changesSegmentLayout = layoutChanged &&
        isSegmentLayout(previous.barLayout) &&
        isSegmentLayout(next.barLayout);
    const crossesAxis = diff.hasDelta('bar.axis') || previous.hasAxis || next.hasAxis;
    const orientationChanged = diff.hasDelta('bar.orientation');
    const changedDimensions = changedBarDimensions(diff);
    if (!changedDimensions.length)
        return plan;
    const orderOptions = (next.axisOrder ?? previous.axisOrder ?? {});
    const reason = stepReason({ changesSegmentLayout, crossesAxis, orientationChanged });
    const timing = defaultTransition({
        ...specTransition(previousSpec ?? {}),
        ...specTransition(nextSpec ?? {}),
        ...orderOptions
    });
    const orderedParts = coordinateStepOrder({
        orderOptions,
        target: next,
        changesSegmentLayout,
        reverse: crossesAxis && !next.hasAxis,
        dimensions: changedDimensions
    });
    if (!orderedParts.length)
        return plan;
    const stepTiming = {
        duration: orderOptions.duration ?? stepDuration(timing.duration, orderedParts.length),
        ease: timing.ease,
        stagger: timing.stagger
    };
    const staggerMaxVal = staggerMax(stepTiming.stagger);
    const totalDuration = stepTiming.duration * orderedParts.length + staggerMaxVal;
    plan.reason = reason;
    plan.target = {
        orientation: next.orientation,
        layout: next.barLayout,
        renderer: barRendererKey(next.barLayout, next.orientation)
    };
    plan.steps = orderedParts.map((part) => ({
        part,
        changes: ['scale', 'axis', 'marks']
    }));
    plan.timing = stepTiming;
    plan.totalDuration = totalDuration;
    return plan;
}
export function barState(spec) {
    if (!spec || normalizeMarkRendererKey(spec.mark) !== 'bar')
        return null;
    const semantic = semanticBarState(spec);
    return {
        orientation: semantic.orientation,
        barLayout: semantic.layout,
        categoryField: semantic.categoryField,
        measureField: semantic.measureField,
        hasAxis: Boolean(semantic.axis),
        hasDetail: Boolean(semantic.detail),
        hasAggregate: Boolean(semantic.aggregate),
        segmentField: semantic.segmentField,
        axisOrder: semantic.axis
    };
}
/**
 * Parent -> child is the canonical detail path. A child -> parent pair
 * reuses that exact path with inverted progress so split and merge cannot
 * acquire different seams, opacity changes, staggering, or step order.
 */
export function canonicalBarTransitionPair(previousSpec, nextSpec) {
    const previous = barState(previousSpec);
    const next = barState(nextSpec);
    const isCollapse = Boolean(previous?.hasDetail &&
        next?.hasAggregate &&
        !next.hasDetail);
    return isCollapse
        ? { from: nextSpec, to: previousSpec, reverse: true }
        : { from: previousSpec, to: nextSpec, reverse: false };
}
export function barCollapseIntermediateSpec(previousSpec, nextSpec) {
    const plan = resolveBarTransitionPlan(previousSpec, nextSpec);
    const enter = plan.enter;
    if (enter?.mode !== 'parent-child-lineage' || enter.from !== 'child-bounds')
        return null;
    const previous = barState(previousSpec);
    if (!previous?.hasDetail)
        return null;
    const route = barLayoutTransitionRoute({
        fromLayout: previous.barLayout,
        toLayout: barState(nextSpec)?.barLayout,
        change: 'collapse'
    });
    return route[0] ? segmentLayoutSpec(previousSpec, route[0], nextSpec) : null;
}
export function barSplitIntermediateSpec(previousSpec, nextSpec) {
    const plan = resolveBarTransitionPlan(previousSpec, nextSpec);
    const enter = plan.enter;
    if (enter?.mode !== 'parent-child-lineage' || enter.from !== 'parent-bounds')
        return null;
    const next = barState(nextSpec);
    if (!next?.hasDetail)
        return null;
    const route = barLayoutTransitionRoute({
        fromLayout: barState(previousSpec)?.barLayout,
        toLayout: next.barLayout,
        change: 'split'
    });
    return route[0] ? segmentLayoutSpec(nextSpec, route[0], previousSpec) : null;
}
export function barIntermediateSpecs(previousSpec, nextSpec) {
    const direct = directBarIntermediateSpecs(previousSpec, nextSpec);
    if (!direct.length)
        return [];
    const previous = barState(previousSpec);
    const next = barState(nextSpec);
    if (!previous || !next || previous.orientation === next.orientation)
        return direct;
    const orientedSource = orientBarSpec(previousSpec, next.orientation);
    if (!orientedSource)
        return direct;
    return [
        { spec: orientedSource, scene: 'axis' },
        ...directBarIntermediateSpecs(orientedSource, nextSpec)
    ];
}
// ─── Internal helpers ─────────────────────────────────────────────────────────
function barBaselinePlan(layout) {
    if (layout === 'stacked') {
        return { name: 'stack-base', anchor: '__stack0', meaning: 'segment-stack-base' };
    }
    return { name: 'zero-baseline', value: 0, meaning: 'measure-zero' };
}
function staggerMax(stagger) {
    if (stagger == null || typeof stagger !== 'object')
        return 0;
    const max = Number(stagger.max);
    return Number.isFinite(max) ? max : 0;
}
function directBarIntermediateSpecs(previousSpec, nextSpec) {
    const collapseSpec = barCollapseIntermediateSpec(previousSpec, nextSpec);
    if (collapseSpec)
        return [{ spec: collapseSpec, scene: 'axis' }];
    const splitSpec = barSplitIntermediateSpec(previousSpec, nextSpec);
    if (splitSpec)
        return [{ spec: splitSpec, scene: 'detail' }];
    return [];
}
function stepOrder(options, orientation) {
    const order = options.order;
    if (Array.isArray(order) && order.length)
        return order.filter((a) => a === 'x' || a === 'y');
    return orientation === 'horizontal' ? ['y', 'x'] : ['x', 'y'];
}
function segmentLayoutStepOrder(options, layout) {
    const order = options.order;
    if (Array.isArray(order) && order.length)
        return order.filter((a) => a === 'x' || a === 'y');
    return layout === 'stacked' ? ['y', 'x'] : ['x', 'y'];
}
function changedBarDimensions(diff) {
    return [
        diff.hasDelta('bar.x-geometry') ? 'x' : null,
        diff.hasDelta('bar.y-geometry') ? 'y' : null
    ].filter((v) => v !== null);
}
function coordinateStepOrder({ orderOptions, target, changesSegmentLayout, reverse, dimensions }) {
    const baseOrder = changesSegmentLayout
        ? segmentLayoutStepOrder(orderOptions, target.barLayout)
        : stepOrder(orderOptions, target.orientation);
    const ordered = reverse ? [...baseOrder].reverse() : [...baseOrder];
    const dimensionSet = new Set(dimensions);
    const steps = ordered.filter((dimension) => dimensionSet.has(dimension));
    for (const dimension of dimensions) {
        if (!steps.includes(dimension))
            steps.push(dimension);
    }
    return steps;
}
function stepReason({ changesSegmentLayout, crossesAxis, orientationChanged }) {
    if (changesSegmentLayout && crossesAxis)
        return 'axis-segment-layout';
    if (orientationChanged && crossesAxis)
        return 'axis-orientation';
    return 'bar-geometry';
}
function orientBarSpec(spec, orientation) {
    const state = barState(spec);
    if (!state || state.orientation === orientation)
        return null;
    const next = cloneSpec(spec);
    const encoding = { ...(next.encoding ?? {}) };
    const categoryEnc = barCategoryChannel(encoding);
    const measureEnc = barMeasureChannel(encoding);
    const category = cloneSpec(categoryEnc);
    const measure = cloneSpec(measureEnc);
    if (!category?.field || !measure?.field)
        return null;
    if (orientation === 'horizontal') {
        encoding.x = measure;
        encoding.y = category;
    }
    else {
        encoding.x = category;
        encoding.y = measure;
    }
    delete encoding.xOffset;
    delete encoding.yOffset;
    if (state.barLayout === 'grouped' && state.segmentField) {
        encoding[barOffsetChannelName(orientation)] = { field: state.segmentField, type: 'nominal' };
    }
    const meta = { ...(next.meta ?? {}) };
    const specState = { ...(meta.state ?? {}) };
    const sceneState = { ...(specState.sceneState ?? {}) };
    sceneState.axis = {
        ...(sceneState.axis ?? {}),
        ...(state.barLayout !== 'simple' ? { layout: state.barLayout } : {}),
        orientation,
        order: orientation === 'horizontal' ? ['y', 'x'] : ['x', 'y']
    };
    if (state.hasDetail || sceneState.detail) {
        sceneState.detail = {
            ...(sceneState.detail ?? {}),
            ...(state.barLayout !== 'simple' ? { layout: state.barLayout } : {})
        };
    }
    specState.sceneState = sceneState;
    meta.state = specState;
    return {
        ...next,
        encoding: encoding,
        margin: {
            ...(orientation === 'horizontal' ? { left: 86, right: 42 } : {}),
            ...(next.margin ?? {})
        },
        meta: meta,
        transition: { ...specTransition(spec) }
    };
}
function segmentLayoutSpec(spec, layout, transitionPeerSpec) {
    const state = barState(spec);
    const next = cloneSpec(spec);
    const encoding = { ...(next.encoding ?? {}) };
    delete encoding.xOffset;
    delete encoding.yOffset;
    if (layout === 'grouped' && state?.segmentField) {
        encoding[barOffsetChannelName(state.orientation)] = {
            field: state.segmentField,
            type: 'nominal'
        };
    }
    const meta = { ...(next.meta ?? {}) };
    const specStateBlock = { ...(meta.state ?? {}) };
    const sceneState = { ...(specStateBlock.sceneState ?? {}) };
    sceneState.detail = { ...(sceneState.detail ?? {}), layout };
    sceneState.axis = { ...(sceneState.axis ?? {}), layout };
    specStateBlock.sceneState = sceneState;
    meta.state = specStateBlock;
    return {
        ...next,
        encoding: encoding,
        meta: {
            ...meta,
            transition: {
                ...specTransition(transitionPeerSpec ?? {}),
                ...specTransition(spec)
            }
        }
    };
}
function cloneSpec(spec) {
    if (spec == null)
        return spec;
    return JSON.parse(JSON.stringify(spec));
}
