export function unitKey(datum: Record<string, unknown>): unknown {
  return datum['__joinKey'] ?? datum['__unitKey'];
}
