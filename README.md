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

## Connect real photo estimates (optional)

Photo recognition needs a service and a provider key. Without them, the app supports photos, manual entry, and nutrition-label values; it does **not** pretend to analyze your images.

1. Copy `.env.example` to `.env` in this folder.
2. Set `GEMINI_API_KEY` to a key from [Google AI Studio](https://aistudio.google.com/apikey). This key is server-only: **never** give it an `EXPO_PUBLIC_` prefix.
3. Set `EXPO_PUBLIC_ANALYSIS_URL` to your computer's LAN address, for example `http://192.168.1.20:3001`, when testing on a phone. `localhost` works for a browser on the same computer.
4. In another terminal in this folder, run `npm run server`.
5. Restart Expo after changing `.env`.

When photo estimates are configured, capturing or importing a photo **automatically starts a scan** through the local service and Google Gemini. The camera and home screen explain this before capture or import. The scan fills in food names, portions, total carbs and calories; every value remains editable. Confirm that you checked the nutrition estimates before saving. Cancel to enter values manually, or use **Retry scan** after a failure. Reopening a saved memory preserves your edits without starting a new scan; **Scan again** is available when you want a fresh estimate.

The included server uses the [Gemini Interactions API](https://ai.google.dev/api/interactions-api), structured output, and the configurable `GEMINI_MODEL` (default `gemini-3.8-flash`, documented by [Google](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash)). It validates input images and returned values, limits request size and rate, times out requests, and does not log photos or keys. Interaction storage is disabled with `store: false`; Google's provider data policies still apply. Missing credentials, unrecognizable food, and service errors produce a clear manual-entry fallback.

This is a **local development server** bound to your LAN for phone testing. Before public hosting, add authentication, HTTPS, persistent/distributed rate limiting, monitoring, and a reviewed privacy policy. CORS is configured for local browser preview; edit `ALLOWED_ORIGINS` if you use a different browser origin. Native requests do not use browser CORS. Hosting, cloud accounts, and provider billing are not set up.

## Accuracy and data

Carbsy records **total carbohydrate**, not net carbs, plus optional calories in kcal. Calories are estimated independently of carbs, including the energy contribution of fat and protein. Meals saved before calorie support remain readable; missing calorie values stay unknown rather than being counted as zero. A photograph cannot determine exact weight, ingredients, or cooking method. Photo outputs are estimates, not validated nutrition facts. For reliable counting, weigh your food and enter values from its nutrition label or a trusted nutrition source. Do not use a photo estimate alone for medication decisions.

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

Five additional mocked AI browser tests check automatic import and camera scans, editable calorie totals and persistence, review before saving, cancellation, retries, and incomplete-result fallback. To run them, start a second Expo preview with `EXPO_PUBLIC_ANALYSIS_URL=http://localhost:3001 npm run web -- --port 8082`, then run `PLAYWRIGHT_BROWSERS_PATH="$PWD/.playwright" npm run test:ai`. These tests intercept requests; they don't call a provider.

The calculation/server suite has 10 tests, the phone/desktop interaction suite has 8 tests, and the mocked AI suite has 5 tests. Browser camera coverage uses a simulated camera feed. Actual provider accuracy and physical-device camera/haptics have not been verified.

The SDK 57 dependency tree currently reports npm audit advisories inherited through Expo/React Native and their tooling. This is a local development app; dependency remediation should be reviewed before release. Avoid `npm audit fix --force`, which suggests incompatible SDK downgrades. The dependency lockfile is included.

## Project layout

- `src/app/`: Expo Router screens and layouts
- `src/components/`: shared UI, mascot, scanner, and meal review
- `src/state/`: serialized local journal persistence
- `src/lib/`: domain types, calculations, photo storage, sample data, and analysis client
- `server/`: optional Node photo-analysis proxy
- `tests/`: calculation, server, and browser tests

Design: warm cream, soft lilac, lime accents, DM Sans, Space Grotesk, and a hand-drawn SVG bean mascot. Animations respect reduced-motion settings; haptics are optional. Food preview photos are bundled locally from Unsplash ([salad](https://images.unsplash.com/photo-1546069901-ba9599a7e63c), [breakfast](https://images.unsplash.com/photo-1525351484163-7529414344d8), [berries](https://images.unsplash.com/photo-1464965911861-746a04b4bca6)). Sample food values are illustrative and don't claim to describe the stock photos accurately.
