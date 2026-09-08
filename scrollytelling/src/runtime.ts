// @ts-nocheck — Story composition runtime built on ScrollyLite's driver surface.
import {
  applyTransforms,
  availableChartIdioms,
  chartModules,
  chartRegistry as BUILT_IN_CHART_IDIOMS,
  clamp,
  clearSceneTransitionProgress,
  createChartRuntimeDeps,
  createViewRenderer,
  defaultScrollProgress,
  domainTransforms,
  hasScrollAction,
  installTransitionProgress,
  loadData,
  normalizeActionEvent,
  normalizeActionTokens,
  registerChartIdiom,
  registerChartModule,
  renderChartShell,
  SCROLL_TRANSITION_NAME,
  snapshotChartRegistry,
  viewRows
} from 'scrollylite/composition';
import type {
  AnyRecord,
  ChartOptions,
  ChartRuntime,
  PageOptions,
  PageRuntime,
  RuntimeOptions,
  StoryRuntime
} from 'scrollylite/composition';
import { applyTheme } from './runtime/theme.js';
import { restoreHashPosition, setupNav, setupResize, setupScroll } from './runtime/navigation.js';
import { compileSpec, storySignature } from './runtime/spec.js';
import { renderShell } from './runtime/shell.js';
export { registerChartIdiom, registerChartModule, availableChartIdioms };
export async function createStory(spec: AnyRecord, options: RuntimeOptions): Promise<StoryRuntime> {
  const runtime = resolveRuntimeDependencies(options);
  const compiled = compileSpec(spec);
  const target = resolveTarget(options.target ?? '#app');
  const data = await loadData(compiled.data, runtime.d3);
  const mount = await prepareMount(target, compiled, data, runtime);
  let renderer, disposeNav, disposeHash, disposeResize, scrollDriver;
  let destroyed = false;
  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    disposeHash?.(); disposeNav?.(); disposeResize?.();
    scrollDriver?.destroy?.(); renderer?.destroy();
    mount.disposeTheme();
  };
  try {
    const shell = renderShell(target, compiled, { debug: options.debug === true, idioms: runtime.idioms });
    renderer = createRenderer(shell, compiled, data, runtime);
    renderer.action({ type: 'enter', step: 0, force: true });
    scrollDriver = setupScroll(compiled, shell, renderer);
    disposeNav = setupNav(shell, renderer, scrollDriver);
    disposeResize = setupResize(renderer, scrollDriver);
    disposeHash = restoreHashPosition(shell, renderer, scrollDriver);
    mount.commit();
    return {
      spec: compiled, data, signature: storySignature(compiled), scrollDriver,
      to(index: number) { renderer.action({ type: 'click', step: index, action: ['step', 'tooltip'], force: true }); },
      destroy
    };
  } catch (error) {
    destroy(); mount.rollback(); throw error;
  }
}

/** Layout-only embedding; charts and navigation remain owned by the caller. */
export async function createPage(spec: AnyRecord, options: PageOptions = {}): Promise<PageRuntime> {
  const compiled = compileSpec(spec);
  const target = resolveTarget(options.target ?? '#app');
  const mount = await prepareMount(target, compiled);
  try {
    const shell = renderShell(target, compiled, { debug: options.debug === true, idioms: BUILT_IN_CHART_IDIOMS });
    mount.commit();
    return { spec: compiled, shell, root: shell.root, story: shell.story, steps: shell.steps,
      views: shell.views, tooltip: shell.tooltip, destroy: mount.disposeTheme };
  } catch (error) {
    mount.disposeTheme(); mount.rollback(); throw error;
  }
}

/** Chart-only embedding, with discrete or externally supplied progress input. */
export async function createChart(spec: AnyRecord, options: ChartOptions): Promise<ChartRuntime> {
  const runtime = resolveRuntimeDependencies(options);
  const compiled = compileSpec(spec);
  const target = resolveTarget(options.target ?? '#app');
  const viewId = options.view ?? options.viewId ?? 'main';
  const requestedStep = options.initialStep ?? 0;
  if (!Number.isSafeInteger(requestedStep)) throw new Error('initialStep must be a finite integer.');
  const data = await loadData(compiled.data, runtime.d3);
  const mount = await prepareMount(target, compiled, data, runtime);
  let renderer;
  let destroyed = false;
  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    renderer?.destroy(); mount.disposeTheme();
  };
  try {
    const shell = renderChartShell(target, compiled, viewId);
    renderer = createRenderer(shell, compiled, data, runtime);
    const initialStep = clamp(requestedStep, 0, compiled.steps.length - 1);
    renderer.action({ type: 'enter', step: initialStep, action: ['step', 'tooltip'], force: true });
    mount.commit();
    return {
      spec: compiled, data, view: shell.views[viewId], tooltip: shell.tooltip,
      to(target: number | { index: number }) {
        const step = typeof target === 'number' ? target : target.index;
        renderer.action({ type: 'click', step, action: ['step', 'tooltip'], force: true });
      },
      progress(index: number, value: number) {
        renderer.action({ type: 'progress', index, value, action: ['scroll', 'tooltip'] });
      },
      resize: renderer.resize, destroy
    };
  } catch (error) {
    destroy(); mount.rollback(); throw error;
  }
}

/** Commit only after the first render; failed mounts retain original node identity. */
async function prepareMount(target, compiled, data = null, runtime = null) {
  const disposeTheme = await applyTheme(compiled.theme, target);
  let children = Array.from(target.childNodes);
  const className = target.getAttribute('class');
  try {
    if (runtime) {
      const context = { root: target, colors: null };
      runtime.context = context;
      runtime.idioms = snapshotChartRegistry(createChartRuntimeDeps(context));
      context.colors = buildColorRegistry(compiled, data, runtime.aq, target, runtime.idioms);
      installTransitionProgress(runtime.d3);
    }
    target.replaceChildren();
  } catch (error) { disposeTheme(); throw error; }
  return {
    disposeTheme,
    commit() { children = []; },
    rollback() {
      target.replaceChildren(...children);
      if (className === null) target.removeAttribute('class');
      else target.setAttribute('class', className);
      children = [];
    }
  };
}

// Story/chart composition supplies discrete and scroll actions to the shared renderer.
function createRenderer(shell: AnyRecord, spec: AnyRecord, datasets: AnyRecord, runtime: AnyRecord) {
  const { d3, aq } = runtime;
  const { drawView, applyScrollAction } = createViewRenderer(runtime.idioms);
  const applyStepScrollProgress = (shell, spec, index, progress, d3, options) => {
    const step = spec.steps[index];
    if (!step || (!options.force && !hasScrollAction(step))) return;
    Object.entries(shell.views).forEach(([id, node]) => applyScrollAction(node, step.views[id] || step.views.main || {}, progress, d3));
  };
  let activeIndex = -1;
  let activeAction = null;
  let resizeFrame = null;
  let progressFrame = null;
  let pendingProgress = null;
  let destroyed = false;

  const action = (event, options = {}) => {
    if (destroyed) throw new Error('This chart runtime has been destroyed.');
    const command = normalizeActionEvent(event, options, {
      activeIndex,
      stepCount: spec.steps.length
    });

    if (command.progress) {
      applyDiscreteStep(command.index, {
        action: command.action,
        direction: command.direction,
        force: command.force === true,
        scrollProgress: command.value
      });
      applyProgressStep(command.index, command.value, command.direction, {
        force: true
      });
      return;
    }

    applyDiscreteStep(command.index, {
      action: command.action,
      direction: command.direction,
      force: command.force !== false
    });
  };

  const applyDiscreteStep = (index: number, options: AnyRecord = {}) => {
    const bounded = clamp(index, 0, spec.steps.length - 1);
    const step = spec.steps[bounded];
    const stepAction = normalizeActionTokens(options.action || step.action);
    const actionSignature = stepAction.join(" ");
    if (bounded === activeIndex && actionSignature === activeAction && !options.force) return;
    activeIndex = bounded;
    activeAction = actionSignature;

    shell.steps.forEach((node, nodeIndex) => {
      node.classList.toggle("is-active", nodeIndex === bounded);
    });
    shell.navButtons.forEach((node, nodeIndex) => {
      node.classList.toggle("is-active", nodeIndex === bounded);
    });
    if (shell.progressFill) {
      const pct = spec.steps.length === 1 ? 100 : (bounded / (spec.steps.length - 1)) * 100;
      shell.progressFill.style.width = `${pct}%`;
    }

    const firstViewSpec = (Object.values(step.views)[0] || {}) as AnyRecord;
    if (shell.figureTitle) {
      shell.figureTitle.textContent = spec.views.main?.title || step.title || "";
    }
    const markLabel = firstViewSpec.mark ? `mark: ${firstViewSpec.mark}` : "";
    if (shell.markName) {
      shell.markName.dataset.chartLabel = markLabel;
      shell.markName.textContent = markLabel;
    }

    Object.entries(shell.views).forEach(([viewId, node]: [string, any]) => {
      const viewConfig = spec.views[viewId] || {};
      const viewSpec = step.views[viewId] || step.views.main || {};
      node.__scrollyLiteMarkName = shell.markName;
      const previousStep = bounded > 0 ? spec.steps[bounded - 1] : null;
      const previousViewSpec = previousStep
        ? previousStep.views[viewId] || previousStep.views.main || null
        : null;
      drawView(node, viewSpec, viewConfig, datasets, shell.tooltip, d3, aq, step.transition, stepAction, {
        previousViewSpec,
        previousTransition: previousStep?.transition || {}
      });
    });

    if (hasScrollAction(stepAction)) {
      applyStepScrollProgress(shell, spec, bounded, options.scrollProgress ?? defaultScrollProgress(options.direction), d3, {
        force: true
      });
    }
  };

  const applyProgressStep = (index: number, progress: number, direction = "down", options: AnyRecord = {}) => {
    const bounded = clamp(index, 0, spec.steps.length - 1);
    const step = spec.steps[bounded];
    if (!options.force && !hasScrollAction(step)) return;

    pendingProgress = {
      index: bounded,
      progress: clamp(progress, 0, 1),
      direction
    };

    if (progressFrame) return;
    progressFrame = window.requestAnimationFrame(() => {
      progressFrame = null;
      if (!pendingProgress) return;
      const next = pendingProgress;
      pendingProgress = null;

      if (activeIndex !== next.index) return;

      updateStoryProgress(shell, spec, next.index, next.progress);
      applyStepScrollProgress(shell, spec, next.index, next.progress, d3, {
        force: options.force === true
      });
    });
  };

  const cancelScrollProgress = () => {
    pendingProgress = null;
    if (progressFrame) {
      window.cancelAnimationFrame(progressFrame);
      progressFrame = null;
    }
  };

  const resize = () => {
    if (destroyed) throw new Error('This chart runtime has been destroyed.');
    if (resizeFrame) window.cancelAnimationFrame(resizeFrame);
    resizeFrame = window.requestAnimationFrame(() => {
      resizeFrame = null;
      if (destroyed) return;
      runtime.context.colors = buildColorRegistry(spec, datasets, aq, runtime.context.root, runtime.idioms);
      if (activeIndex >= 0) applyDiscreteStep(activeIndex, { force: true });
    });
  };

  return {
    action,
    cancelScrollProgress,
    resize,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (resizeFrame) window.cancelAnimationFrame(resizeFrame);
      resizeFrame = null;
      cancelScrollProgress();
      for (const node of Object.values(shell.views)) {
        const scene = node.__scrollyLiteScene;
        if (scene) {
          if (scene.virtualRenderTimer) window.clearTimeout(scene.virtualRenderTimer);
          clearSceneTransitionProgress(scene, { finish: false });
        }
      d3.select(node).interrupt().interrupt(SCROLL_TRANSITION_NAME);
      d3.select(node).selectAll('*').interrupt().interrupt(SCROLL_TRANSITION_NAME);
        delete node.__scrollyLiteScene;
      }
      if (shell.tooltip) shell.tooltip.style.opacity = '0';
      if (runtime.context) runtime.context.colors = null;
    }
  };
}

function updateStoryProgress(shell, spec, index, progress = 0) {
  if (!shell.progressFill) return;
  const denominator = Math.max(1, spec.steps.length - 1);
  const pct = spec.steps.length === 1
    ? 100
    : ((index + clamp(progress, 0, 1)) / denominator) * 100;
  shell.progressFill.style.width = `${Math.min(100, pct)}%`;
}




// Resolve the CSS variable for a series slot (e.g. "var(--sl-series-1)" → actual hex/rgb).
function resolveSeriesVar(value: string, root: Element): string {
  if (!value?.startsWith('var(')) return value;
  if (typeof document === 'undefined') return value;
  const name = value.match(/^var\(\s*(--[^,\s)]+)/)?.[1];
  if (!name) return value;
  return getComputedStyle(root).getPropertyValue(name).trim() || value;
}

// Resolve the current theme palette as an ordered array of concrete color strings.
function resolveThemePalette(root: Element): string[] {
  if (typeof document === 'undefined') return [];
  const style = getComputedStyle(root);
  return [
    '--sl-series-1','--sl-series-2','--sl-series-3','--sl-series-4','--sl-series-5',
    '--sl-series-6','--sl-series-7','--sl-series-8','--sl-series-9','--sl-series-10'
  ].map(v => style.getPropertyValue(v).trim() || v);
}

// Build a story-level Map<field, Map<key, color>> so every categorical key gets
// the same color across all scenes, regardless of which subset appears in each.
//
// Strategy per scene (highest-priority first):
//   1. Idiom-compiled explicit domain + explicit range → use that ordering directly.
//   2. Explicit color.field with no range → collect union of values across scenes.
//   3. No color channel → no registry entry; undeclared color is black.
//
// Final assignment is always sequential (series-1, series-2, …) in the order
// keys are first encountered, so the Nth distinct key always maps to series-N —
// matching the stacked/grouped bar idiom's hardcoded 'var(--sl-series-N)' range.
function buildColorRegistry(
  compiled: AnyRecord,
  datasets: AnyRecord,
  aq: AnyRecord,
  root: Element,
  idioms: AnyRecord
): Map<string, Map<string, string>> {
  // fieldOrder tracks insertion order; fieldRanges tracks explicit var→color for a domain slot.
  const fieldOrder  = new Map<string, string[]>();   // field → ordered unique keys
  const fieldRanges = new Map<string, string[]>();   // field → parallel color array (when explicit)

  const addKey = (field: string, key: string, color?: string) => {
    if (!fieldOrder.has(field)) { fieldOrder.set(field, []); fieldRanges.set(field, []); }
    const keys   = fieldOrder.get(field)!;
    const colors = fieldRanges.get(field)!;
    const idx = keys.indexOf(key);
    if (idx === -1) {
      keys.push(key);
      colors.push(color ?? '');
    } else if (color && !colors[idx]) {
      colors[idx] = color;  // backfill explicit color if we only had inferred before
    }
  };

  for (const step of (compiled.steps || [])) {
    for (const rawViewSpec of Object.values(step.views || {})) {
      const rawSpec = rawViewSpec as AnyRecord;

      // Run the idiom's prepareSpec to get the same encoding that the renderer sees.
      const idiom = idioms.get(rawSpec);
      const spec  = (idiom?.prepareSpec?.(rawSpec) || rawSpec) as AnyRecord;

      const source = viewRows(spec.data ?? rawSpec.data, datasets);
      if (!source?.length) continue;
      const rows = applyTransforms(source, domainTransforms((spec.transform as AnyRecord[]) || []), aq);
      if (!rows.length) continue;

      const colorChannel = (spec.encoding as AnyRecord)?.color as AnyRecord | undefined;

      // Skip quantitative (sequential) and literal-value channels — no categorical keys.
      if (colorChannel?.type === 'quantitative' || colorChannel?.value) continue;
      if (colorChannel?.hue || colorChannel?.luminance) continue;

      const field: string | undefined = colorChannel?.field as string | undefined;
      if (!field) continue;

      // If the encoding has an explicit domain + parallel range, use that ordering.
      const explicitDomain = Array.isArray(colorChannel?.domain) ? colorChannel!.domain as string[] : null;
      const explicitRange  = Array.isArray(colorChannel?.range)  ? colorChannel!.range  as string[] : null;

      if (explicitDomain?.length) {
        explicitDomain.forEach((key, i) => {
          const color = explicitRange ? resolveSeriesVar(explicitRange[i] ?? '', root) : '';
          addKey(field, String(key), color);
        });
      } else {
        // Collect values from actual data rows.
        for (const row of rows) {
          const val = (row as AnyRecord)[field];
          if (val != null) addKey(field, String(val));
        }
      }
    }
  }

  // Assign final colors: any key with an explicit resolved color keeps it;
  // remaining slots get the next available palette entry in order.
  const palette = resolveThemePalette(root);
  const registry = new Map<string, Map<string, string>>();

  for (const [field, keys] of fieldOrder) {
    if (!keys.length) continue;
    const explicitColors = fieldRanges.get(field)!;
    // Determine which palette slots are already claimed by explicit assignments.
    const usedSlots = new Set(
      explicitColors.map(c => palette.indexOf(c)).filter(i => i >= 0)
    );
    let nextSlot = 0;

    const fieldMap = new Map<string, string>();
    keys.forEach((key, i) => {
      if (explicitColors[i]) {
        fieldMap.set(key, explicitColors[i]);
      } else {
        // Skip slots claimed by explicit assignments so sequential keys don't collide.
        while (usedSlots.has(nextSlot)) nextSlot++;
        fieldMap.set(key, palette[nextSlot % palette.length]);
        nextSlot++;
      }
    });
    registry.set(field, fieldMap);
  }
  return registry;
}

function resolveTarget(target) {
  if (typeof target !== "string") return target;
  const node = document.querySelector(target);
  if (!node) throw new Error(`ScrollyLite target not found: ${target}`);
  return node;
}

function resolveRuntimeDependencies(options: AnyRecord = {}) {
  if (!options.d3) {
    throw new Error("Scrollytelling requires D3. Pass { d3 } to createStory().");
  }
  return {
    d3: options.d3,
    aq: options.aq
  };
}




chartModules.forEach(module => {
  if (!BUILT_IN_CHART_IDIOMS.has(module.plugin.key)) registerChartModule(module);
});
