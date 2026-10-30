# Contributing

Use Node 22.13 or newer (Node 24 recommended) and npm. Clone the repository, run `npm ci`, copy `.env.example` to `.env`, then run `npm start`. Sample meals and manual entry work without provider credentials. AI setup is documented in the README; use your own credentials and Infisical project.

Before submitting a pull request, run:

```sh
npm run lint
npm run typecheck
npm test
```

Keep changes focused and describe the behavior, validation, and relevant platform limitations. Use synthetic meals and sample images in tests and screenshots. Never submit personal journals, health data, credentials, logs containing request bodies, or local environment files.

Follow AGENTS.md for Expo SDK documentation and dependency installation. Use `npx expo install <package>` for SDK-compatible dependencies and commit the lockfile. Keep non-route code outside `src/app/`.

Install [Gitleaks](https://github.com/gitleaks/gitleaks#installing) and scan all fetched history before publishing:

```sh
gitleaks git . --log-opts=--all --redact
```

CI scans full fetched Git history as well as running lint, typecheck, and mocked Node tests. Browser tests and real-device checks are described in the README. Never add a broad secret-scanner exclusion to make CI pass: investigate and rotate exposed credentials first. Report vulnerabilities using SECURITY.md, not a public issue.

Contributions are made under the repository's MIT license. Preserve upstream notices and document the source and license of added assets or datasets.
