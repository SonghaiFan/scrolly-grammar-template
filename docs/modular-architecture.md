# Module boundaries

VisDelta is now the visualization-transition package. Narrative page
composition has been extracted to the private `scrollytelling/` package for
later integration into ScrollyTale.

## Ownership

| Package | Owns |
| --- | --- |
| `visdelta` | Immutable visualization declarations, semantic delta, chart idioms, rendering, data transforms, and seekable pair transitions |
| `scrollytelling/` | `story()`, `seq()`, multi-step chart composition, page shell, layout, theme mounting, navigation, scroll progress, resize, and hash restoration |

The dependency direction is one way:

```text
scrollytelling
      ↓
visdelta/composition
      ↓
VisDelta chart and transition internals
```

VisDelta never imports the scrollytelling package. A focused transition can
therefore be installed, bundled, and used without a Story shell or scroll
driver.

## Public VisDelta entries

| Entry | Responsibility |
| --- | --- |
| `visdelta` | Visualization authoring, delta, transition, and plugin registration |
| `visdelta/core` | DOM-free normalization and semantic delta |
| `visdelta/bar` | Focused immutable bar authoring |
| `visdelta/transition` | Pair initialization, seek, play, pause, resize, and destroy |
| `visdelta/plugins` | Plugin definition and registration |
| `visdelta/browser` | The same transition API with browser-global dependency fallback |
| `visdelta/composition` | Lower-level adapter surface for driver packages; not the beginner entry |

`story`, `seq`, `createStory`, `createChart`, `createPage`, `render`, `chart`,
and `page` are no longer exported by VisDelta. They currently belong to
`@visdelta/scrollytelling` inside this repository.

## Size gates

`npm run bundle:check` measures three focused closures: core delta, bar
authoring, and bar plus transition. The transition closure rejects the
composition adapter, unrelated chart idioms, and the extracted scrollytelling
directory.

The measured transition bundle excludes D3, optional Arquero, and CSS. D3 is a
peer dependency. Arquero remains optional when no transform pipeline is
declared.

## Remaining cleanup

- `NarrativeSpec` metadata and several legacy `scroll`-named internal helpers
  still participate in transition compilation. They are compatibility wire
  format, not ownership of the scroll driver.
- The `visdelta/composition` surface is intentionally explicit but broad.
  It should shrink into a smaller renderer/driver contract before ScrollyTale
  consumes it permanently.
- Story CSS lives in the temporary package. The core stylesheet contains only
  visualization tokens, chart surfaces, marks, guides, legends, and tooltips.
- Arquero should later sit behind a transform-engine interface or be replaced
  for the supported subset by native arrays plus D3.

This split changes package ownership. It does not by itself claim cross-idiom
morphing, universal cached seeking, Shadow DOM isolation, or a published
ScrollyTale integration.
