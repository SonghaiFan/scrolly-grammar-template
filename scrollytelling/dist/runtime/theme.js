const stylesheets = new Map();
/** Inline variables belong to a target; external stylesheets remain document-wide. */
export async function applyTheme(theme = {}, target) {
    // Resolve caller input before acquiring any document resources.
    const variables = Object.entries(themeVariables(theme)).map(([name, value]) => [name, String(value)]);
    const hrefs = themeStylesheetHrefs(theme).map(href => new URL(href, document.baseURI).href);
    const releases = [];
    try {
        await Promise.all(hrefs.map(href => {
            const lease = acquireStylesheet(href);
            releases.push(lease.release);
            return lease.ready;
        }));
    }
    catch (error) {
        releases.forEach(release => release());
        throw error;
    }
    const style = target.style;
    const previous = new Map();
    let disposed = false;
    const dispose = () => {
        if (disposed)
            return;
        disposed = true;
        releases.forEach(release => release());
        previous.forEach(({ value, priority, applied }, name) => {
            // Do not overwrite application changes made after initialization.
            if (style.getPropertyValue(name) !== applied || style.getPropertyPriority(name))
                return;
            if (value)
                style.setProperty(name, value, priority);
            else
                style.removeProperty(name);
        });
    };
    try {
        for (const [name, value] of variables) {
            previous.set(name, { value: style.getPropertyValue(name), priority: style.getPropertyPriority(name), applied: value });
            style.setProperty(name, value);
        }
        return dispose;
    }
    catch (error) {
        dispose();
        throw error;
    }
}
function acquireStylesheet(href) {
    const key = new URL(href, document.baseURI).href;
    let entry = stylesheets.get(key);
    if (!entry) {
        const existing = Array.from(document.querySelectorAll('link[rel~="stylesheet"]')).find(link => link.href === key);
        const link = existing ?? document.createElement('link');
        let cancel = () => { };
        const ready = existing?.sheet ? Promise.resolve() : new Promise((resolve, reject) => {
            let settled = false;
            let timeout;
            const finish = (error) => {
                if (settled)
                    return;
                settled = true;
                clearTimeout(timeout);
                link.removeEventListener('load', loaded);
                link.removeEventListener('error', failed);
                error ? reject(error) : resolve();
            };
            const loaded = () => finish();
            const failed = () => finish(new Error(`Scrollytelling theme stylesheet failed to load: ${href}`));
            link.addEventListener('load', loaded);
            link.addEventListener('error', failed);
            timeout = setTimeout(failed, 15000);
            cancel = () => finish(new Error('Theme stylesheet request released.'));
        });
        entry = { link, owned: !existing, users: 0, ready, cancel };
        stylesheets.set(key, entry);
        if (!existing) {
            link.rel = 'stylesheet';
            link.href = key;
            link.dataset.scrollyliteTheme = 'true';
            document.head.append(link);
        }
    }
    const retained = entry;
    retained.users++;
    let released = false;
    return {
        ready: retained.ready,
        release() {
            if (released)
                return;
            released = true;
            if (--retained.users)
                return;
            retained.cancel();
            if (retained.owned)
                retained.link.remove();
            if (stylesheets.get(key) === retained)
                stylesheets.delete(key);
        }
    };
}
function themeStylesheetHrefs(theme = {}) {
    const candidates = [
        theme.href,
        theme.url,
        theme.css,
        theme.stylesheet,
        ...(Array.isArray(theme.stylesheets) ? theme.stylesheets : [])
    ];
    return Array.from(new Set(candidates.filter((href) => typeof href === "string" && href.trim())));
}
function themeVariables(theme = {}) {
    const variables = {
        ...themeVariableAliases(theme),
        ...themeSeriesVariables(theme),
        ...normalizeThemeVariables(theme.variables || theme.customProperties || {})
    };
    // Root-level var() aliases are resolved before inheritance; mirror explicitly
    // overridden semantic tokens locally so renderer aliases follow this theme.
    const aliases = {
        'color-primary': ['accent'], 'color-bg': ['bg'], 'color-surface': ['surface', 'mark-stroke'],
        'color-on-surface': ['fg'], 'color-muted': ['muted'], 'color-border': ['border'],
        'color-outline': ['axis'], 'color-outline-variant': ['grid'], 'type-family': ['font-family'],
        'type-label-size': ['axis-font-size', 'legend-font-size'], 'rounded-md': ['bar-radius'],
        'rounded-sm': ['legend-swatch-radius']
    };
    for (let i = 1; i <= 10; i++)
        aliases[`color-series-${i}`] = [`series-${i}`];
    for (const [source, targets] of Object.entries(aliases)) {
        if (!(('--sl-' + source) in variables))
            continue;
        for (const target of targets)
            if (!(('--sl-' + target) in variables))
                variables['--sl-' + target] = variables['--sl-' + source];
    }
    return variables;
}
function themeVariableAliases(theme = {}) {
    const aliases = {
        // ── Semantic color roles (DESIGN.md layer) ──────────────────────────────
        colorPrimary: "--sl-color-primary",
        colorSurface: "--sl-color-surface",
        colorBg: "--sl-color-bg",
        colorOnSurface: "--sl-color-on-surface",
        colorMuted: "--sl-color-muted",
        colorBorder: "--sl-color-border",
        colorOutline: "--sl-color-outline",
        colorOutlineVariant: "--sl-color-outline-variant",
        // ── Semantic shape scale ────────────────────────────────────────────────
        roundedSm: "--sl-rounded-sm",
        roundedMd: "--sl-rounded-md",
        roundedLg: "--sl-rounded-lg",
        // ── Semantic typography ─────────────────────────────────────────────────
        typeFamily: "--sl-type-family",
        typeLabelSize: "--sl-type-label-size",
        typeLabelWeight: "--sl-type-label-weight",
        typeBodySize: "--sl-type-body-size",
        // ── Component token aliases (kept for backward compatibility) ───────────
        // Color / surface
        background: "--sl-bg",
        foreground: "--sl-fg",
        surface: "--sl-surface",
        muted: "--sl-muted",
        border: "--sl-border",
        accent: "--sl-accent",
        grid: "--sl-grid",
        axis: "--sl-axis",
        shadow: "--sl-shadow",
        // Typography
        fontFamily: "--sl-font-family",
        axisFontSize: "--sl-axis-font-size",
        legendFontSize: "--sl-legend-font-size",
        // Mark geometry
        barRadius: "--sl-bar-radius",
        lineWidth: "--sl-line-width",
        markStroke: "--sl-mark-stroke",
        pointStrokeWidth: "--sl-point-stroke-width",
        unitStrokeWidth: "--sl-unit-stroke-width",
        dimOpacity: "--sl-dim-opacity",
        // Axis / grid
        axisLabelOffset: "--sl-axis-label-offset",
        tickCount: "--sl-tick-count",
        gridWidth: "--sl-grid-width",
        // Legend
        legendSwatchSize: "--sl-legend-swatch-size",
        legendSwatchRadius: "--sl-legend-swatch-radius"
    };
    return Object.fromEntries(Object.entries(aliases)
        .filter(([key]) => theme[key] != null)
        .map(([key, variable]) => [variable, theme[key]]));
}
function themeSeriesVariables(theme = {}) {
    const series = theme.series || theme.palette || theme.colorScheme;
    if (!Array.isArray(series))
        return {};
    return Object.fromEntries(series
        .filter((value) => value != null)
        .map((value, index) => [`--sl-series-${index + 1}`, value]));
}
function normalizeThemeVariables(variables = {}) {
    return Object.fromEntries(Object.entries(variables)
        .filter(([, value]) => value != null)
        .map(([name, value]) => [
        name.startsWith("--") ? name : `--sl-${dash(name)}`,
        value
    ]));
}
function dash(value) {
    return String(value).replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
}
