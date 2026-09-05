import type { AnyRecord } from '../types.js';
export function renderChartShell(target: Element, spec: AnyRecord, viewId = "main") {
  target.className = ["sl-chart-root", target.className].filter(Boolean).join(" ");

  const figure = document.createElement("figure");
  figure.className = "sl-figure sl-chart-figure";
  figure.innerHTML = `
    <figcaption class="sl-figure-header">
      <p class="sl-figure-title"></p>
      <span class="sl-mark-name"></span>
    </figcaption>
  `;

  const view = document.createElement("div");
  view.className = "sl-view";
  view.dataset.viewId = viewId;
  figure.append(view);
  target.append(figure);

  const tooltip = document.createElement("div");
  tooltip.className = "sl-tooltip";
  target.append(tooltip);

  return {
    root: target,
    story: null,
    figure,
    figureTitle: figure.querySelector(".sl-figure-title"),
    markName: figure.querySelector(".sl-mark-name"),
    steps: [],
    navButtons: [],
    progressFill: null,
    views: { [viewId]: view },
    tooltip
  };
}
