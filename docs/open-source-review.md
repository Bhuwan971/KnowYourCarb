# Open-source publication review

Reviewed 2026-10-29, starting at commit `6a5fe33`. This records evidence and limits, not a guarantee that all vulnerabilities or secrets have been found.

## Secrets and public files

- Gitleaks 8.30.1 scanned all 13 commits reachable through locally available Git refs using `--log-opts=--all`. No credential findings remained after reviewing one false positive: the literal `carbsy.journal.v1` local storage namespace. `.gitleaks.toml` allows only that exact secret value; default detection rules remain enabled.
- Gitleaks also scanned a separate snapshot of tracked and non-ignored untracked files. Ignored dependencies, local environment files, and generated output were excluded from that publishable snapshot.
- `.env` is not tracked. Inspection found no nonempty local API key/token/password value to compare against history. Never rely solely on filenames or scanners to protect future credentials.
- `.infisical.json` contained project-link metadata rather than credentials. It has been removed from the index while preserving the local file. Its project identifier remains in existing commits; that identifier is not an authentication secret. No history was rewritten.
- Ignore rules now cover environment variants (only `.env.example` is allowed), local Infisical links, common credential files, signing material, build packages, logs, exports, and backups.
- The four committed screenshots show sample meals and no visible credentials or personal journal entries. The bundled photo sources are recorded in THIRD_PARTY_NOTICES.md.
- Provider keys and Infisical credentials are stripped from the Expo child environment by the launcher. Existing tests verify both environment filtering and separate Infisical injection. Public app configuration must never contain credentials.

The review covers this checkout and locally available history, not unfetched remote refs, hosted CI artifacts, releases, issue attachments, forks, provider accounts, or secrets stored outside this repository. Git author names and email addresses are ordinary commit metadata and become public with history.

## Repository preparation

The existing MIT license is retained, with a Carbsy contributors notice added and the Expo notice preserved. Package metadata declares MIT and the required Node version. Third-party notices distinguish USDA data, Open Food Facts data, Unsplash images, and font licenses from project source. Font license copies are included.

README setup now starts from a fresh clone. CONTRIBUTING.md and SECURITY.md describe checks, private reporting, credential handling, and the service's deployment boundary. GitHub Actions runs lint, typecheck, mocked Node tests, and a redacted full-history secret scan with read-only repository permissions and no application credentials.

## Validation

- Lint: passed.
- Typecheck: passed.
- Node tests: 62 passed, using mocked providers and no provider credentials. The first restricted run could not bind test ports; the rerun with local port access passed.
- Secret scan of available history and publishable working files: passed with the documented exact-value false-positive exception.
- Browser/device tests were not rerun for these repository/documentation changes. Hosted GitHub Actions cannot be confirmed until the changes are pushed.

## Original dependency findings (superseded by the follow-up below)

`npm audit` on 2026-10-29 reported 15 affected dependency entries: 7 high, 3 moderate, 5 low, 0 critical. Counts include parent packages affected through their dependencies; these are not 15 distinct root vulnerabilities.

| Dependency | Finding / path |
| --- | --- |
| `decode-uri-component` | Malformed URI decoding denial of service, through `query-string` and Expo Router; [advisory](https://github.com/advisories/GHSA-qr28-fpjm-wq7f) |
| `zod` | Oversized collection validation memory exhaustion, through Expo CLI and lint tooling; [advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) |
| `node-forge` | RSA signature verification issue in Expo tooling; [advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv) |
| `uuid` | Buffer bounds issue through Xcode/config tooling; [advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq) |
| `deepmerge` | Prototype poisoning through Expo configuration tooling; [advisory](https://github.com/advisories/GHSA-gcqx-w48m-w2h4) |

No dependency upgrades or overrides were applied in this preparation. Audit proposes cross-SDK changes for some paths, including an Expo downgrade and Expo Router major upgrade. These need a separate compatible SDK/dependency update and regression checks; do not run `npm audit fix --force`. Runtime reachability and exploitability of every advisory have not been established. Treat these findings as outstanding before a production release; source publication does not resolve them.

## Before changing repository visibility

1. Commit and push these preparation changes, including the staged removal of `.infisical.json`; do not force-add ignored files.
2. Confirm the hosted checks pass on the exact commit being published. Fetch and scan any additional branches/tags you intend to expose.
3. Enable GitHub private vulnerability reporting, secret scanning/push protection where available, and dependency alerts. These account/repository settings were not changed by this review.
4. Publish the source with the documented development status and dependency findings. Publicly hosting the analysis service requires authentication, HTTPS, abuse/spend controls, and a separate deployment review.

## Local release hardening follow-up — 2026-10-29

Scope was clarified to local use for now. Future public access will be account-free, with deployment and anonymous abuse controls deferred. This is not a public-production approval.

Changes:

- Upgraded to Expo SDK 58, React Native 0.88.1, React 19.3, and SDK-compatible modules. The regenerated npm lockfile removes the vulnerable `decode-uri-component` chain; `node-forge` is 1.4.2 and Xcode tooling no longer depends on the affected UUID version. No forced major dependency overrides are used.
- Migrated web safe-area spacing to CSS, retaining native safe-area handling.
- The service and launcher bind to loopback by default. Phone testing uses explicit `npm run start:lan` or `npm run start:infisical -- --lan`. Standalone LAN binding uses `SERVICE_HOST=0.0.0.0`. Only use this mode on trusted Wi-Fi.
- The service rejects `NODE_ENV=production`. This prevents accidental production-mode startup; it is not an authentication mechanism or a substitute for network isolation.
- Two concurrent uploads/scans maximum, a 15-second upload deadline, malformed-URL handling, invalid host/port validation, and bounded graceful shutdown reduce accidental resource exhaustion. Existing provider deadlines, request size limits, and rate limits remain in place.
- Browser suites use full Chromium and start isolated previews with deterministic AI configuration, without reading `.env`. CI also exports iOS, Android, and web bundles.

Current dependency status: `npm audit` reports **8 affected entries (3 high, 5 low)**, rooted in two upstream issues. Zod 3.25.76 remains under Expo CLI's dev-tools schemas; the upstream fix is Zod 4.6.6+, which is outside that dependency's supported major range. deepmerge 4.3.1 remains in Expo configuration merging, with no patched upstream version listed. The Node analysis service imports neither dependency. Keep development tooling local and process only trusted project/plugin configuration. These findings remain visible and must be revisited before any public rollout; a successful build does not prove absence of vulnerabilities.

Native signing, app-store submissions, physical-device testing, actual provider accuracy, public hosting, verification of anonymous clients, durable quotas, and provider spend enforcement are not completed by this local work.

Follow-up validation: production JavaScript exports for iOS, Android, and web pass (not signed native builds); lint and typecheck pass; Expo Doctor passes 20/20 checks; 65 Node tests, 10 phone/desktop browser tests, and 8 mocked AI browser tests pass. A fresh `npm ci --ignore-scripts` reproduces the lockfile. Gitleaks finds no credentials in the publishable working files or 14 available commits. Browser testing also identified and fixed empty service-URL handling in local mode. The Chromium headless-shell runtime on this machine crashed in its GPU helper, so both suites now use full Chromium. These tests do not call real AI providers.
