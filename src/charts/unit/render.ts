// @ts-nocheck — D3 rendering code; typed via deps injection
import { BaseChart } from '../base.js';
import { unitKey } from './keys.js';
import {
  expandUnits,
  matchUnitSlotsByTravel,
  unitLayout,
  unitSelectionOpacity,
  unitStageTiming
} from './state.js';

export function createUnitRenderer(deps) {
  return new UnitChart(deps).renderer();
}

class UnitChart extends BaseChart {
  render(chart, rows, spec, tooltip, d3) {
    const {
      bandOrLinear,
      bindTooltip,
      colorScale,
      drawGrid,
      drawLegend,
      drawXAxis,
      drawYAxis,
      fadeNonUnitShapes,
      niceExtent,
      position,
      staggerDelay,
      themeValue,
      updateGrid
    } = this.deps;

    const enc = spec.encoding || {};
    const domainRows = chart.domainRows?.length ? chart.domainRows : rows;
    let units = expandUnits(rows, spec, d3);
    const color = colorScale(domainRows, enc.color, d3);
    const originalTransition = chart.transition.base;
    const stage = unitStageTiming(chart);
    if (stage) chart.transition.base = transitionFor(chart, d3, stage.viewDuration);
    const layout = unitLayout(units, chart, spec, {
      bandOrLinear, d3, drawGrid, drawXAxis, drawYAxis, niceExtent, position, updateGrid
    });

    fadeNonUnitShapes(chart);
    chart.scales = { color, layout: layout.name };
    chart.channels = enc;
    chart.position = { x: layout.x, y: layout.y };
    drawLegend(chart, rows, enc.color, d3);
    chart.transition.base = originalTransition;

    const match = matchUnitSlotsByTravel(chart, units, layout);
    units = match.units;
    const markTransition = stage
      ? transitionFor(chart, d3, stage.markDuration)
      : originalTransition;
    const markDelay = (unit, index) => stage
      ? stage.viewDuration + travelDelay(unit, match.maxDistance, stage.travelDelay)
      : staggerDelay(spec, unit, index);
    const opacity = (unit) => unitSelectionOpacity(
      unit, spec, themeValue('--sl-dim-opacity', 0.22)
    );

    chart.g.selectAll('circle.sl-unit')
      .data(units, unitKey)
      .join(
        (enter) => enter
          .append('circle')
          .attr('class', 'sl-unit')
          .attr('data-key', semanticUnitKey)
          .attr('data-source-key', (d) => d.__sourceUnitKey)
          .attr('data-travel-distance', (d) => d.__travelDistance || 0)
          .attr('data-parent-key', (d) => d.__parentKey)
          .attr('data-unit-index', (d) => d.__unitIndex)
          .attr('data-group-key', (d) => layout.groupField ? d.__row[layout.groupField] : null)
          .attr('cx', layout.x)
          .attr('cy', layout.y)
          .attr('r', 0)
          .attr('fill', (d) => color(d.__row || d))
          .attr('stroke', themeValue('--sl-mark-stroke', 'white'))
          .attr('stroke-width', themeValue('--sl-unit-stroke-width', 0.5))
          .call(bindTooltip, spec, tooltip)
          .transition(markTransition)
          .delay(markDelay)
          .attr('r', layout.r)
          .style('opacity', opacity),
        (update) => update
          .attr('data-key', semanticUnitKey)
          .attr('data-source-key', (d) => d.__sourceUnitKey)
          .attr('data-travel-distance', (d) => d.__travelDistance || 0)
          .attr('data-parent-key', (d) => d.__parentKey)
          .attr('data-unit-index', (d) => d.__unitIndex)
          .attr('data-group-key', (d) => layout.groupField ? d.__row[layout.groupField] : null)
          .call(bindTooltip, spec, tooltip)
          .transition(markTransition)
          .delay(markDelay)
          .attr('cx', layout.x)
          .attr('cy', layout.y)
          .attr('r', layout.r)
          .attr('fill', (d) => color(d.__row || d))
          .style('opacity', opacity),
        (exit) => exit
          .transition(markTransition)
          .delay(stage ? stage.viewDuration : 0)
          .attr('r', 0)
          .style('opacity', 0)
          .remove()
      );
  }
}

function semanticUnitKey(unit) {
  return unit.__semanticUnitKey ?? unit.__unitKey;
}

function travelDelay(unit, maxDistance, travelWindow) {
  if (!maxDistance) return 0;
  return (Number(unit.__travelDistance) || 0) / maxDistance * travelWindow;
}

function transitionFor(chart, d3, duration) {
  const transition = chart.scrollDriven
    ? d3.transition(chart.scrollTransitionName)
    : d3.transition();
  return transition.duration(Math.max(1, duration)).ease(chart.transition.base.ease());
}
