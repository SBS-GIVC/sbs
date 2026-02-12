/**
 * SBS AI Gateway
 *
 * Provides a stable internal endpoint for Normalizer Copilot to call:
 *   POST /chat
 *
 * Routing options:
 * - N8N_WEBHOOK_URL: forward to an n8n webhook (recommended for orchestration)
 * - CLOUDFLARE_AI_GATEWAY_URL + CLOUDFLARE_API_TOKEN: call Cloudflare AI Gateway / Workers AI (OpenAI-compatible)
 *
 * Safety:
 * - redaction + length caps
 * - no request logging of raw messages unless LOG_LEVEL=debug
 */

const express = require('express');

const app = express();
app.use(express.json({ limit: '1mb' }));

const PORT = process.env.PORT || 8010;

const N8N_WEBHOOK_URL = (process.env.N8N_WEBHOOK_URL || '').trim();
const CLOUDFLARE_AI_GATEWAY_URL = (process.env.CLOUDFLARE_AI_GATEWAY_URL || '').trim();
const CLOUDFLARE_API_TOKEN = (process.env.CLOUDFLARE_API_TOKEN || '').trim();
const AI_GATEWAY_SHARED_SECRET = (process.env.AI_GATEWAY_SHARED_SECRET || '').trim();

const LOG_LEVEL = (process.env.LOG_LEVEL || 'info').toLowerCase();
const AI_DEFAULT_PROVIDER = (process.env.AI_DEFAULT_PROVIDER || 'deepseek').trim().toLowerCase();
const AI_DEFAULT_MODEL = (process.env.AI_DEFAULT_MODEL || 'deepseek-chat').trim();
const CAPABILITY_ROUTES = (() => {
  try {
    return JSON.parse(process.env.AI_CAPABILITY_ROUTES_JSON || '{}');
  } catch {
    return {};
  }
})();

const SECRET_PATTERNS = [
  /sk-[A-Za-z0-9]{10,}/g,
  /DEEPSEEK_API_KEY\s*=?\s*[A-Za-z0-9\-_.]{10,}/gi,
  /GEMINI_API_KEY\s*=?\s*[A-Za-z0-9\-_.]{10,}/gi,
];

const CAPABILITY_REGISTRY = {
  pre_submit_denial_prevention_copilot: {
    stable: 'v1',
    versions: {
      v1: {
        provider: 'deepseek',
        model: 'deepseek-chat',
        system:
          'You score NPHIES claim denial risk. Return exact actionable fixes with field-level guidance. Keep output compact JSON.'
      }
    }
  },
  re_adjudication_autopilot: {
    stable: 'v1',
    versions: {
      v1: {
        provider: 'deepseek',
        model: 'deepseek-chat',
        system:
          'You draft re-adjudication Communication/CommunicationRequest payload content from rejection reasons and evidence deltas.'
      }
    }
  },
  multimodal_evidence_extractor: {
    stable: 'v1',
    versions: {
      v1: {
        provider: 'deepseek',
        model: 'deepseek-chat',
        system:
          'You extract clinical evidence into structured supportingInfo entries and return confidence estimates.'
      }
    }
  },
  smart_prior_auth_composer: {
    stable: 'v1',
    versions: {
      v1: {
        provider: 'deepseek',
        model: 'deepseek-chat',
        system:
          'You write payer-specific prior-auth narratives and required-field checklists from diagnosis/procedure context.'
      }
    }
  },
  workflow_ai_orchestrator: {
    stable: 'v1',
    versions: {
      v1: {
        provider: 'deepseek',
        model: 'deepseek-chat',
        system:
          'You predict workflow SLA breaches and propose resilient orchestration routing (n8n vs direct service fallback).'
      }
    }
  },
  facility_optimization_engine: {
    stable: 'v1',
    versions: {
      v1: {
        provider: 'deepseek',
        model: 'deepseek-chat',
        system:
          'You benchmark facility denial/rework trends and provide operational coding/process recommendations.'
      }
    }
  }
};

function sanitize(text) {
  const raw = String(text || '');
  const redacted = SECRET_PATTERNS.reduce((acc, pat) => acc.replace(pat, '[REDACTED]'), raw);
  return redacted.length > 2400 ? `${redacted.slice(0, 2380)}\n…(truncated)…` : redacted;
}

function resolveCapability(capability, requestedVersion) {
  const key = String(capability || '').trim();
  const entry = CAPABILITY_REGISTRY[key];
  if (!entry) return null;

  const version = String(requestedVersion || entry.stable || 'v1').trim();
  const resolvedVersion = entry.versions[version] ? version : entry.stable;
  const baseConfig = entry.versions[resolvedVersion] || {};
  const override = CAPABILITY_ROUTES[key] && typeof CAPABILITY_ROUTES[key] === 'object'
    ? CAPABILITY_ROUTES[key]
    : {};

  return {
    capability: key,
    version: resolvedVersion,
    provider: String(override.provider || baseConfig.provider || AI_DEFAULT_PROVIDER),
    model: String(override.model || baseConfig.model || AI_DEFAULT_MODEL),
    system: sanitize(String(override.system || baseConfig.system || 'You are SBS Internal Copilot. Be concise and safe.')),
    rollout: {
      source: Object.keys(override).length ? 'env_override' : 'registry',
      stable: entry.stable
    }
  };
}

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'sbs-ai-gateway',
    timestamp: new Date().toISOString(),
    routes: {
      n8n: Boolean(N8N_WEBHOOK_URL),
      cloudflare: Boolean(CLOUDFLARE_AI_GATEWAY_URL && CLOUDFLARE_API_TOKEN)
    },
    capabilities: Object.keys(CAPABILITY_REGISTRY).length
  });
});

app.get('/v1/registry', (req, res) => {
  const registry = Object.entries(CAPABILITY_REGISTRY).map(([name, item]) => ({
    capability: name,
    stable: item.stable,
    versions: Object.keys(item.versions || {})
  }));
  return res.json({
    success: true,
    registry
  });
});

async function forwardToN8n(payload) {
  const resp = await fetch(N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!resp.ok) {
    const t = await resp.text().catch(() => '');
    throw new Error(`n8n HTTP ${resp.status}: ${t}`);
  }
  return resp.json();
}

async function forwardToCloudflareOpenAI(payload) {
  // Expect CLOUDFLARE_AI_GATEWAY_URL to be an OpenAI-compatible base URL.
  // Example patterns:
  // - https://gateway.ai.cloudflare.com/v1/<account>/<gateway>/openai
  // The request uses /chat/completions.

  const url = `${CLOUDFLARE_AI_GATEWAY_URL.replace(/\/+$/, '')}/chat/completions`;

  const provider = String(payload.provider || AI_DEFAULT_PROVIDER);
  const model = payload.model || (provider === 'deepseek' ? 'deepseek-chat' : AI_DEFAULT_MODEL);

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: payload.system || 'You are SBS Internal Copilot. Be concise and safe.' },
        { role: 'user', content: payload.message || '' }
      ],
      max_tokens: payload.max_tokens || 400,
      temperature: 0.2
    })
  });

  if (!resp.ok) {
    const t = await resp.text().catch(() => '');
    throw new Error(`Cloudflare gateway HTTP ${resp.status}: ${t}`);
  }

  return resp.json();
}

app.post('/chat', async (req, res) => {
  if (AI_GATEWAY_SHARED_SECRET) {
    const auth = String(req.headers.authorization || '');
    const token = String(req.headers['x-sbs-gateway-token'] || '');
    const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
    const provided = bearer || token;
    if (!provided || provided !== AI_GATEWAY_SHARED_SECRET) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Missing/invalid gateway token' });
    }
  }

  const message = sanitize(req.body?.message);
  const context = req.body?.context && typeof req.body.context === 'object' ? req.body.context : {};

  // NOTE: provider is advisory; normalizer-service already gates DeepSeek.
  const provider = String(req.body?.provider || 'deepseek');

  const payload = {
    provider,
    message,
    context,
    system: sanitize(req.body?.system || ''),
    max_tokens: Number(req.body?.max_tokens || 400)
  };

  if (LOG_LEVEL === 'debug') {
    // Avoid printing full message/context; this is minimal.
    console.log('[AI-GW] request', { provider, hasTelemetry: Boolean(context?.telemetry), hasClaimId: Boolean(context?.claimId) });
  }

  try {
    let data;

    if (N8N_WEBHOOK_URL) {
      data = await forwardToN8n(payload);
    } else if (CLOUDFLARE_AI_GATEWAY_URL && CLOUDFLARE_API_TOKEN) {
      data = await forwardToCloudflareOpenAI(payload);
    } else {
      return res.status(503).json({
        error: 'No gateway configured',
        message: 'Set N8N_WEBHOOK_URL or CLOUDFLARE_AI_GATEWAY_URL + CLOUDFLARE_API_TOKEN'
      });
    }

    // Normalize to {reply}
    let reply = data?.reply;
    if (!reply && Array.isArray(data?.choices) && data.choices[0]) {
      reply = data.choices[0]?.message?.content || data.choices[0]?.text;
    }

    if (!reply) {
      reply = JSON.stringify(data).slice(0, 2000);
    }

    return res.json({
      reply: sanitize(reply),
      model: data?.model || payload.model || 'gateway',
      provider
    });
  } catch (err) {
    return res.status(502).json({ error: 'Gateway error', message: String(err.message || err) });
  }
});

app.post('/v1/capabilities/:capability', async (req, res) => {
  const startedAt = Date.now();
  const capability = req.params.capability;
  const resolved = resolveCapability(capability, req.body?.version);
  if (!resolved) {
    return res.status(404).json({
      error: 'Unknown capability',
      capability
    });
  }

  if (AI_GATEWAY_SHARED_SECRET) {
    const auth = String(req.headers.authorization || '');
    const token = String(req.headers['x-sbs-gateway-token'] || '');
    const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
    const provided = bearer || token;
    if (!provided || provided !== AI_GATEWAY_SHARED_SECRET) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Missing/invalid gateway token' });
    }
  }

  const payload = {
    capability: resolved.capability,
    version: resolved.version,
    provider: resolved.provider,
    model: resolved.model,
    system: resolved.system,
    message: sanitize(req.body?.message || ''),
    context: req.body?.context && typeof req.body.context === 'object' ? req.body.context : {},
    max_tokens: Number(req.body?.max_tokens || 500)
  };

  try {
    let data;
    if (N8N_WEBHOOK_URL) {
      data = await forwardToN8n(payload);
    } else if (CLOUDFLARE_AI_GATEWAY_URL && CLOUDFLARE_API_TOKEN) {
      data = await forwardToCloudflareOpenAI(payload);
    } else {
      return res.status(503).json({
        error: 'No gateway configured',
        message: 'Set N8N_WEBHOOK_URL or CLOUDFLARE_AI_GATEWAY_URL + CLOUDFLARE_API_TOKEN'
      });
    }

    let reply = data?.reply;
    if (!reply && Array.isArray(data?.choices) && data.choices[0]) {
      reply = data.choices[0]?.message?.content || data.choices[0]?.text;
    }
    if (!reply) reply = JSON.stringify(data).slice(0, 2000);

    return res.json({
      success: true,
      capability: resolved.capability,
      version: resolved.version,
      provider: resolved.provider,
      model: data?.model || resolved.model,
      reply: sanitize(reply),
      telemetry: {
        latency_ms: Date.now() - startedAt,
        rollout: resolved.rollout
      }
    });
  } catch (error) {
    return res.status(502).json({
      error: 'Gateway capability route failed',
      message: String(error.message || error),
      capability: resolved.capability,
      version: resolved.version
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ SBS AI Gateway listening on :${PORT}`);
});
