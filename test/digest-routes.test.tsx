import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

// runs/ is read-only: every test builds its own temp runs dir.
const line = (at: string, job: string, status: string, owner: string | null, error?: string) =>
  JSON.stringify({ at, job, status, owner, ...(error ? { error } : {}) });

function appWith(files: Record<string, string>) {
  const runsDir = mkdtempSync(join(tmpdir(), 'rig-routes-'));
  for (const [night, content] of Object.entries(files)) writeFileSync(join(runsDir, `${night}.jsonl`), content);
  return createApp({ adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir });
}

const normal = [
  line('2026-01-01T01:00:00+01:00', 'b/job', 'ok', 'rook'),
  line('2026-01-01T01:30:00+01:00', 'a/job', 'retry', null, 'upstream 503'),
  line('2026-01-01T01:31:00+01:00', 'a/job', 'retry', null, 'upstream 503'),
  line('2026-01-01T01:32:00+01:00', 'a/job', 'retry', null, 'upstream 503'),
  line('2026-01-01T01:33:00+01:00', 'a/job', 'fail', null, 'gave up'),
].join('\n');

describe('GET /digest/:night', () => {
  it('200: one table sorted by job, fail and retries marked, missing owner as —', async () => {
    const res = await appWith({ '2026-01-01': normal }).request('/digest/2026-01-01');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html.indexOf('a/job')).toBeLessThan(html.indexOf('b/job'));
    expect(html).toContain('retries');
    expect(html).toContain('fail');
    expect(html).toContain('—');
    expect(html).toContain('2026-01-01T01:30:00+01:00');
  });

  it('404 for a night with no file', async () => {
    const res = await appWith({}).request('/digest/2026-01-01');
    expect(res.status).toBe(404);
  });

  it('404 for a night that is not a date', async () => {
    const res = await appWith({}).request('/digest/not-a-night');
    expect(res.status).toBe(404);
  });

  it('empty night renders "nothing ran"', async () => {
    const res = await appWith({ '2026-01-02': '' }).request('/digest/2026-01-02');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('a night with a bad line still renders and says how many were skipped', async () => {
    const res = await appWith({ '2026-01-03': `${normal}\n{"at":"2026-01-01T0` }).request('/digest/2026-01-03');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('a/job');
    expect(html).toContain('1 bad line skipped');
  });
});

describe('GET /api/digest/:night', () => {
  it('200: the same jobs, in the same order, as the page', async () => {
    const app = appWith({ '2026-01-01': normal });
    const json = (await (await app.request('/api/digest/2026-01-01')).json()) as { rows: { job: string }[] };
    const html = await (await app.request('/digest/2026-01-01')).text();
    expect(json.rows.map((r) => r.job)).toEqual(['a/job', 'b/job']);
    expect(html.indexOf('a/job')).toBeLessThan(html.indexOf('b/job'));
  });

  it('404 for a night with no file', async () => {
    const res = await appWith({}).request('/api/digest/2026-01-01');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'no such night' });
  });

  it('404 for a night that is not a date', async () => {
    const res = await appWith({}).request('/api/digest/not-a-night');
    expect(res.status).toBe(404);
  });

  it('empty night: 200 with no rows', async () => {
    const res = await appWith({ '2026-01-02': '' }).request('/api/digest/2026-01-02');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ night: '2026-01-02', rows: [], badLines: 0 });
  });

  it('a night with a bad line: 200, the bad line counted', async () => {
    const res = await appWith({ '2026-01-03': `${normal}\nnot json` }).request('/api/digest/2026-01-03');
    const json = (await res.json()) as { rows: unknown[]; badLines: number };
    expect(res.status).toBe(200);
    expect(json.badLines).toBe(1);
    expect(json.rows).toHaveLength(2);
  });
});
