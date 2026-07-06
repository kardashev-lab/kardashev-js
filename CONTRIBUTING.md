# Contributing to kardashev

Thanks for helping make US grid data easier to access in JavaScript/TypeScript. This package wraps the free Kardashev Labs hosted API (`data.kardashevlabs.org`).

## Local setup

```bash
git clone https://github.com/kardashev-lab/kardashev-js
cd kardashev-js
npm install
```

## Running tests

```bash
npm test
```

## Before opening a PR

- Run `npm test` and make sure it passes.
- Run `npm run build` and confirm it succeeds with no type errors.
- If you add a new method, verify the exact endpoint path and query params against `kardashev-data`'s route definitions (`api/routes/*.py`) rather than assuming - several methods in the Python client (`generation`, `hydro`, `solar`, `queue`, `commodities`, `nuclear_status`) previously pointed at endpoints that didn't exist, silently 404ing for every caller.
- Update `CHANGELOG.md` with a one-line summary under a new version heading.
- Bump `version` in `package.json` to match.

## PR guidelines

- Keep changes scoped to one endpoint or one fix where possible.
- Mention which endpoint(s) you tested against the live API, not just unit test mocks.
