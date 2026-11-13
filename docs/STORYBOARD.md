# Beyond the Frame — storyboard

> Every journey adds another brushstroke to who I am.

The site is one film, scrubbed by the scrollbar. This document describes it scene by scene; the same thing, as data the page actually runs, is [`assets/js/cinema/storyboard.js`](../assets/js/cinema/storyboard.js). Change a camera there and the film changes; this file is the explanation.

## How to read it

- **Time** is measured in screens of scrolling (1.0 = 100vh). The film is 31.6 screens long.
- **Camera** is given as *centre* (which point of the painting is in the middle of the screen, 0–1 across and 0–1 down) and *zoom* (1 = the painting just covers the screen), plus three moves that use the painting's depth:
  - *dolly*: the camera pushes in and the near layers spread apart from the far ones;
  - *orbit*: the camera steps sideways, so a near figure slides across what is behind it;
  - *focus*: one depth is sharp and the rest softens; changing it while the camera moves is a focus pull.
- **Layers.** Every painting is three depth layers: near, middle and far. Where a near layer moves aside, the layer behind shows colour painted in for that purpose, so nothing stretches and no halo follows a figure.
- **Motion in the paint.** The sky and water stream along their own brushstrokes, wheat and leaves lean in the wind, water ripples and glints, stars twinkle, lanterns and bright paint breathe, a raking light lifts the impasto. Petals, pollen, embers and motes hang in the air and drift with the scroll.
- **Close-ups.** Where the camera goes in (a star, the tunnel, the sun), a higher-resolution picture of that region takes over as the zoom passes 1.25.
- **Foreground** also means the page's own layer: text, lanterns, frames, the globe.
- Every value is a function of the scroll position, so **scrolling back plays everything in reverse**.

## The paintings

All eight are yours. Seven were painted from your own travel photographs; the wall label on screen says which, and its button shows the photograph.

| File (in `assets/paintings/`) | Title on its label | Painted from | Used in |
|---|---|---|---|
| `ocean-*` | Starry Night Ocean | a Starry Night ocean scene, after Van Gogh | 1 and 8 |
| `house-*` | The Flying House (the night version, since 13 Nov: a crescent moon, stars, a band of sunset, one person at the window and one on the steps) | Lijiang (`lijiang-01`) | 2 |
| `blossom-*` | Blossom at Blue Moon Valley | Blue Moon Valley, Lijiang (`lijiang-24`) | 2 |
| `lanterns-*` | Room of Lanterns | the Van Gogh exhibition, Shanghai (`shanghai-02`) | 3 |
| `yak-*` | The Yak Rider | Blue Moon Valley, Lijiang (`lijiang-19`) | 4 |
| `bookshop-*` | The Spiral Library | Shenzhen (`shenzhen-03`) | 5 |
| `field-*` | Golden Field | Dali (`dali-10`) | 6 |
| `terraces-*` | White Terraces | Lijiang (`lijiang-16`) | 7 |

**Still to supply:** paintings of Costa Rica and of Boston for chapter 2. Until then that chapter is carried by the flying house and the blossom tree, and Costa Rica, China and Boston appear as three arched windows holding your real photographs. The slots are listed as `AWAITING` in `storyboard.js` and marked on the page in the draft view (`?draft`). Nothing was generated to stand in for them.

## The transitions

Each one grows out of something already in the picture.

| Name | What happens | Where |
|---|---|---|
| **Portal** | A ragged ring of light opens from one point of the old painting while the paint around it winds like a spiral; the new painting is inside the ring. | 1→2 (the brightest star), 5→6 (the end of the tunnel) |
| **Star** | The same, as a five-pointed star that turns as it opens. | 7→8 (a star over the terraces) |
| **Lantern** | One lantern's glow floods the frame and settles into the daylight of the next painting. | 3→4 |
| **Brush** | A loaded brush sweeps across; every bristle runs a little ahead of or behind its neighbours, with wet paint dragging on the leading edge. | 2a→2b |
| **Petals** | Blossom blows across in two sheets; every petal opens onto the new painting, and petals fill the air. | 2→3 |
| **Swirl** | The old painting winds up around a point like a Van Gogh sky and unwinds as the new one. | 4→5 (the sky's swirl becomes the spiral library) |
| **Pour** | The new painting runs down the canvas like wet paint, its edge turning from gold to water. | 6→7 |

Any transition can instead be played from a short video of one painting becoming the next (made in a video generator from the start and end frames written by `tools/transition_frames.py`, then cut into frames by `tools/prepare_transition.py`). The frames are scrubbed by the scroll; until they have loaded, the transition above plays. None is installed yet.

On the lighter stage (phones, low-power devices, no WebGL) these are a growing circle (portal, star, lantern), a ragged-edged wipe (brush, petals, pour) and a turning cross-fade (swirl). With *Reduce motion* on, all are plain cross-fades and the camera stops pushing in.

---

## Chapter 1 — Enter the Painting &nbsp;·&nbsp; `#home` &nbsp;·&nbsp; 0.0 – 2.4

**Painting:** Starry Night Ocean.

| Scroll | Camera | On the painting | Words and controls |
|---|---|---|---|
| 0.0 | centre (0.50, 0.47), zoom 1.00, the whole night | Stars pulse, the sky streams, the sea rolls; the seated figure and driftwood are still. | **RUIBIN JIN YAO**, *Building Beyond the Horizon.*, one line on what I do and where I study, **Begin the journey**, **Skip experience** (to the plain portfolio). |
| 0.8 – 1.5 | drifts left and in to (0.40, 0.44), zoom 1.7, push 0.3 | The figure comes forward against the sky; the bright star beside him swells. | The name leaves; *Every journey adds another brushstroke to who I am.* |
| 1.5 – 1.9 | (0.385, 0.43), zoom 2.7 | The star fills a third of the screen. | — |

**Transition (1.9 – 2.75), portal:** the camera pushes into the star (zoom 9) and the ring of light opens from it. The star becomes the bright star in the sky of the next painting, which the camera then pulls back from.

## Chapter 2 — Where My Story Begins &nbsp;·&nbsp; `#about` &nbsp;·&nbsp; 2.4 – 7.0

**Paintings:** The Flying House, then Blossom at Blue Moon Valley.

| Scroll | Camera | On the painting | Words and controls |
|---|---|---|---|
| 2.75 – 3.3 | pulls back from the star (0.74, 0.22, zoom 3.2) past the crescent moon to the whole painting | The house and its balloons hang above the forest at nightfall; the brush rings the moon with light. | — |
| 3.1 – 4.0 | (0.50, 0.50), zoom 1.04 → 1.22 | — | **Where my story begins**; *Three cultures. Three languages. One global perspective.*; the first paragraph of the biography. Three arched windows rise: **Costa Rica**, **China**, **Boston**, each a real photograph with its flag, each a link to that country. |
| 4.0 – 4.55 | pushes toward the house, (0.50, 0.55), zoom 1.6, push 0.4, focus on the house | The house separates from the sky; the brush winds a violet eddy into the sky left of the balloons, then rides the sweep into the blossom tree. | Growing up between two cultures; what living across them taught me. |
| **4.4 – 5.05, brush** | — | A brush sweeps the blossom tree across, left to right. | — |
| 5.1 – 5.9 | the tree and its prayer flags, (0.30, 0.58), zoom 1.3 → 1.42 | Pink petals drift; the waterfall runs. | **Three languages, one global mindset**; Mandarin, Spanish and English as three pennants, with their levels. |
| 5.85 – 6.65 | pans to the mountains and the sun, (0.62, 0.40) | — | Education (Hult, Lincoln School), what drives me, off the clock, **Read the full story**, **Download my résumé**. |

**Transition (6.6 – 7.3), swirl:** the camera rises to the sun-spiral above the mountains; the sky winds up around it and unwinds as the room of lanterns. Petals become embers.

## Chapter 3 — My Journey &nbsp;·&nbsp; `#experience` &nbsp;·&nbsp; 7.0 – 11.6

**Painting:** Room of Lanterns.

| Scroll | Camera | On the painting | Words and controls |
|---|---|---|---|
| 7.3 – 8.0 | settles on the seated figure, (0.42, 0.50), zoom 1.15 | Lanterns breathe; embers rise. | **My journey**; how many lanterns there are and since when; **Open the full timeline**. |
| 7.95 – 11.05 | pans slowly across the room, (0.36, 0.42) → (0.64, 0.36), zoom 1.35 | The figure stays in front of the lanterns as the room slides behind him. | One golden brushstroke is painted across the screen as you scroll, and every entry of `data/journey.js` hangs on it as a lantern in date order, with the years written large behind. Colour is the kind of entry; an unlit, dashed lantern is something still ahead (graduation, December 2026). A lantern opens its entry: dates, organisation, what I did, photographs, evidence, connected projects. |

**Transition (11.2 – 11.95), portal:** the camera tilts up to where the figure is looking; one lantern's light opens into daylight.

## Chapter 4 — The World I've Explored &nbsp;·&nbsp; `#world` &nbsp;·&nbsp; 11.6 – 15.2

**Painting:** The Yak Rider.

| Scroll | Camera | On the painting | Words and controls |
|---|---|---|---|
| 11.95 – 12.5 | the rider, (0.47, 0.50) → (0.46, 0.46), zoom 1.25, push 0.3 | The yak and rider stand off the lake and mountains. | **The world I've explored**; countries, places and photographs counted from `data/travel.js`. |
| 12.9 – 14.8 | tilts up to the peaks, (0.50, 0.30), and darkens | The valley dims. | A painted globe rises (WebGL): the countries I know are lit, pins glow on them, and it turns to each one as you scroll, or when you point at its name, or when you drag it. Beside it, the list: Costa Rica (home), China, United States (where I live now), Canada, South Korea, each opening its chapter of places and photographs. Any other country on the globe opens as *Undiscovered*. **Open the full atlas** has the flat map, statistics, year filter, replay and the photo albums. |

**Transition (14.8 – 15.5), swirl:** the camera climbs into the swirl of sky above the rider; it winds into the spiral of the library.

## Chapter 5 — Gallery of Creations &nbsp;·&nbsp; `#projects` &nbsp;·&nbsp; 15.2 – 20.8

**Painting:** The Spiral Library.

| Scroll | Camera | On the painting | Words and controls |
|---|---|---|---|
| 15.5 – 16.5 | the whole library, then (0.515, 0.48), zoom 1.2 | Bulbs glow; warm dust. | **Gallery of creations**; how many projects in how many rooms; **Search all projects**. |
| 16.3 – 20.3 | one long push down the tunnel to its far end, zoom 1.2 → 2.4, push 0.95 | Shelves and the table of books slide past the camera at different speeds. | Framed canvases come out of the tunnel one at a time, rest in front of you, and pass your shoulder: first the five featured websites (Sunflower Intelligence, Costa Rica — Pura Vida, VRFB — The Science of Flow Energy, CourtVision AI, 545 Days), each with its real, unpainted screenshot, then a wall of canvases for each field: Finance, Analytics & AI, Energy Storage, Strategy & Consulting. A canvas steps forward and opens its case study. |

**Transition (20.4 – 21.15), portal:** the bright end of the tunnel opens onto the field.

## Chapter 6 — Energy and International Business &nbsp;·&nbsp; `#energy` &nbsp;·&nbsp; 20.8 – 25.0

**Painting:** Golden Field.

| Scroll | Camera | On the painting | Words and controls |
|---|---|---|---|
| 21.15 – 22.2 | the field and its sky, (0.50, 0.48) → (0.55, 0.50) | Pollen drifts; clouds stream. | **Energy and international business**; the internship (HJAT, Shenyang, June – August 2026) and what it was about. |
| 21.8 – 24.5 | lowers toward the wheat, (0.60, 0.50) → (0.45, 0.54), zoom 1.28 | Solar panels, a flow battery (two tanks and a stack, electrolyte circulating) and pylons rise out of the wheat toward the village on the horizon. | One current is drawn through them as you scroll, with six stops, one for each piece of work: market maps, tender evaluation, trilingual proposals, the VRFB vs. lithium cost comparison, 30 study guides, outreach and training. Three cards follow it: *Mapping the market*, *Counting the cost* (a brushstroke becomes the cost chart: lithium ahead at 4 hours, the flow battery at 8) and *Sharing what I learned*, with the certificate, the completion letter and the link to my VRFB site. |

**Transition (24.55 – 25.3), pour:** the terraces run down over the field like wet paint.

## Chapter 7 — My Palette of Skills &nbsp;·&nbsp; `#skills` &nbsp;·&nbsp; 25.0 – 28.8

**Painting:** White Terraces.

| Scroll | Camera | On the painting | Words and controls |
|---|---|---|---|
| 25.3 – 26.1 | the terraces, (0.50, 0.55), then into the pools, zoom 1.3 | Water drifts in the pools. | **My palette of skills**; no ratings, only tools and proof. |
| 26.25 – 27.8 | (0.48, 0.62) → (0.56, 0.60) | — | Ten brushstrokes of paint flow in from the left, one per skill group. The chapter walks through them as you scroll, or you choose one: what it is for, the tools confirmed for it, and the projects and jobs where it shows. |
| 27.75 – 28.35 | tilts up to the town and the night sky | — | Languages and credentials; **See the certificates** (each one full size, with its verification link). |

**Transition (28.3 – 29.15), portal:** the camera rises to a star in the terraces' sky and passes through it, back to the first night.

## Chapter 8 — Beyond the Horizon &nbsp;·&nbsp; `#contact` &nbsp;·&nbsp; 28.8 – 31.6

**Painting:** Starry Night Ocean again, brighter and richer in colour than at the start.

| Scroll | Camera | On the painting | Words and controls |
|---|---|---|---|
| 29.15 – 30.2 | the sky, pulling out from zoom 1.2 to 1.06 | The stars glow harder than in chapter 1. | **Every star is a way to get in touch.** The painted stars themselves are the buttons: nothing is drawn over them, no line and no logo. Each wakes in turn with its name on dark glass beside it, twinkles softly, and flares when pointed at or reached with the keyboard: **Email** on the brightest star, **LinkedIn** on the moon, then **Instagram**, **GitHub**, **X**, **Facebook**, the **résumé** and the **phone** numbers. Each star is a real link, reachable with the keyboard. *Beyond the horizon* stands at the lower right. |
| 30.4 – 31.6 | the whole painting, the opening frame | The stars stay lit to the end. | **Let's talk** over the sea at the lower right: the invitation, the email address (with copy), *Save my contact card*, where I am based, the closing line. |

Which star carries which link is set in `assets/js/cinema/chapters/contact.js`; the addresses are `links` in `data/site.js`, and a link left empty there has no star. On a phone only a slice of the sky fits, so the same ways are listed as cards under the invitation; on a very wide or very short screen any star that falls outside the picture is listed there too.

---

## Leaving the film

- **Menu** (top right): the eight chapters with their paintings, and straight routes to everything.
- **The golden stroke** along the bottom is the progress; its marks are the chapters, and the arrows step between them. Far jumps cut behind a short curtain instead of fast-forwarding the film.
- **View portfolio** / **Skip experience**: `portfolio.html`, the same content on one ordinary page.
- **Full views** open over the film and close back to where you were: `#view/story`, `#view/timeline`, `#view/atlas`, `#view/projects` (search and filters), `#view/credentials`.
- **Deep links** from the first site still work: `#projects/<id>`, `#world/<CODE>`, `#experience/<id>`, `#skills/<id>`.

## The painter's brush

A paintbrush goes through the whole film (`brush.js`, `brush-motifs.js`). It is always on screen and always has a job: it paints Van Gogh's handwriting into the painting on stage, writes each chapter's title as it appears, rides the wet edge of the two brush transitions, and between jobs flies to where the next one starts and waits there, loaded with its next colour. Everything it does follows the scroll: scrolling back lifts the paint off stroke by stroke and takes the brush back along its path.

| Scroll | Painting | What the brush paints |
|---|---|---|
| 0.04 – 0.9 | Starry Night Ocean | the great vortex of the sky, a band of five lanes of strokes wound round it |
| 1.02 – 1.34 | | writes *Every journey adds another brushstroke to who I am.* |
| 1.4 – 1.86 | | four rings of light round the brightest star, just before the camera flies into it |
| 2.8 – 3.12 | The Flying House | three rings round the crescent moon |
| 3.16 – 3.48 | | writes **Where my story begins** |
| 3.55 – 4.18 | | a violet eddy in the sky left of the balloons |
| 4.4 – 5.05 | | rides the brush transition's edge into the blossom tree |
| 5.12 – 5.78 | Blossom at Blue Moon Valley | petals blown off the crown on the wind |
| 6.0 – 6.5 | | the sun's rings, as the camera reaches the peaks |
| 7.64 – 7.96 | Room of Lanterns | writes **My journey** |
| 8.08 – 8.6, 9.9 – 10.4 | | rings of light round two lanterns, the first the one the figure looks up at |
| 12.26 – 12.58 | The Yak Rider | writes **The world I've explored** |
| 12.62 – 13.3 | | a cloud wound into a spiral over the snow peaks |
| 15.5 – 15.82 | The Spiral Library | the tunnel's rings traced in gold |
| 15.84 – 16.16 | | writes **Gallery of creations** |
| 21.46 – 21.78 | Golden Field | writes **Energy and international business** |
| 21.84 – 22.6 | | wheat flicked upward across the field |
| 22.66 – 23.1 | | a cloud wound up in the open sky |
| 24.55 – 25.3 | | rides the pour of gold into the white terraces |
| 25.66 – 25.98 | White Terraces | writes **My palette of skills** |
| 26.04 – 26.7 | | a turquoise eddy in the water of a pool |
| 29.34 – 29.66 | Starry Night Ocean | writes **Beyond the horizon** |
| 29.7 – 30.44 | | a ring of light round each star that is a way to get in touch, in the order they wake (the vortex and the star from the first chapter are still there) |
| 30.5 – 30.82 | | writes **Let's talk** |

On the WebGL stage the strokes are drawn every frame into a layer covering just the part of the painting in view (so they stay sharp at any zoom) and the painting shader mixes it in at the motif's depth, with the same low light on its ridges as the painting's own paint; transitions carry the new paint with the painting. On the lighter stage (phones) the same strokes are drawn on a canvas over the pictures. The gentle film (a device that asks for less motion) keeps the strokes and the brush, without the written titles or the rides; the still stage has neither. `?nobrush` turns it off.

## What the cinematic rebuild changed, chapter by chapter

- **1. Home.** The name and introduction moved to one column on the right, so the seated figure and the star he looks at are in the clear. The camera drifts in with a slight orbit, the focus pulls from the figure to the star, and the star's close-up carries the push into it.
- **2. About.** Out of the star beside the flying house; a slow arc round the house with the sky softened behind it; the brush sweeps in the blossom tree; the focus pulls from the tree to the mountains; petals carry the picture into the lantern room.
- **3. Experience.** A walk past the lanterns from left to right with the focus moving through the room; then up to one bright lantern, whose glow floods the frame.
- **4. World.** The glow settles into daylight. The camera arcs round the rider, opening the lake and the mountains behind him, then climbs to the sky, whose swirl winds into the library.
- **5. Projects.** One long dolly down the spiral. Each canvas hangs on a shelf in shadow, lifts off, turns to face the visitor with a glint across its glass, rests in the centre (sharp, lit, clickable, floating slightly) and passes the shoulder as the next one arrives.
- **6. Energy.** Warm light and wind in the wheat. The solar panels rise one by one and follow the sun through the chapter, the flow battery's two tanks fill and drain as the current runs, and the whole landscape drifts with the camera, the near things most.
- **7. Skills.** Down the terraces with the water (ripples and glints on the pools), then a tilt up to the stars with the focus pulled out to the sky.
- **8. Contact.** Through a turning star back to the night ocean. Every painted star is now one way to get in touch (email, LinkedIn, Instagram, GitHub, X, Facebook, résumé, phone): the star in the painting is the button and flares when pointed at. The camera pulls back to the first frame with the invitation over the sea.
