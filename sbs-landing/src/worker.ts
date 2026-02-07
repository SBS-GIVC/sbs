import { DurableObject } from "cloudflare:workers";

interface Env {
  SBS_LANDING: DurableObjectNamespace;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const id = env.SBS_LANDING.idFromName("default");
    const stub = env.SBS_LANDING.get(id);
    return stub.fetch(request);
  }
};

export class SBSLanding extends DurableObject {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    // Forward to internal container port 3000
    const containerUrl = `http://localhost:3000${url.pathname}${url.search}`;
    
    // Maintain request body/method/headers
    const newRequest = new Request(containerUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body
    });

    try {
      const response = await fetch(newRequest);
      return response;
    } catch (err) {
      return new Response(`Landing Container error: ${err}`, { status: 502 });
    }
  }
}
