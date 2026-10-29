import { readdirSync } from 'node:fs';
import type { RigConfig } from './config.js';
import { readNight } from './digest/reader.js';
import type { RunStatus } from './digest/types.js';
import { lastBeat, type Beat } from './heartbeat.js';

// Per-job counts of one night, by each job's last status. Null counts: the night file could not be read.
export type NightSummary = {
  night: string;
  ok: number | null;
  retry: number | null;
  fail: number | null;
};

export type Status = {
  adapter: string;
  installed: string;
  lastBeat: Beat | null;
  nights: NightSummary[];
};

// Nights on disk = runs/<YYYY-MM-DD>.jsonl, newest first.
export function nightsOnDisk(runsDir: string): string[] {
  try {
    return readdirSync(runsDir)
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.jsonl$/.test(f))
      .map((f) => f.slice(0, 10))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

// Counts are per job: rows of the night whose lastStatus is ok, retry, fail (the same rows the digest shows).
export function nightSummary(runsDir: string, night: string): NightSummary {
  const n = readNight(runsDir, night);
  if (n === null) return { night, ok: null, retry: null, fail: null };
  const count = (s: RunStatus): number => n.rows.filter((r) => r.lastStatus === s).length;
  return { night, ok: count('ok'), retry: count('retry'), fail: count('fail') };
}

export function readStatus(config: RigConfig): Status {
  return {
    adapter: config.adapter,
    installed: config.installed,
    lastBeat: lastBeat(),
    nights: nightsOnDisk(config.runsDir).map((night) => nightSummary(config.runsDir, night)),
  };
}
