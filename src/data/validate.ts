import { normalizeFilter } from './filter.js';

const operations = ['filter', 'timeUnit', 'fold', 'bin', 'aggregate', 'sort', 'limit'];
type ObjectSpec = Record<string, any>;

export function validateTransforms(transforms: unknown): void {
  if (!Array.isArray(transforms)) throw new Error('transform must be an array.');
  transforms.forEach((entry, index) => {
    try {
      const transform = object(entry);
      const keys = Object.keys(transform);
      if (keys.length !== 1 || !operations.includes(keys[0]!)) throw new Error('Expected one supported transform operation per entry.');
      const key = keys[0]!;
      const value = transform[key];
      if (key === 'filter') { normalizeFilter(value); return; }
      if (key === 'limit') { integer(value, 0, 'limit'); return; }
      const config = object(value);
      if (key === 'timeUnit') {
        fields(config, ['field', 'unit', 'as']); field(config.field);
        if (config.unit !== 'month') throw new Error('Only timeUnit "month" is supported.');
      } else if (key === 'bin') {
        fields(config, ['field', 'as', 'step', 'maxbins']); field(config.field);
        if (config.step !== undefined && (!Number.isFinite(config.step) || config.step <= 0)) throw new Error('bin.step must be positive and finite.');
        if (config.maxbins !== undefined) integer(config.maxbins, 1, 'bin.maxbins');
      } else if (key === 'fold') {
        fields(config, ['fields', 'as', 'labels', 'sourceAs', 'labelAs']); fieldList(config.fields, false);
        if (config.as !== undefined) {
          if (!Array.isArray(config.as) || config.as.length !== 2) throw new Error('fold.as must contain two field names.');
          config.as.forEach(field);
        }
        for (const name of ['sourceAs', 'labelAs']) if (config[name] !== undefined) field(config[name]);
        if (config.labels !== undefined) object(config.labels);
        return;
      } else if (key === 'aggregate') {
        fields(config, ['groupby', 'fields']);
        if (config.groupby !== undefined) fieldList(config.groupby, true);
        if (config.fields !== undefined) {
          if (!Array.isArray(config.fields) || !config.fields.length) throw new Error('aggregate.fields must be a non-empty array.');
          config.fields.forEach((entry: unknown) => {
            const metric = object(entry); fields(metric, ['op', 'field', 'as']);
            const op = metric.op ?? 'count';
            if (!['count', 'sum', 'mean', 'min', 'max', 'median'].includes(op)) throw new Error(`Unsupported aggregate operator: ${op}`);
            if (op !== 'count' || metric.field !== undefined) field(metric.field);
            if (metric.as !== undefined) field(metric.as);
          });
        }
      } else if (key === 'sort') {
        fields(config, ['fields', 'field', 'order']);
        if (config.fields !== undefined) {
          if (config.field !== undefined || config.order !== undefined) throw new Error('Use sort.fields or sort.field/order, not both.');
          if (!Array.isArray(config.fields) || !config.fields.length) throw new Error('sort.fields must be non-empty.');
          config.fields.forEach((value: unknown) => typeof value === 'string' ? field(value) : sortField(object(value)));
        } else sortField(config);
      }
      if (config.as !== undefined) field(config.as);
    } catch (error) {
      throw new Error(`transform[${index}]: ${(error as Error).message}`);
    }
  });
}

function object(value: unknown): ObjectSpec {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected a configuration object.');
  return value as ObjectSpec;
}
function fields(value: ObjectSpec, allowed: string[]) {
  const unknown = Object.keys(value).find(key => !allowed.includes(key));
  if (unknown) throw new Error(`Unsupported property: ${unknown}`);
}
function field(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Expected a non-empty field name.');
}
function fieldList(value: unknown, empty: boolean) {
  if (!Array.isArray(value) || (!empty && !value.length)) throw new Error('Expected an array of field names.');
  value.forEach(field);
}
function integer(value: unknown, minimum: number, name: string) {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) throw new Error(`${name} must be an integer >= ${minimum}.`);
}
function sortField(value: ObjectSpec) {
  fields(value, ['field', 'order']); field(value.field);
  if (value.order !== undefined && !['ascending', 'descending'].includes(value.order)) throw new Error('sort.order must be ascending or descending.');
}
