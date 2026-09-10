// @ts-nocheck — D3 frame snapshots are private to this surface.
import { renderChartShell } from './chart-shell.js';
import { createViewRenderer } from './view-renderer.js';
import { resolveTarget } from './target.js';
import { inferTransition } from '../grammar/infer-transition.js';
import { captureDomFrame } from './dom-frame.js';
import { hideTooltip } from './marks.js';
import { VISDELTA_TRANSITION_NAME, clearSceneTransitionProgress } from '../transition-progress.js';
export function createTransitionSurface(from, to, options, chartTypes) {
    const { d3, aq } = options;
    const { drawView, prepareScrollSourceState, compileTransitionSource, renderVirtualScrollPhase, applyVirtualScrollSequence } = createViewRenderer(chartTypes);
    const chartType = chartTypes.get(from);
    if (!chartType)
        throw new Error(`Unsupported chart type: ${from.mark}`);
    const canonical = chartType.canonicalTransitionPair?.(from, to) ?? { from, to, reverse: false };
    const source = canonical.from;
    const target = canonical.to;
    const canonicalProgress = value => canonical.reverse ? 1 - value : value;
    const host = resolveTarget(options.target || '#app');
    const root = document.createElement('div');
    root.className = 'sl-transition-root';
    const shell = renderChartShell(root, {}, 'main');
    const node = shell.views.main;
    const config = { height: options.height ?? from.height ?? to.height ?? 500 };
    const scenes = { scene: inferTransition(source, target) };
    // Cache only when the selected chart type explicitly opts into reusable-frame
    // contract. Unspecified/custom renderers use the reconstruction bridge.
    const cacheFrames = chartType.transitionEvaluation === 'cached' && options.reconstruct !== true;
    let cached = null;
    const disposeScene = () => {
        const scene = node.__visDeltaScene;
        if (scene) {
            clearSceneTransitionProgress(scene, { finish: false });
            if (scene.virtualRenderTimer)
                window.clearTimeout(scene.virtualRenderTimer);
        }
        d3.select(node).selectAll('*').interrupt().interrupt(VISDELTA_TRANSITION_NAME);
        node.replaceChildren();
        delete node.__visDeltaScene;
    };
    let previousChildren = [...host.childNodes];
    host.replaceChildren(root);
    function compileFrames() {
        disposeScene();
        prepareScrollSourceState(node, config, {}, shell.tooltip, d3, aq, compileTransitionSource(source));
        const startFrame = captureDomFrame(node);
        drawView(node, target, config, {}, shell.tooltip, d3, aq, scenes, ['scroll', 'tooltip'], { previousViewSpec: source });
        const scene = node.__visDeltaScene;
        const phases = scene.virtualScrollSequence?.phases ?? [{ start: 0, end: 1 }];
        const frames = phases.map((phase, index) => {
            if (index > 0)
                renderVirtualScrollPhase(scene, index);
            const evaluator = scene.transitionProgress.compile();
            return { start: phase.start, end: phase.end, evaluator, dom: captureDomFrame(node) };
        });
        // Save the clean endpoint (no zero-opacity exit marks/ticks), while keeping
        // detached nodes alive in the phase snapshots for later reverse seeks.
        clearSceneTransitionProgress(scene, { finish: true });
        prepareScrollSourceState(node, config, {}, shell.tooltip, d3, aq, compileTransitionSource(target));
        const endFrame = captureDomFrame(node);
        let activeFrame = endFrame;
        const activate = (frame) => {
            if (activeFrame !== frame) {
                frame.restore();
                activeFrame = frame;
            }
        };
        return {
            progress(value) {
                if (value === 0) {
                    startFrame.restore();
                    activeFrame = startFrame;
                    return;
                }
                if (value === 1) {
                    endFrame.restore();
                    activeFrame = endFrame;
                    return;
                }
                const frame = frames.find(frame => value <= frame.end) ?? frames[frames.length - 1];
                activate(frame.dom);
                frame.evaluator.progress((value - frame.start) / Math.max(Number.EPSILON, frame.end - frame.start));
            }
        };
    }
    return {
        view: node,
        commitMount() { previousChildren = []; },
        rollbackMount() {
            if (root.parentNode === host)
                host.replaceChildren(...previousChildren);
            previousChildren = [];
        },
        progress(value) {
            hideTooltip(shell.tooltip);
            value = canonicalProgress(value);
            if (cacheFrames) {
                cached ?? (cached = compileFrames());
                cached.progress(value);
                return;
            }
            disposeScene();
            if (value === 0 || value === 1) {
                const endpoint = compileTransitionSource(value === 0 ? source : target);
                prepareScrollSourceState(node, config, {}, shell.tooltip, d3, aq, endpoint);
            }
            else {
                drawView(node, target, config, {}, shell.tooltip, d3, aq, scenes, ['scroll', 'tooltip'], {
                    previousViewSpec: source
                });
                // The pair's progress is already normalized. Chart-local timing and
                // The step order applies inside the plan; scroll easing is not a control here.
                const scene = node.__visDeltaScene;
                if (!applyVirtualScrollSequence(scene, value))
                    scene.transitionProgress?.progress(value);
            }
        },
        resize() { cached = null; },
        destroy() { cached = null; disposeScene(); root.remove(); }
    };
}
