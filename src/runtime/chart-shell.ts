import type { AnyRecord } from '../types/index.js';
export function renderChartShell(target: Element, spec: AnyRecord, viewId = "main") {
  target.className = ["vd-chart-root", target.className].filter(Boolean).join(" ");

  const figure = document.createElement("figure");
  figure.className = "vd-figure vd-chart-figure";
  figure.innerHTML = `
    <figcaption class="vd-figure-header">
      <p class="vd-figure-title"></p>
      <span class="vd-mark-name"></span>
    </figcaption>
  `;

  const view = document.createElement("div");
  view.className = "vd-view";
  view.dataset.viewId = viewId;
  figure.append(view);
  target.append(figure);

  const tooltip = document.createElement("div");
  tooltip.className = "vd-tooltip";
  target.append(tooltip);

  return {
    root: target,
    story: null,
    figure,
    figureTitle: figure.querySelector(".vd-figure-title"),
    markName: figure.querySelector(".vd-mark-name"),
    steps: [],
    navButtons: [],
    progressFill: null,
    views: { [viewId]: view },
    tooltip
  };
}
