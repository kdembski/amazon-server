---
name: anomalies
description: Use when asked how conversion errors or pricing errors work, why a listing was or was not reported to Discord, or before changing anomaly detection (src/modules/anomalies, a marketplace's price update, its ListingPrice mapper, reporters or Discord services).
---

# Anomalies

Price anomalies found after a marketplace stores scraped prices, reported as `ActivityEvent`s and Discord messages.

- [conversion-error.md](conversion-error.md): one country is much cheaper than the others after conversion to PLN.
- [pricing-error.md](pricing-error.md): a country's price dropped sharply against its own recent history.

Read the file of the detector in question; read both before changing the marketplace input (its price update, the
recent-prices query, the `ListingPrice` mapper). Detectors in `src/modules/anomalies` work on `ListingPrice` only;
each marketplace in `src/modules/marketplaces/<name>` supplies the prices and the reporters. Check production
behaviour with the `database` skill (`ActivityEvent` types `conversion_error_sent`, `pricing_error_sent`, `ad_scraped`).
