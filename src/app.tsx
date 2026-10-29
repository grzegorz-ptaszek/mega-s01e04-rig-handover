import { Hono } from 'hono';
import { loadConfig, type RigConfig } from './config.js';
import { lane } from './lane.js';
import { readNight } from './digest/reader.js';
import { readStatus } from './status.js';
import { Layout } from './views/layout.js';
import { StatusBoard } from './views/status.js';

export function createApp(config: RigConfig = loadConfig()) {
  const app = new Hono();

  app.get('/health', (c) => c.json({ ok: true, lane: lane().id }));

  app.get('/api/digest/:night', (c) => {
    const night = c.req.param('night');
    // Validate before any path is built from the input.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(night)) return c.json({ error: 'no such night' }, 404);
    // Same reader and same rows as the HTML page: the JSON is the Night, unchanged.
    const result = readNight(config.runsDir, night);
    if (result === null) return c.json({ error: 'no such night' }, 404);
    return c.json(result);
  });

  app.get('/', (c) =>
    c.html(
      <Layout title="status" lane={lane()}>
        <StatusBoard status={readStatus(config)} />
      </Layout>,
    ),
  );

  return app;
}
