import { parsePatch } from 'diff';
import semver from 'semver';
import { AppError, MAX_BYTES, reviewInputSchema, type ReviewInput } from './index.js';
export function normalizePath(value: string) {
  const p = value.replace(/\\/g, '/');
  if (!p || p.startsWith('/') || /^[a-zA-Z]:/.test(p) || /[\x00-\x1f%]/.test(p) || p.split('/').some(x => x === '..' || x === '.' || !x))
    throw new AppError('UNSAFE_PATH','Use a repository-relative path without traversal or encoded segments.');
  return p;
}
export function validateGlob(value: string) {
  normalizePath(value);
  if (value.length > 250 || /[!{}()]/.test(value)) throw new AppError('INVALID_SCOPE','Use a literal path, * or ** glob.');
  return value;
}
export type ParsedInput = { input: ReviewInput; files: string[]; anchors: Map<string, Map<number,string>>; sources: Map<string,string>; changedLines: number };
export function parseReviewInput(raw: unknown): ParsedInput {
  if (Buffer.byteLength(JSON.stringify(raw),'utf8') > MAX_BYTES) throw new AppError('INPUT_TOO_LARGE','Total input must not exceed 30 KB.',413);
  const input = reviewInputSchema.parse(raw);
  if (/GIT binary patch|Binary files .* differ|^Submodule /m.test(input.diff)) throw new AppError('INVALID_DIFF','Binary patches and submodules are unsupported.');
  for (const [name, version] of Object.entries(input.dependency_versions)) {
    if (!semver.valid(version) || semver.prerelease(version)) throw new AppError('INVALID_VERSION','Supply a stable semantic version.',400,false,{['dependency_versions.'+name]:'Example: 1.8.0'});
  }
  let patches;
  try { patches = parsePatch(input.diff); } catch { throw new AppError('INVALID_DIFF','Unified diff hunk counts are inconsistent.'); }
  if (!patches.length || patches.some(p => !p.hunks.length || !p.oldFileName || !p.newFileName)) throw new AppError('INVALID_DIFF','Supply a unified text diff with line hunks.');
  const anchors = new Map<string,Map<number,string>>();
  const sources = new Map<string,string>();
  let changedLines = 0;
  const allPaths = new Set<string>();
  for (const patch of patches) {
    const names = [patch.oldFileName,patch.newFileName].filter((p): p is string => !!p && p !== '/dev/null');
    for (const n of names) {
      const safe = normalizePath(n.replace(/^[ab]\//,''));
      if (!/\.(ts|tsx|json|md)$/.test(safe)) throw new AppError('UNSUPPORTED_FILE','Supported input files: .ts, .tsx, .json, .md.');
    }
    const file = normalizePath((patch.newFileName === '/dev/null' ? patch.oldFileName! : patch.newFileName!).replace(/^[ab]\//,''));
    if (anchors.has(file)) throw new AppError('INVALID_DIFF','Duplicate file sections are unsupported.');
    allPaths.add(file);
    const lines = new Map<number,string>();
    for (const hunk of patch.hunks) {
      let line = hunk.newStart;
      for (const item of hunk.lines) {
        if (item[0] === '+' || item[0] === '-') changedLines++;
        if (item[0] === '+' || item[0] === ' ') {
          if (lines.has(line)) throw new AppError('INVALID_DIFF','Overlapping hunks are unsupported.');
          lines.set(line++, item.slice(1));
        }
      }
    }
    anchors.set(file,lines);
    if (patch.oldFileName === '/dev/null' && lines.size && [...lines.keys()].every((n,i) => n === i+1))
      sources.set(file,[...lines.values()].join('\n'));
  }
  for (const context of input.context_files) {
    const file = normalizePath(context.path);
    if (!/\.(ts|tsx|json|md)$/.test(file)) throw new AppError('UNSUPPORTED_FILE','Unsupported context file type.');
    if (context.content.includes('\0')) throw new AppError('INVALID_INPUT','Binary context is unsupported.');
    allPaths.add(file);
    const lines = new Map(context.content.split(/\r?\n/).map((s,i) => [i+1,s]));
    const diffLines = anchors.get(file);
    if (diffLines && [...diffLines].some(([n,s]) => lines.get(n) !== s)) throw new AppError('CONTEXT_MISMATCH','Context must match the post-change lines in the diff.');
    anchors.set(file,lines); sources.set(file,context.content);
  }
  if (allPaths.size > 3 || changedLines > 200) throw new AppError('INPUT_TOO_LARGE','Limit input to 3 files and 200 changed lines.',413);
  return { input, files: [...new Set(patches.map(p => normalizePath((p.newFileName === '/dev/null'?p.oldFileName!:p.newFileName!).replace(/^[ab]\//,''))))], anchors, sources, changedLines };
}
