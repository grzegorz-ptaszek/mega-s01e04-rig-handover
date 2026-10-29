import type { DigestRow, Night } from '../digest/types.js';

const dash = '—';

// `retries` at or above this count marks the row (warn class plus text).
const RETRY_MARK = 3;

function RowView({ row }: { row: DigestRow }) {
  const failed = row.lastStatus === 'fail';
  const retried = row.retries >= RETRY_MARK;
  return (
    <tr class={failed || retried ? 'warn' : undefined}>
      <td>{row.job}</td>
      <td>{row.owner ?? dash}</td>
      <td>{row.runs}</td>
      <td>{row.retries}</td>
      <td>
        {row.lastStatus}
        {retried ? ' · retries' : ''}
      </td>
      <td>{row.lastError ?? dash}</td>
      <td>{row.first}</td>
      <td>{row.last}</td>
    </tr>
  );
}

export function DigestTable({ night }: { night: Night }) {
  return (
    <>
      <h1>digest {night.night}</h1>
      {night.rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th>
              <th>owner</th>
              <th>runs</th>
              <th>retries</th>
              <th>last status</th>
              <th>last error</th>
              <th>first</th>
              <th>last</th>
            </tr>
          </thead>
          <tbody>
            {night.rows.map((row) => (
              <RowView row={row} />
            ))}
          </tbody>
        </table>
      )}
      {night.badLines > 0 ? (
        <p class="warn">
          {night.badLines} {night.badLines === 1 ? 'bad line' : 'bad lines'} skipped
        </p>
      ) : null}
    </>
  );
}

export function DigestMissing({ night }: { night: string }) {
  return (
    <>
      <h1>digest {night}</h1>
      <p class="warn">no file for {night} in runs/</p>
    </>
  );
}
