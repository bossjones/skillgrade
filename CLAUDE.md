# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`skillgrade` is a CLI (published to npm) that evaluates [Agent Skills](https://agentskills.io) —
it verifies that AI coding agents (Gemini, Claude, Codex, OpenCode, ACP, or any custom command)
correctly discover and use a skill. It runs an agent against tasks in an isolated environment,
grades the resulting workspace, and reports pass rates. Runs on Node 20+; the default execution
provider is Docker.

## Commands

```bash
npm run build          # tsc -p tsconfig.build.json + copy src/viewer.html → dist/
npm run dev            # run the CLI from source via ts-node (src/skillgrade.ts)
npm test               # vitest run (all tests/*.test.ts)
npm run test:coverage  # with v8 coverage

# run a single test file or filter by name
npx vitest run tests/config.test.ts
npx vitest run -t "resolveModel"
```

The compiled CLI is `bin/skillgrade.js` → `dist/skillgrade.js`. `npm run dev` is the fastest way
to exercise the CLI against a skill without rebuilding.

**Testing note:** `tests/bootstrap.test.ts` and `tests/analytics.test.ts` are excluded in
`vitest.config.ts` and won't run under `npm test`.

## Architecture

The end-to-end flow lives in `src/commands/run.ts` (`runEvals`) and orchestrates:

1. **Config** (`src/core/config.ts`) — parses/validates `eval.yaml`, applies `defaults`, and
   `resolveTask` merges per-task overrides + resolves file-reference fields (an
   `instruction`/`rubric`/`run` value that is an existing file path is read into its content).
2. **Skill detection** (`src/core/skills.ts`) — finds the skill: root `SKILL.md`, else
   `skills/*/SKILL.md`, `.agents/skills/*`, `.claude/skills/*`.
3. **Agent** (`src/agents/`) — `registry.ts` maps a name to a `BaseAgent`. Each agent runs the
   instruction inside the workspace via the provider's `runCommand`. Auto-detection: with exactly
   one API key present, `ANTHROPIC_API_KEY`→claude, `OPENAI_API_KEY`→codex, `GEMINI_API_KEY`→gemini.
4. **Provider** (`src/providers/`) — `EnvironmentProvider` (defined in `src/types.ts`). `docker`
   (default, isolated, builds an image with the agent CLI installed) or `local` (runs on the host,
   used in CI). Both **inject the skill** into `.agents/skills/` and `.claude/skills/` in the
   workspace so the agent can discover it.
5. **Runner** (`src/evalRunner.ts`) — `EvalRunner.runEval` runs N trials (optionally parallel),
   logs each step to a `session_log`, runs graders, computes weighted reward, and calculates
   `pass_rate` / `pass@k` / `pass^k`. A trial with reward ≥ 0.5 counts as a success.
6. **Graders** (`src/graders/index.ts`) — `deterministic` (runs a command, parses a
   `{score, details, checks}` JSON object from stdout) and `llm_rubric` (sends the session
   transcript + rubric to an LLM judge). Final reward = `Σ(score × weight) / Σweight`.
7. **Reporters** (`src/reporters/`) — CLI output, plus a browser report served from the bundled
   `src/viewer.html`. Reports are JSON, written to `<output>/<skill-name>/results/`.
8. **Analytics** (`src/analytics/engine.ts`) — Normalized Gain `(p_with − p_without)/(1 − p_without)`.

The three commands (`init`, `preview`, run) are dispatched in `src/skillgrade.ts` and live in
`src/commands/`.

## Model resolution — the one thing to get right

Model IDs are **centralized in `src/core/models.ts`** (`DEFAULT_MODELS` + `resolveModel`). Do not
hardcode model strings anywhere else — the init path and the LLM grader previously drifted because
they duplicated the same string. A retired/stale model ID returns HTTP 404 at runtime.

`resolveModel(provider, override, env)` precedence, highest first: explicit `override` (a grader's
`model:` / task `grader_model:`) → `ANTHROPIC_MODEL`/`OPENAI_MODEL`/`GEMINI_MODEL` env var →
`DEFAULT_MODELS[provider]`. Because of this, **switching models never requires a code change or a
release** — pin `defaults.grader_model` in `eval.yaml` or set the env var for one run. Verify any
new default ID against the provider's live model catalog before committing it.

When parsing Anthropic responses, pick the `text` content block explicitly
(`content.find(b => b.type === 'text')`) — adaptive thinking is on by default on Sonnet 5 and
prepends a thinking block, so `content[0]` is not necessarily the text.

## Gotchas

- Deterministic grader scripts run inside `node:20-slim`, which has **`awk` but not `bc`** — use
  `awk` for arithmetic in grader shell scripts.
- At runtime the runner materializes graders to fixed paths in a temp task dir: deterministic →
  `tests/test.sh` (then `test_1.sh`, …), rubrics → `prompts/quality.md` (then `quality_1.md`, …).
  See `prepareTempTaskDir` in `src/commands/run.ts`.
- The instruction is delivered to CLI agents via a temp file (base64 → `/tmp/.prompt.md`) to avoid
  shell-escaping issues with long prompts.
- Secrets are **redacted** from persisted session logs (`EvalRunner.sanitize`) — env values longer
  than 5 chars are stripped from all logged output.
- Env vars are loaded from `.env` in the skill directory; shell values override `.env`.

## Reference docs

`README.md` is the user-facing reference for `eval.yaml`, all CLI flags/presets, grader formats,
and the custom `command`/`opencode`/`acp` agents. Consult it before changing CLI surface so docs
and behavior stay in sync. `templates/eval.yaml.template` is the scaffold emitted by
`skillgrade init` without an API key.
