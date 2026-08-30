# Visual and Video Capture Checklist — Hands-On Robotics Projects

Mirrors `docs/hardware/PHOTOGRAPHY_CHECKLIST.md`'s pattern for the Robotics
Hardware & Sensors course. This is the concrete shot/recording list for
every `[IMAGE: ...]` / `[SCREENSHOT: ...]` / `[VIDEO: ...]` placeholder
across all five Phase 5 documents (Module 0, Project 1, Project 2,
Project 3, Project 4), now that all five sections are fully seeded and
every placeholder in the approved content is known.

As decided in `IMPLEMENTATION_PLAN.md` §5.2: `IMAGE`/`VIDEO`/`EMBED`
block schemas require a real, resolvable source — there is no
schema-level concept of "pending" — so **none of the items below are
seeded as blocks yet**. Every seeded lesson currently ships text-only
(architecture diagrams as `CODE` blocks, no visual/video block at all
where a real capture is still needed), matching
`robotics-hardware-and-sensors`'s stricter precedent, not
`ros2-fundamentals`'s placeholder-video convention.

Every item below falls into exactly one of three buckets:

1. **Architecture diagrams — optional SVG upgrade, no physical hardware
   needed.** Already fully specified as ASCII in the approved docs and
   already rendering correctly as `CODE` blocks in the seeded lessons.
   Authoring real SVGs for these is *additional scope*, not a content
   gap — flagged for approval in `IMPLEMENTATION_PLAN.md` §5.2 and never
   confirmed, so the course currently ships with text-only diagrams by
   default, matching that section's own fallback option.
2. **Capturable now, no physical rig required.** A small number of items
   only need a desk-test launch (URDF + RViz, no actual sensors), so
   they don't have to wait for Phase 6.
3. **Genuinely requires the physical Jetson + RPLIDAR S3 + D435i rig.**
   Everything else — hero photos, RViz screenshots taken during a real
   sensor/algorithm run, terminal captures of real data, and all video.
   These are cross-referenced below to the exact
   `PHASE_6_PHYSICAL_VALIDATION_CHECKLIST.md` item that produces them.

## General rules for every real capture (bucket 2 and 3)

- Full resolution, no compression artifacts.
- Every RViz capture: full window, not a cropped panel — Displays panel,
  Fixed Frame, and the visualization itself all visible in one shot.
- Neutral, evenly lit background for product/hero shots.
- File naming: `<section>-<shot-name>.jpg` / `.png` / `.mp4`, lowercase,
  hyphenated (e.g. `project-3-loop-closure-clean.png`) — matches this
  repo's existing `public/courses/**` convention.
- Terminal captures: real output from a real run, never "illustrative"
  text typed to look like output — same discipline the Hardware course's
  checklist already applies to its own terminal shots.

---

## Bucket 1 — Architecture diagrams: RESOLVED, all 5 now real SVG `IMAGE` blocks

Every architecture/data-flow diagram in this course — one per
section — is now a real, hand-authored SVG seeded as an `IMAGE` block,
not `CODE`-block ASCII. No physical hardware was needed for any of
these; the content already existed in full, hand-verified ASCII form,
and authoring a real diagram only changed how it renders, not what it
says.

Module 0's own per-section diagram (§4's `PHYSICAL SENSORS → driver
nodes → ...` pipeline) is the one exception left as `CODE` ASCII —
**satisfied instead by the course-wide Course Project Data Flow
diagram** (below), which the reviewer explicitly designated as Module
0's resolution for this bucket rather than a literal panel-by-panel SVG
conversion of that specific ASCII pipeline. If a literal SVG of Module
0's own sensor-pipeline diagram is wanted later, that remains a
distinct, still-open item — flagged here, not silently dropped.

| Section | Source | Asset | Seeded as | Live in |
|---|---|---|---|---|
| Module 0 | course-wide (see Bucket 1b) | `public/robotics-projects/project-data-flow.svg` | `IMAGE` | `module-0-welcome-prerequisites-what-youll-build`, and again in `project-4-overview-prerequisites-and-lab-safety-check` |
| Project 1 | §4 | `public/robotics-projects/project-1-data-flow.svg` | `IMAGE` (teal) | `project-1-architecture-and-data-flow` |
| Project 2 | §4 | `public/robotics-projects/project-2-data-flow.svg` | `IMAGE` (blue) | `project-2-architecture-and-data-flow` |
| Project 3 | §4 | `public/robotics-projects/project-3-data-flow.svg` | `IMAGE` (purple) | `project-3-architecture-and-data-flow` |
| Project 4 | §4 | `public/robotics-projects/project-4-data-flow.svg` | `IMAGE` (coral) | `project-4-architecture-and-data-flow` |

Each per-project diagram is a horizontal 4-node chain (real topic/package
names from that project's own design doc — `rplidar_ros`,
`realsense2_camera_node`, `slam_toolbox`, `map_saver_cli`, `AMCL`,
`bt_navigator`, etc. — nothing invented), using one consistent accent
color per project, matching the palette already established by the two
Bucket 1b diagrams. Project 2's lesson also still carries its separate
`CODE` "Component breakdown" table (a markdown-style table, not an
architecture diagram — out of scope for this conversion, per §4 of the
content-mapping conventions).

All 5 confirmed rendering live in-browser: Projects 2, 3, and 4 render
correctly on a fresh page load; Project 1's inline thumbnail showed a
stale cached crop specific to this testing session's browser tab (the
server, the raw file, a cache-bypassed fetch, and the diagram's own
"Enlarge" modal all independently confirmed the correct 4-box diagram —
this was a browser-cache artifact of iterating on the file mid-session,
not a defect in the seeded content).

---

## Bucket 1b — Two course-level diagrams, authored as real SVGs (prior session)

Unlike Bucket 1's five per-project diagrams above, these two are new
content, not conversions of an existing per-project `CODE` block — a
course-wide project-dependency diagram and a whole-rig hardware
overview, neither of which existed as ASCII art anywhere in the Phase 5
docs. Same reasoning as Bucket 1 applies (architecture/hardware-layout
diagrams, no physical capture needed).

| Diagram | Asset | Seeded as | Live in |
|---|---|---|---|
| Lab Equipment Overview — RPLIDAR S3, RealSense D435i, standalone IMU, Jetson Orin, and battery, each labeled on the chassis | `public/robotics-projects/lab-equipment-overview.svg` | `IMAGE` | `module-0-welcome-prerequisites-what-youll-build` |
| Course Project Data Flow — Module 0 feeding Projects 1–3 independently, with a distinct dependency arrow from Project 3's saved map to Project 4 | `public/robotics-projects/project-data-flow.svg` | `IMAGE` (seeded twice, same asset) | `module-0-welcome-prerequisites-what-youll-build` (course-intro placement) and again in `project-4-overview-prerequisites-and-lab-safety-check` (at the point the map dependency becomes concrete) |

Both confirmed rendering live in-browser as real images (not broken
links, not another ASCII placeholder) at all three seed locations.

---

## Bucket 2 — Capturable now, no physical rig required

Only one item qualifies, called out explicitly in the source doc itself:

- **Module 0 §7 — RViz TF tree screenshot**, from `robot_description`'s
  own desk-test launch (`ros2 launch robot_description display.launch.py`
  — no sensors, no Jetson, runs on any machine with the package built).
  Source: *"could actually be captured from the desk-test launch alone,
  no hardware required"* (§13 Visual Assets). Belongs beside lesson
  `building-robot-description`. **Blocked only on real chassis mount
  offsets replacing the xacro placeholders** (Phase 6 Module 0 item 6) —
  capture this once those are measured, not necessarily waiting for the
  full sensor rig.

---

## Bucket 3 — Requires the physical rig (cross-referenced to Phase 6)

### Module 0

*(reference: Phase 6 checklist, `MODULE 0 CHECKLIST`, items 1–8)*

- `[IMAGE]` Hero photo — lab robot with RPLIDAR S3, D435i, and standalone
  IMU all visible and labeled (§1, §13). → Phase 6 item 7 (bringup
  integration) is the first point every sensor is confirmed live
  together; capture then.
- `[SCREENSHOT]` RPLIDAR S3 + D435i wiring/mounting photos (§13). →
  Phase 6 items 2–3.
- `[SCREENSHOT]` `rqt_graph` output with full bringup running (§13). →
  Phase 6 item 7.
- `[VIDEO]` 7 slots (Project Overview, Concept — TF tree/bring-up,
  Setup — physical connections, Implementation — building the two
  packages, Execution — running `bringup.launch.py`, Debugging — a real
  driver failure diagnosed, Final Demonstration — all sensors live
  simultaneously). → Debugging needs a real failure to occur naturally;
  do not stage one. The rest map to Phase 6 items 2, 3, 5, 7.

### Project 1

*(reference: Phase 6 checklist, `PROJECT 1 CHECKLIST`, items 1–6)*

- `[IMAGE]` Hero photo — robot mid-avoidance-turn (§1, §10). → Phase 6
  item 5 (first real floor test).
- `[SCREENSHOT]` RViz LaserScan display during an avoidance decision
  (§10). → Phase 6 item 3.
- `[SCREENSHOT]` `rqt_graph` showing `obstacle_avoidance_node`'s
  connections (§10). → Phase 6 item 2.
- `[VIDEO]` 7 slots, same shape as Module 0 (Overview / Concept — FOV
  filtering & LaserScan fields / Setup / Implementation / Execution /
  Debugging — a real avoidance failure / Final Demonstration). → map to
  Phase 6 items 1–5.

### Project 2

*(reference: Phase 6 checklist, `PROJECT 2 CHECKLIST`, items 1–6)*

- `[IMAGE]` Hero photo — robot tracking a colored object (§1, §10). →
  Phase 6 item 5 (real floor test).
- `[SCREENSHOT]` `hsv_calibrator`'s live Camera/Mask windows
  mid-calibration (§1, §10). → Phase 6 item 2 — capture during the
  actual real-lighting calibration run, not a re-staged one.
- `[SCREENSHOT]` `/color_tracker/debug_image` with contour and centroid
  drawn (§10). → Phase 6 item 3.
- `[SCREENSHOT]` `rqt_graph` showing `color_tracker_node`'s connections
  (§10). → Phase 6 item 3.
- `[VIDEO]` 7 slots (Overview / Concept — HSV, contours, centroids /
  Setup / Implementation — calibrator + tracker / Execution / Debugging
  — a real tracking failure / Final Demonstration). → Phase 6 items 2–5.

### Project 3

*(reference: Phase 6 checklist, `PROJECT 3 CHECKLIST`, items 1–7)*

- `[IMAGE]` Hero photo — robot mid-mapping-run (§1, §10). → Phase 6
  item 5.
- `[SCREENSHOT]` RViz map mid-build, before loop closure (§10). → Phase 6
  item 5.
- `[SCREENSHOT]` RViz map after loop closure, walls clean (§10). → Phase
  6 item 5.
- `[SCREENSHOT]` A "bad" map showing doubled walls, for deliberate
  contrast (§10 — *"worth capturing deliberately once, since it's
  genuinely instructive"*, source's own note). → capture by intentionally
  under-tuning `minimum_travel_distance` or driving too fast during one
  throwaway trial before the real Phase 6 item 5 run; not itself a
  pass/fail item.
- `[PDF/IMAGE]` `view_frames` output showing the complete, connected TF
  tree (§10). → Phase 6 item 4 (THE TF CHECKPOINT) — the source doc
  explicitly names this as the artifact that checkpoint produces.
- `[VIDEO]` A teleop-driven mapping run from start to loop closure (§1)
  — the single most important video in the whole course, since it's the
  most direct demonstration of the project's actual capability. → Phase
  6 items 5–6.
- `[VIDEO]` 7 slots, same shape as prior projects (Overview / Concept —
  SLAM, pose graphs, loop closure / Setup / Implementation / Execution —
  a full teleop mapping run / Debugging — a real TF or drift problem /
  Final Demonstration — save, reload, confirm). → Phase 6 items 1–7.

### Project 4

*(reference: Phase 6 checklist, `PROJECT 4 CHECKLIST`, items 1–8)*

- `[IMAGE]` Hero photo — robot navigating autonomously toward a marked
  goal, planned path visible in RViz overlaid on the physical scene (§1,
  §10). → Phase 6 item 4 (first real short goal).
- `[SCREENSHOT]` RViz particle cloud before and after convergence, side
  by side (§10). → Phase 6 item 3.
- `[SCREENSHOT]` RViz global path plus local costmap deviation around a
  placed obstacle (§10). → Phase 6 item 6.
- `[SCREENSHOT]` `ros2 lifecycle get` output for all six nodes reporting
  `ACTIVE` (§10). → Phase 6 item 2 — capture the real terminal output as
  evidence, exactly as Phase 6 item 2 already asks for.
- `[VIDEO]` A full navigation run including an obstacle-avoidance
  deviation and a recovery behavior (§1) — this course's final and most
  complete demonstration; capture it as the closing artifact once items
  1–7 of the Project 4 Phase 6 checklist all pass. → Phase 6 items 4, 6.
- `[VIDEO]` 7 slots, same shape as prior projects (Overview / Concept —
  lifecycle nodes, AMCL, costmaps, actions / Setup / Implementation —
  config + launch composition + action-client script / Execution — a
  full navigation run / Debugging — a real localization or planning
  failure / Final Demonstration — goal + obstacle + recovery, end to
  end). → Phase 6 items 1–8.

---

## Totals

- **5** per-project architecture diagrams (Bucket 1) — **done**: all
  real SVGs, seeded as `IMAGE` blocks, confirmed rendering live.
- **2** course-level diagrams (Bucket 1b) — **done**: real SVGs, seeded,
  confirmed rendering live.
- **1** item capturable now without the physical rig (Bucket 2) — still
  open.
- **17** photo/screenshot/PDF items requiring the physical rig (Bucket 3):
  4 in Module 0, 3 in Project 1, 4 in Project 2, 5 in Project 3, 4 in
  Project 4.
- **37** video slots requiring the physical rig: 7 generic slots × 5
  sections, plus the 2 named videos in Project 3's and Project 4's §1
  that don't fit the generic 7-slot template (the teleop mapping run and
  the full navigation-with-recovery run).

**Zero** items in this document are blocked on anything other than
physical hardware access (Bucket 3) — every diagram that could be
authored without the physical rig (Buckets 1 and 1b, 7 diagrams total)
now has been. The one remaining open, non-hardware-blocked item is
Bucket 2's single desk-test screenshot.

---

## After capture

- Drop files into `public/robotics-projects/` following the naming rule
  above.
- Photos/screenshots/video: add the corresponding `IMAGE`/`VIDEO` block
  to the relevant lesson's `contentBlocks` array in `prisma/seed.ts`,
  at the position the source doc's own placeholder implies (its §1 for
  hero/overview media, its §10/§13 for the rest) — this document does
  not do that wiring itself, since none of these assets exist yet.
- Bucket 1 SVGs (if that scope is approved): swap the named `CODE` block
  for a real `IMAGE` block at the same position — do not remove the
  `CODE` block and add the `IMAGE` block as a separate one; the diagram
  should render once, not twice.
- Re-run `pnpm db:seed` and confirm each newly-added block appears
  correctly in the lesson player, the same way Module 0–3's own content
  was spot-checked live in-browser during implementation.
