import { DEFAULT_TIMING } from '../timing.js';
import { externalizeScrollyViewSpec, narrativeState, narrativeTransition, withNarrative } from '../scrolly-meta.js';
import { compileViewWithCompiler } from '../charts/compile-view.js';
export const SCENE_TRANSITIONS = ['focus', 'guide', 'granularity', 'observation'];
export function resolveSceneTransition(viewSpec = {}, stepTransition = {}, compilerEntry) {
    const supportedScenes = compilerEntry?.scenes ?? SCENE_TRANSITIONS;
    const state = narrativeState(viewSpec);
    const scene = uniqueTokens([...(stepTransition.scene || [])]).filter((token) => SCENE_TRANSITIONS.includes(token) && supportedScenes.includes(token));
    return {
        scene,
        focus: scene.includes('focus') ? (state.focus || null) : null,
        guide: scene.includes('guide') ? (state.guide || null) : null,
        granularity: scene.includes('granularity') ? (state.granularity || null) : null
    };
}
export function withSceneTransitionDefaults(viewSpec, sceneTransition) {
    const transition = { ...narrativeTransition(viewSpec) };
    if ((hasScene(sceneTransition, 'observation') || hasScene(sceneTransition, 'granularity')) && transition.stagger == null) {
        transition.stagger = { ...DEFAULT_TIMING.scene.stagger };
    }
    return withNarrative(viewSpec, { transition });
}
export function compileViewSpec(viewSpec, sceneTransition, compilerEntry) {
    if (!compilerEntry?.compiler)
        return viewSpec;
    return externalizeScrollyViewSpec(compileViewWithCompiler(viewSpec, sceneTransition, compilerEntry.compiler, compilerEntry.stateOperations));
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
