// @ts-nocheck - D3 axis rendering is provided through chart runtime deps.
import { chartStyle, responsiveTickCount } from '../style.js';

/** Unit-owned axes for layouts that explicitly map or group horizontal position. */
export function drawUnitXAxis(chart, x, channel, d3, deps) {
  const transition = chart.transition.base;
  const style = chartStyle(deps);
  const rule = style.charts.unit;
  if (rule.grid === 'both' || rule.grid === 'vertical') deps.drawGrid(chart, null, d3, transition, {
    x,
    xTickCount: responsiveTickCount(chart.innerWidth, style.tickSpacing.x)
  });
  else deps.updateGrid(chart, null, d3, transition);
  deps.drawXAxis(
    chart,
    x,
    style.axisTitle(channel, 'right'),
    d3,
    transition,
    {
      tickCount: responsiveTickCount(chart.innerWidth, style.tickSpacing.x),
      tickFormat: channel?.format
    }
  );
  deps.drawYAxis(chart, null, null, d3, transition);
  if (rule.openXDomain) chart.scene.xAxis.select('.domain').style('opacity', 0);
  if (!rule.edgeTitles || !channel?.title) return;
  chart.scene.xLabel.attr('text-anchor', 'end').transition(transition)
    .attr('text-anchor', 'end')
    .attr('x', chart.margin.left + chart.innerWidth - style.edgeTitleInset.right)
    .attr('y', chart.height - style.edgeTitleInset.bottom)
    .attr('transform', null);
}

export function clearUnitAxes(chart, d3, deps) {
  const transition = chart.transition.base;
  deps.updateGrid(chart, null, d3, transition);
  deps.drawXAxis(chart, null, null, d3, transition);
  deps.drawYAxis(chart, null, null, d3, transition);
}
