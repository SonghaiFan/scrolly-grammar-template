import { DEFAULT_TIMING } from '../timing.js';
import { serializeViewSpec, specState, specTransition, withSpecMeta } from '../spec-meta.js';
import { compileViewWithCompiler } from '../charts/compile-view.js';
export const SCENE_TRANSITIONS = ['selection', 'axis', 'detail', 'mapping'];
export function resolveSceneTransition(viewSpec = {}, stepTransition = {}, compilerEntry) {
    const supportedScenes = compilerEntry?.scenes ?? SCENE_TRANSITIONS;
    const state = specState(viewSpec);
    const scene = uniqueTokens([...(stepTransition.scene || [])]).filter((token) => SCENE_TRANSITIONS.includes(token) && supportedScenes.includes(token));
    return {
        scene,
        selection: scene.includes('selection') ? (state.selection || null) : null,
        axis: scene.includes('axis') ? (state.axis || null) : null,
        detail: scene.includes('detail') ? (state.detail || null) : null
    };
}
export function withSceneTransitionDefaults(viewSpec, sceneTransition) {
    const transition = { ...specTransition(viewSpec) };
    if ((hasScene(sceneTransition, 'mapping') || hasScene(sceneTransition, 'detail')) && transition.stagger == null) {
        transition.stagger = { ...DEFAULT_TIMING.scene.stagger };
    }
    return withSpecMeta(viewSpec, { transition });
}
export function compileViewSpec(viewSpec, sceneTransition, compilerEntry) {
    if (!compilerEntry?.compiler)
        return viewSpec;
    return serializeViewSpec(compileViewWithCompiler(viewSpec, sceneTransition, compilerEntry.compiler, compilerEntry.stateOperations));
}
export function hasScene(sceneTransition, type) {
    return Boolean(sceneTransition?.scene?.includes(type));
}
function normalizeToken(value) {
    if (value == null)
        return '';
    return String(value).trim();
}
function uniqueTokens(values) {
    return [...new Set(values.map(normalizeToken).filter(Boolean))];
}
