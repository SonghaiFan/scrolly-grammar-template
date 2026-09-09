# Scrollytelling composition (temporary)

This private package contains the narrative and page-orchestration layer that
was extracted from VisDelta. It is intentionally kept inside the repository
for now and is expected to be integrated into ScrollyTale later.

## Boundary

This package owns:

- `story()` and `seq()` composition
- `createStory()`, `createPage()`, and multi-step `createChart()`
- story layout and theme mounting
- navigation, native scroll progress, resize, and hash restoration
- narrative shell styles and the weather scrollytelling example

VisDelta owns visualization declarations, semantic delta computation,
rendering, and seekable pair transitions. This package consumes the explicit
`visdelta/composition` adapter surface instead of importing private source
paths.

## Development

```bash
npm install
npm test
npm run test:browser
```

The build first rebuilds the parent VisDelta package, then compiles this
package against its generated composition contract. Browser examples use an
import map for the local `visdelta/composition` adapter during repository QA.
