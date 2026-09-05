import { story as createStory } from "../../../dist/index.js";

// Layout presets — each carries its natural action token list.
// floatToText: sidebar chart, discrete step navigation.
// textOverVis: sticky chart background, scroll-driven transitions.
export const layoutCopy = {
  floatToText: {
    label: "Float to Text",
    description: "Sidebar layout — chart floats beside the text. Navigate with the step buttons.",
    preset: "floatToText",
    actionMode: ["step", "tooltip"]
  },
  textOverVis: {
    label: "Text over Vis",
    description: "Scrolly layout — chart fills the background. Scroll to drive transitions.",
    preset: "textOverVis",
    actionMode: ["scroll", "tooltip"]
  }
};

export function createBaseDemo() {
  return {
    data: {
      weather: {
        url: "./data/weather_sample.csv",
        type: "csv"
      },
      weatherDays: {
        url: "./data/weather_days_tidy.csv",
        type: "csv"
      }
    },
    layout: {
      offset: 0.58,
      nav: true,
      progress: true,
      scroll: {
        progress: "geometry"
      }
    },
    views: {
      main: {
        title: "Melbourne weather sample",
        height: 540
      }
    }
  };
}

export const story = Object.assign(createStory, {
  demo() {
    return createStory(createBaseDemo());
  }
});
