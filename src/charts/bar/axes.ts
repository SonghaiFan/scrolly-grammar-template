// @ts-nocheck - D3 axis rendering is provided through chart runtime deps.
import { chartStyle, responsiveTickCount } from '../style.js';

/** Bar-owned presentation: open quantitative axis, categorical baseline, no grid. */
export function drawBarAxes(chart, x, y, enc, d3, deps, horizontal, options = {}) {
  const transition = chart.transition.base;
  const style = chartStyle(deps);
  const rule = style.charts.bar;
  const xTransition = options.xTransition || transition;
  const yTransition = options.yTransition || transition;
  const xTickCount = responsiveTickCount(chart.innerWidth, style.tickSpacing.x);
  const yTickCount = responsiveTickCount(chart.innerHeight, style.tickSpacing.y);

  drawStyledGrid(rule.grid, chart, x, y, d3, deps, transition, xTickCount, yTickCount);
  deps.drawXAxis(
    chart,
    x,
    style.axisTitle(enc.x, 'right'),
    d3,
    xTransition,
    {
      tickCount: xTickCount,
      tickFormat: enc.x?.format,
      position: horizontal ? undefined : y(0)
    }
  );
  deps.drawYAxis(
    chart,
    y,
    horizontal ? enc.y?.title : style.axisTitle(enc.y, 'up'),
    d3,
    yTransition,
    {
      tickCount: yTickCount,
      tickFormat: enc.y?.format,
      position: horizontal ? x(0) : undefined
    }
  );

  if (rule.openXDomain) chart.scene.xAxis.select('.domain').style('opacity', 0);
  if (rule.openYDomain) chart.scene.yAxis.select('.domain').style('opacity', 0);
  if (rule.edgeTitles) {
    placeEdgeTitles(chart, enc, horizontal, xTransition, yTransition, style.edgeTitleInset);
  }
}

function drawStyledGrid(grid, chart, x, y, d3, deps, transition, xTickCount, yTickCount) {
  if (grid === 'both') return deps.drawGrid(chart, y, d3, transition, { x, xTickCount, yTickCount });
  if (grid === 'vertical') return deps.drawGrid(chart, null, d3, transition, { x, xTickCount });
  if (grid === 'horizontal') return deps.drawGrid(chart, y, d3, transition, { yTickCount });
  return deps.updateGrid(chart, null, d3, transition);
}

function placeEdgeTitles(chart, enc, horizontal, xTransition, yTransition, inset) {
  if (enc.x?.title) {
    chart.scene.xLabel
      .attr('text-anchor', 'end')
      .transition(xTransition)
      .attr('text-anchor', 'end')
      .attr('x', chart.margin.left + chart.innerWidth - inset.right)
      .attr('y', chart.height - inset.bottom)
      .attr('transform', null);
  }

  if (enc.y?.title) {
    chart.scene.yLabel
      .attr('text-anchor', 'start')
      .transition(yTransition)
      .attr('text-anchor', 'start')
      .attr('x', chart.margin.left + inset.left)
      .attr('y', chart.margin.top - inset.top)
      .attr('transform', null);
  }
}
