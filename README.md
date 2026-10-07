# Weather Cottage

An isometric cutaway cottage — one room, open to the rafters — that reads the
real weather where you are and changes to match it. Built with Vite, React, three.js and react-three-fiber.
The look is borrowed from *Virtual Cottage*: low-poly, flat-shaded, muted plum
outside and warm lamplight inside.

```bash
npm install
npm run dev
```

`npm run typecheck` runs `tsc -b` over the whole project.

Opens on <http://localhost:5173>. It asks for geolocation, and falls back to
Kuala Lumpur if you decline or the request times out.

## What the weather actually drives

Data comes from [Open-Meteo](https://open-meteo.com) — no API key, refreshed
every five minutes. Turning the browser's coordinates into a city name needs a
second service, because Open-Meteo's geocoding only goes name → coordinates:
[BigDataCloud's](https://www.bigdatacloud.com/) client-side reverse geocoder,
also free and keyless. It receives the same coordinates the forecast request
already carries. If it fails the name falls back to the browser's own time zone
(`Asia/Kuala_Lumpur` → "Kuala Lumpur"), which costs no network call at all — see
[reverseGeocode.ts](src/lib/reverseGeocode.ts) to swap or drop the provider. The current conditions map onto the scene like this:

| Reading | Effect |
| --- | --- |
| `weather_code` | Picks a condition group (clear, cloudy, overcast, fog, rain, snow, storm), which selects the backdrop gradient and the whole light mood |
| `is_day` | Day/night palette, and how strongly the interior lamps read |
| `cloud_cover` | Dims the key light and lifts the ambient fill, so overcast goes flat and shadowless |
| Condition group | How many cloud props are out and what colour they are; fog also rolls banks of mist in around the plinth |
| `precipitation` / intensity | Number of rain or snow instances, which are hidden wherever they would fall across the room |
| `wind_speed_10m`, `wind_direction_10m` | Direction and lean of the falling rain; drift on snow |
| `temperature_2m` | Chimney smoke only when it is below 22 °C |
| Storm codes (95–99) | Random lightning flashes on the key light, with a bolt drawn under a cloud behind the room |

Latitude, longitude and the clock also feed a NOAA solar-position calculation
([`src/lib/sun.js`](src/lib/sun.js)) that aims the key light, so the shadows
point where the real sun is.

## Moving the camera

The camera is locked to one angle -- the cutaway is authored for it, and swinging
round shows the backs of two solid walls -- so the only movements are zoom and
framing.

- The `+` / `-` control on the right edge zooms. Steps are multiples of whatever
  fits the current viewport, so `100%` frames the cottage on a phone and on a
  desktop alike. The scroll wheel does nothing.
- Clicking something in the room frames it close up: the laptop screen and the
  fire are the two targets today. `Back to the room`, `Esc`, or a click on empty
  space pulls back out.

New targets are a wrapper, not a mechanism. Put a `Focusable` where the camera
should aim -- its origin is what ends up centred:

```tsx
<Focusable label="the kettle" zoom={3.4} position={[0.2, 1.1, 0]}>
  ...
</Focusable>
```

## Documents on the desktop

Any PDF dropped into the project's `documents/` folder shows up as an icon on
the laptop's Mac desktop, labelled with the filename minus its extension --
a build-time glob in [`src/lib/documents.ts`](src/lib/documents.ts) picks it
up, so dropping the file in is the whole authoring step, with no manifest to
keep in sync. Clicking the icon opens the PDF in a Preview-style window right
there on the screen, rendered by the browser's own built-in PDF viewer. The
two samples that ship with the repo, `Weather Report.pdf` and
`Cottage Notes.pdf`, are just placeholders -- drop in your own and they take
their place.

## Previewing a condition

Waiting for a thunderstorm is a bad debug loop. In dev there is a switcher on
the left edge: pick a condition, drag the intensity, and force day or night.
Changes apply immediately, with no reload. `live` hands control back to the API.
The panel is stripped from production builds.

The same state can be linked to, which is useful for sharing a look:

```
http://localhost:5173/?preview=snow&intensity=0.9&night
```

`preview` takes `clear`, `cloudy`, `overcast`, `fog`, `rain`, `snow` or
`storm`. `intensity` is `0`–`1`. `night` forces the dark palette.

## Using a Blender model instead

The cottage in `src/scene/` is procedural so the project runs with no assets.
To replace it with something modelled in Blender:

1. Build the cottage with the cutaway already in the mesh — delete the two
   walls and the near roof slope facing `+X` and `+Z`. The camera sits on that
   corner, so anything solid there hides the interior.
2. Keep it near the origin, with the floor sitting on `z = 0` in
   Blender's coordinates (the exporter converts Z-up to three.js Y-up).
3. Roughly 4.4 × 4.4 Blender units across, 2.95 to the wall plate and 4.45 to
   the ridge matches the current framing, camera and precipitation volume.
   Otherwise set `VITE_COTTAGE_SCALE`.
4. Export as glTF 2.0 (`.glb`), **+Y up**, with `Apply Modifiers` on.
5. Drop it in `public/models/` and set the env var:

```bash
echo 'VITE_COTTAGE_MODEL=/models/cottage.glb' > .env.local
```

Lighting, precipitation, camera and HUD do not read the cottage geometry, so
they keep working unchanged. Interior lamps come from the scene's own point
lights; if your model has its own emissive materials, expect to retune the
night intensities in [`src/lib/palette.js`](src/lib/palette.js).

## Weather props

The clouds, mist, raindrop, snowflake, lightning bolt and snow cap are modelled
in Blender too, in `public/models/weather.glb`. They are built in the room's
space and measured off it, so the scene places them with the same scale and
offset as `cozy_room.glb`, and the box that keeps rain and snow off the room is
the room's own bounds. To rebuild the file after changing the room, run the
script on top of it:

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b public/models/cozy_room.blend \
    --python blender/build_weather.py -- public/models/weather.glb
```

Add `--blend PATH` after the output to also save the props as a `.blend` to
look at. If `weather.glb` is missing or fails to load, the room still renders,
just without weather.

## Using a downloaded character

Someone sits at the desk, typing, breathing and glancing around. The figure
follows Virtual Cottage's own idiom for people: one soft mass for the sweater,
an oversized rounded head of hair sitting straight on it with no neck, sleeves
tapering into mitts, and no face at all -- the camera only ever sees a back.
Capsules and spheres rather than the boxes the rest of the room is made of,
because a drawn sleeve has no edges to catch light. Like the cottage, the figure
is procedural so the project runs with no assets, and like the cottage it can be
replaced -- with a rigged character from a site such as
[free3d](https://free3d.com), or anything exported from Blender:

1. Download the character and check its licence covers what you are doing with
   it. Most free3d models are personal-use only.
2. Open it in Blender and export glTF 2.0 (`.glb`), **+Y up**. `.obj`, `.fbx`
   and `.max` will not load in the browser.
3. Drop it in `public/models/` and point the env vars at it:

```bash
cat >> .env.local <<'ENV'
VITE_PERSON_MODEL=/models/person.glb
VITE_PERSON_SCALE=1
VITE_PERSON_TURN=180
VITE_PERSON_LIFT=0
ENV
```

`TURN` is degrees about Y -- the procedural figure faces the desk at `-Z`, and
most exported characters face `+Z`. `LIFT` is measured from the chair seat, so
a character authored standing wants about `-0.49` to put it back on the floor.
A figure roughly 1.7 units tall matches the room.

The pose is yours to solve: the seated animation in
[`Person.tsx`](src/scene/Person.tsx) drives named groups of the procedural
figure, and an imported model is rendered as-is. A model authored standing will
stand, wherever `LIFT` puts it.

## Layout

```
src/
  types.ts                domain types: Weather, Condition, Mood, Place
  lib/openMeteo.ts        API client, WMO code table
  lib/reverseGeocode.ts   coordinates -> city name, with an offline fallback
  lib/sun.ts              solar azimuth and altitude
  lib/palette.ts          fixed cottage colours, per-condition light moods
  hooks/useWeather.ts     fetching, refresh timer, geolocation
  scene/dims.ts           one source of truth for cottage dimensions
  scene/Panel.tsx         the flat-shaded box every solid is made of
  scene/Cottage.tsx       shell, roof, gable, chimney, platform
  scene/Furniture.tsx     the room's furniture
  scene/Person.tsx        the procedural resident, seated at the desk
  scene/CharacterModel.tsx  optional glTF character swap
  scene/Focusable.tsx     wraps anything the camera can be sent to
  scene/focus.ts          focus request type and context
  scene/zoom.ts           zoom limits shared by the camera and the HUD
  scene/Weather.tsx       Blender weather props: clouds, rain, snow, mist, lightning
  scene/Lighting.tsx      sun, fill, lightning
  scene/Scene.tsx         canvas, fog, camera
  scene/BlenderCottage.tsx  optional glTF swap
  ui/Hud.tsx              readout and location search
  ui/WeatherSwitcher.tsx  dev-only condition preview
  dev/auditZFight.ts      finds coplanar faces that shimmer
```

## Two things worth knowing before editing the scene

**The sky is CSS, not geometry.** A gradient sphere only ever shows the middle
of its gradient near the horizon, so every condition blended to the same grey.
The sky is a `linear-gradient` div behind a transparent canvas, which means the
two mood colours land exactly as written.

**Boxes must not share a face plane.** Two coplanar faces pointing the same way
z-fight, and it reads as a dithered shimmer on a surface. Faces that merely
touch while pointing opposite ways are fine — backface culling hides one. When
something flickers, run this in the dev console:

```js
__auditZFight()
```

It walks the live scene graph and lists offending pairs worst-first. It
straightens the idle drift rotation before measuring, so results are stable
between calls -- `driftStraightened: false` in the report means they are not,
and hits may be spurious. Fix a hit by insetting or overhanging one of the two
boxes, never by nudging a shared value by a hair.
