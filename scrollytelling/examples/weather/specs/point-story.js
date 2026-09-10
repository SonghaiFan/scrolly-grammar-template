import { point } from "../../../../dist/index.js";
import { story } from "./shared.js";

export function createPointStory({ actionMode = ["step", "tooltip"] } = {}) {
  const base = point("weather")
    .x("tmin")
    .y("tmax")
    .color({ field: "period", type: "nominal" })
    .key("decade")
    .sort("year");

  const hotCold = base
    .x("hot_days")
    .y("cold_days");

  return story.demo()
    .action(actionMode)
    .layout("floatToText")
    .description(
      "Demonstrates Selection, Axis, Mapping, and Detail on scatter points. " +
      "Circles carry semantic identity across axis and variable changes."
    )
    .add(
      "Baseline: temperature scatter",
      base,
      {
        body: "One circle per decade — x encodes min temperature, y encodes max temperature. Color encodes period.",
        code: 'point("weather").x("tmin").y("tmax")\n  .color({ field: "period", type: "nominal" })\n  .key("decade").sort("year")'
      }
    )
    .add(
      "Selection: filter to recent decades",
      base.where({ period: "recent" }),
      {
        body: "Selection removes older decades. The same circles shrink to the recent subset.",
        code: 'base.where({ period: "recent" })'
      }
    )
    .add(
      "Axis: flip axes, log scale",
      base.flip({ x: { scale: { type: "log" } } }),
      {
        body: "Axis flips x and y and applies a log scale — the same circles, read differently.",
        code: 'base.flip({ x: { scale: { type: "log" } } })'
      }
    )
    .add(
      "Mapping: hot/cold axes",
      hotCold,
      {
        body: "Mapping remaps both axes — x becomes hot days, y becomes cold days. Circles keep their decade identity.",
        code: 'base.x("hot_days").y("cold_days")'
      }
    )
    .add(
      "Detail: merge to periods",
      hotCold.rollup("period"),
      {
        body: "Detail merges decade circles into three aggregate period circles.",
        code: 'hotCold.rollup("period")'
      }
    )
    .add(
      "Detail: split back to decades",
      hotCold.breakdown("decade"),
      {
        body: "Detail splits each period circle back into its constituent decades.",
        code: 'hotCold.breakdown("decade")'
      }
    )
    .toSpec();
}
