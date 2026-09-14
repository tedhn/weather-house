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
| `precipitation` / intensity | Number of rain or snow instances |
| `wind_speed_10m`, `wind_direction_10m` | Direction and lean of the falling rain; drift on snow |
| `temperature_2m` | Chimney smoke only when it is below 22 °C |
| Storm codes (95–99) | Random lightning flashes on the key light |

Latitude, longitude and the clock also feed a NOAA solar-position calculation
([`src/lib/sun.js`](src/lib/sun.js)) that aims the key light, so the shadows
point where the real sun is.

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

## Hermes signals

The room can also show what the [Hermes](AGENTS.md) pipelines have done today:
the floor lamp lights while mail is waiting, sheets stack on the desk for each
job scored, and the hearth burns full once the digest has gone out.

The link is a store, not a server. `scripts/signals.mjs` reads the other
pipelines' run output — all read-only — and writes `public/hermes.json`, which
the page fetches and re-reads every minute.

```bash
node scripts/signals.mjs collect
```

To keep it current, copy `com.ted.cottage-signals.plist` into
`~/Library/LaunchAgents/` and load it:

```bash
launchctl load ~/Library/LaunchAgents/com.ted.cottage-signals.plist
```

None of this is required. With no signals file the room renders exactly as it
does without Hermes — every lamp on, fire burning — and the same is true if the
file goes stale, so a dead scheduler shows nothing rather than yesterday's news.
See [AGENTS.md](AGENTS.md) for the stage contract and the signal-to-room map.

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

## Layout

```
src/
  types.ts                domain types: Weather, Condition, Mood, Place
  lib/openMeteo.ts        API client, WMO code table
  lib/reverseGeocode.ts   coordinates -> city name, with an offline fallback
  lib/hermes.ts           reads public/hermes.json, ignores it when stale
  scene/affordances.ts    the one place a signal maps to something visible
  lib/sun.ts              solar azimuth and altitude
  lib/palette.ts          fixed cottage colours, per-condition light moods
  hooks/useWeather.ts     fetching, refresh timer, geolocation
  scene/dims.ts           one source of truth for cottage dimensions
  scene/Panel.tsx         the flat-shaded box every solid is made of
  scene/Cottage.tsx       shell, roof, gable, chimney, platform
  scene/Furniture.tsx     the room's furniture
  scene/Precipitation.tsx instanced rain and snow
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
