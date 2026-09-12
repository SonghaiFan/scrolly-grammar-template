# Transition runtime

## `transition(from, to, options)`

Creates one seekable transition between two states of the same chart type.

```js
const change = await transition(from, to, {
  target: "#chart",
  d3,
  aq,
  data: { sales: rows },
  height: 420,
  chartStyle: paperChartStyle
});
```

| Option | Meaning |
| --- | --- |
| `target` | CSS selector or element; defaults to `#app` |
| `d3` | Required D3 dependency |
| `aq` | Arquero dependency, required only when transforms run |
| `data` | Named tidy datasets used by either state |
| `height` | Explicit chart height |
| `chartStyle` | One structural style shared by both endpoints |

The runtime snapshots and resolves both states before mounting. If setup fails,
the previous target contents are restored.

## Controller

| Member | Meaning |
| --- | --- |
| `from`, `to` | Defensive copies of the authored endpoints |
| `delta` | Semantic difference between the resolved endpoints |
| `view` | Mounted chart-view element |
| `value` | Current progress |
| `progress(value)` | Pause playback and show one frame; direction is inferred from the previous value |
| `play({ duration?, from?, to? })` | Animate across any part of the `0`–`1` interval |
| `pause()` | Stop owned playback at the current frame |
| `resize()` | Recompile at the current container size and keep progress |
| `destroy()` | Stop playback and remove the mounted transition |

Finite progress is clamped to `[0, 1]`; non-finite values are rejected.
Arbitrary seek order is supported. For fixed data, size, style, and chart module,
directly seeking to a progress value returns the same frame.

```js
slider.addEventListener("input", event => {
  change.progress(event.currentTarget.valueAsNumber);
});

window.addEventListener("resize", () => change.resize());
```

Controls remain outside VisDelta. Buttons, sliders, scroll, gestures, routes,
media clocks, and tests all use the same `progress()` method.

Call `destroy()` when the host component unmounts.
