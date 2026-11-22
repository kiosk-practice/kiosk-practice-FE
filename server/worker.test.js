import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import worker from './worker.js';

const input = { kind: 'help', brand: '카페', title: '메뉴 선택', guide: '음료를 골라주세요.', context: '{}' };
const request = (body = JSON.stringify(input), headers = {}) => new Request('https://kiosk.example/api/ai', {
  method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body, duplex: 'half',
});
const upstream = () => Response.json({ status: 'completed', output: [
  { type: 'message', content: [{ type: 'output_text', text: '음료를 골라주세요.' }] },
] });

test('deployment routes API to the Worker before SPA assets', async () => {
  const config = JSON.parse(readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8'));
  assert.equal(config.main, 'server/worker.js');
  assert.ok(config.assets.run_worker_first.includes('/api/*'));
  assert.ok(config.compatibility_flags.includes('nodejs_compat'));
  const page = new Request('https://kiosk.example/practice');
  const response = await worker.fetch(page, { ASSETS: { fetch(received) {
    assert.equal(received, page);
    return new Response('<html>practice</html>');
  } } });
  assert.match(await response.text(), /practice/);
});

test('POST /api/ai uses runtime secrets and preserves Korean across stream chunks', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    assert.equal(options.headers.Authorization, 'Bearer worker-secret');
    const sent = JSON.parse(options.body);
    assert.equal(sent.model, 'test-model');
    assert.deepEqual(JSON.parse(sent.input), input);
    return upstream();
  });
  const bytes = new TextEncoder().encode(JSON.stringify(input));
  const body = new ReadableStream({ start(controller) {
    for (const byte of bytes) controller.enqueue(Uint8Array.of(byte));
    controller.close();
  } });
  const response = await worker.fetch(request(body), { OPENAI_API_KEY: 'worker-secret', OPENAI_MODEL: 'test-model' });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { answer: '음료를 골라주세요.' });
});

test('Worker retains request validation and reports missing runtime key', async (t) => {
  t.mock.method(globalThis, 'fetch', () => assert.fail('must not call provider'));
  const env = { OPENAI_API_KEY: '' };
  const missing = await worker.fetch(request(), env);
  assert.equal(missing.status, 503);
  assert.deepEqual(await missing.json(), { error: 'unconfigured' });
  assert.equal((await worker.fetch(new Request('https://kiosk.example/api/ai'), env)).status, 405);
  assert.equal((await worker.fetch(request('{'), env)).status, 400);
  assert.equal((await worker.fetch(request(JSON.stringify({ ...input, kind: 'invalid' })), env)).status, 400);
  assert.equal((await worker.fetch(request('x'.repeat(16001)), env)).status, 413);
  assert.equal((await worker.fetch(request(undefined, { origin: 'https://other.example' }), env)).status, 403);
  assert.equal((await worker.fetch(request(undefined, { 'content-type': 'text/plain' }), env)).status, 415);
});

test('provider failures remain sanitized and rate limits survive successive requests', async (t) => {
  const mock = t.mock.method(globalThis, 'fetch', async () => { throw new Error('private-secret'); });
  const failure = await worker.fetch(request(), { OPENAI_API_KEY: 'failure-secret' });
  assert.equal(failure.status, 502);
  assert.deepEqual(await failure.json(), { error: 'unavailable' });
  mock.mock.mockImplementation(async () => upstream());
  const env = { OPENAI_API_KEY: 'limit-secret' };
  for (let i = 0; i < 20; i++) assert.equal((await worker.fetch(request(), env)).status, 200);
  assert.equal((await worker.fetch(request(), env)).status, 429);
});
