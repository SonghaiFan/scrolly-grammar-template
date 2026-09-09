export function resolveTarget(target) {
    if (typeof target !== "string")
        return target;
    const node = document.querySelector(target);
    if (!node)
        throw new Error(`VisDelta target not found: ${target}`);
    return node;
}
