import { DurableObject } from "cloudflare:workers";

interface Env {
  SBS_NORMALIZER: DurableObjectNamespace;
}

// Worker
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const id = env.SBS_NORMALIZER.idFromName("default");
    const stub = env.SBS_NORMALIZER.get(id);
    return stub.fetch(request);
  }
};

// Durable Object (Container Host)
export class SBSNormalizer extends DurableObject {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  async fetch(request: Request): Promise<Response> {
    // Forward request to the container running on localhost:8000
    // Note: Cloudflare Workers Containers often assume port 80 or 8080 by default, 
    // but we can try 8000 since our Dockerfile uses EXPOSE 8000.
    const url = new URL(request.url);
    const containerUrl = `http://localhost:8000${url.pathname}${url.search}`;
    
    // We must reconstruct the request to avoid immutable headers issues if modified
    const newRequest = new Request(containerUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body
    });

    try {
      const response = await fetch(newRequest);
      return response;
    } catch (err) {
      return new Response(`Container error: ${err}`, { status: 502 });
    }
  }
}
