import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/reader.js';

function runsDirWith(night: string, content: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
  writeFileSync(join(dir, `${night}.jsonl`), content);
  return dir;
}

describe('readNight', () => {
  it('reads runs/2026-10-28.jsonl: 5 jobs, 1 bad line', () => {
    const night = readNight('runs', '2026-10-28');
    expect(night?.badLines).toBe(1);
    expect(night?.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
  });

  it('counts runs and retries and keeps the last error and the log offsets', () => {
    const row = readNight('runs', '2026-10-28')?.rows.find((r) => r.job === 'fixtures/refresh');
    expect(row).toEqual({
      job: 'fixtures/refresh',
      owner: 'rook',
      runs: 4,
      retries: 3,
      lastStatus: 'ok',
      lastError: 'upstream 503',
      first: '2026-10-29T01:30:00+01:00',
      last: '2026-10-29T01:37:00+01:00',
    });
  });

  it('keeps a row whose owner is null', () => {
    const row = readNight('runs', '2026-10-28')?.rows.find((r) => r.job === 'digest/render');
    expect(row?.owner).toBeNull();
  });

  it('marks a failed job as fail', () => {
    const row = readNight('runs', '2026-10-28')?.rows.find((r) => r.job === 'notes/backup');
    expect(row?.lastStatus).toBe('fail');
    expect(row?.lastError).toBe('quota exceeded');
  });

  it('returns null for a night with no file', () => {
    expect(readNight('runs', '1999-01-01')).toBeNull();
  });

  it('returns no rows for an empty file', () => {
    expect(readNight(runsDirWith('2026-01-01', ''), '2026-01-01')).toEqual({
      night: '2026-01-01',
      rows: [],
      badLines: 0,
    });
  });

  it('counts, never throws, on lines that do not parse or have the wrong shape', () => {
    const dir = runsDirWith(
      '2026-01-02',
      [
        '{"at":"2026-01-02T01:00:00+01:00","job":"a","status":"ok","owner":null}',
        'not json',
        '{"at":"2026-01-02T02:00:00+01:00","job":"b","status":"weird","owner":null}',
        '[1,2]',
        '',
      ].join('\n'),
    );
    const night = readNight(dir, '2026-01-02');
    expect(night?.badLines).toBe(3);
    expect(night?.rows.map((r) => r.job)).toEqual(['a']);
  });
});
