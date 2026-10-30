# Security

## Reporting a vulnerability

Do not post credentials, personal meals, photographs, or exploit details in a public issue. Use the repository's **Security → Report a vulnerability** feature when enabled. If private reporting is unavailable, open an issue asking the maintainer to provide a private reporting channel, without disclosing the vulnerability itself. No dedicated security inbox or response-time guarantee is currently established.

## Credentials and privacy

Keep provider keys in a local ignored `.env` or your secret manager. Commit only blank/example configuration. `.infisical.json` is a local project link and is ignored. Anything named `EXPO_PUBLIC_*` is public in the compiled app; never put credentials there ([Expo documentation](https://docs.expo.dev/guides/environment-variables/)). The launcher injects Infisical secrets only into the service process.

If a credential is committed, revoke or rotate it immediately. Removing the file or adding it to `.gitignore` does not remove prior commits. Coordinate history cleanup with maintainers, including branches, tags, forks, and pull requests, and scan again. Do not paste the credential into a report.

Photos, descriptions, and correction notes sent for analysis reach the configured server and AI provider. Barcode and branded search queries reach external food databases. Saved journals and photos are local and are not encrypted by this app. Avoid real personal data in public bug reports and screenshots.

## Deployment boundary

The bundled service is for local development on a trusted network. It binds to the LAN and has no authentication; CORS does not authenticate native clients. Do not expose it to the internet or an untrusted network with funded provider keys. Public deployment requires authentication and authorization, HTTPS, abuse and spend controls, durable rate limiting, and a deployment-specific privacy review.

The project has no supported production release or security backport policy yet. Dependency findings and the scope of the publication review are recorded in `docs/open-source-review.md`. Publishing source is not a production security certification.
