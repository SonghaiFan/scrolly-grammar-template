export function defineChartModule(module) {
    const key = String(module?.key ?? '').replace(/\s+/g, '').toLowerCase();
    if (!key)
        throw new Error('Chart module key is required.');
    if (typeof module.load !== 'function')
        throw new Error(`Chart module "${key}" requires load().`);
    return Object.freeze({ key, load: module.load });
}
