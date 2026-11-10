# Transition clips

The film draws its eight transitions with a shader. Any of them can instead be played from a short
video of one painting becoming the next: the video is cut into frames, and the frames are scrubbed by
the scroll (forward and backward) with a short cross-fade to the painting at each end.

## 1. The start and end frames

```bash
python3 tools/transition_frames.py
```

writes `tools/transitions/frames/`: for every transition, the exact frame the film shows when it
begins and when it ends, 1920 × 1080.

| Pair | Start frame | End frame |
|---|---|---|
| `night-house` | the brightest star over the ocean | the sky beside the flying house |
| `house-blossom` | the flying house, close | the blossom tree |
| `blossom-lanterns` | the sun over the mountains | the lantern room |
| `lanterns-yak` | a bright lantern | the yak rider, wide |
| `yak-bookshop` | the swirling sky | the spiral library, wide |
| `bookshop-field` | the end of the tunnel | the golden field |
| `field-terraces` | the wheat | the white terraces |
| `terraces-return` | a star over the terraces | the great spiral over the ocean |

## 2. Generate a clip (Higgsfield or any generator that takes a first and a last frame)

Use a video model that accepts a **start image and an end image** (in Higgsfield: Seedance 1.5 Pro,
Cinema Studio Video 3.0, MiniMax Hailuo and FLUX 3 Video all do). Settings: 16:9, 4 to 6 seconds,
720p or 1080p, **no audio**, no camera cut.

Suggested prompts (keep "oil painting, thick impasto brushstrokes, Van Gogh style, one continuous
shot, no cut" in every one):

| Pair | Prompt |
|---|---|
| `night-house` | The camera flies straight into the glowing star; its light swirls open like wet paint and becomes a turquoise swirling sky around a small house lifted by balloons. |
| `house-blossom` | A wide brush of wet paint sweeps from left to right across the canvas, repainting the scene into a pink blossoming tree before blue mountains. |
| `blossom-lanterns` | Pink petals blow across the frame in the wind, thicker and thicker, and as they clear they have become hundreds of glowing golden lanterns in a dark room. |
| `lanterns-yak` | The camera rises into one glowing lantern; its warm light floods the frame and settles into bright daylight over a green lake, snow mountains and a rider on a white yak. |
| `yak-bookshop` | The swirling clouds wind tighter into a spiral that becomes a tunnel of bookshelves glowing red and gold. |
| `bookshop-field` | The camera travels down the tunnel of books toward the bright light at its end and comes out over a wide golden wheat field under a blue swirling sky. |
| `field-terraces` | The golden wheat melts into flowing paint that runs downhill and turns into turquoise water in white stone terraces. |
| `terraces-return` | The camera tilts up to a bright star, which opens as a turning five-pointed star onto a deep blue night sky with a great spiral over the ocean. |

## 3. Put the clip into the film

```bash
python3 tools/prepare_transition.py clip.mp4 --for night-house
```

cuts it into 48 frames (1280 × 720, AVIF and WebP, about 3 to 5 MB) in
`assets/transitions/night-house/` and lists it in `assets/js/cinema/clips.js`. Reload the page: that
transition now plays the clip. Only the frames around the scroll position are loaded, and until they
arrive the shader's transition plays, so there is never a gap.

```bash
python3 tools/prepare_transition.py --remove night-house    # back to the shader
python3 tools/prepare_transition.py --list
```

Notes:

- A generated clip will not match the paintings pixel for pixel at its ends; the cross-fade covers the join.
- The lighter stage (phones) and the reduced-motion stage keep their own transitions and never load clips.
- Clips are heavier than the shader (a few MB each). One or two at the big moments is the right amount.
