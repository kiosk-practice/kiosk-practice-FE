import { Readable } from 'node:stream';
import { createAiMiddleware } from './ai.js';

let middleware;
let apiKey;
let model;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/api/ai') return env.ASSETS.fetch(request);

    // shortcut: limits apply per Worker isolate; use shared limits for a global spending cap.
    if (!middleware || apiKey !== env.OPENAI_API_KEY || model !== env.OPENAI_MODEL) {
      apiKey = env.OPENAI_API_KEY;
      model = env.OPENAI_MODEL;
      middleware = createAiMiddleware({ apiKey: apiKey ?? '', model: model ?? 'gpt-4.1-mini' });
    }
    const req = request.body ? Readable.fromWeb(request.body, { encoding: 'utf8' }) : Readable.from([]);
    Object.assign(req, {
      url: url.pathname + url.search,
      method: request.method,
      headers: { ...Object.fromEntries(request.headers), host: url.host },
    });
    let status;
    let headers;
    let response;
    try {
      await middleware(req, {
        writeHead(code, values) { status = code; headers = values; },
        end(body) { response = new Response(body, { status, headers }); },
      }, () => {});
      return response;
    } finally {
      req.destroy();
    }
  },
};
