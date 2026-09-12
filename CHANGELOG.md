# Changelog

## 0.2.0 - Unreleased first release

VisDelta is a greenfield library. There is no compatibility layer or migration
API in this release.

### Language and runtime

- Added immutable chart states, `delta(from, to)`, and a seekable
  `transition(from, to)` controller.
- Added exact progress control, play, pause, reverse, resize, and destroy.
- Defined one semantic rule for every chart: each rendered frame keeps marks,
  scales, axes, ticks, and grid lines consistent.
- Defined one membership order: exit marks before the scale changes; change the
  scale before entering marks appear. Reverse traverses the same frames.
- Separated `.where()` (membership), `.highlight()` (attention), and `.focus()`
  (camera only).
- Added tidy-data input from arrays, CSV URLs, promises, and optional declared
  transforms. VisDelta does not clean or reshape undeclared data.
- Added quantitative, nominal, ordinal, and temporal type detection.

### Chart modules

- Added peer `area`, `bar`, `line`, `point`, and `unit` modules. Core contains no
  chart-name branches.
- Added lazy chart loading and public plugin registration. A chart state carries
  its own module, so importing a new chart type is sufficient to use it.
- Kept chart-specific geometry, matching, transition planning, axes, and
  rendering inside each chart module.
- Added D3 curve names directly for Line and Area.
- Added key-aware Line and Area path transitions, honest gaps, staged
  add/remove, and reversible split/merge.
- Added Point detail/summary motion and optional transition-only gooey blending.
- Added Unit `grid`, centered `force`, categorical `bar`, and `beeswarm` layouts. Unit matching
  preserves explicit keys first, then globally minimizes unmatched travel.
- Centered Unit bar stacks on their category ticks.

### Documentation and packaging

- Added real-data editable labs for every chart type and real-browser regression
  coverage for forward, reverse, and arbitrary progress.
- Reduced the documentation to one language-and-implementation guide, one API
  reference, focused chart/data/runtime pages, and the labs.
- Removed the earlier story/composition layer, scroll actions, compatibility
  themes, duplicate design essays, and generated browser artifacts from source.
- Added focused package entries for Core, each chart type, transitions, plugins,
  chart styles, browser use, and three CSS themes.

The implementation rules are documented in
[docs/language-framework.md](docs/language-framework.md).
