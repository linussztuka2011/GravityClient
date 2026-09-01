/**
 * Comparison for the dependency ranges Fabric mods declare, e.g.
 * `">=1.21.11 <1.22"`.
 *
 * Fabric's own matcher understands the full set of semver predicates; this
 * covers the forms that actually appear in `fabric.mod.json` files — `*`, the
 * four inequalities, exact versions, and the `~`/`^` shorthands — so the
 * launcher can refuse to install a mod into an instance it will crash on
 * rather than finding out from a Fabric error screen.
 *
 * Note this handles Minecraft's year-based versions correctly by comparing
 * numerically per segment: 26.1.1 is greater than 1.22, so a mod declaring
 * `">=1.21.11 <1.22"` is correctly reported as not supporting it.
 */

interface ParsedVersion {
  numbers: number[];
  /** Anything after the numeric part, e.g. the "-snapshot-10" of 26.3-snapshot-10. */
  suffix: string;
}

function parseVersion(version: string): ParsedVersion {
  const trimmed = version.trim();
  const match = /^(\d+(?:\.\d+)*)(.*)$/.exec(trimmed);
  if (!match) {
    return { numbers: [], suffix: trimmed };
  }
  return {
    numbers: match[1].split('.').map((n) => parseInt(n, 10)),
    suffix: match[2],
  };
}

/** Returns <0, 0 or >0, ordering a pre-release below the release it precedes. */
export function compareVersions(a: string, b: string): number {
  const left = parseVersion(a);
  const right = parseVersion(b);

  const length = Math.max(left.numbers.length, right.numbers.length);
  for (let i = 0; i < length; i++) {
    const diff = (left.numbers[i] ?? 0) - (right.numbers[i] ?? 0);
    if (diff !== 0) return diff < 0 ? -1 : 1;
  }

  // 1.21.11 outranks 1.21.11-rc1; two suffixed builds fall back to text order.
  if (left.suffix === right.suffix) return 0;
  if (!left.suffix) return 1;
  if (!right.suffix) return -1;
  return left.suffix < right.suffix ? -1 : 1;
}

/** Applies one predicate, e.g. `">=1.21.11"`, to a concrete version. */
function satisfiesPredicate(version: string, predicate: string): boolean {
  const term = predicate.trim();
  if (term === '' || term === '*') return true;

  const operatorMatch = /^(>=|<=|>|<|=|\^|~)?\s*(.+)$/.exec(term);
  if (!operatorMatch) return false;

  const [, operator = '=', target] = operatorMatch;
  const cmp = compareVersions(version, target);

  switch (operator) {
    case '>=': return cmp >= 0;
    case '<=': return cmp <= 0;
    case '>': return cmp > 0;
    case '<': return cmp < 0;
    case '=': return cmp === 0;
    // ~1.21.11 allows patch bumps, ^1.21.11 allows minor bumps. Both are
    // lower-bounded by the target and capped by the segment above it.
    case '~':
    case '^': {
      if (cmp < 0) return false;
      const parts = parseVersion(target).numbers;
      const capIndex = operator === '~' ? Math.max(parts.length - 2, 0) : 0;
      const cap = parts.slice(0, capIndex + 1);
      cap[capIndex] = (cap[capIndex] ?? 0) + 1;
      return compareVersions(version, cap.join('.')) < 0;
    }
    default: return false;
  }
}

/**
 * True when `version` satisfies every space-separated predicate in `range`.
 * An empty or missing range means "no constraint".
 */
export function satisfiesRange(version: string, range: string | undefined | null): boolean {
  if (!range || range.trim() === '' || range.trim() === '*') return true;
  return range
    .trim()
    .split(/\s+/)
    .every((predicate) => satisfiesPredicate(version, predicate));
}
