import { cloneState } from './grammar/view-state.js';
import { delta, visualizationChartModule, visualizationSpec } from './core.js';
import { normalizeDataSource } from './charts/authoring.js';
import { loadData } from './runtime/data.js';
import { createTransitionSurface } from './runtime/transition-surface.js';
import { transitionRegistry } from './runtime/chart-registry.js';
import { validateTransforms } from './data/validate.js';
import { createChartRuntimeDeps } from './runtime/chart-deps.js';
import { resolveTarget } from './runtime/target.js';
/** Compile two states of the same chart type into a standalone, seekable transition. */
export async function transition(from, to, options) {
    const localModules = [visualizationChartModule(from), visualizationChartModule(to)]
        .filter((module) => module !== null);
    const source = visualizationSpec(from);
    const target = visualizationSpec(to);
    if (!source.mark || source.mark !== target.mark) {
        throw new Error('transition() requires two states of the same chart type.');
    }
    for (const module of localModules) {
        if (normalizeChartKey(module.key) !== normalizeChartKey(source.mark)) {
            throw new Error(`Visualization uses chart module "${module.key}" but declares mark "${source.mark}".`);
        }
    }
    if (!options?.d3) {
        throw new Error('Pass { target, d3 } to transition().');
    }
    validateTransforms(source.transform ?? []);
    validateTransforms(target.transform ?? []);
    const declared = cloneState(options.data ?? {});
    const sourceCache = new Map();
    const resolveData = async (spec) => {
        let data = normalizeDataSource(spec.data);
        if (typeof data === 'string' || (data && typeof data === 'object' && 'name' in data && !('url' in data))) {
            const name = typeof data === 'string' ? data : String(data.name);
            if (!(name in declared))
                throw new Error(`transition(): missing dataset "${name}". Pass options.data or bind inline data.`);
            data = normalizeDataSource(declared[name]);
        }
        if (!data || typeof data !== 'object')
            throw new Error('transition(): each visualization needs a data source.');
        if (!Array.isArray(data) && !Array.isArray(data.values) && !('url' in data)) {
            throw new Error('transition(): expected rows, { values }, or { url }.');
        }
        if (!Array.isArray(data) && 'url' in data) {
            const urlSource = data;
            data = { ...urlSource, type: urlSource.type ?? urlSource.format?.type ?? (/\.json(?:[?#]|$)/i.test(urlSource.url) ? 'json' : 'csv') };
        }
        const cacheKey = JSON.stringify(data);
        let pending = sourceCache.get(cacheKey);
        if (!pending) {
            pending = loadData({ rows: data }, options.d3).then(result => cloneState(result.rows));
            sourceCache.set(cacheKey, pending);
        }
        return { ...spec, data: { values: await pending } };
    };
    const [resolvedFrom, resolvedTo] = await Promise.all([resolveData(source), resolveData(target)]);
    const host = resolveTarget(options.target ?? '#app');
    const chartTypes = await transitionRegistry(resolvedFrom, createChartRuntimeDeps({ root: host }), localModules);
    const surface = createTransitionSurface(resolvedFrom, resolvedTo, options, chartTypes);
    let value = 0;
    let animation = null;
    let destroyed = false;
    function assertAlive() {
        if (destroyed)
            throw new Error('This transition has been destroyed.');
    }
    function stop() {
        if (animation !== null)
            cancelAnimationFrame(animation);
        animation = null;
    }
    function show(next) {
        surface.progress(next);
        value = next;
    }
    const controller = {
        // Expose copies: caller inspection cannot change the rendered endpoints.
        from: cloneState(source),
        to: cloneState(target),
        delta: delta(resolvedFrom, resolvedTo),
        view: surface.view,
        get value() { return value; },
        progress(next) {
            assertAlive();
            next = finiteProgress(next);
            stop();
            show(next);
            return controller;
        },
        play({ duration = 800, from = 0, to = 1 } = {}) {
            assertAlive();
            if (!Number.isFinite(duration) || duration < 0)
                throw new Error('duration must be a finite non-negative number.');
            const start = finiteProgress(from);
            const end = finiteProgress(to);
            stop();
            show(start);
            const span = duration * Math.abs(end - start);
            if (!span) {
                show(end);
                return controller;
            }
            let started = null;
            const tick = (now) => {
                started ?? (started = now);
                const fraction = Math.min(1, (now - started) / span);
                show(start + (end - start) * fraction);
                animation = fraction < 1 ? requestAnimationFrame(tick) : null;
            };
            animation = requestAnimationFrame(tick);
            return controller;
        },
        pause() { assertAlive(); stop(); return controller; },
        resize() { assertAlive(); surface.resize(); show(value); return controller; },
        destroy() {
            if (destroyed)
                return;
            stop();
            surface.destroy();
            destroyed = true;
        }
    };
    try {
        show(0);
        surface.commitMount();
    }
    catch (error) {
        surface.rollbackMount();
        controller.destroy();
        throw error;
    }
    return controller;
}
function finiteProgress(value) {
    if (!Number.isFinite(value))
        throw new Error('progress must be a finite number.');
    return Math.max(0, Math.min(1, value));
}
function normalizeChartKey(value) {
    return String(value ?? '').replace(/\s+/g, '').toLowerCase();
}
