// @ts-nocheck — D3 axis rendering is provided through chart runtime deps.

/** Point-owned axis presentation for compact correlation plots. */
export function drawPointAxes(chart, x, y, enc, d3, deps) {
  const transition = chart.transition.base;
  const xTickCount = Math.max(2, Math.floor(chart.innerWidth / 80));
  const yTickCount = Math.max(2, Math.floor(chart.innerHeight / 60));

  deps.drawGrid(chart, y, d3, transition, {
    x,
    xTickCount,
    yTickCount
  });
  deps.drawXAxis(chart, x, axisTitle(enc.x, 'right'), d3, transition, {
    tickCount: xTickCount
  });
  deps.drawYAxis(chart, y, axisTitle(enc.y, 'up'), d3, transition, {
    tickCount: yTickCount
  });

  // A scatterplot reads as a field rather than a boxed coordinate frame.
  chart.scene.xAxis.select('.domain').style('opacity', 0);
  chart.scene.yAxis.select('.domain').style('opacity', 0);

  if (enc.x?.title) {
    chart.scene.xLabel
      .attr('text-anchor', 'end')
      .transition(transition)
      .attr('text-anchor', 'end')
      .attr('x', chart.innerWidth)
      .attr('y', chart.height - 4)
      .attr('transform', `translate(${chart.margin.left},0)`);
  }

  if (enc.y?.title) {
    chart.scene.yLabel
      .attr('text-anchor', 'start')
      .transition(transition)
      .attr('text-anchor', 'start')
      .attr('x', 0)
      .attr('y', Math.max(12, chart.margin.top - 4))
      .attr('transform', null);
  }
}

function axisTitle(channel, direction) {
  const title = channel?.title;
  if (!title) return undefined;
  return direction === 'right' ? `${title} →` : `↑ ${title}`;
}
