# Photography & Screenshot Capture Checklist

Per the kickoff prompt's VISUAL STANDARD: product hero shots and RViz2/
visualization screenshots must be real, never generated, never a permanent
placeholder. This is the concrete shot list to execute against the real
RPLIDAR A2 and Orbbec Astra Pro units, so `heroImageSrc` and the
visualization sections of each device's Stage 5 module have real assets
to fill rather than the labelled placeholders Stage 1 currently ships.

Launch commands referenced below are the exact, already-verified sequences
from `JAZZY_DEVICE_VERIFICATION.md` §1.3a (RPLIDAR) and §2.2a (Astra Pro) —
follow those in full before capturing anything; do not skip steps to save
time, since several (rtprio limit, `cleanup_shm_node`, the RViz2 fixed-frame
setting) are what make the capture possible at all.

General rules for every shot:

- Full resolution, no compression artifacts — these get cropped and
  annotated later; a shot that's already lossy limits what Stage 5's
  diagrams can do with it.
- Neutral, evenly lit background for product shots — no cluttered desk in
  frame. A plain wall or a sheet of card is enough.
- Every RViz2 capture: full window, not a cropped panel — the Displays
  panel, Fixed Frame setting, and the visualization itself should all be
  visible in one shot, so the caption can point at the exact configuration
  that produced it.
- File naming: `<device-slug>-<shot-name>.jpg` / `.png`, lowercase,
  hyphenated — matches this repo's existing `public/courses/**` convention.

---

## RPLIDAR A2

### Product shots

1. **Front three-quarter view** — the unit sitting upright, rotating head
   and base both visible. This is the default hero shot candidate.
2. **Top-down** — directly above, showing the full circular scanning
   window. Makes the 360° sensing area intuitive in a way a side view
   doesn't.
3. **Side profile** — shows the unit's height and where the cable exits.
   Useful for a physical-setup/mounting diagram later.
4. **Close-up: USB adapter board and cable connector** — the small PCB the
   unit's cable terminates in before USB. This is what a learner actually
   holds and plugs in; the sensor head itself never touches their hands.
5. **Close-up: model/serial label** — must be legible enough to confirm
   the exact sub-model (A2M6 / A2M7 / A2M8 / A2M12). §1.3 of the findings
   doc already flags SKU confusion as a real beginner trap; a clear label
   photo settles which launch file and baud rate this specific unit needs.

### RViz2 / data captures

Launch with: `ros2 launch rplidar_ros view_rplidar_a2m8_launch.py` (swap
the SKU to match what step 5 above actually confirmed).

6. **Full RViz2 window, LaserScan display, real room** — arrange 2–3
   distinguishable obstacles (a box, a chair leg, a wall corner) at
   different distances before capturing, so the scan shape is
   unambiguous rather than an empty circle.
7. **Terminal: `ros2 topic echo /scan --once`** — one full message,
   captured as a real screenshot, to sit beside shot 6 as "here's the
   visualization, here's the actual data behind it."
8. **Terminal: `dmesg | grep -i cp210`** right after plugging in, and
   **`ls -l /dev | grep rplidar`** after the udev rule is applied — the
   two confirmations §1.3a's setup sequence describes in prose, captured
   as real output for the course's own screenshots rather than the
   "illustrative output" convention used elsewhere.

---

## Orbbec Astra Pro

### Product shots

1. **Front view** — both the RGB lens and the depth emitter/receiver
   openings visible and, ideally, distinguishable from each other. This
   is the shot that has to do the most teaching work: a learner should be
   able to look at it and believe "two sensors, one housing" before
   reading a word of explanation.
2. **Front three-quarter view** — hero shot candidate.
3. **Side profile** — shows depth (front-to-back), relevant for mounting.
4. **Close-up: cable and connector** — same reasoning as the RPLIDAR's
   adapter-board shot.
5. **Close-up: model label** — must clearly show **"Astra Pro"**, not
   "Astra Pro Plus" or any other variant. This is the single most
   important disambiguation shot in the whole checklist: §2.1 of the
   findings doc documents real, confirmed confusion between this device
   and its newer, similarly-named sibling, and the modern official driver
   supports only the latter.
6. **Mounting bracket/clip, if present** — separate close-up.

### RViz2 / data captures

Launch with the full §2.2a sequence, ending in:
`ros2 launch astra_camera astra_pro.launch.xml`. **Fixed Frame must be set
to `camera_link`** before any of these — §2.2a's confirmed real gotcha;
skipping it produces a blank RViz2 with no error explaining why.

7. **Full RViz2 window, RGB Image display** — a real, recognisable test
   scene (a room with a few distinct objects at varying depths — the same
   scene reused across shots 7–9 makes the RGB/depth/point-cloud
   comparison legible later).
8. **Full RViz2 window, Depth Image display** — same scene as shot 7,
   depth colormap visible.
9. **Full RViz2 window, PointCloud2 display on
   `/camera/depth_registered/points`** — angled so the 3D structure of
   the scene is actually visible, not a flat top-down view that looks
   like a 2D image.
10. **Terminal: `lsusb | grep 2bc5`**, captured right after plugging in —
    this is the direct, real-hardware confirmation of §2.3's dual-USB-
    identity finding (`2bc5:0403` depth, `2bc5:0501` RGB). Two lines for
    one physical device is exactly the thing this course needs to prove,
    not just assert.
11. **Terminal: `ros2 topic echo /camera/color/camera_info --once`** —
    pairs with shot 7, same reasoning as the RPLIDAR's echo capture.

---

## After capture

- Drop files into `public/hardware/` following the naming rule above.
- Update each device's `heroImageSrc`/`heroImageAlt` in `prisma/seed.ts`'s
  `HARDWARE_DEVICES` array to point at the chosen hero shot (shot 1 or 2
  from each device's product-shot list are the two best hero-shot
  candidates going in).
- The RViz2/data captures don't get wired into the schema in Stage 1 — they
  belong in each device's Stage 5 module design, as the real evidence
  behind whichever visualization section that module ends up needing.
- Re-run `pnpm db:seed` and confirm the placeholder ("Product photo pending
  capture") is gone from both the `/hardware` catalog and the DEVICE_CARD
  blocks embedded in the two overview lessons.
