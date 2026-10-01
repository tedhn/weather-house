"""Export cozy_room.blend as a glTF with one node per piece of the room.

The .blend keeps every part as its own object (each chair wheel, each key),
which is a few hundred draw calls. Joining the whole room into one mesh
fixes that but leaves nothing to animate. This joins parts into the pieces
the scene animates -- the bed, the desk, the chair -- named after them, each
with its origin where it should grow from.

    /Applications/Blender.app/Contents/MacOS/Blender -b public/models/cozy_room.blend \
        --python blender/export_room.py -- /tmp/cozy_room.raw.glb
    npx @gltf-transform/cli optimize /tmp/cozy_room.raw.glb public/models/cozy_room.glb \
        --join-named false --compress draco

`--join-named false` is what keeps the pieces apart. Draco rather than the
default meshopt, because meshopt quantizes positions by rescaling each node,
which moves every origin this script sets. The .blend itself is never saved.
"""

import re
import sys
from collections import defaultdict

import bpy
from mathutils import Vector

# First match wins, tested against the object name and against its stem (the
# name with its _N / .NNN suffix stripped). Every mesh has to land somewhere; an unmatched one fails the export
# rather than silently vanishing from the room.
PIECES = [
    ("Floor", ["Plinth", "Plank"]),
    ("Walls", ["WallBack", "WallLeft", "BaseboardBack", "BaseboardLeft", "CornerPost"]),
    ("Beams", ["BeamBack", "BeamLeft", "CapBack", "CapLeft", "FrontPostL", "FrontPostB"]),
    ("WindowPlant", ["WinCactus", "WinPot"]),
    ("Window", ["Win", "Blind"]),
    ("Desk", ["DeskTop", "DeskLeg", "Drawers", "DrawerFront", "DrawerKnob"]),
    ("Monitor", ["Monitor", "Screen"]),
    ("Keyboard", ["Keyboard", "Key", "Mouse"]),
    ("Mug", ["Mug"]),
    # The fans and the clock hands turn on their own, so they are pieces too.
    ("TowerFan0", ["TowerFan_0"]),
    ("TowerFan1", ["TowerFan_1"]),
    ("Tower", ["Tower"]),
    ("DeskLamp", ["Lamp"]),
    ("Chair", ["Chair"]),
    ("Person", ["Hair", "Skin", "Shirt", "Shorts", "Eye", "Cheek"]),
    ("Bed", ["BedFrame", "BedLeg", "Headboard", "Footboard", "Mattress", "Sheet", "Duvet"]),
    ("Bedding", ["Pillow", "Cushion", "Throw"]),
    ("AlarmClock", ["Alarm"]),
    ("NightLamp", ["NightLamp"]),
    ("Nightstand", ["Nightstand"]),
    ("Storage", ["Storage"]),
    ("Rug", ["Rug"]),
    ("Plant", ["BigPot", "BigLeaf"]),
    ("ClockHandH", ["ClockHandH"]),
    ("ClockHandM", ["ClockHandM"]),
    ("Clock", ["Clock"]),
    ("Darts", ["Dart"]),
    ("Pinboard", ["Pin", "Photo", "MapRoute"]),
    ("PosterSpace", ["PosterSpace", "PosterPlanet", "PosterRing", "PosterRocket", "PosterStar", "PosterTitle"]),
    ("PosterGame", ["PosterGame", "PosterPixel"]),
]

# Hung on a wall, so they grow from their middle. Everything else stands on
# something and grows from the bottom of its bounding box.
WALL_HUNG = {"Window", "Clock", "Darts", "Pinboard", "PosterSpace", "PosterGame", "Beams", "TowerFan0", "TowerFan1"}

# Pieces that turn about some other object's middle: a hand about the face.
PIVOT_ON = {"ClockHandH": "ClockFace", "ClockHandM": "ClockFace"}


def piece_for(name):
    stem = re.split(r"[_.]", name)[0]
    for piece, prefixes in PIECES:
        if any(name.startswith(prefix) or stem.startswith(prefix) for prefix in prefixes):
            return piece
    raise SystemExit(f"export_room: no piece for object {name!r}; add it to PIECES")


def main():
    out = sys.argv[sys.argv.index("--") + 1]

    # The chair and the person hang off empties, which are about to go.
    for obj in bpy.data.objects:
        if obj.parent is not None:
            world = obj.matrix_world.copy()
            obj.parent = None
            obj.matrix_world = world

    for obj in list(bpy.data.objects):
        if obj.type != "MESH":
            bpy.data.objects.remove(obj)

    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]

    # Joining keeps only the active object's modifiers, so the bevels are
    # baked into every part first.
    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.convert(target="MESH")

    pivot_sources = {}
    for piece, source in PIVOT_ON.items():
        corners = [bpy.data.objects[source].matrix_world @ Vector(c) for c in bpy.data.objects[source].bound_box]
        pivot_sources[piece] = sum(corners, Vector()) / len(corners)

    groups = defaultdict(list)
    for obj in meshes:
        groups[piece_for(obj.name)].append(obj)

    for piece, parts in groups.items():
        bpy.ops.object.select_all(action="DESELECT")
        for obj in parts:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = parts[0]
        bpy.ops.object.join()
        joined = bpy.context.view_layer.objects.active
        joined.name = piece
        joined.data.name = piece

        corners = [joined.matrix_world @ Vector(c) for c in joined.bound_box]
        low = Vector(min(c[i] for c in corners) for i in range(3))
        high = Vector(max(c[i] for c in corners) for i in range(3))
        pivot = (low + high) / 2
        if piece in pivot_sources:
            pivot = pivot_sources[piece]
        elif piece not in WALL_HUNG:
            pivot.z = low.z
        bpy.context.scene.cursor.location = pivot
        bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
        print(f"export_room: {piece}: {len(parts)} parts")

    bpy.ops.export_scene.gltf(
        filepath=out,
        export_format="GLB",
        export_apply=True,
        export_lights=False,
        export_cameras=False,
        export_yup=True,
    )


main()
