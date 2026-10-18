# Carbsy · KnowYourCarb

A camera-first carb journal with a playful little personality. Built from scratch with TypeScript, React Native, and Expo SDK 57, for iOS, Android, and the web.

## Try it on your phone

Dependencies are installed. In this folder, run:

```sh
npm start
```

Open **Expo Go** on your phone and scan the QR code. Keep your computer and phone on the same Wi-Fi. Use an Expo Go version that supports SDK 57. On iPhone, Expo may require signing into the same Expo account on the CLI and Expo Go. See the [Expo setup guide](https://docs.expo.dev/tutorial/create-your-first-app/) and [compatible Expo Go versions](https://expo.dev/go).

For a browser preview:

```sh
npm run web
```

Use Node 22.13 or newer (Node 24 LTS recommended). Camera support requires a phone or a browser with camera access; browser camera capture needs localhost or HTTPS. Importing a photo and trying a sample work without camera access.

## What works

- On Today, take or upload a photo. Open **More options** for manual entry, samples, barcode scanning or descriptions.
- Log a meal four ways: **snap a photo** (or import one), **scan a barcode**, **describe it** in words ("2 slices of pepperoni pizza and a coke"), or **type it in** with USDA food search.
- Returning to the mobile home screen opens a live camera once permission has been granted.
- Every food shows **where its numbers came from** (USDA, label, barcode, AI guess or you) and **how solid the estimate is** (solid / good guess / rough guess), with a likely carb range for the whole meal.
- **Quick check** asks the one question that moves the total most, such as "Which one is it? Cola · Diet cola" or "How much rice? ½ · 1 · 1½ · 2 cups". Answers recalculate instantly from USDA data, with no rescan.
- Tap a food to swap look-alikes, pick a USDA household portion, change portions eaten in quarter steps, enter a weight, or override any value.
- "Not quite right?" rescans with your note ("brown rice, about half eaten").
- **Having it again?** logs a past meal in one tap with your corrections. Search also offers your own past foods.
- Open a sample meal immediately, without configuring any services. Samples use real USDA records and are excluded from all real totals.
- Browse, search, filter, reopen, edit and delete memories. View seven days of logged carbs. Set an optional personal daily reference; no target is prescribed.
- Customize your greeting and haptics. Export meal details as JSON (photos are excluded).
- Photos and journal data persist locally across restarts. No account is needed.

## Connect AI with OpenRouter and Infisical

The photo service supports OpenRouter and direct Gemini. With either provider, capturing or importing a photo automatically estimates food names, portions, calories and total carbs. Values remain editable; check them before saving. Cancel or retry a scan, and reopen saved memories without rescanning.

### Recommended: Infisical secrets

The Infisical CLI is installed on this computer. For other machines, follow its [installation guide](https://infisical.com/docs/cli/overview). In this project folder:

```sh
infisical login
infisical init
```

Select your Infisical project. This creates a `.infisical.json` project link containing no secrets. Alternatively, copy `.infisical.json.example` to `.infisical.json` and replace its project ID after logging in.

Add these values in your Infisical project's **dev** environment at **/**:

| Name                 | Value                                                          |
| -------------------- | -------------------------------------------------------------- |
| `AI_PROVIDER`        | `openrouter`                                                   |
| `OPENROUTER_API_KEY` | Your [OpenRouter API key](https://openrouter.ai/settings/keys) |
| `OPENROUTER_MODEL`   | `google/gemini-2.5-flash` (optional default)                   |
| `USDA_API_KEY`       | Optional, enables USDA Branded Foods barcode lookups           |

The default model supports [images and structured output](https://openrouter.ai/google/gemini-2.5-flash). You can select another OpenRouter model that supports both features. The service requires schema support from the selected endpoint and requests providers that disallow data collection. Provider availability and OpenRouter account policies still apply.

Start everything with:

```sh
npm run start:infisical
# Browser preview:
npm run start:infisical -- --web
# Or start just the photo service:
npm run server:infisical
```

Infisical injects secrets into **only the server process**, not Expo. No secrets are exported to a file, logged by the service, or given an `EXPO_PUBLIC_` prefix. Expo receives the public service URL; the launcher strips provider keys and Infisical credentials and disables Expo's automatic dotenv loading. Do not wrap the entire Expo command in `infisical run`.

To change scope, use `INFISICAL_ENV` and `INFISICAL_SECRET_PATH` in the local `.env` (these values are not secrets). Set `INFISICAL_API_URL` for an EU Cloud or self-hosted instance and log in to that same domain. For a machine identity, supply `INFISICAL_TOKEN` through your host's secret store and set `INFISICAL_PROJECT_ID`; the CLI reads the token from the server environment. Restart after changing secrets. See the [Infisical CLI guide](https://infisical.com/docs/cli/overview).

### Plain local setup

Copy `.env.example` to `.env`, set `OPENROUTER_API_KEY`, and run `npm start` or `npm run web`. Direct Gemini remains available by setting `AI_PROVIDER=gemini`, `GEMINI_API_KEY`, and optionally `GEMINI_MODEL` (default `gemini-3.8-flash`). Keep all provider keys server-only.

The launcher starts Expo and the service together and automatically uses your computer's Wi-Fi address for phone requests. Keep your phone and computer on the same Wi-Fi. With multiple network adapters, override `EXPO_PUBLIC_ANALYSIS_URL=http://YOUR_WIFI_IP:3001`. Remote photo services can also use this variable; Expo tunnels forward Expo only, so remote testing needs an accessible analysis service.

Missing keys, exhausted credits, unrecognizable food, and service errors show a clear retry/manual fallback. A real provider scan still requires your Infisical project, login, and OpenRouter key. Tests use mocked responses; no credentials or provider credits are used by the test suites.

Scans use low reasoning effort and retain nutrition validation. The service gives the entire estimate, including one nutrition correction and the USDA matching call, a shared 90-second deadline; the app stops waiting after 120 seconds, including photo preparation and upload. This leaves room for slower provider responses and a correction pass. Cancelled scans stop upstream work and late results cannot replace manual edits. Restart the photo service after changing its code or configuration.

The service uses the [OpenRouter Chat Completions API](https://openrouter.ai/docs/guides/overview/multimodal/image-understanding) or the [Gemini Interactions API](https://ai.google.dev/api/interactions-api). It validates input and nutrition results, limits request size and rate, and times out requests. Gemini interaction storage is disabled; OpenRouter provider routing disallows data collection. These settings are not a guarantee of zero retention across every service.

This is a **local development server** bound to your LAN for phone testing. Before public hosting, add authentication, HTTPS, persistent/distributed rate limiting, monitoring, and a reviewed privacy policy. CORS is configured for local browser preview; edit `ALLOWED_ORIGINS` if you use a different browser origin. Native requests do not use browser CORS. Hosting, cloud accounts, and provider billing are not set up.

## Accuracy and data

Carbsy records **total carbohydrate**, calories, protein and fat, with optional sugar, fiber, added sugar, saturated fat, sodium, potassium, calcium and iron. Sugar and fiber are already included in total carbs. Unknown nutrients stay unknown, never zero.

### How a carb number is made

A photo or description goes through two stages on the server:

1. **Perception (vision or text model).** The model identifies each food and its preparation, writes a USDA-style lookup phrase, and estimates the portion twice: as a household measure ("1 cup", "2 slices", "1 can") and as cooked edible grams with a min–max range. It also gives its own nutrition estimate, but only as a **cross-check**. For ambiguous look-alikes that differ in carbs (regular vs diet, juice vs water, flour vs corn tortilla), it lists alternatives.
2. **Grounding (USDA FoodData Central).** For each food, and each alternative, the server retrieves candidates from a bundled database of **12,826 USDA foods**: FNDDS 2021–2023 (foods as eaten, including mixed dishes such as curries, pizza and pad thai) and SR Legacy (basic foods). A text-only matching call picks the record that matches the food _and its preparation_, or none. It may only choose IDs the server offered. Nutrition is then calculated as **USDA per-100 g composition × grams**. When the household measure matches a USDA portion (e.g. FNDDS "1 cup, cooked" white rice = 163 g), USDA's weight replaces the photo's gram guess.

Safeguards:

- **Cross-check.** If the USDA result and the model's independent estimate disagree substantially, the food is flagged ("check the food type and amount"), its confidence drops to _rough_, and its range widens to include both.
- **Measure vs weight.** If the household measure and the gram estimate disagree by more than 2×, they are averaged and flagged.
- **Labels.** Readable labels and barcodes bypass the database and use label values.
- **No match.** Unmatched foods stay explicit **AI guesses**.
- **Matching failure.** If matching fails, the photo estimate is still returned, labelled as unmatched.
- **Validation.** Nutrient bounds, sugar/fiber ⊂ carbs, mass balance and energy plausibility are validated. One correction pass is allowed, and values are never silently clamped.

**Confidence** describes the carb number only: how wide its interval is, in grams and relative to the estimate. Ranges are assumption ranges, **not statistically calibrated confidence intervals**.

### Data sources

| Source                                                                                                                               | Used for                                                         | Setup                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| [USDA FNDDS 2021–2023](https://fdc.nal.usda.gov/download-datasets) + SR Legacy (`server/data/usda-foods.json`, retrieved 2026-10-17) | Grounding photo/description estimates; food search               | Bundled. Rebuild with `npm run build:foods -- --fndds <dir> --sr <dir> --out server/data/usda-foods.json` from the USDA CSV downloads |
| [USDA Branded Foods](https://fdc.nal.usda.gov/api-guide)                                                                             | Barcode lookup (manufacturer label data), branded search results | Optional `USDA_API_KEY` ([free key](https://fdc.nal.usda.gov/api-key-signup)) in server secrets                                       |
| [Open Food Facts](https://world.openfoodfacts.org/)                                                                                  | Barcode lookup (crowdsourced; worldwide coverage)                | None                                                                                                                                  |

Barcodes query both product databases at once and prefer USDA's manufacturer data. Impossible label data, such as more than 100 g of carbs per 100 g, is rejected rather than shown. Drinks are reported per 100 ml and scaled as ml ≈ g.

### Limits

A single photo cannot reliably reveal weight, recipe or amount eaten. Grounding removes the model's _nutrient recall_ as an error source, but **portion estimation and food identification remain the dominant errors** ([image-based dietary assessment research](https://pmc.ncbi.nlm.nih.gov/articles/PMC7686022/)). That is why Quick check asks about amounts and look-alikes, and why it targets the carb-heaviest uncertainty first.

No measured photo accuracy rate has been established yet. A proper benchmark would use independently weighed portions (for example [Nutrition5k](https://github.com/google-research-datasets/Nutrition5k)), measure per-food and meal-level absolute carb error, and separate identification error from portion error. For reliable counting, weigh food or use labels, barcodes or known recipes. **Do not use a photo estimate alone for medication decisions.**

On native devices, saved photos are copied out of the temporary camera cache into the app's document directory. Metadata is written only after photo persistence succeeds. Browser photos are compressed JPEG data URIs stored with the local journal. Clearing browser data or uninstalling the app deletes local data. The JSON export contains meal details, **not a photo backup**. There is no cloud sync or encryption layer in this version.

## Validate

```sh
npm run typecheck
npm run lint
npm test
```

The calculation tests cover fractional servings, zero versus missing carbs, local dates, and sample exclusion. Server tests use mocked provider responses to cover missing credentials, malformed data, unrecognizable food, CORS, and safe upstream errors. Real provider output requires a supplied key and hasn't been validated with clinical or weighed-meal benchmarks.

For browser interaction tests, keep `npm run web` running on port 8081:

```sh
PLAYWRIGHT_BROWSERS_PATH="$PWD/.playwright" npx playwright install chromium
PLAYWRIGHT_BROWSERS_PATH="$PWD/.playwright" npm run test:ui
```

The browser tests cover phone and desktop layouts, sample meals, manual calculations, import, persistence after reload, edit/delete/discard, search, and preferences. Physical camera capture and native haptics still need a real-device test in Expo Go.

Six additional mocked AI browser tests check automatic import and camera scans, editable calorie totals and persistence, compact results, nutrient edits, weight scaling, cancellation, retries, and incomplete-result fallback. To run them, start a second Expo preview with `EXPO_PUBLIC_ANALYSIS_URL=http://localhost:3001 npx expo start --web --port 8082`, then run `PLAYWRIGHT_BROWSERS_PATH="$PWD/.playwright" npm run test:ai`. These tests intercept requests; they don't call a provider.

The Node suite (62 tests) covers USDA grounding with the real bundled database, household-portion weights, cross-check flags, alternatives, label bypass, matcher safety, text input, barcode sources, food search, deadlines and secret isolation. The phone/desktop interaction suite has 8 tests, and the mocked AI suite has 8 tests.

To work on the UI without AI credits, `node scripts/mock-service.mjs` runs the real service with a canned "AI": database search, USDA grounding, barcodes and validation are real. Then start Expo with `EXPO_PUBLIC_ANALYSIS_URL=http://localhost:3001 npx expo start --web`. Browser camera coverage uses a simulated camera feed. Actual provider accuracy and physical-device camera/haptics have not been verified.

The SDK 57 dependency tree currently reports npm audit advisories inherited through Expo/React Native and their tooling. This is a local development app; dependency remediation should be reviewed before release. Avoid `npm audit fix --force`, which suggests incompatible SDK downgrades. The dependency lockfile is included.

## Project layout

- `src/app/`: Expo Router screens and layouts
- `src/components/`: shared UI, mascot, scanner, and meal review (`meal/`: food cards, quick check, food search, result hero)
- `src/state/`: serialized local journal persistence
- `src/lib/`: domain types, calculations, photo storage, sample data, and analysis client
- `server/`: Node service. `analysis.mjs` (perception → USDA grounding pipeline), `foods.mjs` (USDA database search), `sources.mjs` (barcode databases), `nutrition.mjs` (consistency checks), `data/` (bundled USDA foods)
- `tests/`: calculation, server, and browser tests

Design: warm cream, soft lilac, lime accents, DM Sans, Space Grotesk, and a hand-drawn SVG bean mascot. Animations respect reduced-motion settings; haptics are optional. Food preview photos are bundled locally from Unsplash ([salad](https://images.unsplash.com/photo-1546069901-ba9599a7e63c), [breakfast](https://images.unsplash.com/photo-1525351484163-7529414344d8), [berries](https://images.unsplash.com/photo-1464965911861-746a04b4bca6)). Sample food values are illustrative and don't claim to describe the stock photos accurately.
