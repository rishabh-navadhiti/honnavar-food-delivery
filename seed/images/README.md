# Seed images

Photos for the demo catalogue (`seed/catalogue.json`). The demo reset loads each file through the same
resize path as uploads (320 px and 800 px WebP), so any reasonable photo works.

- **Kitchen photo:** `<kitchen-key>.jpg`, e.g. `sharavathi-udupi-bhavana.jpg`
- **Dish photo:** `<kitchen-key>--<dish-key>.jpg`, e.g. `sagara-fish-meals--fish-thali.jpg`
- **Formats:** JPEG, PNG or WebP, up to 5 MB each. Use the exact file name given in the catalogue's
  `image` field (the extension may differ if the catalogue says so).
- **Missing files are fine:** the reset logs one warning listing them, and the app shows the placeholder
  illustration instead.

Only add photos you have the right to use. The stand-in catalogue ships with no images.
