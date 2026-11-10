# Photos

Photos uploaded here appear on the site by themselves: inside each country on the World map (under the city or province they belong to), and in the country's album under the map. There's no code to edit.

## Where they go

```
assets/photos/<COUNTRY>/<place>/<photo>.jpg     a city or a province/state
assets/photos/<COUNTRY>/<photo>.jpg             the country in general ("Around China")
```

- `<COUNTRY>` is the three-letter code: `CHN` China · `USA` United States · `CAN` Canada · `KOR` South Korea · `CRI` Costa Rica. Other countries: [ISO 3166-1 alpha-3](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-3).
- `<place>` is the city or province/state in lowercase, with dashes for spaces: `shenyang`, `boston`, `new-york`, `seoul`, `busan`, `toronto`, `british-columbia`, `heredia`.
- A folder for a place that isn't listed in `data/travel.js` adds that place to the map by itself. The site recognises the city or province from the folder's name and lights it up.
- A country with photos but no entry in `data/travel.js` is lit as visited.

## Uploading on github.com

1. Open [assets/photos on GitHub](https://github.com/RuibinRay/RuibinRay.github.io/tree/main/assets/photos) and click into the country, then the place.
2. **Add file → Upload files**, drag the photos in, then **Commit changes**.
   For a new place, drag in a whole folder named after it (for example a folder `seoul` with the photos inside). GitHub keeps the folder.
3. The site updates in a minute or two. A browser that already had the site open picks up new photos within 10 minutes.

## Captions and dates

The file name becomes the caption, and a date in the name becomes the photo's date:

| File name | Shows as |
|---|---|
| `2026-07-12 Zhongjie at night.jpg` | "Zhongjie at night", Jul 2026 |
| `great-wall-at-sunrise.jpg` | "Great wall at sunrise" |
| `IMG_2041.jpg` | no caption |
| `PXL_20260712_093011.jpg` | no caption, Jul 2026 |

For a longer caption or a story, list the photo under its place in `data/travel.js`:

```js
places: [
  { name: 'Shenyang', region: 'Liaoning', note: '…',
    photos: [ { src: 'assets/photos/CHN/shenyang/IMG_2041.jpg', caption: 'First week at HJAT', date: '2026-06', story: '…' } ] }
]
```

Add `public: false` to a listed photo to keep it off the site.

## Before uploading

- **Format:** `.jpg`, `.png`, `.webp` or `.avif`. iPhone `.heic` photos don't display in most browsers. Export them as JPEG first, or set iPhone **Settings → Camera → Formats → Most Compatible**.
- **Size:** about 2000 px on the long side and under ~500 KB each keeps the site fast ([Squoosh](https://squoosh.app) does this in the browser). GitHub refuses files over 100 MB.
- **Everything here is public**, including what's hidden inside a photo file. Phone photos often store the GPS location where they were taken. Remove it before uploading if you don't want it public (on iPhone: Share → Options → turn off Location; on Windows: Properties → Details → Remove Properties).
- Ask before posting photos of other people.

## How the site finds them

GitHub Pages only serves files; it can't list a folder. So the site asks GitHub's public API for the list of files in this folder (`api.github.com`, at most once every 10 minutes per visitor). If GitHub doesn't answer (it allows 60 requests an hour per network), the site shows the photos it already knows about, plus any listed in `data/travel.js` and `data/gallery.js`.
