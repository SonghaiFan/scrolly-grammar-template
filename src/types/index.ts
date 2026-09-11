// ─── Channel & Encoding ──────────────────────────────────────────────────────

export type ChannelType = 'quantitative' | 'temporal' | 'nominal' | 'ordinal';
export type SortOrder = 'ascending' | 'descending';

export interface SortSpec {
  field?: string;
  order?: SortOrder;
  op?: string;
}

export interface ChannelSpec {
  field?: string;
  type?: ChannelType;
  title?: string;
  aggregate?: string | boolean;
  timeUnit?: string;
  value?: string;
  sort?: SortOrder | SortSpec;
  domain?: unknown[];
  scale?: Record<string, unknown>;
  bin?: boolean | Record<string, unknown>;
  [key: string]: unknown;
}

export interface EncodingSpec {
  x?: ChannelSpec;
  y?: ChannelSpec;
  color?: ChannelSpec;
  /** Declares grouping/detail identity without assigning a visual property. */
  detail?: ChannelSpec;
  size?: ChannelSpec;
  xOffset?: ChannelSpec;
  yOffset?: ChannelSpec;
  tooltip?: ChannelSpec | ChannelSpec[];
  key?: ChannelSpec;
  [channel: string]: ChannelSpec | ChannelSpec[] | undefined;
}

// ─── Transforms & Filters ────────────────────────────────────────────────────

export interface FilterSpec {
  field: string;
  equal?: unknown;
  notEqual?: unknown;
  gt?: number;
  lt?: number;
  gte?: number;
  lte?: number;
  oneOf?: unknown[];
  [key: string]: unknown;
}

export interface AggregateFieldSpec {
  op: string;
  field?: string;
  as: string;
}

export interface AggregateTransform {
  groupby: string[];
  fields: AggregateFieldSpec[];
}

export interface TimeUnitTransform {
  field: string;
  unit: string;
  as: string;
}

export type TransformSpec =
  | { filter: FilterSpec | string; [key: string]: unknown }
  | { aggregate: AggregateTransform; [key: string]: unknown }
  | { sort: SortSpec & { field: string }; [key: string]: unknown }
  | { timeUnit: TimeUnitTransform; [key: string]: unknown }
  | Record<string, unknown>;

// ─── Timing ──────────────────────────────────────────────────────────────────

export interface StaggerSpec {
  step?: number;
  max?: number;
}

export interface TransitionSpec {
  duration?: number;
  ease?: string;
  stagger?: StaggerSpec | number;
}

export interface TransitionOrder {
  order?: Array<'x' | 'y'>;
  duration?: number;
  stagger?: StaggerSpec;
}

export interface TimingDefaults {
  transition: Required<TransitionSpec> & { stagger: StaggerSpec };
  scene: { stagger: StaggerSpec };
  step: { minDuration: number };
  unit: {
    axisDurationMultiplier: number;
    xRatio: number;
    stagger: StaggerSpec;
    xStagger: StaggerSpec;
  };
}

// ─── Layout & Margin ─────────────────────────────────────────────────────────

export interface MarginSpec {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

// ─── Selection / Axis / Detail ─────────────────────────────────────────────

export interface SelectionSpec {
  field?: string;
  equal?: unknown;
  mode?: 'highlight' | 'filter' | 'focus';
  filter?: FilterSpec;
  opacity?: number;
  [key: string]: unknown;
}

export interface AxisSpec {
  flip?: boolean;
  layout?: BarLayout;
  orientation?: BarOrientation;
  xScale?: string;
  yScale?: string;
  order?: Array<'x' | 'y'>;
  duration?: number;
  stagger?: StaggerSpec;
  scale?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface DetailSpec {
  category?: string | null;
  categoryTitle?: string;
  categoryField?: string | null;
  fields?: string[];
  labels?: Record<string, string>;
  segment?: string;
  segmentField?: string | null;
  value?: string;
  valueTitle?: string;
  valueField?: string | null;
  layout?: BarLayout;
  color?: ChannelSpec;
  domain?: unknown[];
  range?: unknown[];
  source?: string;
  groupby?: string[];
  op?: string;
  [key: string]: unknown;
}

// ─── Semantic Key ─────────────────────────────────────────────────────────────

export interface SemanticKeyPart {
  field?: string;
  value?: unknown;
}

export type SemanticKeyPartInput = string | SemanticKeyPart | Array<string | SemanticKeyPart>;

export interface SemanticKey {
  entity?: SemanticKeyPartInput;
  entities?: SemanticKeyPartInput;
  measure?: SemanticKeyPartInput;
  measures?: SemanticKeyPartInput;
}

// ─── Spec metadata ───────────────────────────────────────────────────────────

export interface ObjectMeta {
  key?: string | string[] | null;
  semantic?: Record<string, unknown>;
}

export interface ChartChangeState {
  selection?: SelectionSpec;
  axis?: AxisSpec;
  detail?: DetailSpec;
  [key: string]: unknown;
}

export interface ChartStateMeta {
  selection?: SelectionSpec | null;
  axis?: AxisSpec | null;
  detail?: DetailSpec | null;
  sceneState?: ChartChangeState;
}

export interface SpecMeta {
  object?: ObjectMeta;
  state?: ChartStateMeta;
  transition?: TransitionSpec;
  transform?: TransformSpec[];
  action?: { scroll?: ScrollSpec };
  unit?: Record<string, unknown>;
  annotation?: { title?: string; description?: string };
  [key: string]: unknown;
}

export interface ResolvedChartState {
  selection: SelectionSpec | null;
  axis: AxisSpec | null;
  detail: DetailSpec | null;
  sceneState: ChartChangeState;
}

// ─── View Spec ────────────────────────────────────────────────────────────────

export type Mark = 'bar' | 'line' | 'point' | 'unit' | (string & {});
export type ScrollSpec = true | { ease?: string; [key: string]: unknown };

export interface ViewSpec {
  mark?: Mark;
  data?: string | { name: string } | Record<string, unknown>;
  encoding?: EncodingSpec;
  transform?: TransformSpec[];
  filter?: FilterSpec;
  key?: string | string[] | null;
  semanticKey?: SemanticKey | null;
  transition?: TransitionSpec;
  scroll?: ScrollSpec;
  axis?: AxisSpec | null;
  detail?: DetailSpec | null;
  selection?: SelectionSpec | null;
  unit?: Record<string, unknown> | null;
  meta?: SpecMeta;
  margin?: Partial<MarginSpec>;
  [field: string]: unknown;
}

// ─── Story ───────────────────────────────────────────────────────────────────

export type StepActionToken = 'step' | 'scroll' | 'tooltip' | 'enter';
export type StepActionInput = StepActionToken | string;

export interface StepDefinition {
  title?: string;
  body?: string;
  view?: ViewSpec | { toSpec(): ViewSpec };
  action?: StepActionInput | StepActionInput[];
  code?: string;
}

export interface StepSpec {
  id?: string;
  title?: string;
  body?: string;
  transition?: { scene: string[] };
  action?: StepActionToken[];
  views?: Record<string, ViewSpec>;
  inspector?: { code: string };
}

export interface LayoutSpec {
  preset?: string;
  [key: string]: unknown;
}

export interface ThemeSpec {
  href?: string;
  [key: string]: unknown;
}

export interface StorySpec {
  $schema?: string;
  title?: string;
  description?: string;
  data?: Record<string, unknown>;
  layout?: LayoutSpec;
  theme?: ThemeSpec;
  views?: Record<string, ViewSpec>;
  steps?: StepSpec[];
}

// ─── Bar-specific ─────────────────────────────────────────────────────────────

export type BarLayout = 'simple' | 'grouped' | 'stacked';
export type BarOrientation = 'vertical' | 'horizontal';

export interface ChannelSignature {
  field: string | null;
  title: string | null;
  type: string | null;
  aggregate: string | null;
  domain: unknown[] | null;
  scale: Record<string, unknown> | null;
  sort: unknown | null;
  bin: unknown | null;
}

export interface BarGeometryRole {
  role: 'category' | 'measure';
  field: string | null;
  filters?: FilterSpec[];
}

export interface BarGeometrySegment {
  field: string;
  color: ChannelSignature;
}

export interface BarGeometryState {
  orientation: BarOrientation;
  layout: BarLayout;
  category?: BarGeometryRole;
  measure?: BarGeometryRole;
  segment?: BarGeometrySegment | null;
  channel: ChannelSignature;
}

export interface BarSemanticState {
  orientation: BarOrientation;
  layout: BarLayout;
  categoryField: string | null;
  measureField: string | null;
  axis: AxisSpec | null;
  detail: DetailSpec | null;
  aggregate: AggregateTransform | AggregateTransform[] | null;
  segmentField: string | null;
  xGeometry: BarGeometryState;
  yGeometry: BarGeometryState;
}

// ─── Grammar internal ─────────────────────────────────────────────────────────

export interface GrammarMeta {
  operations?: string[];
  /** Per-chart-type scene capabilities (e.g. bar opts out of `mapping`). */
  capabilities?: Record<string, boolean>;
}

// ─── Diff ─────────────────────────────────────────────────────────────────────

export type DeltaAction = 'add' | 'remove' | 'change';

export interface Delta<T = unknown> {
  type: string;
  action: DeltaAction;
  previous: T | null;
  next: T | null;
}

export interface SemanticViewState {
  mark: string | null;
  key: string | string[] | null;
  semanticKey: SemanticKey | null;
  encoding: EncodingSpec;
  filters: FilterSpec[];
  nonFilterTransforms: TransformSpec[];
  selection: SelectionSpec | null;
  axis: AxisSpec | null;
  detail: DetailSpec | null;
  bar?: BarSemanticState;
}

export interface SemanticDiffResult {
  previous: SemanticViewState;
  next: SemanticViewState;
  deltas: Delta[];
  has(type: string, action?: DeltaAction | null): boolean;
  get<T = unknown>(type: string): Delta<T> | null;
}

export interface DiffResult {
  changed: string[];
  has(key: string): boolean;
  deltas: Delta[];
  delta<T = unknown>(type: string): Delta<T> | null;
  hasDelta(type: string, action?: DeltaAction | null): boolean;
  semantic: SemanticDiffResult;
  previous: SemanticViewState;
  next: SemanticViewState;
}

// ─── Transition planning ──────────────────────────────────────────────────────

export type ChartPart = 'x' | 'y';
export type TransitionChange = 'scale' | 'axis' | 'marks' | 'enter' | 'exit';

export interface TransitionMatch {
  mode: string;
  reason: string;
}

export interface TransitionStep {
  part?: ChartPart;
  changes: TransitionChange[];
}

export interface TransitionPlanBaseline {
  name: string;
  anchor?: string;
  value?: number;
  meaning: string;
}

export interface TransitionItemAction {
  mode: string;
  reason: string;
  from?: string;
  to?: string;
  target?: string;
  source?: string;
  baseline?: TransitionPlanBaseline;
  parentKey?: string | null;
  childKey?: Array<string | null>;
  targetLayout?: BarLayout;
  sourceLayout?: BarLayout;
  sourceOrientation?: BarOrientation;
  categoryKey?: string | null;
  segmentKey?: string | null;
  valueKey?: string | null;
}

export interface TransitionPlanDiffEntry {
  type: string;
  action: DeltaAction;
  previous: unknown;
  next: unknown;
}

export interface TransitionPlan {
  diff?: TransitionPlanDiffEntry[];
  reason?: string;
  target?: { orientation: BarOrientation; layout: BarLayout; renderer: string };
  match?: TransitionMatch;
  enter?: TransitionItemAction;
  exit?: TransitionItemAction;
  steps?: TransitionStep[];
  timing?: TransitionSpec;
  totalDuration?: number;
}

// ─── Chart type ───────────────────────────────────────────────────────────────

export type DataRow = Record<string, unknown>;

export interface ChartContext {
  g: unknown;
  scene: unknown;
  transition: unknown;
  transitionPlan?: TransitionPlan;
  scales?: unknown;
  channels?: EncodingSpec;
  position?: unknown;
  [key: string]: unknown;
}

export interface TooltipContext {
  show(content: string | HTMLElement, options?: Record<string, unknown>): void;
  hide(): void;
  [key: string]: unknown;
}

export type D3Lib = Record<string, unknown>;

export type Renderer<S extends ViewSpec = ViewSpec> = (
  chart: ChartContext,
  rows: DataRow[],
  spec: S,
  tooltip: TooltipContext,
  d3: D3Lib
) => void;

export type StateOperations = Record<string, string>;

export interface IntermediateSpec<S extends ViewSpec = ViewSpec> {
  spec: S;
  scene: string;
}

export interface CanonicalTransitionPair<S extends ViewSpec = ViewSpec> {
  from: S;
  to: S;
  /** Map authored progress p to canonical progress 1 - p. */
  reverse: boolean;
}

export interface CompilerContext {
  [key: string]: unknown;
}

export interface SpecCompiler {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  base(spec: ViewSpec, context: Record<string, unknown>): ViewSpec;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  operations: Record<string, (spec: ViewSpec, operationSpec: any, context: Record<string, unknown>) => ViewSpec>;
}

export interface ChartDeps {
  drawGrid?: (chart: ChartContext, scale: unknown, d3: D3Lib) => void;
  drawXAxis?: (chart: ChartContext, scale: unknown, title: string | undefined, d3: D3Lib) => void;
  drawYAxis?: (chart: ChartContext, scale: unknown, title: string | undefined, d3: D3Lib) => void;
  drawLegend?: (chart: ChartContext, rows: DataRow[], colorSpec: ChannelSpec | undefined, d3: D3Lib) => void;
  fadeNonBarShapes?: (chart: ChartContext) => void;
  [key: string]: unknown;
}

export interface ChartType<S extends ViewSpec = ViewSpec> {
  key: string;
  /** Opt in only when all animated SVG properties can be captured and sought. */
  transitionEvaluation?: 'cached' | 'reconstruct';
  renderer: Renderer<S>;
  prepareSpec(spec: S): S;
  resolveTransitionPlan(prev: S | null, next: S | null): TransitionPlan;
  /**
   * Optionally compile opposite authored directions as one reversible path.
   * The public transition still exposes the endpoints in authored order.
   */
  canonicalTransitionPair?(prev: S, next: S): CanonicalTransitionPair<S>;
  intermediateSpecs?(prev: S, next: S): IntermediateSpec<S>[];
  defaultMargin(spec: S): Partial<MarginSpec>;
  readonly scenes: readonly string[];
  readonly stateOperations: StateOperations;
  inspect?: Record<string, unknown>;
  createSpecCompiler?: (context: CompilerContext) => SpecCompiler;
}

export interface ChartPlugin<S extends ViewSpec = ViewSpec> {
  key: string;
  readonly scenes: readonly string[];
  readonly stateOperations: StateOperations;
  createChartType(deps: ChartDeps): ChartType<S>;
  createSpecCompiler?: (context: CompilerContext) => SpecCompiler;
}

// ─── Actions & Events ─────────────────────────────────────────────────────────

export type ActionType =
  | 'enter' | 'exit' | 'step' | 'scroll' | 'progress'
  | 'tooltip' | 'input' | 'scrub' | 'click' | 'unclick'
  | (string & {});

export type Direction = 'up' | 'down' | (string & {});
export type ActionToken = 'step' | 'scroll' | 'tooltip' | 'enter' | (string & {});

export type RawActionEvent =
  | number
  | string
  | Event
  | {
      type?: string;
      step?: number;
      index?: number;
      value?: number;
      progress?: number;
      scrollProgress?: number;
      direction?: Direction;
      action?: ActionToken | ActionToken[];
      force?: boolean;
    };

export interface NormalizedActionEvent {
  type: ActionType;
  index: number;
  value: number;
  direction: Direction;
  action: ActionToken[];
  force?: boolean;
  progress: boolean;
}

// ─── Runtime ─────────────────────────────────────────────────────────────────

export type Target = string | Element;

export interface RuntimeOptions {
  target?: Target;
  d3: D3Lib;
  aq?: Record<string, unknown>;
  debug?: boolean;
}

export interface PageOptions {
  target?: Target;
  debug?: boolean;
}

export interface ChartOptions extends RuntimeOptions {
  view?: string;
  viewId?: string;
  initialStep?: number;
}

export interface ScrollRuntime {
  readonly type: 'native';
  resize(): void;
  refresh(): void;
  scrollToStep(index: number, options?: { progress?: number; behavior?: 'instant' | 'smooth' | 'auto' }): number | null;
  destroy(): void;
}

export interface StoryRuntime {
  spec: StorySpec;
  data: Record<string, unknown>;
  signature: Record<string, unknown>[];
  /** Programmatically jump to step `index` with a natural animated transition. */
  to(index: number): void;
  scrollDriver: ScrollRuntime;
  destroy(): void;
}

export interface PageRuntime {
  spec: StorySpec;
  shell: Record<string, unknown>;
  root: Element;
  story: Element;
  steps: Element[];
  views: Record<string, Element>;
  tooltip: Element;
  destroy(): void;
}

/** A state returned by Seq navigation methods */
export interface SeqState {
  spec: ViewSpec;
  text: string;
  title?: string;
  index: number;
}

export interface ChartRuntime {
  spec: StorySpec;
  data: Record<string, unknown>;
  view: Element;
  tooltip: Element;
  /**
   * Animate to a step with a full animated transition.
   * Accepts a step index, or a SeqState object from `seq.next()` / `seq.at(n)`.
   * Works with any event trigger — button click, route change, hover, timer, etc.
   *
   * @example
   * chart.to(1);
   * chart.to(seq.next());  // SeqState — index is extracted automatically
   * el.addEventListener('mouseenter', () => chart.to(1));
   */
  to(target: number | SeqState | { index: number }): void;
  /**
   * Scrub the transition toward step `index` at a continuous `value` (0 → 1).
   * Use with sliders, scroll offsets, or any gesture-driven input.
   *
   * @example
   * slider.oninput = () => chart.progress(1, +slider.value);
   */
  progress(index: number, value: number): void;
  resize(): void;
  destroy(): void;
}
