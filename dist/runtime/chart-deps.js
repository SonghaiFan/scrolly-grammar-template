import { createMarkHelpers } from './marks.js';
import { escapeHtml } from './utils.js';
export function createChartRuntimeDeps(context = {}) {
    const { bandOrLinear, bindTooltip, channelDomain, colorScale, curveFor, drawGrid, drawLegend, drawPath, drawXAxis, drawYAxis, easeFor, fadeNonBarShapes, fadeNonLineShapes, fadeNonPointShapes, fadeNonUnitShapes, hideTooltip, moveTooltip, niceExtent, position, quantitativeDomain, quantitativeScale, showTooltip, staggerDelay, themeValue, updateGrid } = createMarkHelpers(context);
    return {
        bandOrLinear,
        bindTooltip,
        channelDomain,
        colorScale,
        curveFor,
        drawGrid,
        drawLegend,
        drawPath,
        drawXAxis,
        drawYAxis,
        easeFor,
        escapeHtml,
        fadeNonBarShapes,
        fadeNonLineShapes,
        fadeNonPointShapes,
        fadeNonUnitShapes,
        hideTooltip,
        moveTooltip,
        niceExtent,
        position,
        quantitativeDomain,
        quantitativeScale,
        showTooltip,
        staggerDelay,
        themeValue,
        updateGrid
    };
}
export const CHART_RUNTIME_DEPS = createChartRuntimeDeps();
