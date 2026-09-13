// @ts-nocheck — D3 rendering code; typed via deps injection
import { BaseChart } from '../base.js';
import { cameraPosition, cameraScale, cameraSize, focusCamera, pointBounds, viewSelection } from '../../focus.js';
import { specTransition } from '../../spec-meta.js';
import { directionalEase } from '../../transition-progress.js';
import { unitKey } from './keys.js';
import { clearUnitAxes, drawUnitXAxis } from './axes.js';
import {
  expandUnits,
  matchUnitSlotsByIdentityAndTravel,
  unitLayout,
  unitSelectionOpacity,
  unitStageTiming
} from './state.js';

const DEFAULT_UNIT_STAGGER = { step: 4, max: 100 };

export function createUnitRenderer(deps) {
  return new UnitChart(deps).renderer();
}

class UnitChart extends BaseChart {
  render(chart, rows, spec, tooltip, d3) {
    const {
      bandOrLinear,
      bindTooltip,
      chartStyle,
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
    const baseLayout = unitLayout(units, chart, spec, {
      bandOrLinear, chartStyle, d3, drawGrid, drawXAxis, drawYAxis, niceExtent, position, updateGrid
    });
    const camera = focusCamera(
      units.map((unit, index) => ({
        datum: unit.__row || unit,
        bounds: pointBounds(baseLayout.x(unit, index), baseLayout.y(unit, index), baseLayout.r)
      })),
      viewSelection(spec),
      { width: chart.innerWidth, height: chart.innerHeight }
    );
    const layout = {
      ...baseLayout,
      r: cameraSize(baseLayout.r, camera),
      x: (unit, index) => cameraPosition(baseLayout.x(unit, index), camera, 'x'),
      y: (unit, index) => cameraPosition(baseLayout.y(unit, index), camera, 'y'),
      ...(baseLayout.trajectory ? {
        trajectory: (unit) => baseLayout.trajectory(unit).map((point) => ({
          x: cameraPosition(point.x, camera, 'x'),
          y: cameraPosition(point.y, camera, 'y')
        }))
      } : {})
    };
    const xScale = baseLayout.axis
      ? cameraScale(baseLayout.axis.scale, camera, 'x')
      : null;
    chart.camera = camera;
    if (baseLayout.axis) {
      drawUnitXAxis(chart, xScale, baseLayout.axis.channel, d3, {
        chartStyle, drawGrid, drawXAxis, drawYAxis, updateGrid
      }, { position: cameraPosition(chart.innerHeight, camera, 'y') });
    } else {
      clearUnitAxes(chart, d3, { drawXAxis, drawYAxis, updateGrid });
    }

    fadeNonUnitShapes(chart);
    chart.scales = { color, layout: layout.name, ...(xScale ? { x: xScale } : {}) };
    chart.channels = enc;
    chart.position = { x: layout.x, y: layout.y };
    drawLegend(chart, rows, enc.color, d3);
    chart.transition.base = originalTransition;

    const match = matchUnitSlotsByIdentityAndTravel(chart, units, layout);
    units = match.units;
    const markDuration = stage && layout.trajectory
      ? stage.markDuration + stage.travelDelay
      : stage?.markDuration;
    const enterTransition = stage
      ? transitionFor(chart, d3, markDuration)
      : (chart.transition.enter || originalTransition);
    const fallsToAxis = Number.isFinite(stage?.moveAcrossDuration);
    const updateTransition = stage
      ? transitionFor(chart, d3, fallsToAxis ? stage.moveAcrossDuration : markDuration)
      : originalTransition;
    const transitionOptions = specTransition(spec);
    const hasStaggerOverride = Object.prototype.hasOwnProperty.call(transitionOptions, 'stagger');
    const perMarkDelay = (unit, index) => stage && !hasStaggerOverride
      ? layout.trajectory
        ? 0
        : travelDelay(unit, match.maxDistance, stage.travelDelay)
      : staggerDelay(
          spec,
          unit,
          index,
          hasStaggerOverride ? transitionOptions.stagger : DEFAULT_UNIT_STAGGER
        );
    const baseMarkDelay = (unit, index) => camera.bounds
      ? 0
        : stage
        ? stage.viewDuration + (fallsToAxis
            ? 0
            : perMarkDelay(unit, index))
        : perMarkDelay(unit, index);
    const enterMarkDelay = (unit, index) =>
      (chart.transition.enterDelay || 0) + baseMarkDelay(unit, index);
    const updateMarkDelay = (unit, index) =>
      (chart.transition.exitDuration || 0) + baseMarkDelay(unit, index);
    const opacity = (unit) => unitSelectionOpacity(
      unit, spec, themeValue('--vd-dim-opacity', 0.22)
    );

    chart.g.selectAll('circle.vd-unit')
      .data(units, unitKey)
      .join(
        (enter) => {
          const entered = enter.append('circle')
          .attr('class', 'vd-unit')
          .attr('data-key', semanticUnitKey)
          .attr('data-source-key', (d) => d.__sourceUnitKey)
          .attr('data-travel-distance', (d) => d.__travelDistance || 0)
          .attr('data-matched-by', (d) => d.__matchedBy)
          .attr('data-parent-key', (d) => d.__parentKey)
          .attr('data-unit-index', (d) => d.__unitIndex)
          .attr('data-group-key', (d) => layout.groupField ? d.__row[layout.groupField] : null)
          .attr('cx', (unit, index) => trajectoryStart(layout, unit, 'x', layout.x(unit, index)))
          .attr('cy', (unit, index) => trajectoryStart(layout, unit, 'y', layout.y(unit, index)))
          .attr('r', 0)
          .attr('fill', (d) => color(d.__row || d))
          .attr('stroke', themeValue('--vd-mark-stroke', 'white'))
          .attr('stroke-width', cameraSize(themeValue('--vd-unit-stroke-width', 0.5), camera))
          .call(bindTooltip, spec, tooltip);
          const entering = entered.transition(enterTransition)
          .delay(enterMarkDelay)
          .attr('r', layout.r)
          .style('opacity', opacity);
          return layout.trajectory ? applyForceTrajectory(entering, layout, d3) : entering;
        },
        (update) => {
          const moveAcross = update
            .attr('data-key', semanticUnitKey)
            .attr('data-source-key', (d) => d.__sourceUnitKey)
            .attr('data-travel-distance', (d) => d.__travelDistance || 0)
            .attr('data-matched-by', (d) => d.__matchedBy)
            .attr('data-parent-key', (d) => d.__parentKey)
            .attr('data-unit-index', (d) => d.__unitIndex)
            .attr('data-group-key', (d) => layout.groupField ? d.__row[layout.groupField] : null)
            .call(bindTooltip, spec, tooltip)
            .transition(updateTransition)
            .delay(updateMarkDelay)
            .attr('cx', layout.x)
            .attr('r', layout.r)
            .attr('fill', (d) => color(d.__row || d))
            .attr('stroke-width', cameraSize(themeValue('--vd-unit-stroke-width', 0.5), camera))
            .style('opacity', opacity);

          if (layout.trajectory) return applyForceTrajectory(moveAcross, layout, d3);
          if (!fallsToAxis) return moveAcross.attr('cy', layout.y);
          return moveAcross
            .transition()
            .delay(perMarkDelay)
            .duration(Math.max(1, stage.markDuration))
            .easeVarying(function(unit, index) {
              const fromY = Number(this.getAttribute('cy'));
              const toY = Number(layout.y(unit, index));
              return toY > fromY
                ? directionalEase(d3.easeBounceOut, d3.easeExpIn)
                : directionalEase(d3.easeExpOut, d3.easeBounceIn);
            })
            .attr('cy', layout.y);
        },
        (exit) => exit
          .transition(chart.transition.exit || updateTransition)
          .delay(stage ? stage.viewDuration : 0)
          .attr('r', 0)
          .style('opacity', 0)
          .remove()
      );
  }
}

function applyForceTrajectory(transition, layout, d3) {
  return transition
    // The force cooling schedule already supplies the motion curve. Linear
    // playback keeps normalized progress aligned with the recorded tick index.
    .ease(d3.easeLinear)
    .attrTween('cx', (unit) => (progress) => trajectoryPoint(layout, unit, progress).x)
    .attrTween('cy', (unit) => (progress) => trajectoryPoint(layout, unit, progress).y);
}

function trajectoryStart(layout, unit, axis, fallback) {
  return layout.trajectory?.(unit)?.[0]?.[axis] ?? fallback;
}

function trajectoryPoint(layout, unit, progress) {
  const frames = layout.trajectory(unit);
  if (!frames?.length) return { x: layout.x(unit), y: layout.y(unit) };
  if (frames.length === 1) return frames[0];
  const scaled = Math.max(0, Math.min(1, progress)) * (frames.length - 1);
  const lower = Math.floor(scaled);
  const upper = Math.min(frames.length - 1, lower + 1);
  const mix = scaled - lower;
  return {
    x: frames[lower].x + (frames[upper].x - frames[lower].x) * mix,
    y: frames[lower].y + (frames[upper].y - frames[lower].y) * mix
  };
}

function semanticUnitKey(unit) {
  return unit.__semanticUnitKey ?? unit.__unitKey;
}

function travelDelay(unit, maxDistance, travelWindow) {
  if (!maxDistance) return 0;
  return (Number(unit.__travelDistance) || 0) / maxDistance * travelWindow;
}

function transitionFor(chart, d3, duration) {
  const transition = chart.seekable
    ? d3.transition(chart.seekTransitionName)
    : d3.transition();
  return transition.duration(Math.max(1, duration)).ease(chart.transition.base.ease());
}
