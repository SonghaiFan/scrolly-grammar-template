import { bar } from "../../../dist/index.js";
import { story } from "./shared.js";

export function createBarStory({ actionMode = ["step", "tooltip"] } = {}) {
  const base = bar("weatherDays")
    .x("decade")
    .y("count")
    .sort("year");

  return story.demo()
    .action(actionMode)
    .layout("floatToText")
    .description(
      "Demonstrates Focus, Guide, and Granularity scene transitions on tidy data. " +
      "Each step changes one semantic dimension of the bar chart."
    )
    .add(
      "Baseline: vertical bar chart",
      base.where({ type: "Hot days" }),
      {
        body: "One vertical bar per decade — bar height encodes hot days count.",
        code: 'bar("weatherDays").x("decade").y("count").sort("year")\n  .where({ type: "Hot days" })'
      }
    )
    .add(
      "Focus: filter to recent decades",
      base.where({ type: "Hot days", period: "recent" }),
      {
        body: "Focus narrows the data to recent decades only. The bar layout is preserved; only the domain changes.",
        code: 'base.where({ type: "Hot days", period: "recent" })'
      }
    )
    .add(
      "Guide: flip to horizontal bars",
      base.where({ type: "Hot days", period: "recent" }).flip(),
      {
        body: "Guide changes the reading frame — vertical becomes horizontal with a two-stage axis transition.",
        code: 'base.where({ type: "Hot days", period: "recent" }).flip()'
      }
    )
    .add(
      "Focus: switch to cold days",
      base.where({ type: "Cold days" }).flip(),
      {
        body: "A keyed focus update swaps the hot/cold filter while keeping the flipped orientation.",
        code: 'base.where({ type: "Cold days" }).flip()'
      }
    )
    .add(
      "Baseline: return to hot days",
      base.where({ type: "Hot days" }),
      {
        body: "Back to the original baseline — no filter, vertical orientation.",
        code: 'base.where({ type: "Hot days" })'
      }
    )
    .add(
      "Granularity: hot/cold stacked segments",
      base.breakdown("type").color("type"),
      {
        body: "Granularity splits each decade bar into hot and cold segments — one aggregate becomes two.",
        code: 'base.breakdown("type").color("type")'
      }
    )
    .add(
      "Focus: highlight cold days",
      base.breakdown("type").color("type").highlight({ type: "Cold days" }),
      {
        body: "Focus highlights cold segments by fading the hot ones — shape is preserved, emphasis changes.",
        code: 'base.breakdown("type").color("type").highlight({ type: "Cold days" })'
      }
    )
    .add(
      "Guide: stacked → grouped layout",
      base.breakdown("type").color("type").layout("grouped").flip(),
      {
        body: "Guide changes the segment layout from stacked to side-by-side, then flips orientation.",
        code: 'base.breakdown("type").color("type").layout("grouped").flip()'
      }
    )
    .add(
      "Granularity: roll up to mean",
      base.rollup("decade", { title: "Average days", op: "mean" }),
      {
        body: "Granularity merges segments back into one average-days bar per decade.",
        code: 'base.rollup("decade", { title: "Average days", op: "mean" })'
      }
    )
    .toSpec();
}
