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

- Snap a photo, import from your library, or enter a meal manually.
- Returning to the mobile home screen opens a live camera once permission has been granted.
- Try the animated sample scan immediately, without configuring any services.
- Keep a photo with editable food names, explicit portions, total carbohydrate, calories, servings eaten, meal type, and notes.
- Each food's carbs and calories are multiplied by portions eaten; the photo sticker and memory card update as you edit. The daily carb total stays in sync.
- Save or discard; browse, search, filter, reopen, edit, and delete memories.
- View seven days of logged carbs. Set an optional personal daily reference; no target is prescribed.
- Customize your greeting and haptics. Export meal details as JSON (photos are excluded).
- Photos and journal data persist locally across restarts. No account is needed.

Sample memories are explicitly labeled and **excluded from all real daily and weekly totals**. The app starts with an empty real journal.

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

Scans use low reasoning effort and retain nutrition validation. The service gives the entire estimate, including one nutrition correction, a shared 35-second deadline; the app stops waiting after 45 seconds, including photo preparation and upload. Cancelled scans stop upstream work and late results cannot replace manual edits. Restart the photo service after changing its code or configuration.

The service uses the [OpenRouter Chat Completions API](https://openrouter.ai/docs/guides/overview/multimodal/image-understanding) or the [Gemini Interactions API](https://ai.google.dev/api/interactions-api). It validates input and nutrition results, limits request size and rate, and times out requests. Gemini interaction storage is disabled; OpenRouter provider routing disallows data collection. These settings are not a guarantee of zero retention across every service.

This is a **local development server** bound to your LAN for phone testing. Before public hosting, add authentication, HTTPS, persistent/distributed rate limiting, monitoring, and a reviewed privacy policy. CORS is configured for local browser preview; edit `ALLOWED_ORIGINS` if you use a different browser origin. Native requests do not use browser CORS. Hosting, cloud accounts, and provider billing are not set up.

## Accuracy and data

Carbsy records **total carbohydrate**, calories, protein and fat, with optional sugar, fiber, added sugar, saturated fat, sodium, potassium, calcium and iron. Sugar and fiber are already included in total carbs; added sugar is included in sugar. Unknown nutrients stay unknown, including incomplete meal totals. Older journals remain readable.

Scans separate food identification and cooked edible weight from nutrient calculation. For matching plain foods, the server scales a bundled, attributed [USDA FoodData Central](https://fdc.nal.usda.gov/) composition record per 100 g (`server/food-reference.json`, retrieved October 6, 2026). The catalog covers 18 common foods, including cooked meat, eggs, legumes, rice and injera. It requires an appropriate preparation match; complete stews, coated foods and unmatched recipes use explicitly marked AI estimates. Readable labels take precedence. Unsupported recipe-dependent nutrients (especially added sugar and unknown seasoning/sodium) remain unknown. No USDA API key or live database request is required at scan time.

The server checks nutrient bounds, carbohydrate/sugar/fiber relationships, edible mass and broad macro energy consistency, and makes at most one correction pass on inconsistent nutrition. Energy checks allow rounding, fiber and food-specific factors; they do **not** recover carbs or sugar from calories. A rejected estimate stays editable rather than being silently clamped. Scans include assumption ranges for portions/carbs where available; these are **not statistically calibrated confidence intervals**. Weight edits scale all known nutrients together, while portions eaten scale totals. Changing descriptive portion text alone does not recalculate nutrition.

A single photo cannot reliably reveal weight, recipe or amounts eaten. The visible injera/flatbread beneath toppings is counted separately, and can be removed or its portions reduced if it was not eaten. The minimal result shows the photo, carbs, calories, protein/fat and save action; **More nutrition** exposes other nutrients and uncertainty, and **Edit details** exposes portions and values.

These checks improve numerical consistency and grounding, but have not established a measured photo accuracy rate. [Image-based dietary assessment research](https://pmc.ncbi.nlm.nih.gov/articles/PMC7686022/) identifies food matching and portion estimation as substantial sources of error. For reliable counting, weigh food and use labels, known recipes or matching composition records. [USDA documentation](https://fdc.nal.usda.gov/Foundation_Foods_Documentation/) describes per-100-g values and food-specific energy factors; the [FDA explains total and added sugar](https://www.fda.gov/food/nutrition-facts-label/added-sugars-nutrition-facts-label). A future accuracy benchmark should use independently weighed portions and known recipes, measure per-food and meal-level absolute carb/energy error, assess range coverage, and separate identification error from portion error. Do not use a photo estimate alone for medication decisions.

On native devices, saved photos are copied out of the temporary camera cache into the app's document directory. Metadata is written only after photo persistence succeeds. Browser photos are compressed JPEG data URIs stored with the local journal. Storage failures preserve the editor and show an error instead of reporting success. Browser storage has a quota; larger journals may eventually need IndexedDB/cloud storage. Clearing browser data or uninstalling the app deletes local data. The JSON export contains meal details, **not a photo backup**. There is no cloud sync or encryption layer in this first version.

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

The browser tests cover phone and desktop layouts, sample animation, manual calculations, import, persistence after reload, edit/delete/discard, search, and preferences. Physical camera capture and native haptics still need a real-device test in Expo Go.

Six additional mocked AI browser tests check automatic import and camera scans, editable calorie totals and persistence, compact results, nutrient edits, weight scaling, cancellation, retries, and incomplete-result fallback. To run them, start a second Expo preview with `EXPO_PUBLIC_ANALYSIS_URL=http://localhost:3001 npx expo start --web --port 8082`, then run `PLAYWRIGHT_BROWSERS_PATH="$PWD/.playwright" npm run test:ai`. These tests intercept requests; they don't call a provider.

The calculation/server/provider and secret-isolation suite has 16 tests, the phone/desktop interaction suite has 8 tests, and the mocked AI suite has 5 tests. Browser camera coverage uses a simulated camera feed. Actual provider accuracy and physical-device camera/haptics have not been verified.

The SDK 57 dependency tree currently reports npm audit advisories inherited through Expo/React Native and their tooling. This is a local development app; dependency remediation should be reviewed before release. Avoid `npm audit fix --force`, which suggests incompatible SDK downgrades. The dependency lockfile is included.

## Project layout

- `src/app/`: Expo Router screens and layouts
- `src/components/`: shared UI, mascot, scanner, and meal review
- `src/state/`: serialized local journal persistence
- `src/lib/`: domain types, calculations, photo storage, sample data, and analysis client
- `server/`: Node photo-analysis proxy for OpenRouter or Gemini
- `tests/`: calculation, server, and browser tests

Design: warm cream, soft lilac, lime accents, DM Sans, Space Grotesk, and a hand-drawn SVG bean mascot. Animations respect reduced-motion settings; haptics are optional. Food preview photos are bundled locally from Unsplash ([salad](https://images.unsplash.com/photo-1546069901-ba9599a7e63c), [breakfast](https://images.unsplash.com/photo-1525351484163-7529414344d8), [berries](https://images.unsplash.com/photo-1464965911861-746a04b4bca6)). Sample food values are illustrative and don't claim to describe the stock photos accurately.
