import { unit } from "../../../../dist/index.js";
import { story } from "./shared.js";

export function createUnitStory({ actionMode = ["step", "tooltip"] } = {}) {
  const base = unit("weather")
    .x("year")
    .y("hot_days")
    .color({ field: "period", type: "nominal" })
    .key("decade")
    .value("hot_days")
    .label("decade")
    .sort("year");

  return story.demo()
    .action(actionMode)
    .layout("floatToText")
    .description(
      "Demonstrates Selection and Axis layouts on repeated count units. " +
      "Each circle is one hot day — axis changes how those circles are arranged."
    )
    .add(
      "Baseline: one unit per hot day",
      base,
      {
        body: "One circle per hot day, keyed by decade plus unit index. Color encodes period.",
        code: 'unit("weather").x("year").y("hot_days")\n  .color({ field: "period", type: "nominal" })\n  .key("decade").value("hot_days").label("decade").sort("year")'
      }
    )
    .add(
      "Selection: recent decades only",
      base.where({ period: "recent" }),
      {
        body: "Filtering happens before unit expansion — fewer decades, same unit chart.",
        code: 'base.where({ period: "recent" })'
      }
    )
    .add(
      "Axis: group units by period",
      base.group("period", { color: { field: "period", type: "nominal" } }),
      {
        body: "Axis changes the spatial layout — same circles now cluster by period.",
        code: 'base.group("period", { color: { field: "period", type: "nominal" } })'
      }
    )
    .add(
      "Axis: dodge along timeline",
      base.dodge("year"),
      {
        body: "Axis changes layout again — units spread along a collision-dodged year axis.",
        code: 'base.dodge("year")'
      }
    )
    .toSpec();
}
