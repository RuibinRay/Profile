# The cinematic rebuild — exactly what changed

Branch `cinematic-4k-film`, 10 November 2026. The eight chapters, their order, their length in scroll,
every word, link, panel, deep link and the plain portfolio are as they were. What changed is how the
paintings are prepared and how the film is drawn.

Read with: [`ASSET-AUDIT.md`](ASSET-AUDIT.md) (the image-quality phase) and
[`STORYBOARD.md`](STORYBOARD.md) (the film, scene by scene).

## 1. Paintings and other assets

| What | Before | Now |
|---|---|---|
| Largest painting file | 2048 px WebP, a plain resize of a 1376–2000 px original | 3840 px AVIF from an AI-upscaled master, colour-locked to the original; 2560, 1280 and 640 px in AVIF and WebP |
| Close-ups | none | eight 2048 px close-ups of the regions the camera enters |
| Depth and flow map | 512 px, one depth pass | 1280 px, depth read at two scales and merged, sky set to infinity |
| Layers | one cut-out and a blurred background, lighter stage only | three depth layers per painting; what is behind each is painted in by an inpainting model and used only beside real steps in depth |
| Motion masks | none | wind, water and sky regions per painting |
| The ocean | a 4:3 painting from an older, smaller rendition | put together at 3840 × 2160 (16:9) from the two pictures supplied for it: the empty night ocean, and the figure on his log as a separate element. The element is the near layer exactly and the empty ocean is what is behind it. The log runs off the left edge and the feet below the log were removed, as asked |
| Masters | none | `tools/masters/`, apart from the web versions |

New and changed tools:

- `tools/upscale_paintings.py` (new): supplied painting → 4K master and close-ups (Real-ESRGAN, on the GPU); for a painting made of a background and an element, enlarges both and lays the element in place.
- `tools/prepare_paintings.py` (rewritten): master → every web file, the maps, the layers, the fills, the manifest.
- `tools/transition_frames.py` (new): the start and end frame of every transition, for a video generator.
- `tools/prepare_transition.py` (new): a generated clip → frames the film scrubs. See `tools/transitions/README.md`.

## 2. The film

### `assets/js/cinema/shaders.js` (the painting shader, rewritten)

- Three depth layers looked up separately, each shifted by its own depth; the layer behind shows its painted-in fill where a nearer one has moved aside. Before, one flat picture was bent by its depth, which stretched whatever stood next to a foreground edge.
- Camera **orbit** (the camera steps sideways) and **focus** (one depth sharp, the rest soft) beside the existing dolly and pointer parallax.
- **Wind** leans wheat, leaves and hanging lanterns in travelling gusts; **water** ripples and glints; **stars** twinkle in the sky. The existing paint flow, impasto light and breathing lights remain.
- **Close-ups** blend in as the zoom passes 1.25.
- **Exposure** and **warmth** as camera values (lantern light into daylight, the warm field).
- Transitions: the portal, brush, swirl and pour remain (the brush now drags wet paint; the pour's edge turns from gold to water). New: **star** (a turning five-pointed star), **lantern** (a glow floods the frame and settles into daylight), **petals** (blossom blows across, each petal opening onto the next painting).
- Particles: motes are now also **petals** (turning leaf shapes laid over the picture) and drift with the scroll as well as with time.
- A **film clip** shader for transitions played from pre-rendered frames.

### `assets/js/cinema/stage-gl.js` (rewritten)

- Loads each painting as a bundle: picture, three maps, two fills, and the close-up of the shot on stage. The picture and its first map are enough for a first frame; the rest follow.
- Chooses file size and format by screen (3840 px AVIF on a canvas wider than about 2200 real pixels with memory to spare, else 2560; WebP where AVIF is missing).
- Decodes pictures off the main thread; at the 3840 px size keeps only the paintings on stage and the next one in the direction of travel.
- Three quality settings as before; the lowest draws one plane without layers, focus or close-ups.
- Plays a transition from clip frames when one is installed (`clips.js`), loading only the frames around the scroll position and falling back to the shader until they arrive.

### `assets/js/cinema/storyboard.js`

- Camera keys gained `ox`, `oy` (orbit), `f`, `b` (focus), `ex` (exposure), `warm`. Every shot was re-timed with them (see "What the cinematic rebuild changed" in `STORYBOARD.md`). Chapter lengths and all beat times are unchanged.
- Each shot names its close-up. Each transition names its type and edge colours: blossom → lanterns is now **petals**, lanterns → yak is **lantern**, terraces → ocean is **star**.
- The ocean's cameras and anchors are given in the new 16:9 picture.

### Chapters

- `chapters/projects.js`: each canvas starts on a shelf down the tunnel (far, to one side, turned along the wall, in shadow), lifts off, swings round to face the visitor with a glint crossing its glass, rests in the centre (lit, floating slightly, clickable) and passes the shoulder. Screenshots are untouched and stay sharp.
- `chapters/energy.js`: the solar panels rise one by one and follow the sun, the flow battery's tanks fill and drain as the current runs, and the landscape drifts with the camera, near things most.
- `chapters/contact.js`: every painted star of the last chapter is one way to get in touch (email on the brightest star, LinkedIn on the moon, then Instagram, GitHub, X, Facebook, the résumé and the phone numbers), each a real link. **The painted star is itself the button** (the lines of light and the logos were removed, as asked): a clear circle the size of the star, a soft twinkle to show it can be pressed, a flare of light on hover or keyboard focus, and its name on dark glass beside it. Labels slide or flip to stay on screen. The invitation moved over the sea at the lower right. Phones, any star a screen crops and any star the invitation would stand on get the same ways as a list of cards, each marked with a small star of light. Before, the stars named parts of the site and the profiles were small text links.
- `index.html`, `assets/css/cinema.css`: on the home screen the name and introduction share one column on the right, so the seated figure and his star are never behind the words.

### Other files

- `assets/js/cinema/formats.js` (new): AVIF or WebP, and which file of a painting to fetch.
- `assets/js/cinema/clips.js` (new, generated): the installed transition clips (none yet).
- `assets/js/cinema/stage-lite.js`: uses the new near-layer cut-out and real backgrounds; maps the new transition types onto its three (growing circle, ragged wipe, turning cross-fade).
- `assets/js/cinema/main.js`: waits for the format check before the first painting is asked for. Chooses the **gentle film** for a device that asks for less motion, and adds the **Play the full film / Calm version** switch (top bar, menu, first screen), remembered in `localStorage`.
- `assets/js/cinema/stage-gl.js`, `shaders.js`: the gentle film. The camera's zoom is held at 1.4 or less with no dolly or orbit, transitions are a plain cross-fade (`uType` 6), self-moving paint runs at 0.6 and particles at half.

## 3. What was measured and checked

In the app's browser (Chromium), stepping the film by hand because the pane was hidden:

- The shader compiles; layers and close-ups load; no script errors on the WebGL, lighter and reduced-motion stages across all eight chapters.
- Frame time at 2520 × 1575 on an Apple M2: 3 to 7 ms in every chapter, 14 ms at the heaviest moment (the petal transition). 60 frames per second needs 16.6 ms.
- Every transition at its midpoint; the widest camera arc (the yak rider) for torn or haloed edges; the gallery at rest and mid-handover; the energy landscape early and late.
- A transition clip (a throwaway test clip, since removed) loads its frames around the scroll position and scrubs with it.

- The contact stars at 1184 × 750, 1280 × 720, 1366 × 660, 1440 × 900, 1920 × 1080, 2560 × 1300 and 1024 × 768: no label over another label, a star or the invitation, none off screen. Hover flare on the email star and the moon. The phone list at 375 × 812.
- The gentle film in a browser that reports *Reduce motion* (this Mac has it on): all eight chapters, no errors; the switch to the full film and back, at the same chapter.

Not checked: real-time smoothness with the pane visible, Safari, Firefox, a 4K monitor, a real phone, a mid-range laptop's graphics.

## 4. The painter's brush, the night house and smoother scrolling (13 November)

### What changed

| What | Before | Now |
|---|---|---|
| Painting 2 | the daylight Flying House, 2000 × 1116 | the night version supplied on 13 November (crescent moon, stars, a band of sunset, a person at the window and one on the steps), enlarged to a 3840 × 2160 master with its layers and close-up rebuilt; the old one is kept in `tools/source/paintings/house-alternates/` |
| Masters | ocean, house and lanterns not exactly 16:9 | all eight exactly 3840 × 2160 (`tools/upscale_paintings.py` trims a painting within 1% of 16:9 to exactly 16:9 before enlarging it) |
| Chapter 2's camera | aimed at the daylight composition | passes the moon, then goes in toward the two people at the window and on the steps (`storyboard.js`) |
| The painter's brush | none | a paintbrush through the whole film: it paints 14 Van Gogh motifs (1,400 strokes) into the paintings, writes the nine titles, rides the brush and pour transitions, and waits between jobs where the next starts. See "The painter's brush" in `STORYBOARD.md` |
| Titles | rose and faded in | painted on: a brush-edged mask scrubbed open by the scroll (`.is-painted`, `assets/img/paint-reveal.svg`), with the brush riding its edge |
| Gallery frames | a flat gold outline | a gilt frame painted in thick strokes with a moulded light (`assets/img/frame-painted.webp`, made by `tools/make_frame.py`) |
| Glass behind words | frosted (a blur of what is behind) | dark glass without the blur, slightly more opaque |
| Uploads to the graphics card | a painting's whole bundle as it arrived | one picture per frame; close-ups fetched with their painting, not at the transition into it |
| The globe | built as chapter 4 approaches (a tenth of a second mid-scroll) | built at the visitor's first pause after the opening chapter (or as before, if they never pause) |

New files: `assets/js/cinema/brush.js`, `assets/js/cinema/brush-motifs.js`, `assets/img/paint-reveal.svg`, `assets/img/frame-painted.webp`, `tools/make_frame.py`. Changed: `shaders.js` (the stroke shaders; the painting shader mixes in the brush's paint layer), `stage-gl.js` (the paint layer, the upload queue), `engine.js` (titles painted on), `main.js` (the brush), `chapters/world.js` (the globe at a pause), `cinema.css` (sections 10, 16 and the glass).

### Why the film stuttered, and what was measured

Measured by scrolling the whole film with the mouse wheel in Chromium (Apple M2, GPU on), 1440 × 900 at 2× pixels, the 3840 px paintings, every frame recorded:

| | Frames over 20 ms | Worst frame | 95% of frames within |
|---|---|---|---|
| Before | 226 of 977 (23%) | 300 ms | 33–217 ms, depending on the chapter |
| After | 15 of 1,035 (1.4%) | 67 ms | 16.8 ms in every chapter (60 frames a second) |
| After, at 2560 × 1440 (1× pixels) | 23 of 1,613 (1.4%) | 67 ms (100 ms in one of two runs) | 16.8 ms in every chapter |

The main cause was the frosted glass: every label, card and button with a background blur had to re-blur the painting behind it on every frame, because the painting moves every frame. In the last chapter (eight labels and the invitation) that alone made frames of 150–270 ms; without the blur the same stretch ran at 16.7 ms. The rest were uploads of whole 4K bundles at once, close-ups fetched at the moment of a transition, the globe being built mid-scroll, and the stroke shader compiling on its first stroke.

Also checked: every motif and title at its moment on the WebGL stage (1440 × 900); the lighter stage at 390 × 844 (the strokes on the canvas, the titles, the brush kept in view at the edge when its strokes are off screen); the gentle film (brush and strokes, no written titles); the still stage (no brush). Not checked: Safari, Firefox, a real phone, a mid-range laptop, and real-time feel with a visible window (the measurements were in a headless browser).

## 5. Known limits

- **Why a Mac showed no animation.** macOS *Reduce motion* was on, and the site answered it with the calm stage: still pictures. It now answers with the gentle film and a one-click switch to everything. The full film is never forced on a device that asks for less motion.
- **No Higgsfield clip is installed.** The Higgsfield connector in this session can read the account (10 credits, free plan) but cannot start a generation, and the browser pane is not signed in. The frames and prompts are ready (`tools/transitions/`), and the film plays a clip as soon as one is prepared.
- The larger drawing of the figure alone (`ocean-alternates/figure-alone.png`) is not used: it is a different drawing from the figure on the log.
- The extra pixels in the masters are reconstructed, not recovered (see the audit).
- Depth is estimated; thin things (strings, flags, horn tips) belong to the layer behind them.
