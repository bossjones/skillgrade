import { describe, it, expect, afterEach } from 'vitest';
import { DEFAULT_MODELS, resolveModel } from '../src/core/models';

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
