"""Build the weather props as public/models/weather.glb.

Run it on top of the room, so everything that has to fit the room is
measured off the room itself rather than copied in by hand:

    /Applications/Blender.app/Contents/MacOS/Blender -b public/models/cozy_room.blend \
        --python blender/build_weather.py -- public/models/weather.glb

Pass --blend PATH after the output to also save the built props as a .blend
to look at. The script is the source; that file is not read back.

The props share the room's space, so the scene places them with the same
scale and offset as cozy_room.glb. The export holds:

    Cloud0..Cloud4  clouds parked behind the two back walls, in the order
                    they appear as the sky fills up
    Mist0..Mist3    flat banks hugging the plinth, for fog
    Raindrop, Snowflake
                    templates at the origin, instanced in code
    Bolt            hangs down from its origin, turned to face the camera
    SnowCap         one blanket over both wall caps, origin at its base so it
                    grows upward as snow settles
    Shelter         the room's bounding box. Never drawn: the scene reads it
                    to keep rain and snow off the room
"""

import math
import random
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

# (colour, roughness, emission strength). The drops, flakes and bolt glow a
# little so they still read against a night sky.
STYLE = {
    "Cloud": ("#f6f8fb", 0.95, 0.0),
    "Rain": ("#a8d4ff", 0.25, 0.6),
    "Snow": ("#f3f8ff", 0.7, 0.25),
    "Bolt": ("#fff1a0", 0.4, 6.0),
    "SnowCap": ("#f7fafd", 0.9, 0.2),
}

# Blender space: +X and -Y are the two open sides facing the camera, so
# "behind the room" is -X or +Y. (x, y, z, size, shape). The first slots are
# the ones in open sky; the top-left one sits under the HUD's temperature, so
# it only comes out once the sky is filling up.
CLOUDS = [
    (4.5, 2.4, 2.4, 0.85, 0),
    (1.6, 4.5, 3.8, 1.0, 1),
    (-3.5, 3.5, 3.5, 1.15, 0),
    (-4.7, -0.5, 2.5, 0.85, 2),
    (-1.0, 4.9, 4.6, 0.9, 2),
]
MIST = [
    (-0.6, -3.4, -0.55, 1.5),
    (3.4, 0.4, -0.55, 1.4),
    (-3.5, 1.4, -0.3, 1.3),
    (1.6, 3.6, -0.3, 1.3),
]

# Puffs per cloud shape, as (x, y, z, radius) in units of the cloud's size:
# a big crown, smaller shoulders, all sitting on one flat base.
SHAPES = [
    [(0, 0, 0.2, 0.6), (-0.68, 0.05, 0, 0.42), (0.66, -0.04, 0.02, 0.46), (0.15, 0.3, 0.34, 0.4), (-1.1, 0, -0.08, 0.27), (1.12, 0.04, -0.1, 0.26)],
    [(0, 0, 0.12, 0.52), (-0.55, 0.1, 0.06, 0.46), (0.6, 0, 0, 0.4), (-0.15, 0.28, 0.3, 0.38), (1.0, 0.02, -0.08, 0.26)],
    [(0, 0, 0.16, 0.5), (0.58, 0.05, 0.02, 0.4), (-0.56, -0.02, 0, 0.36), (0.25, 0.25, 0.28, 0.32)],
]
FLAT = 0.08  # how far below the puffs' centres the base is cut, in cloud sizes


def linear(hex_colour):
    return tuple((int(hex_colour[i : i + 2], 16) / 255) ** 2.2 for i in (1, 3, 5))


def material(name):
    colour, roughness, glow = STYLE[name]
    mat = bpy.data.materials.new(name)
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*linear(colour), 1)
    bsdf.inputs["Roughness"].default_value = roughness
    if glow:
        bsdf.inputs["Emission Color"].default_value = (*linear(colour), 1)
        bsdf.inputs["Emission Strength"].default_value = glow
    return mat


def detach(obj):
    """The mesh off a scratch object, with the object deleted so its name is
    free for the exported node."""
    mesh = obj.data
    bpy.data.objects.remove(obj)
    return mesh


def place(name, mesh, collection):
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    return obj


def apply(obj, kind, **settings):
    mod = obj.modifiers.new(kind, kind)
    for key, value in settings.items():
        setattr(mod, key, value)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=mod.name)


def smooth(mesh):
    for poly in mesh.polygons:
        poly.use_smooth = True


def cloud_mesh(name, puffs, mat, scratch):
    """Overlapping spheres fused into one skin, then cut flat underneath."""
    bm = bmesh.new()
    for x, y, z, radius in puffs:
        bmesh.ops.create_icosphere(bm, subdivisions=3, radius=radius, matrix=Matrix.Translation((x, y, z)))
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    obj = place(name, mesh, scratch)
    apply(obj, "REMESH", mode="VOXEL", voxel_size=0.035)
    apply(obj, "DECIMATE", ratio=0.12)
    for v in obj.data.vertices:
        v.co.z = max(v.co.z, -FLAT)
    smooth(obj.data)
    obj.data.materials.append(mat)
    return detach(obj)


def raindrop_mesh(mat):
    """A bead with a point on top, the cartoon raindrop."""
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=8, v_segments=6, radius=0.045)
    for v in bm.verts:
        if v.co.z > 0:
            v.co.z *= 1 + 3.0 * (v.co.z / 0.045) ** 2
    mesh = bpy.data.meshes.new("Raindrop")
    bm.to_mesh(mesh)
    smooth(mesh)
    mesh.materials.append(mat)
    return mesh


def flake_mesh(mat, scratch):
    """A chunky six-point star, thick enough to read edge-on as it tumbles."""
    bm = bmesh.new()
    ring = []
    for i in range(12):
        angle = i * math.pi / 6
        radius = 0.1 if i % 2 == 0 else 0.048
        ring.append(bm.verts.new((math.cos(angle) * radius, math.sin(angle) * radius, -0.02)))
    face = bm.faces.new(ring)
    top = bmesh.ops.extrude_face_region(bm, geom=[face])
    for v in (g for g in top["geom"] if isinstance(g, bmesh.types.BMVert)):
        v.co.z += 0.04
    mesh = bpy.data.meshes.new("Snowflake")
    bm.to_mesh(mesh)
    obj = place("Snowflake", mesh, scratch)
    apply(obj, "BEVEL", width=0.012, segments=1, limit_method="ANGLE")
    obj.data.materials.append(mat)
    return detach(obj)


def bolt_mesh(mat, scratch):
    """A zigzag hanging down from its origin, which sits in the cloud. Turned
    to face the camera, which looks along -X+Y from this side."""
    outline = [(0, 0), (0.3, -0.62), (0.1, -0.62), (0.36, -1.32), (0.15, -1.32), (0.42, -2.2),
               (-0.08, -1.12), (0.1, -1.12), (-0.16, -0.5), (0.02, -0.5), (-0.15, 0)]
    bm = bmesh.new()
    face = bm.faces.new([bm.verts.new((x, -0.04, z)) for x, z in outline])
    front = bmesh.ops.extrude_face_region(bm, geom=[face])
    for v in (g for g in front["geom"] if isinstance(g, bmesh.types.BMVert)):
        v.co.y += 0.08
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(45), 3, "Z"))
    mesh = bpy.data.meshes.new("Bolt")
    bm.to_mesh(mesh)
    obj = place("Bolt", mesh, scratch)
    apply(obj, "BEVEL", width=0.015, segments=2, limit_method="ANGLE")
    obj.data.materials.append(mat)
    return detach(obj)


def bounds(objects):
    corners = [obj.matrix_world @ Vector(c) for obj in objects for c in obj.bound_box]
    low = Vector(min(c[i] for c in corners) for i in range(3))
    high = Vector(max(c[i] for c in corners) for i in range(3))
    return low, high


def snowcap_mesh(mat, scratch):
    """One soft blanket over both wall caps. Everything is fused into one skin,
    since two slabs meeting at the corner would share a top face plane and
    shimmer. The base sits on the caps, so scaling up grows it upward."""
    caps = [o for o in bpy.data.objects if o.type == "MESH" and o.name.startswith(("CapBack", "CapLeft"))]
    if len(caps) < 2:
        raise SystemExit("build_weather: expected CapBack and CapLeft in the room")
    bm = bmesh.new()
    base = max(bounds([cap])[1].z for cap in caps)
    rng = random.Random(3)
    for cap in caps:
        low, high = bounds([cap])
        size = high - low + Vector((0.08, 0.08, 0))
        centre = (low + high) / 2
        bmesh.ops.create_cube(bm, size=1, matrix=Matrix.Translation((centre.x, centre.y, base + 0.02)) @ Matrix.Diagonal((size.x, size.y, 0.08, 1)))
        # A row of drifts along the top, so it reads as heaped snow rather
        # than a slab of plaster.
        along_x = size.x > size.y
        length = size.x if along_x else size.y
        width = size.y if along_x else size.x
        for i in range(int(length / 0.28)):
            t = (i + 0.5) / int(length / 0.28)
            x = low.x + (high.x - low.x) * t if along_x else centre.x
            y = centre.y if along_x else low.y + (high.y - low.y) * t
            radius = width * rng.uniform(0.32, 0.42)
            bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1, matrix=Matrix.Translation((x, y, base + 0.03)) @ Matrix.Diagonal((radius * 1.3, radius, radius * 0.42, 1)))
    # Lumps of snow slumping over the edges that face into the room, -Y on
    # the back wall's cap and +X on the left wall's.
    for cap in caps:
        low, high = bounds([cap])
        along_x = (high.x - low.x) > (high.y - low.y)
        for _ in range(7):
            t = rng.uniform(0.1, 0.9)
            x = low.x + (high.x - low.x) * t if along_x else high.x + 0.02
            y = low.y - 0.02 if along_x else low.y + (high.y - low.y) * t
            bmesh.ops.create_icosphere(bm, subdivisions=2, radius=rng.uniform(0.05, 0.08), matrix=Matrix.Translation((x, y, base + rng.uniform(0.0, 0.04))))
    mesh = bpy.data.meshes.new("SnowCap")
    bm.to_mesh(mesh)
    obj = place("SnowCap", mesh, scratch)
    apply(obj, "REMESH", mode="VOXEL", voxel_size=0.025)
    apply(obj, "SMOOTH", factor=1.0, iterations=6)
    apply(obj, "DECIMATE", ratio=0.08)
    smooth(obj.data)
    obj.data.materials.append(mat)
    return detach(obj), base


def main():
    argv = sys.argv[sys.argv.index("--") + 1 :]
    out = argv[0]
    blend = argv[argv.index("--blend") + 1] if "--blend" in argv else None

    room = [o for o in bpy.data.objects if o.type == "MESH"]
    room_low, room_high = bounds(room)

    weather = bpy.data.collections.new("Weather")
    bpy.context.scene.collection.children.link(weather)
    scratch = bpy.data.collections.new("Scratch")
    bpy.context.scene.collection.children.link(scratch)

    mats = {name: material(name) for name in STYLE}
    rng = random.Random(11)

    shapes = [cloud_mesh(f"CloudShape{i}", puffs, mats["Cloud"], scratch) for i, puffs in enumerate(SHAPES)]
    for i, (x, y, z, size, shape) in enumerate(CLOUDS):
        cloud = place(f"Cloud{i}", shapes[shape], weather)
        cloud.location = (x, y, z)
        cloud.scale = (size, size * 0.85, size)
        # Long side along the screen, which runs along +X+Y from this camera.
        cloud.rotation_euler.z = math.radians(45 + rng.uniform(-12, 12))

    # Mist is a cloud squashed flat; the scene gives it its own see-through
    # material, so it shares the cloud's mesh rather than carrying a copy.
    for i, (x, y, z, size) in enumerate(MIST):
        mist = place(f"Mist{i}", shapes[0], weather)
        mist.location = (x, y, z)
        mist.scale = (size, size * 0.8, size * 0.38)
        mist.rotation_euler.z = math.radians(45 + rng.uniform(-20, 20))

    place("Raindrop", raindrop_mesh(mats["Rain"]), weather)
    place("Snowflake", flake_mesh(mats["Snow"], scratch), weather)
    place("Bolt", bolt_mesh(mats["Bolt"], scratch), weather)

    cap_mesh, cap_base = snowcap_mesh(mats["SnowCap"], scratch)
    cap = place("SnowCap", cap_mesh, weather)
    cap_mesh.transform(Matrix.Translation((0, 0, -cap_base)))
    cap.location.z = cap_base

    shelter_mesh = bpy.data.meshes.new("Shelter")
    bm = bmesh.new()
    centre = (room_low + room_high) / 2
    size = room_high - room_low
    bmesh.ops.create_cube(bm, size=1, matrix=Matrix.Translation(centre) @ Matrix.Diagonal((*size, 1)))
    bm.to_mesh(shelter_mesh)
    place("Shelter", shelter_mesh, weather)

    for obj in list(bpy.context.scene.objects):
        obj.select_set(obj.name in weather.objects)
    bpy.ops.export_scene.gltf(
        filepath=out,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_lights=False,
        export_cameras=False,
        export_yup=True,
    )
    print(f"build_weather: wrote {out}, shelter {[round(v, 2) for v in room_low]} to {[round(v, 2) for v in room_high]}")

    if blend:
        for obj in room:
            bpy.data.objects.remove(obj)
        for obj in [o for o in bpy.data.objects if o.type in ("LIGHT", "CAMERA", "EMPTY")]:
            bpy.data.objects.remove(obj)
        bpy.ops.wm.save_as_mainfile(filepath=blend)


main()
