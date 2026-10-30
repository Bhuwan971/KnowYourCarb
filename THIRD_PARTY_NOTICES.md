# Third-party notices

The repository's MIT license applies to project source. Keep the existing Expo copyright notice for inherited template material. Dependencies retain their respective licenses in their installed packages; the lockfile records exact versions.

## USDA data

`server/data/usda-foods.json` is generated from USDA FoodData Central FNDDS 2021–2023 and SR Legacy. Source URLs and transformation are in `scripts/build-food-db.mjs`. Attribution: U.S. Department of Agriculture, Agricultural Research Service, FoodData Central. See [data documentation](https://fdc.nal.usda.gov/data-documentation/) and [API guide](https://fdc.nal.usda.gov/api-guide/). FoodData Central data are public domain and published under CC0. USDA does not endorse this application.

## Open Food Facts

Barcode responses are fetched at runtime from [Open Food Facts](https://world.openfoodfacts.org/). Its database is under the Open Database License (ODbL), with individual contents under the Database Contents License. These terms are separate from the source-code license. Preserve attribution and review the ODbL obligations before redistributing a derived database. See the [official API licensing documentation](https://openfoodfacts.github.io/openfoodfacts-server/api/). No Open Food Facts database dump or product images are bundled.

## Sample photography

The sample images use the [Unsplash license](https://unsplash.com/license), not MIT:

- `assets/bowl.jpg`: [salad source](https://images.unsplash.com/photo-1546069901-ba9599a7e63c)
- `assets/toast.jpg`: [breakfast source](https://images.unsplash.com/photo-1525351484163-7529414344d8)
- `assets/berries.jpg`: [berries source](https://images.unsplash.com/photo-1464965911861-746a04b4bca6)

Screenshots can incorporate these sample photographs and retain those terms. The photos illustrate the interface and do not validate the sample nutrition values.

## Fonts

DM Sans and Space Grotesk are supplied through `@expo-google-fonts/dm-sans` and `@expo-google-fonts/space-grotesk`. Their font files use the SIL Open Font License 1.1. Copies of the font license and copyright notices are in `docs/licenses/`; retain these notices when distributing bundled fonts. The JavaScript font packages carry their own package licenses.
