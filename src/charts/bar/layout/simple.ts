// @ts-nocheck — D3 rendering code; typed via deps injection
import { applyBarIdentity, barKeyAccessor } from '../keys.js';
import { cameraScale, cameraSize, focusCamera, rectBounds, viewSelection } from '../../../focus.js';
import { barCategoryChannel, barMeasureChannel, barOrientationFromEncoding } from './index.js';
import { drawBarAxes } from '../axes.js';

export function createSimpleBarRenderer(deps, kit) {
  const { bandOrLinear, bindTooltip, channelDomain, colorScale, position, quantitativeDomain, themeValue } = deps;

  return function renderSimpleBar(chart, rows, spec, tooltip, d3) {
    const enc = spec.encoding || {};
    const domainRows = chart.domainRows?.length ? chart.domainRows : rows;
    const orientation = barOrientationFromEncoding(enc);
    const horizontal = orientation === 'horizontal';
    const categoryChannel = barCategoryChannel(enc);
    const measureChannel = barMeasureChannel(enc);
    const categoryField = categoryChannel?.field;
    const valueField = measureChannel?.field;
    const key = barKeyAccessor(chart, spec, categoryField || valueField);
    const selection = viewSelection(spec);
    const categoryRange = horizontal ? [0, chart.innerHeight] : [0, chart.innerWidth];

    const baseCategoryScale = horizontal
      ? d3.scaleBand().domain(channelDomain(rows, categoryChannel)).range(categoryRange).padding(0.22)
      : bandOrLinear(rows, categoryChannel, categoryRange, d3);
    const baseMeasureScale = d3.scaleLinear()
      .domain(quantitativeDomain(domainRows, measureChannel, 0))
      .range(horizontal ? [0, chart.innerWidth] : [chart.innerHeight, 0]).nice();
    const baseX = horizontal ? baseMeasureScale : baseCategoryScale;
    const baseY = horizontal ? baseCategoryScale : baseMeasureScale;
    const baseGeom = { x: baseX, y: baseY, categoryField, valueField, chart, horizontal, position };
    const baseGeometry = simpleBarGeometry(baseGeom);
    const camera = focusCamera(
      rows.map((row) => ({ datum: row, bounds: geometryBounds(baseGeometry, row) })),
      selection,
      { width: chart.innerWidth, height: chart.innerHeight }
    );
    const x = cameraScale(baseX, camera, 'x');
    const y = cameraScale(baseY, camera, 'y');
    const color = colorScale(domainRows, enc.color, d3);
    const geom = { x, y, categoryField, valueField, chart, horizontal, position };
    const steps = kit.steps(chart, orientation, d3);
    const xAxisTransition = kit.axisTransition(steps, 'x', d3) || chart.transition.base;
    const yAxisTransition = kit.axisTransition(steps, 'y', d3) || chart.transition.base;
    const collapseLineage = kit.collapseLineage(chart, categoryField);
    const zeroBaselineExit = kit.baselineExitPlan(chart, 'zero-baseline');
    const geometry = simpleBarGeometryContract(geom, collapseLineage, kit.sourceBaselineExit, zeroBaselineExit);

    chart.scales = { x, y, color, orientation };
    chart.camera = camera;
    chart.channels = enc;
    chart.position = {
      x: (d) => horizontal ? x(d[valueField]) : position(x, d[categoryField]),
      y: (d) => horizontal ? position(y, d[categoryField]) : y(d[valueField])
    };

    drawBarAxes(chart, x, y, enc, d3, deps, horizontal, {
      xTransition: xAxisTransition,
      yTransition: yAxisTransition
    });

    kit.renderBarJoin({
      chart, rows, spec, tooltip, d3, bindTooltip, key,
      category: (d) => d[categoryField],
      className: 'sl-bar', orientation, rx: cameraSize(themeValue('--sl-bar-radius', 3), camera),
      fill: (d) => color(d),
      applyIdentity: applyBarIdentity, steps, geometry
    });
  };
}

function simpleBarGeometryContract(geom, collapseLineage, sourceBaselineExit, exitPlan) {
  return {
    start: (d) => collapseLineage?.start(d) || simpleBarEnterGeometry(d, geom),
    target: simpleBarGeometry(geom),
    applyX: (selection) => applySimpleBarX(selection, geom),
    applyY: (selection) => applySimpleBarY(selection, geom),
    apply: (selection) => applySimpleBarGeometry(selection, geom),
    exit: collapseLineage ? null : (selection) => applySimpleBarExitGeometry(selection, geom, sourceBaselineExit, exitPlan)
  };
}

function simpleBarEnterGeometry(d, geom) {
  const target = simpleBarGeometry(geom);
  if (geom.horizontal) {
    return { x: geom.x(0), y: target.y(d), width: 0, height: target.height };
  }
  return { x: target.x(d), y: geom.y(0), width: target.width, height: 0 };
}

function applySimpleBarGeometry(selection, geom) {
  applySimpleBarX(selection, geom);
  applySimpleBarY(selection, geom);
  return selection;
}

function simpleBarGeometry(geom) {
  const { x, y, categoryField, valueField, horizontal, position } = geom;
  if (horizontal) {
    return {
      x: (d) => Math.min(x(0), x(d[valueField])),
      y: (d) => y(d[categoryField]),
      width: (d) => Math.abs(x(d[valueField]) - x(0)),
      height: Math.max(1, y.bandwidth())
    };
  }
  const width = simpleCategoryWidth(x);
  return {
    x: (d) => position(x, d[categoryField]) - width / 2,
    y: (d) => Math.min(y(0), y(d[valueField])),
    width: Math.max(1, width),
    height: (d) => Math.abs(y(d[valueField]) - y(0))
  };
}

function applySimpleBarX(selection, geom) {
  const { x, categoryField, valueField, horizontal, position } = geom;
  if (horizontal) {
    return selection.attr('x', (d) => Math.min(x(0), x(d[valueField]))).attr('width', (d) => Math.abs(x(d[valueField]) - x(0)));
  }
  const width = simpleCategoryWidth(x);
  return selection.attr('x', (d) => position(x, d[categoryField]) - width / 2).attr('width', Math.max(1, width));
}

function applySimpleBarY(selection, geom) {
  const { y, categoryField, valueField, horizontal } = geom;
  if (horizontal) {
    return selection.attr('y', (d) => y(d[categoryField])).attr('height', Math.max(1, y.bandwidth()));
  }
  return selection.attr('y', (d) => Math.min(y(0), y(d[valueField]))).attr('height', (d) => Math.abs(y(d[valueField]) - y(0)));
}

function applySimpleBarExitGeometry(selection, geom, sourceBaselineExit, exitPlan) {
  return sourceBaselineExit(selection, { horizontal: geom.horizontal, plan: exitPlan, value: (d) => d[geom.valueField] });
}

function simpleCategoryWidth(scale) {
  return typeof scale.bandwidth === 'function' ? scale.bandwidth() : 10;
}

function geometryBounds(geometry, datum) {
  const value = (property) => typeof property === 'function' ? property(datum) : property;
  return rectBounds(value(geometry.x), value(geometry.y), value(geometry.width), value(geometry.height));
}
