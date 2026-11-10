# Asset-quality audit — phase 1

10 November 2026. Branch `cinematic-4k-film`. Nothing here is committed or published yet.

Two pictures go with this page:

- [`audit/before-after.jpg`](audit/before-after.jpg) — four paintings, the file the site used until now beside the new master, at 4K scale.
- [`audit/layers.jpg`](audit/layers.jpg) — every painting's depth map, its three layers and the painted-in backgrounds.

> **Update, the same day.** After this audit you supplied new pictures for the ocean, and the home scene
> was rebuilt from them at 3840 × 2160 (16:9): the empty night ocean as the background, and the figure
> on his log as a separate element laid on top (log running off the left edge, feet removed). See
> [`audit/ocean-home.jpg`](audit/ocean-home.jpg). Two things to know about those files:
>
> - `starry_ocean_4K_3840x2160.png` is 3840 × 2160 in size but carries only about 1920 px of real detail
>   (nothing above half of its finest scale: it was enlarged by plain resizing). It was reduced to
>   1920 × 1080 and then enlarged properly with the same AI upscaler as the other paintings.
> - The element (`Joven contemplativo…png`, 1448 × 1086) is the near layer exactly, and the empty ocean
>   is what is behind it, so for this painting nothing behind the figure is guessed.
>
> The rows about the ocean below describe the 4:3 version this replaced; the other versions you sent
> are kept in `tools/source/paintings/ocean-alternates/`.

## 1. What was there

| Painting | Supplied file | Supplied size | What the site showed on desktop |
|---|---|---|---|
| Starry Night Ocean | `ocean-supplied.jpg` (JPEG, heavily compressed) | 1500 × 1120 | 2048 px, made from an older 2560 px enlargement of a *different* 1024 px rendition |
| The Flying House | `house.webp` | 2000 × 1116 | 2048 px (1.02× resize) |
| Blossom at Blue Moon Valley | `blossom.webp` | 1672 × 941 | 2048 px (1.22× resize) |
| Room of Lanterns | `lanterns.jpg` | 1376 × 768 | 2048 px (1.49× resize) |
| The Yak Rider | `yak.webp` | 1672 × 941 | 2048 px (1.22× resize) |
| The Spiral Library | `bookshop.webp` | 1672 × 941 | 2048 px (1.22× resize) |
| Golden Field | `field.webp` | 1672 × 941 | 2048 px (1.22× resize) |
| White Terraces | `terraces.webp` | 1672 × 941 | 2048 px (1.22× resize) |

Findings:

- **No painting had 2048 real pixels.** The "2048" desktop files were ordinary resizes with a sharpening pass. That is not enhancement and should not be called one.
- **Maps were small.** One 512 px map per painting held depth and paint flow. Depth edges were several pixels soft at screen size.
- **One foreground cut-out, blurred fill.** The lighter stage had a 1280 px foreground and a background whose hidden area was a blur of the surrounding colours (a visible smear behind the yak rider, for example). The WebGL stage had no layers at all: it bent one flat picture by its depth, which stretches whatever is next to a foreground edge.
- **WebP only**, in three sizes (2048, 1280, 640).
- **Project screenshots** (`assets/media/work/`) are genuine 2048 × 1280 captures with 1080 and 480 px versions, served with `srcset`. **Travel photographs and certificates** (`assets/media/`, 678 files) are real photographs at up to 2048 px with the same three sizes. Both are already at their native quality.

## 2. What was done

### 4K masters by AI super-resolution

`tools/upscale_paintings.py` enlarges each supplied painting four times with Real-ESRGAN (x4plus), reduces the result to 3840 px wide, and then **locks colour and lighting to the original**: everything coarser than about three original pixels is taken from the supplied painting, so the model can only add fine paint texture. It cannot move, recolour or re-light anything.

| Painting | Master | Enlargement from the supplied file |
|---|---|---|
| Starry Night Ocean | 3840 × 2866 | 2.56× |
| The Flying House | 3840 × 2142 | 1.92× |
| Blossom, Yak Rider, Spiral Library, Golden Field, White Terraces | 3840 × 2160 | 2.30× |
| Room of Lanterns | 3840 × 2142 | 2.79× |

The ocean now comes from the file you supplied for this project (1500 px), not from the older enlargement, which was a slightly different rendition.

### Close-ups where the camera goes in

Eight regions the film's camera enters are cut as separate 2048 px detail images at a higher density than the master (the master is 1.9–2.8× the supplied density):

| Region | Share of the width | Density vs supplied | Passes |
|---|---|---|---|
| Ocean, the brightest star | 22% | 6.2× | 2 |
| Ocean, the great spiral | 36% | 3.8× | 1 |
| Flying House, the star the film arrives through | 36% | 2.8× | 1 |
| Blossom, the sun | 34% | 3.6× | 1 |
| Lanterns, the lantern the film leaves through | 30% | 5.0× | 2 |
| Yak Rider, the sky swirl | 36% | 3.4× | 1 |
| Spiral Library, the tunnel | 40% | 3.1× | 1 |
| White Terraces, the star | 24% | 5.1× | 2 |

Golden Field has none: its camera never goes closer than the master can carry.

### Depth, three layers and painted-in backgrounds

`tools/prepare_paintings.py` now:

- reads **depth at two scales** (518 and 1036 px) and merges them: the coarse pass for the overall lie of the land, the fine pass for edges; the sky is set to infinity;
- cuts **three layers** per painting (near, middle, far) with mattes whose edges are pulled onto the painting's own edges, and removes specks and pinholes;
- **paints in what is behind** the near layer, and behind the middle layer, with an inpainting model (LaMa) instead of a blur;
- uses that painted-in colour **only beside a real step in depth** (a figure against the sky). Where a layer boundary merely crosses continuous ground (the wheat field, a floor, the tunnel wall) the painting's own pixels stay, so nothing is replaced that does not have to be;
- writes **motion masks**: where wind moves things (wheat, foliage, hanging lanterns), where there is water, where the sky is.

Maps are now 1280 px wide (masks 640), up from 512.

### Web versions

| File | Sizes | Formats | Total |
|---|---|---|---|
| The painting | 3840 | AVIF | 13.9 MB (largest 2.0 MB) |
| | 2560 | AVIF, WebP | 8.3 + 7.5 MB |
| | 1280, 640 | AVIF, WebP | 4.0 MB |
| Close-ups | 2048 | AVIF, WebP | 6.5 MB |
| Layer fills (transparent where unused) | 1920, 960 | AVIF, WebP | 4.3 MB |
| Depth, flow, mattes, masks | 1280 / 640 | PNG (lossless) | 3.2 MB |
| Lighter-stage layers | 1280 | AVIF, WebP | 5.0 MB |

AVIF is measured at 38–39.5 dB against the master. `assets/paintings/` is 55 MB (was 12 MB). A visitor downloads only the size and format their screen needs: about 1.7 MB per painting at 4K, 1.0 MB at 2560, 0.3 MB on a phone.

Masters are kept apart from the web versions, in `tools/masters/` (16 files, 36 MB, near-lossless WebP). `tools/source/paintings/` still holds the paintings exactly as supplied.

### What the site does with them today

- The film picks the file by screen: the 3840 px AVIF when the canvas has more than about 2200 real pixels across and the device has memory to spare, otherwise 2560; 1280 on the low setting. A browser without AVIF gets WebP (tops out at 2560).
- Large paintings are decoded off the main thread, so scrolling does not stall while the next scene arrives.
- At the 3840 size only the paintings on stage and the next one in the direction of travel are held (about 45 MB each on the graphics card).
- The lighter stage uses the new near-layer cut-out and the properly painted-in background.

Checked in the app's browser: the film at 1440 × 900 loads the 3840 px files, a narrow window loads 2560, `?webp` falls back to WebP, `?lite` shows the new layers; no script errors in any of them.

## 3. Limitations

1. **The extra pixels are reconstructed, not recovered.** The masters are sharper and cleaner than any resize, but the detail between original pixels is the model's plausible paint, not information that was in your files. True 4K needs larger originals; if you have them, drop them into `tools/source/paintings/` and both scripts will use them.
2. **Real-ESRGAN tidies paint.** Strokes come out crisper and slightly smoother inside than the originals' grain. Shapes, colours and composition are unchanged.
3. **Two sources are weak.** Room of Lanterns is the smallest (1376 px) and the ocean is a heavily compressed JPEG; both gain the most and have the most invented detail.
4. **Not every master is exactly 3840 × 2160.** Each keeps its own shape: the ocean is 4:3 (3840 × 2866), the house and the lanterns are 3840 × 2142. Cropping them to 16:9 would cut into the paintings.
5. **Very deep zooms are still soft.** The portals push to 6–9× for a moment; the close-ups carry 2.8–6.2× the supplied density, so the last instant inside a star or the tunnel is covered by the portal's light, not by pixels.
6. **Painted-in backgrounds are invented.** They are only ever seen as slivers behind a near object when layers slide apart, and they are softer (1920 px) than the painting.
7. **Depth is an estimate.** Thin things (balloon strings, prayer flags, the tips of the yak's horns) belong to the layer behind them.
8. **Screenshots and photographs were left alone on purpose.** They are real captures at 2048 px; running an upscaler over interface text and faces would make them less truthful, not better.
9. **The film does not use the layers, masks or close-ups yet.** Phase 1 prepared them and switched the film to the new paintings and depth; the layered shader, focus, close-up blending and motion masks are phase 2.
10. **No pre-rendered frames.** There are no image sequences for transitions yet.
11. **Not yet checked** in Safari or Firefox (AVIF and off-thread decoding), on a 4K monitor, or on a phone.
12. **Models are not in the repository.** PyTorch (in a temporary environment), Real-ESRGAN x4plus (64 MB), LaMa (196 MB) and Depth Anything V2 small (99 MB) were downloaded to a temporary folder; the top of each script has the commands to fetch them again.
