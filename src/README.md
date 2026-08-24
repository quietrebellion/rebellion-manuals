# Source

Canonical source for the Rebellion Manuals. Each manual is a single self-contained HTML file
with no build step and no dependencies beyond Google Fonts and the Kit embed script.

| File | Deploys to |
|---|---|
| `bedrock.html` | `/bedrock/index.html` |
| `hub.html` | `/index.html` |
| `og-card.html` | source for `/bedrock/og.png` |
| `og-hub.html` | source for `/og.png` |
| `kit-email-template.html` | pasted into Kit, not deployed here |

## Deploying

Copy the file to its deploy path, commit, then verify by hash rather than by eye:

```sh
curl -s "https://manuals.rebellioncollective.com/bedrock/?cb=$(date +%s)" | sha256sum
sha256sum src/bedrock.html
```

The CDN is `max-age=600` behind Varnish, so expect two or three polls at 15 second intervals
before the new hash lands. Do not trust a deploy until the hashes match. Commits through the
GitHub web UI have silently failed here more than once.

## Brand

```
Deep Teal    #064B56
Ember Orange #F2542D
Pale Sage    #DBE0B2
Bone Canvas  #F7F3E8
Ash Charcoal #1E2422
sage-soft    #E9ECD3
```

Poppins 300/400/600/800, DM Mono 500.

Ember fails contrast as text at 3.11:1 on bone. It is for rules, buttons, focus rings, and
accents only. Labels and links use Deep Teal.

## Non-obvious constraints

State keys are `<manual>-v1` in localStorage, with every read and write wrapped in try/catch
and an in-memory fallback so private browsing does not break the tool.

Item IDs must be hyphenated integers. `Date.now() + Math.random()` puts a decimal point in
the ID and `querySelector('#id')` throws.

Every user string passes through `esc()` before touching innerHTML.

`overflow-wrap: anywhere` on body text, or one long pasted string blows out mobile layout.

The skip link has to be the first Tab stop, so the initial render must not move focus to the
h2. A `booted` flag gates that. `<main>` carries `tabindex="-1"` so the skip link actually
lands somewhere.
