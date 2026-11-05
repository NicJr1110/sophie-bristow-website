import type { Env } from './env';

const API_VERSION = '2025-02-19';

function base(env: Env) {
  const dataset = env.PUBLIC_SANITY_DATASET || 'production';
  return { url: `https://${env.PUBLIC_SANITY_PROJECT_ID}.api.sanity.io/v${API_VERSION}/data`, dataset };
}

/** Uncached, authenticated query against published content. */
export async function sanityQuery<T>(env: Env, groq: string, params: Record<string, unknown> = {}): Promise<T> {
  const { url, dataset } = base(env);
  const u = new URL(`${url}/query/${dataset}`);
  u.searchParams.set('query', groq);
  u.searchParams.set('perspective', 'published');
  for (const [k, v] of Object.entries(params)) u.searchParams.set(`$${k}`, JSON.stringify(v));
  const res = await fetch(u, { headers: { Authorization: `Bearer ${env.SANITY_WRITE_TOKEN}` } });
  if (!res.ok) throw new Error(`Sanity query ${res.status}: ${await res.text()}`);
  return ((await res.json()) as { result: T }).result;
}

export type Mutation = Record<string, unknown>;

/** Returns the raw Response so callers can detect 409 (revision conflict). */
export async function sanityMutate(env: Env, mutations: Mutation[]): Promise<Response> {
  const { url, dataset } = base(env);
  return fetch(`${url}/mutate/${dataset}?returnIds=true&visibility=sync`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.SANITY_WRITE_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ mutations }),
  });
}

/**
 * Patch the published doc, then any open draft too, so that publishing an
 * unrelated edit in the Studio can't overwrite the shop status.
 */
export async function patchArtwork(
  env: Env,
  id: string,
  set: Record<string, unknown>,
  unset: string[] = [],
  ifRevisionID?: string,
): Promise<Response> {
  const patch = (docId: string, rev?: string) => ({
    patch: { id: docId, ...(rev ? { ifRevisionID: rev } : {}), set, ...(unset.length ? { unset } : {}) },
  });
  const res = await sanityMutate(env, [patch(id, ifRevisionID)]);
  if (res.ok) {
    // Fails harmlessly if no draft exists.
    await sanityMutate(env, [patch(`drafts.${id}`)]).catch(() => undefined);
  }
  return res;
}
