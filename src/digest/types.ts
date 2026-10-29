// Plan morning-digest, section 1. The contract every part of the digest builds on.

export type RunStatus = 'ok' | 'retry' | 'fail';

// One row per job in a night's run log.
export type DigestRow = {
  job: string;
  // Missing owner stays a row, rendered as `—` (styleguide).
  owner: string | null;
  // Parsed log lines for this job.
  runs: number;
  // Parsed log lines for this job with status `retry`.
  retries: number;
  lastStatus: RunStatus;
  // Error of the last line that has one; null if no line had one.
  lastError: string | null;
  // `at` of the first and last line, as written in the log (offset kept, never converted).
  first: string;
  last: string;
};

export type Night = {
  night: string; // YYYY-MM-DD
  rows: DigestRow[]; // sorted by job
  // Lines that did not parse. Counted, never thrown: the night still renders.
  badLines: number;
};

// Reads runs/<night>.jsonl. Returns null when the night has no file (the page answers 404).
// An empty file is a night with no rows. Implemented in src/digest/reader.ts.
export type ReadNight = (runsDir: string, night: string) => Night | null;
