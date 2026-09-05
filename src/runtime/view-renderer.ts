// @ts-nocheck — extracted rendering pipeline; D3 scene internals remain dynamic.
import { applyTransforms } from '../data/transforms.js';
import { resolveMarkRendererKey } from '../charts/index.js';
import { externalizeScrollyViewSpec, narrativeScroll, narrativeState } from '../scrolly-meta.js';
import { easeProgress, hasScrollAction, normalizeScrollAction } from './actions.js';
import { activeMarkLayer, applyPlotClip, drawTextBoard, drawUnsupported, effectiveTransitionSpec, fadeLayers, transitionSpec } from './marks.js';

import { domainTransforms, viewRows } from './data.js';
import { applySceneTransitions, getScene, resetSceneToEmptySource, resizeScene } from './scene.js';
import { clamp } from './utils.js';
import { SCROLL_TRANSITION_NAME, clearSceneTransitionProgress, createSceneTransitionProgress } from '../transition-progress.js';
import { createViewCompiler } from './view-compile.js';
import type { AnyRecord } from '../types.js';
import type { ChartIdiomRegistry } from '../charts/index.js';

/** Per-instance rendering pipeline, shared by standalone transitions and stories. */
export function createViewRenderer(idioms: ChartIdiomRegistry) {
const { compileEffectiveView, compileTransitionSource } = createViewCompiler(idioms);
return { drawView, applyScrollAction, prepareScrollSourceState, compileTransitionSource,
  renderVirtualScrollPhase, applyVirtualScrollSequence };
function drawView(node: any, viewSpec: AnyRecord, viewConfig: AnyRecord, datasets: AnyRecord, tooltip: Element, d3: AnyRecord, aq: AnyRecord, stepTransition: AnyRecord = {}, stepAction: string[] = [], options: AnyRecord = {}) {
  const scene = getScene(node, viewConfig, d3);
  scene.progressRoots = [
    node,
    node.__scrollyLiteMarkName
  ].filter(Boolean);

  if (!viewSpec || !viewSpec.mark) {
    clearVirtualScrollSequence(scene);
    scene.empty.style("display", "grid").text("No view for this step.");
    fadeLayers(scene, null, null, d3);
    return;
  }

  scene.empty.style("display", "none");

  if (viewSpec.mark === "text") {
    clearVirtualScrollSequence(scene);
    fadeLayers(scene, "text", null, d3);
    drawTextBoard(scene, viewSpec);
    return;
  }

  const { sceneTransition, effectiveViewSpec } = compileEffectiveView(viewSpec, stepTransition);
  const transitionSource = compileTransitionSource(
    options.previousViewSpec,
    options.previousTransition
  );

  if (scene.virtualRenderTimer) {
    window.clearTimeout(scene.virtualRenderTimer);
    scene.virtualRenderTimer = null;
  }

  // Scroll is continuous, so each scroll step scrubs from its authored adjacent
  // source. Stepped rendering is discrete and diffs from the currently rendered
  // state held in scene.previousSpec.
  const scrollDrivenStep = hasScrollAction(stepAction);
  const rawSourceSpec = scrollDrivenStep
    ? transitionSource.effectiveViewSpec
    : scene.previousSpec;
  const idiom = idioms.get(effectiveViewSpec);
  const targetForPlan = prepareIdiomSpec(idiom, effectiveViewSpec);
  const sourceForPlan = prepareIdiomSpec(idiom, rawSourceSpec);
  const intermediatePhases = intermediateRenderPhases(idiom, sourceForPlan, targetForPlan);
  if (intermediatePhases.length) {
    const renderPhases = renderPhaseConfigs(intermediatePhases, {
      idiom,
      node,
      finalSpec: effectiveViewSpec,
      viewConfig,
      datasets,
      tooltip,
      d3,
      aq,
      stepAction,
      finalSceneTransition: sceneTransition,
      transitionSource
    });

    if (scrollDrivenStep) {
      scene.virtualScrollSequence = createVirtualScrollSequence(renderPhases);
      renderVirtualScrollPhase(scene, 0);
      return;
    }

    clearVirtualScrollSequence(scene);
    renderPhaseSequence(scene, renderPhases, 0);
    return;
  }

  clearVirtualScrollSequence(scene);
  renderCompiledView(node, effectiveViewSpec, viewConfig, datasets, tooltip, d3, aq, stepAction, sceneTransition, {
    transitionSource
  });
}

function renderCompiledView(node: any, effectiveViewSpec: AnyRecord, viewConfig: AnyRecord, datasets: AnyRecord, tooltip: Element, d3: AnyRecord, aq: AnyRecord, stepAction: string[] = [], sceneTransition: AnyRecord = {}, renderOptions: AnyRecord = {}) {
  const scene = getScene(node, viewConfig, d3);
  const scrollDriven = renderOptions.scrollDriven ?? hasScrollAction(stepAction);
  if (scrollDriven && !renderOptions.skipScrollSourcePrep) {
    prepareScrollSourceState(
      node,
      viewConfig,
      datasets,
      tooltip,
      d3,
      aq,
      renderOptions.transitionSource
    );
  }
  clearSceneTransitionProgress(scene, { finish: !scrollDriven });
  const idiom = idioms.get(effectiveViewSpec);
  const renderSpec = idiom?.prepareSpec?.(effectiveViewSpec) || effectiveViewSpec;
  const previousRawSpec = scrollDriven
    ? renderOptions.transitionSource?.effectiveViewSpec || null
    : scene.previousSpec;
  const previousSpec = prepareIdiomSpec(idiom, previousRawSpec);
  const source = viewRows(renderSpec.data, datasets);
  const rows = applyTransforms(source, renderSpec.transform || [], aq);
  const domainRows = applyTransforms(source, domainTransforms(renderSpec.transform || []), aq);
  if (!rows.length) {
    const emptyTransition = transitionSpec(renderSpec, previousSpec, { scrollDriven, d3 });
    scene.empty.style("display", "grid").style('opacity', 0).text("No rows after transforms.")
      .transition(emptyTransition.base).style('opacity', 1);
    fadeLayers(scene, null, emptyTransition, d3);
    for (const layer of [scene.grid, scene.xAxis, scene.yAxis, scene.xLabel, scene.yLabel, scene.legend, scene.unitLabel]) {
      layer.transition(emptyTransition.base).style('opacity', 0);
    }
    if (scrollDriven) {
      scene.transitionProgress = createSceneTransitionProgress(scene, { transitionName: SCROLL_TRANSITION_NAME });
    }
    scene.previousSpec = renderSpec;
    return;
  }

  const width = Math.max(60, node.clientWidth || 720);
  const height = viewConfig.height || effectiveViewSpec.height || 500;
  resizeScene(scene, width, height);

  const rendererKey = resolveMarkRendererKey(renderSpec);
  const chart: AnyRecord = {
    scene,
    type: rendererKey,
    width,
    height,
    margin: {
      top: 58,
      right: 44,   // extra breathing room prevents last-bar clipping at narrow widths
      bottom: 64,
      left: 68,
      ...(idiom?.defaultMargin?.(renderSpec) || {}),
      ...(effectiveViewSpec.margin || {})
    },
    transition: transitionSpec(renderSpec, previousSpec, { scrollDriven, d3 } as AnyRecord),
    transitionPlan: idiom?.resolveTransitionPlan?.(previousSpec, renderSpec) || {},
    sceneTransition,
    scrollDriven,
    scrollTransitionName: SCROLL_TRANSITION_NAME,
    sourceRows: source,
    domainRows
  };
  chart.innerWidth = chart.width - chart.margin.left - chart.margin.right;
  chart.innerHeight = chart.height - chart.margin.top - chart.margin.bottom;
  chart.frame = scene.frame.transition(chart.transition.base).attr(
    "transform",
    `translate(${chart.margin.left},${chart.margin.top})`
  );
  chart.g = activeMarkLayer(scene, rendererKey, chart.transition);
  applyPlotClip(chart, true);

  if (rendererKey !== "unit") {
    scene.unitLabel.transition(chart.transition.base).style("opacity", 0);
  }

  const renderer = idiom?.renderer;
  if (renderer) renderer(chart, rows, renderSpec, tooltip, d3);
  else drawUnsupported(chart, renderSpec, idioms.types());

  if (rendererKey === "unit") hideUnitMetaLabel(scene);

  applySceneTransitions(chart, rows, renderSpec);
  if (scrollDriven) {
    scene.transitionProgress = createSceneTransitionProgress(scene, {
      transitionName: SCROLL_TRANSITION_NAME
    });
  }
  scene.previousSpec = renderSpec;
}

function prepareIdiomSpec(idiom, spec) {
  if (!spec) return null;
  return idiom?.prepareSpec?.(spec) || spec;
}

function intermediateRenderPhases(idiom, sourceSpec, targetSpec) {
  const raw = idiom?.intermediateSpecs?.(sourceSpec, targetSpec) ??
    idiom?.intermediateSpec?.(sourceSpec, targetSpec) ??
    [];
  const phases = Array.isArray(raw) ? raw : raw?.sequence || [raw];
  return phases
    .map((phase) => ({
      ...phase,
      spec: externalizeScrollyViewSpec(phase?.spec || null)
    }))
    .filter((phase) => phase.spec);
}

function renderPhaseConfigs(intermediatePhases, context) {
  let source = context.transitionSource;
  const phases = intermediatePhases.map((phase) => {
    const sceneTransition = sceneTransitionForPhase(phase);
    const transitionPlanDuration = transitionPlanDurationForPhase(context.idiom, source?.effectiveViewSpec, phase.spec);
    const config = {
      node: context.node,
      spec: phase.spec,
      viewConfig: context.viewConfig,
      datasets: context.datasets,
      tooltip: context.tooltip,
      d3: context.d3,
      aq: context.aq,
      stepAction: context.stepAction,
      sceneTransition,
      transitionSource: source,
      transitionPlanDuration
    };
    source = {
      effectiveViewSpec: phase.spec,
      sceneTransition
    };
    return config;
  });

  phases.push({
    node: context.node,
    spec: context.finalSpec,
    viewConfig: context.viewConfig,
    datasets: context.datasets,
    tooltip: context.tooltip,
    d3: context.d3,
    aq: context.aq,
    stepAction: context.stepAction,
    sceneTransition: context.finalSceneTransition,
    transitionSource: source,
    transitionPlanDuration: transitionPlanDurationForPhase(context.idiom, source?.effectiveViewSpec, context.finalSpec)
  });

  return phases;
}

function transitionPlanDurationForPhase(idiom, previousSpec, nextSpec) {
  const plan = idiom?.resolveTransitionPlan?.(
    prepareIdiomSpec(idiom, previousSpec),
    prepareIdiomSpec(idiom, nextSpec)
  );
  const duration = Number(plan?.update?.totalDuration);
  return Number.isFinite(duration) ? duration : null;
}

function sceneTransitionForPhase(phase) {
  const sceneType = phase.scene || "guide";
  const state = narrativeState(phase.spec);
  return {
    scene: [sceneType],
    [sceneType]:
      state[sceneType] ||
      state.sceneState?.[sceneType] ||
      null
  };
}

function prepareScrollSourceState(node: any, viewConfig: AnyRecord, datasets: AnyRecord, tooltip: Element, d3: AnyRecord, aq: AnyRecord, transitionSource: AnyRecord = {}) {
  const scene = getScene(node, viewConfig, d3);
  const sourceSpec = transitionSource?.effectiveViewSpec || null;
  if (!sourceSpec) {
    resetSceneToEmptySource(scene);
    return;
  }

  renderCompiledView(
    node,
    sourceSpec,
    viewConfig,
    datasets,
    tooltip,
    d3,
    aq,
    ["scroll"],
    transitionSource.sceneTransition || {},
    {
      scrollDriven: true,
      skipScrollSourcePrep: true,
      transitionSource: null
    }
  );
  scene.transitionProgress?.progress(1);
  clearSceneTransitionProgress(scene, { finish: true });
}


function virtualRenderDelay(phaseOrSpec: AnyRecord = {}) {
  const spec = phaseOrSpec.spec || phaseOrSpec;
  const plannedDuration = Number(phaseOrSpec.transitionPlanDuration);
  if (Number.isFinite(plannedDuration)) return Math.max(1, plannedDuration);
  const transition = effectiveTransitionSpec(spec);
  const duration = Number(transition.duration);
  const fallbackDuration = Number(effectiveTransitionSpec({}).duration) || 900;
  const guideStaging = narrativeState(spec).sceneState?.guide?.staging || narrativeState(spec).guide?.staging || {};
  const stageOrder = Array.isArray(guideStaging.order)
    ? guideStaging.order.filter((axis) => axis === "x" || axis === "y")
    : [];
  const stagedDuration = Number(guideStaging.duration);
  const effectiveDuration =
    stageOrder.length > 1 && Number.isFinite(stagedDuration)
      ? stagedDuration * stageOrder.length
      : duration;
  const stagger = transition.stagger;
  const staggerMax =
    typeof stagger === "object"
      ? Number(stagger.max ?? 0)
      : 0;
  return Math.max(1, Number.isFinite(effectiveDuration) ? effectiveDuration : fallbackDuration) + (Number.isFinite(staggerMax) ? staggerMax : 0);
}

function clearVirtualScrollSequence(scene) {
  scene.virtualScrollSequence = null;
}

function createVirtualScrollSequence(phases = []) {
  const durations = phases.map((phase) => virtualRenderDelay(phase));
  const total = Math.max(1, durations.reduce((sum, duration) => sum + duration, 0));
  let cursor = 0;
  return {
    phase: null,
    phases: phases.map((phase, index) => {
      const start = cursor / total;
      cursor += durations[index];
      const end = index === phases.length - 1 ? 1 : cursor / total;
      return { ...phase, start, end };
    })
  };
}

function renderPhaseSequence(scene, phases = [], index = 0) {
  const config = phases[index];
  if (!config) return;

  renderCompiledView(
    config.node,
    config.spec,
    config.viewConfig,
    config.datasets,
    config.tooltip,
    config.d3,
    config.aq,
    config.stepAction,
    config.sceneTransition,
    {
      transitionSource: config.transitionSource
    }
  );

  if (index >= phases.length - 1) return;
  scene.virtualRenderTimer = window.setTimeout(() => {
    scene.virtualRenderTimer = null;
    renderPhaseSequence(scene, phases, index + 1);
  }, virtualRenderDelay(config));
}

function renderVirtualScrollPhase(scene, phaseIndex) {
  const sequence = scene.virtualScrollSequence;
  const config = sequence?.phases?.[phaseIndex];
  if (!sequence || !config || sequence.phase === phaseIndex) return;

  sequence.phase = phaseIndex;
  renderCompiledView(
    config.node,
    config.spec,
    config.viewConfig,
    config.datasets,
    config.tooltip,
    config.d3,
    config.aq,
    config.stepAction,
    config.sceneTransition,
    {
      transitionSource: config.transitionSource
    }
  );
}

function applyVirtualScrollSequence(scene, progress) {
  const sequence = scene.virtualScrollSequence;
  if (!sequence?.phases?.length) return false;

  const bounded = clamp(progress, 0, 1);
  const phases = sequence.phases;
  const phaseIndex = phases.findIndex((phase, index) =>
    bounded <= phase.end || index === phases.length - 1
  );
  const phase = phases[Math.max(0, phaseIndex)];
  const span = Math.max(0.001, phase.end - phase.start);

  renderVirtualScrollPhase(scene, Math.max(0, phaseIndex));
  scene.transitionProgress?.progress(clamp((bounded - phase.start) / span, 0, 1));
  return true;
}

function hideUnitMetaLabel(scene) {
  scene.unitLabel.interrupt().text("").style("opacity", 0);
}

function applyScrollAction(node, viewSpec, progress, d3) {
  const scene = node.__scrollyLiteScene;
  if (!scene || !viewSpec?.mark) return;

  const action = normalizeScrollAction(narrativeScroll(viewSpec)) as AnyRecord;
  const eased = easeProgress(progress, action.ease, d3);
  if (applyVirtualScrollSequence(scene, eased)) return;
  scene.transitionProgress?.progress(eased);
}
}
