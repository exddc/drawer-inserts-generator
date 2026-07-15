# AGENTS.md

## Cursor Cloud specific instructions

This is a single, purely client-side Next.js app (`drawer-inserts-generator`, "Box Grid Generator"). There is no backend, database, or external service — the entire product runs in the browser and is served by one Next.js dev server. All geometry generation and model export (STL/3MF via `three`, `three-csg-ts`, `jszip`) happens client-side.

### Node version (important gotcha)
- The project requires Node `24.x` (see `.node-version` / `package.json` `engines`). Node 24.18.0 is installed via `nvm` and is the default.
- The base VM ships an `/exec-daemon/node` (v22) that takes PATH precedence in non-login shells. A one-off line was added to `~/.bashrc` prepending the nvm Node 24 bin, so **login shells** (e.g. `bash -l`, tmux sessions started with a login shell) correctly resolve `node` -> v24.18.0. Verify with `node --version` before running commands; if it shows v22, run `nvm use 24.18.0` or start a login shell.

### Commands (see `package.json` scripts; mirrors `.github/workflows/ci.yml`)
- Dev server: `npm run dev` (serves http://localhost:3000). Run it from a login shell so Node 24 is used.
- Checks: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run test` (Vitest, `tests/`).
- Production build: `npm run build` then `npm run start`.

### Notes
- `npm ci` prints an `allow-scripts` warning that `sharp` and `unrs-resolver` install scripts were not run. This does not affect the dev server or the tests/lint/typecheck flow.
