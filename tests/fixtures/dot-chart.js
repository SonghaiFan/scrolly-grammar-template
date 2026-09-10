import {
  ChartState,
  defineChartModule,
  defineChartType
} from '/dist/plugins.js';

let loads = 0;

const plugin = defineChartType({
  key: 'dot',
  renderer(chart, rows, spec) {
    const field = spec.encoding.x.field;
    chart.g.selectAll('circle.dot')
      .data(rows, row => row.id)
      .join('circle')
      .attr('class', 'dot')
      .attr('cy', 40)
      .attr('r', 6)
      .transition(chart.transition.base)
      .attr('cx', row => Number(row[field]) * 20);
  }
});

const dotModule = defineChartModule({
  key: 'dot',
  async load() {
    loads += 1;
    return { plugin };
  }
});

class DotState extends ChartState {
  chartModule() {
    return dotModule;
  }
}

export function dot(data = []) {
  return new DotState({ mark: 'dot', data, encoding: {} });
}

export function moduleLoads() {
  return loads;
}
