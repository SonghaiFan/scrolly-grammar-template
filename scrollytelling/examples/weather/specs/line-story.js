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
      "Demonstrates Focus, Guide, Observation, and Granularity on a trend line. " +
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
      "Focus: zoom to recent decades",
      base.where({ period: "recent" }),
      {
        body: "Focus keeps the line objects intact and rescales x to the recent period.",
        code: 'base.where({ period: "recent" })'
      }
    )
    .add(
      "Guide: logarithmic y scale",
      base.guide({ y: { scale: { type: "log" } } }),
      {
        body: "Guide changes the reading frame — same data, different scale for the y axis.",
        code: 'base.guide({ y: { scale: { type: "log" } } })'
      }
    )
    .add(
      "Observation: switch to cold days",
      cold,
      {
        body: "Observation swaps the encoded variable — same decade path, y now encodes cold days.",
        code: 'base.y("cold_days")'
      }
    )
    .add(
      "Granularity: split line into periods",
      cold.breakdown("period", { color: { field: "period", type: "nominal" } }),
      {
        body: "Granularity splits one continuous line into per-period segments — same points, new grouping.",
        code: 'cold.breakdown("period", { color: { field: "period", type: "nominal" } })'
      }
    )
    .add(
      "Granularity: merge back to one line",
      cold.rollup(),
      {
        body: "Granularity merges period segments back into a single continuous trend.",
        code: 'cold.rollup()'
      }
    )
    .toSpec();
}
