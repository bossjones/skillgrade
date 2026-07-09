import { describe, it, expect, afterEach } from 'vitest';
import { DEFAULT_MODELS, DEFAULT_BASE_URLS, resolveModel, resolveBaseUrl } from '../src/core/models';

const RETIRED_SONNET = 'claude-sonnet-4-20250514';

describe('resolveModel', () => {
  const savedEnv = { ...process.env };
  afterEach(() => {
    process.env = { ...savedEnv };
  });

  it('defaults anthropic to a current, non-retired model', () => {
    delete process.env.ANTHROPIC_MODEL;
    expect(resolveModel('anthropic')).toBe('claude-sonnet-5');
    expect(resolveModel('anthropic')).not.toBe(RETIRED_SONNET);
  });

  it('honors an explicit override above env and default', () => {
    process.env.ANTHROPIC_MODEL = 'claude-opus-4-8';
    expect(resolveModel('anthropic', 'claude-haiku-4-5')).toBe('claude-haiku-4-5');
  });

  it('honors the ANTHROPIC_MODEL env var over the default', () => {
    process.env.ANTHROPIC_MODEL = 'claude-opus-4-8';
    expect(resolveModel('anthropic')).toBe('claude-opus-4-8');
  });

  it('prefers an explicit env map over process.env', () => {
    process.env.ANTHROPIC_MODEL = 'from-process';
    expect(resolveModel('anthropic', undefined, { ANTHROPIC_MODEL: 'from-map' })).toBe('from-map');
  });

  it('exposes a default per provider and none is the retired Sonnet 4', () => {
    expect(DEFAULT_MODELS.anthropic).toBe('claude-sonnet-5');
    expect(Object.values(DEFAULT_MODELS)).not.toContain(RETIRED_SONNET);
  });
});

describe('resolveBaseUrl', () => {
  const savedEnv = { ...process.env };
  afterEach(() => {
    process.env = { ...savedEnv };
  });

  it('defaults anthropic and openai to their public API base URLs', () => {
    delete process.env.ANTHROPIC_BASE_URL;
    delete process.env.OPENAI_BASE_URL;
    expect(resolveBaseUrl('anthropic')).toBe('https://api.anthropic.com/v1');
    expect(resolveBaseUrl('openai')).toBe('https://api.openai.com/v1');
  });

  it('honors the *_BASE_URL env var over the default', () => {
    process.env.OPENAI_BASE_URL = 'http://localhost:11434/v1';
    expect(resolveBaseUrl('openai')).toBe('http://localhost:11434/v1');
  });

  it('honors an explicit override above env and default', () => {
    process.env.ANTHROPIC_BASE_URL = 'http://from-env/v1';
    expect(resolveBaseUrl('anthropic', 'http://from-override/v1')).toBe('http://from-override/v1');
  });

  it('prefers an explicit env map over process.env', () => {
    process.env.OPENAI_BASE_URL = 'http://from-process/v1';
    expect(resolveBaseUrl('openai', undefined, { OPENAI_BASE_URL: 'http://from-map/v1' })).toBe('http://from-map/v1');
  });

  it('strips trailing slashes', () => {
    expect(resolveBaseUrl('openai', 'http://localhost:8080/v1///')).toBe('http://localhost:8080/v1');
  });

  it('returns empty string for gemini (no base-URL override)', () => {
    expect(resolveBaseUrl('gemini')).toBe('');
    expect(DEFAULT_BASE_URLS.gemini).toBeUndefined();
  });
});
