/**
 * Central default model IDs and resolver, shared by `skillgrade init` scaffolding
 * and the LLM grader.
 *
 * Keeping the defaults in one place stops the init path and the grader from drifting
 * apart (they previously hardcoded the same model string in two files), and the resolver
 * lets each provider's model be overridden per-request or via an environment variable —
 * so a retired default never hard-blocks a run.
 */
export type LLMProvider = 'gemini' | 'anthropic' | 'openai';

/**
 * Current, non-retired default model per provider.
 *
 * Anthropic is pinned to `claude-sonnet-5` (the documented replacement for the retired
 * `claude-sonnet-4-20250514`). Verify IDs against the provider's model catalog before
 * changing them — a stale ID returns HTTP 404 from the API.
 */
export const DEFAULT_MODELS: Record<LLMProvider, string> = {
  anthropic: 'claude-sonnet-5',
  openai: 'gpt-4o',
  gemini: 'gemini-3-flash-preview',
};

/** Environment variable that overrides the default model, per provider. */
const ENV_VARS: Record<LLMProvider, string> = {
  anthropic: 'ANTHROPIC_MODEL',
  openai: 'OPENAI_MODEL',
  gemini: 'GEMINI_MODEL',
};

/**
 * Resolve the model ID for a provider. Precedence, highest first:
 *   1. `override`  — an explicit value (e.g. a task's `model:` field)
 *   2. the provider's `*_MODEL` variable in `env` (falling back to `process.env`)
 *   3. the built-in default from {@link DEFAULT_MODELS}
 */
export function resolveModel(
  provider: LLMProvider,
  override?: string,
  env?: Record<string, string>,
): string {
  if (override) return override;
  const envName = ENV_VARS[provider];
  const envValue = env?.[envName] ?? process.env[envName];
  if (envValue) return envValue;
  return DEFAULT_MODELS[provider];
}

/**
 * Default API base URL per provider. Gemini is intentionally absent — it has no
 * base-URL override (its API key rides in the query string and the model sits in
 * the path), so there is nothing to point elsewhere.
 */
export const DEFAULT_BASE_URLS: Partial<Record<LLMProvider, string>> = {
  anthropic: 'https://api.anthropic.com/v1',
  openai: 'https://api.openai.com/v1',
};

/** Environment variable that overrides the default base URL, per provider. */
const BASE_URL_ENV_VARS: Partial<Record<LLMProvider, string>> = {
  anthropic: 'ANTHROPIC_BASE_URL',
  openai: 'OPENAI_BASE_URL',
};

/**
 * Resolve the API base URL for a provider, with trailing slashes stripped.
 * Precedence, highest first:
 *   1. `override` — an explicit value
 *   2. the provider's `*_BASE_URL` variable in `env` (falling back to `process.env`)
 *   3. the built-in default from {@link DEFAULT_BASE_URLS}
 *
 * Only `anthropic` and `openai` have a base URL; any other provider yields `''`.
 */
export function resolveBaseUrl(
  provider: LLMProvider,
  override?: string,
  env?: Record<string, string>,
): string {
  const envName = BASE_URL_ENV_VARS[provider];
  const raw =
    override ??
    (envName ? (env?.[envName] ?? process.env[envName]) : undefined) ??
    DEFAULT_BASE_URLS[provider] ??
    '';
  return raw.replace(/\/+$/, '');
}
