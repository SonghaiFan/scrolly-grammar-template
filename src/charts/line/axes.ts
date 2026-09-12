// @ts-nocheck - D3 axis rendering is provided through chart runtime deps.
import { chartStyle, responsiveTickCount } from '../style.js';

/** Line-owned presentation: baseline x-axis and a light horizontal reading grid. */
export function drawLineAxes(chart, x, y, enc, d3, deps, options = {}) {
  drawSeriesAxes(chart, x, y, enc, d3, deps, options);
}

function drawSeriesAxes(chart, x, y, enc, d3, deps, options) {
  const transition = chart.transition.base;
  const axisDuration = options.duration;
  const style = chartStyle(deps);
  const rule = style.charts.line;
  const xTickCount = responsiveTickCount(chart.innerWidth, style.tickSpacing.x);
  const yTickCount = responsiveTickCount(chart.innerHeight, style.tickSpacing.y);
  if (rule.grid === 'both') deps.drawGrid(chart, y, d3, transition, { x, xTickCount, yTickCount, duration: axisDuration });
  else if (rule.grid === 'vertical') deps.drawGrid(chart, null, d3, transition, { x, xTickCount, duration: axisDuration });
  else if (rule.grid === 'horizontal') deps.drawGrid(chart, y, d3, transition, { yTickCount, duration: axisDuration });
  else deps.updateGrid(chart, null, d3, transition);
  deps.drawXAxis(chart, x, style.axisTitle(enc.x, 'right'), d3, transition, {
    tickCount: xTickCount,
    tickFormat: enc.x?.format,
    duration: axisDuration
  });
  deps.drawYAxis(chart, y, style.axisTitle(enc.y, 'up'), d3, transition, {
    tickCount: yTickCount,
    tickFormat: enc.y?.format,
    duration: axisDuration
  });
  if (rule.openXDomain) chart.scene.xAxis.select('.domain').style('opacity', 0);
  if (rule.openYDomain) chart.scene.yAxis.select('.domain').style('opacity', 0);
  if (rule.edgeTitles) placeEdgeTitles(chart, enc, transition, axisDuration, style.edgeTitleInset);
}

function placeEdgeTitles(chart, enc, transition, duration, inset) {
  if (enc.x?.title) {
    chart.scene.xLabel.attr('text-anchor', 'end').transition(transition).duration(duration)
      .attr('text-anchor', 'end')
      .attr('x', chart.margin.left + chart.innerWidth - inset.right)
      .attr('y', chart.height - inset.bottom)
      .attr('transform', null);
  }
  if (enc.y?.title) {
    chart.scene.yLabel.attr('text-anchor', 'start').transition(transition).duration(duration)
      .attr('text-anchor', 'start')
      .attr('x', chart.margin.left + inset.left)
      .attr('y', chart.margin.top - inset.top)
      .attr('transform', null);
  }
}
