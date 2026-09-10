import { line } from "../../../../dist/index.js";
import { story } from "./shared.js";

export function createLineStory({ actionMode = ["step", "tooltip"] } = {}) {
  const base = line("weather")
    .x("decade")
    .y("hot_days")
    .key("decade")
    .sort("year");

  const cold = base
    .y("cold_days");

  return story.demo()
    .action(actionMode)
    .layout("floatToText")
    .description(
      "Demonstrates Selection, Axis, Mapping, and Detail on a trend line. " +
      "Each scene changes one dimension of how the line is read or grouped."
    )
    .add(
      "Baseline: hot-days trend",
      base,
      {
        body: "One line over decades — vertical position encodes hot days.",
        code: 'line("weather").x("decade").y("hot_days").key("decade").sort("year")'
      }
    )
    .add(
      "Selection: zoom to recent decades",
      base.where({ period: "recent" }),
      {
        body: "Selection keeps the line objects intact and rescales x to the recent period.",
        code: 'base.where({ period: "recent" })'
      }
    )
    .add(
      "Axis: logarithmic y scale",
      base.axis({ y: { scale: { type: "log" } } }),
      {
        body: "Axis changes the reading frame — same data, different scale for the y axis.",
        code: 'base.axis({ y: { scale: { type: "log" } } })'
      }
    )
    .add(
      "Mapping: switch to cold days",
      cold,
      {
        body: "Mapping swaps the encoded variable — same decade path, y now encodes cold days.",
        code: 'base.y("cold_days")'
      }
    )
    .add(
      "Detail: split line into periods",
      cold.breakdown("period", { color: { field: "period", type: "nominal" } }),
      {
        body: "Detail splits one continuous line into per-period segments — same points, new grouping.",
        code: 'cold.breakdown("period", { color: { field: "period", type: "nominal" } })'
      }
    )
    .add(
      "Detail: merge back to one line",
      cold.rollup(),
      {
        body: "Detail merges period segments back into a single continuous trend.",
        code: 'cold.rollup()'
      }
    )
    .toSpec();
}
