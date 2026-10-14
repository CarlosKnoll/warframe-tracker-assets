# warframe-tracker-assets

Images used by the Warframe tracker (task icons, shard colors, vendor icons).
Kept in a separate repo so pictures can change without releasing a new app version.

## How the app finds them

1. The app fetches `icons.json` from the `releases` branch (written by CI, never by hand).
2. That manifest holds `assetsVersion` (an exact git tag, e.g. `v1.0.0`) and a map of
   icon key -> file path.
3. Images load from `https://cdn.jsdelivr.net/gh/CarlosKnoll/warframe-tracker-assets@<assetsVersion>/<path>`.

The app only ever asks for **keys** (e.g. `reward.forma`), never file paths, so files can be
renamed or replaced freely as long as the keys keep existing.

## Image spec

- WebP (SVG or PNG also accepted), transparent background
- 128 x 128 px, ideally under 15 KB (the build warns above 40 KB)
- lowercase kebab-case file names, grouped in `tasks/`, `shards/`, `vendors/`, `ui/`

## Releasing a change

```sh
# 1. add/replace images, edit icons.src.json if keys or paths changed
git add -A && git commit -m "Update forma icon"
git push

# 2. tag a NEW version (never reuse or move a tag) and push it
git tag v1.0.1
git push origin v1.0.1
```

The `release-manifest` workflow validates `icons.src.json` against the files on disk and, if
everything checks out, publishes the new `icons.json` to the `releases` branch.
To test validation locally: `VERSION=v0.0.0 node scripts/build-manifest.mjs`.

## Credits

Warframe and its artwork belong to Digital Extremes. Add attribution/source notes here.
