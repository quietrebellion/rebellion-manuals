# Tools

Test and build scripts for the Rebellion Manuals. Node plus Playwright, no build step.

```
npm i playwright @axe-core/playwright
```

Chromium is expected at `/opt/pw-browsers/chromium`, with a fallback to whatever Playwright
resolves on its own.

| Script | What it does |
|---|---|
| `preship.js` | The big one. Runs axe (WCAG 2 A/AA) across every screen, dumps the generated calendar file for inspection, writes a PDF, and loads a legacy localStorage shape to prove back-compat. Run this before any deploy. |
| `qa.js` | Functional and edge cases. Empty input, advancing with nothing entered, long and unusual input, HTML injection, mid-flow reload. |
| `qa3.js` | Targeted regression checks for the fixes that keep breaking: skip-link reachability, no em dashes in generated markup, 44px touch targets, overflow at 375px and at 200% text zoom. |
| `qa5.js` | Meta and information density. OG and canonical tags, external request count, then per-screen word count, height, and control sizes. |
| `icscheck.js` | Validates the generated iCalendar against RFC 5545. DTSTAMP present, text escaping, 75-octet line folding. |
| `test-protect.js` | Flow test for the protect step and the fear field echo. |
| `test-v10.js` | End-to-end walk through all ten screens. |
| `shoot-og.js` | Renders `src/og-card.html` and `src/og-hub.html` to 1200x630 PNGs. |

## Watch out

`innerText` uppercases anything styled `text-transform: uppercase`, so a regex looking for
sentence-case copy will produce false failures on kickers and mono labels. Two checks broke
this way during the Bedrock build.
