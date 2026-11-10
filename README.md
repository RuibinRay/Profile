# Beyond the Frame — the painted universe of Ray

The portfolio of **Ruibin (Ray) Jin Yao**, told as a walk through eight living Van Gogh-style paintings.

> Every journey adds another brushstroke to who I am.

- **The film:** `index.html` — a scroll-driven journey in eight chapters.
- **The plain portfolio:** `portfolio.html` — the same content on one ordinary, fast page (the film's *View portfolio* and *Skip experience* go here).
- **Storyboard:** [`docs/STORYBOARD.md`](docs/STORYBOARD.md) — every chapter, camera move and transition, in words.

Plain HTML, CSS and JavaScript modules. No build step, no framework, no backend, no trackers. Three.js and GSAP are in `assets/vendor/`; everything you'll want to change lives in `data/`.

---

## What's on the site

| Chapter | Address | What it is | Content comes from |
|---|---|---|---|
| 1. Enter the Painting | `#home` | The name over the night ocean; the camera pushes into a star. | `data/site.js` → `profile` |
| 2. Where My Story Begins | `#about` | Three cultures, three languages, school, what drives me; the full biography opens from here. | `data/site.js` → `about`, `education`, `profile.languages` |
| 3. My Journey | `#experience` | Every job, school and milestone as a lantern on one golden stroke. Something still ahead is an unlit lantern. | `data/journey.js` |
| 4. The World I've Explored | `#world` | A painted globe and the countries I know; each opens its places and photographs. | `data/travel.js`, `data/gallery.js` |
| 5. Gallery of Creations | `#projects` | Every project as a framed canvas: five featured websites, then a wall per field. | `data/work.js` |
| 6. Energy and International Business | `#energy` | The HJAT internship as an energy landscape with six stops. | `data/journey.js` (`hjat`), `data/work.js` (`storage`) |
| 7. My Palette of Skills | `#skills` | Skills as brushstrokes: tools and the work where each shows. Languages and certificates. | `data/palette.js`, `data/site.js` → `certifications`, `coursework`, `awards` |
| 8. Beyond the Horizon | `#contact` | The stars joined into one constellation, then the invitation to get in touch. | `data/site.js` → `links` |

**Full views** open over the film and close back to where you were:

| Address | View |
|---|---|
| `#view/story` | the whole biography, At a Glance, education, résumé |
| `#view/timeline` | the full journey with filters by kind and year |
| `#view/atlas` | the interactive world map, statistics, year filter, replay, photo albums |
| `#view/projects` | every project, with search and filters by field (`#view/projects.finance` opens it filtered) |
| `#view/credentials` | languages, tools, certificates with their verification links, coursework, awards |

**Detail links** are the ones the first site used, so old links keep working on both pages: `#projects/<id>` (a case study), `#world/<CODE>` (a country), `#experience/<id>` (a journey entry), `#skills/<id>` (a colour of the palette), `#memories/<album>`.

---

## Editing your content

Open a file in `data/`, change the text, save, refresh. Both pages read the same files.

Three rules the site follows:

1. **Empty means hidden.** Any `''` or `[]` is left off the public site.
2. **Draft view shows what's missing.** Add `?draft` to the address to see every empty field as a note, plus the atlas editor (on the plain portfolio) and the paintings still to supply (on the film).
3. **Nothing is invented.** Every fact came from you. Counts on screen (projects, lanterns, countries, photographs, certificates) are computed from the data files.

The data files are the ones from the first site and are documented at the top of each: `site.js` (profile, links, about, education, awards, certificates, coursework), `journey.js`, `work.js`, `palette.js`, `travel.js`, `gallery.js`. `world.js` and `regions/` are generated map data; don't edit them.

Two things changed in the data for this version:

- `profile.tagline` is now *Building Beyond the Horizon.*
- `palette.js` has a tenth colour, **Web & creative development**. Its tools and projects are the ones already listed on the Digital Creations case studies in `work.js`.

### Linking things together

Projects, journey entries, countries and skills point at each other with short references in their `related` (or `seenIn`) lists: `'j:<id>'` a journey entry, `'w:<id>'` a project, `'c:<CODE>'` a country, `'s:<id>'` a skill. Add a reference and the link appears in both places.

### Adding a project, a journey entry, a country, photos, a certificate

Exactly as before; the comments at the top of each data file have the fields. In short:

- **Project:** copy an entry in `data/work.js`. `featured: true` with a `cover` screenshot makes it one of the large canvases in chapter 5; every project appears on its field's wall and in the index.
- **Journey entry:** copy an entry in `data/journey.js`. `upcoming: true` draws it as an unlit lantern.
- **Country:** add it to `countries` in `data/travel.js` with `status: 'visited'` (or `home`, `current`, `wishlist`). Only `home`, `visited` and `current` are lit on the globe and listed. A country that isn't in the file is never shown as visited.
- **Photos:** upload to `assets/photos/<COUNTRY>/<place>/` on GitHub, or prepare them in three sizes with `python3 tools/prepare_media.py <photo> assets/media/<folder>/<name>` and list them in the data file.
- **Certificate:** add it to `certifications` in `data/site.js`; `url` is the issuer's verification page.

---

## The paintings

Each painting is prepared once by `tools/prepare_paintings.py` into `assets/paintings/`:

| File | Used for |
|---|---|
| `<id>-2048.webp`, `<id>-1280.webp`, `<id>-640.webp` | the painting for desktop, phones, and thumbnails |
| `<id>-aux.png` | the motion map the shader reads: red and green are the direction the paint flows (along its own brushstrokes), blue is depth |
| `<id>-bg-1280.webp`, `<id>-fg-1280.webp` | a far layer with the foreground painted out, and the foreground cut out, for the lighter two-layer parallax |
| `manifest.json` (and `assets/js/cinema/manifest.js`) | sizes, colours, a tiny blurred preview, the wall label, the photograph it was painted from, and hand-placed anchor points (stars, the tunnel's end, the sun) that cameras and portals aim at |

The sources are in `tools/source/paintings/`. Depth comes from the Depth Anything V2 (small) model run on your own computer; the model is not in the repository. The top of the script has the three commands to set it up.

### Adding or replacing a painting

1. Put the image in `tools/source/paintings/` (16:9, as large as you have).
2. Add an entry to `PAINTINGS` in `tools/prepare_paintings.py`: an `id`, the title and label for its wall card, `alt` text, the photograph it was painted from (optional), and a few `anchors`.
3. Run the script. It writes the images and the manifest.
4. Give the painting a shot in `assets/js/cinema/storyboard.js`: which chapter, where the camera looks and how it gets there. `docs/STORYBOARD.md` explains the vocabulary.

**Still to supply:** paintings of Costa Rica and Boston for chapter 2 (`AWAITING` in `storyboard.js`). Until then that chapter uses the flying house and the blossom tree, with your real photographs of the three places in its windows.

---

## How the film works

```
assets/js/cinema/
  storyboard.js     the film as data: chapters, cameras, transitions (one unit = one screen of scroll)
  engine.js         one GSAP ScrollTrigger scrubbing one master timeline; text "beats"; travel between chapters
  stage-gl.js       the WebGL stage (Three.js): the painting shader, motes in the air, quality tiers
  shaders.js        GLSL: depth parallax, paint flow, impasto light, the four transitions
  globe.js          the painted globe of chapter 4
  stage-lite.js     the lighter stage: layered images, CSS transforms and clip-paths, no WebGL
  view.js           camera maths shared by both stages
  manifest.js       the paintings (generated)
  chrome.js         top bar, menu, progress stroke, wall label, pause
  panels.js         the full views and the detail routes
  project-index.js  the searchable project list (also used by the plain portfolio)
  chapters/*.js     one small file per chapter: its words, controls and scroll behaviour
  main.js           chooses a stage and puts it together
assets/js/content/  the content components from the first site (case studies, atlas, timeline, palette,
                    certificates, contact, star chart), shared by the film's panels and portfolio.html
assets/js/portfolio.js   the plain portfolio
assets/css/         content.css (components) · cinema.css (the film) · portfolio.css (the plain page)
```

- **Everything is a function of the scroll position.** The timeline never plays by itself, so scrolling back reverses every camera move, transition and piece of text.
- **Three stages, one film.** WebGL on capable screens. The lighter stage on phones, small touch screens, low-memory devices and when WebGL 2 is missing; it is also where the WebGL stage hands over if it cannot keep up after stepping its resolution down twice. The calm stage when *Reduce motion* is on: no push-ins, plain cross-fades, text that fades without travelling. All content is the same in all three.
- **Memory.** Only the paintings on stage and their neighbours hold textures (at most four); the rest are released. Pixel ratio is capped at 1.75. The world map and globe data load only as chapter 4 approaches.
- **Pause.** The round button in the top bar stops everything that moves by itself (remembered in that browser). Scrolling still works.
- **Not trapped.** The menu, the chapter marks on the progress stroke, the previous / next arrows, *View portfolio* and *Skip experience* are always available; far jumps cut behind a short curtain rather than fast-forwarding the film.

### Address options, for testing

| Add to the URL | Effect |
|---|---|
| `?draft` | marks what is still to add |
| `?lite` | the lighter stage |
| `?calm` | the reduced-motion stage |
| `?gl` | force the WebGL stage |
| `?why` | shows which stage is running, at what quality, and why |
| `?step` | no scroll smoothing: the film is exactly where the scrollbar is |

In the console, `RJY.film.engine.travel(12.5)` jumps to a moment and `RJY.film.stage.info()` reports the stage.

---

## Previewing on your computer

The film uses JavaScript modules, which browsers only load from a server. In this folder:

```bash
python3 -m http.server 8000
```

then open http://localhost:8000.

## Publishing on GitHub Pages

The site is built to live in a repository named **`Profile`**, at `https://ruibinray.github.io/Profile/`.

1. Create a public repository named `Profile` and push this folder to its `main` branch (keep the empty `.nojekyll` file).
2. **Settings → Pages → Build and deployment:** *Deploy from a branch*, `main`, `/ (root)`.
3. After a minute or two it is live.

All paths are relative, so the site also works from another repository name or from a user site (`ruibinray.github.io`). Four things mention the address and should be changed if it moves: `<link rel="canonical">` and the `og:` tags in `index.html` and `portfolio.html`, `sitemap.xml`, `robots.txt`, and the links in `404.html`. `meta.repo` in `data/site.js` tells the site where to look for photos uploaded to `assets/photos/`.

After changing code, change the `?v=` number on the `<link>` and `<script>` lines of both pages so browsers fetch the new files.

Never commit passwords, API keys or anything private: the repository is public.

---

## Accessibility and performance

- Real headings (`h1` on the name, an `h2` per chapter), a skip link to the plain portfolio, visible focus, links and buttons throughout. Gallery canvases, lanterns and country names are ordinary links; one reached with the keyboard is brought to the middle of the screen.
- Dialogs trap focus and close with Esc. The chapter name is announced when it changes.
- *Reduce motion* gets the calm stage; the pause button stops all self-moving paint.
- Text over the paintings sits on a pool of night and the stage dims behind it.
- Project screenshots are shown as they are, never repainted.
- First visit, desktop: the page, fonts, GSAP and Three.js, then one painting (about 0.8 MB) and its motion map; later paintings load a chapter ahead. Phones never load Three.js.

## Credits

- Paintings: Van Gogh-style scenes from my own photographs, and a Starry Night ocean scene after Vincent van Gogh.
- [three.js](https://threejs.org) (MIT) and [GSAP](https://gsap.com) with ScrollTrigger (GreenSock standard licence); notices in `assets/vendor/LICENSES.txt`. `tools/build_vendor.sh` refreshes them.
- Depth maps made with [Depth Anything V2](https://github.com/DepthAnything/Depth-Anything-V2) (small), run locally.
- Fonts: [Fraunces](https://github.com/undercasetype/Fraunces), [Instrument Sans](https://github.com/Instrument/instrument-sans), and a subset of [Noto Serif SC](https://github.com/notofonts/noto-cjk), SIL Open Font License.
- Country borders, provinces and cities: [Natural Earth](https://www.naturalearthdata.com/) (public domain). Map code: d3-geo, d3-zoom, topojson-client (ISC). Flags: [flag-icons](https://github.com/lipis/flag-icons) (MIT).
