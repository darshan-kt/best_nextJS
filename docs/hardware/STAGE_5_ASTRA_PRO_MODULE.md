# Stage 5 — Orbbec Astra Pro: Full Module Design (Module 4)

Per `HARDWARE_COURSE_KICKOFF_PROMPTS.md` Stage 5, built from the approved
`docs/hardware/STAGE_4_ASTRA_PRO_PROFILE.md`, following the Section A–L
template and the VISUAL STANDARD. Design output only — no LMS writes.

**Section lettering note.** The design doc assigns Module 4 (this device) a
different B/C order than Module 5 (RPLIDAR): here, **B is Hardware
Understanding and C is How It Works** — swapped relative to the RPLIDAR
module — followed verbatim from `ROBOTICS_HARDWARE_AND_SENSORS_COURSE.md`
§22, not normalized to match the other module. Every letter from D onward
matches the RPLIDAR module's lettering exactly.

**Resolving the flagged decision first, as instructed.** Section H below
specifies the missing two-parallel-chains data-pipeline SVG as part of this
stage's visual set — not deferred to Stage 7. See Section H's Visual
requirements for the full spec.

---

## Module 4 Learning Objectives

By the end of this module, the learner can:

- Explain structured-light depth sensing at three depths and state why
  "one housing" does not mean "one sensor" for this device.
- Correctly distinguish "Astra Pro" from "Astra Pro Plus" on sight, and
  explain why that distinction determines which driver path works at all.
- Complete the full verified Jazzy setup path — fork, branch, native deps,
  udev rules, rtprio, semaphore cleanup, RViz2 fixed frame — in the correct
  sequence, on a real Ubuntu 24.04 machine.
- Explain why a fully error-free, publishing point cloud can still be
  silently misaligned, and know which single parameter controls that.
- Walk two distinct diagnostic paths (RGB/UVC vs. depth/OpenNI2) for this
  device, rather than treating it as one linear ladder.
- Evaluate a piece of hardware's driver-support maturity before buying it —
  using this device's own MEDIUM confidence rating as the worked example.

---

## Section A — Introduction

**Objective:** Introduce the device honestly — legacy status stated as
real, useful information, not hidden or apologized for.

**Concepts covered:** RGB-D camera; what makes this device different from
the RPLIDAR (imaging *and* ranging vs. ranging alone); this course's own
confidence-rating method, applied transparently.

**Content block sequence:**
1. **TEXT** — hook: "The RPLIDAR module ended with a device that just
   works — official package, officially released, HIGH confidence. This
   module is the opposite case on purpose: a device whose only working
   Jazzy path is a small community fork. That's not a flaw in this
   course's design — it's the more common real-world situation, and
   learning to evaluate it is the point."
2. **DEVICE_CARD** (`orbbec-astra-pro`) — first concrete look; the
   `HardwareSupportBanner` renders automatically here since
   `supportStatus` is `LEGACY` (Stage 1's own design) — the learner sees
   the honest status before reading a word of prose.
3. **TEXT** — what an RGB-D camera is at a high level: a device that
   reports both an ordinary color image and, separately, a distance value
   for every pixel — "RGB" plus "D" (depth).
4. **CALLOUT** (INFO) — the confidence-rating method, stated plainly and
   reused explicitly from the profile: this course rated the RPLIDAR HIGH
   because an official, buildfarm-released package exists; this device is
   rated MEDIUM because its only working path is a small, single-
   maintainer, unmerged fork — "every individual claim in this module is
   still traced to a real source, the same as the RPLIDAR's — the
   *confidence* is lower because the source itself is less institutionally
   backed, not because the facts are less verified."
5. **TEXT** — the driver landscape, stated directly rather than
   discovered mid-setup: Orbbec's own actively-maintained driver
   (`OrbbecSDK_ROS2`) does not support this exact device — only newer,
   similarly-named models. This course uses `yosefl20/ros2_astra_camera`,
   branch `jazzy` instead. "Knowing this now, before Section G, is the
   whole point of stating legacy status honestly up front."

**Visual requirements:** None new — the `DEVICE_CARD` (with its automatic
support banner) covers this section's need.

**Video:** See the Video Curation section at the end of this document.

**Exercise:** None.

**Quiz:** None at section level (module quiz is Section K).

---

## Section B — Hardware Understanding

**Objective:** Identify the physical components, and correctly read the
one label that determines whether any of this module's driver work
applies at all.

**Concepts covered:** RGB lens; IR projector; IR receiver; housing;
captive cable; the "Astra Pro" vs. "Astra Pro Plus" label distinction.

**Content block sequence:**
1. **TEXT** — component walkthrough, from the profile §3: RGB lens
   (ordinary color camera, a UVC device in its own right); IR projector
   (emits the invisible structured-light pattern); IR receiver (captures
   the pattern's distortion, paired with the projector as the OpenNI2
   depth engine); housing (one enclosure for all three optical elements).
2. **IMAGE** — annotated hardware diagram (see Visual requirements).
3. **CALLOUT** (WARNING) — the single most important label on this
   device: it must read exactly **"Astra Pro"**, not "Astra Pro Plus" or
   any other variant. "This isn't a cosmetic difference — Orbbec's
   modern, actively-maintained driver supports the Plus model but not this
   one. Confirm the label before doing anything else in this module."
4. **TEXT** — the cable/USB nuance, stated before Section F needs it
   operationally: one physical captive cable, but this device enumerates
   as **two separate USB identities** at the OS level — the physical
   cable count (one) does not match the logical device count (two). "Keep
   this in mind for Section G's very first verification command."

**Visual requirements:**
- **Purpose:** let a learner visually confirm "two sensors, one housing"
  before reading a word of the working-principle explanation · **Concept:**
  the five physical components from profile §3, with the RGB lens and IR
  projector/receiver visually distinguished from each other · **Format:**
  labelled callout diagram over a device silhouette, front-view emphasis
  (matching `PHOTOGRAPHY_CHECKLIST.md`'s own shot 1 reasoning: "a learner
  should be able to look at it and believe 'two sensors, one housing'
  before reading a word of explanation") · **Status: not yet generated** —
  new SVG · **What the learner should understand:** every component named
  here is referenced again operationally in Sections F–J.

**Video:** None — device-specific component identification.

**Exercise:** None.

**Quiz:** None at section level.

---

## Section C — How It Works

**Objective:** Explain structured-light depth sensing at three depths,
sourced directly from the profile.

**Concepts covered:** Structured light; the projector/receiver pair;
triangulation-family reasoning applied across a 2D field.

**Content block sequence:**
1. **TEXT** — intuition (profile §2, verbatim reasoning): the device is
   really two devices sharing one housing — an ordinary color camera, and
   a separate depth-sensing system that projects an invisible infrared
   pattern and watches how it distorts across surfaces at different
   distances, the same way two eyes infer depth by comparing slightly
   different views.
2. **IMAGE** — working-principle diagram (see Visual requirements).
3. **TEXT** — simplified technical: **structured light** — an infrared
   projector emits a fixed, known pattern; an infrared receiver captures
   how that pattern lands on the scene; because the projector-to-receiver
   geometry is fixed and known, any local shift in the pattern reveals
   distance at that point — the same triangulation-family idea as the
   RPLIDAR's laser method, applied across a whole 2D field at once instead
   of one scanning point.
4. **CALLOUT** (TIP) — direct cross-device comparison: "The RPLIDAR
   scans one direction at a time, 360° per rotation. This device measures
   an entire 2D field simultaneously, but only within its fixed 60°×49.5°
   cone. Same underlying triangulation idea, genuinely different coverage
   shape — Module 2 Lesson 1 already drew this exact contrast."
5. **TEXT** — practical consequence, the load-bearing one for this
   module: because RGB and depth are two independent sensing systems, they
   can be enabled/disabled independently, and their data only becomes
   spatially aligned through **explicit processing** — not automatically,
   just because both come from one housing. "Section D's specification
   table has a real, published example of exactly this — read it
   carefully."

**Visual requirements:**
- **Purpose:** make structured-light sensing visually intuitive, and show
  *why* RGB and depth are separate systems rather than one combined sensor
  · **Concept:** IR projector emits pattern → pattern lands on scene at
  varying distances → IR receiver captures distortion → depth computed;
  shown alongside, not merged with, the separate RGB lens path ·
  **Format:** side-view diagram, IR projector and receiver as a fixed pair
  with pattern lines to near/far objects showing different distortion,
  RGB lens drawn as a visually separate light path into a different part
  of the same housing · **Status: not yet generated** — new SVG · **What
  the learner should understand:** two genuinely separate optical systems,
  not one sensor producing two outputs.

**Video:** See Video Curation — none embedded.

**Exercise:** None.

**Quiz:** None at section level.

---

## Section D — Specifications

**Objective:** Read the full spec table, with the `depth_registration`
finding surfaced as its own prominent teaching moment, not a footnote.

**Concepts covered:** All specifications from the profile §1; the
`depth_registration` default and what it actually controls.

**Content block sequence:**
1. **SPEC_TABLE** (`orbbec-astra-pro`) — the full spec set: depth range
   (0.6–8.0 m, optimal 0.6–5.0 m), depth resolution, RGB resolution, field
   of view, interface, dimensions/weight — each carrying its "why it
   matters" in the underlying `HardwareDeviceSpec` records, per Stage 1's
   schema.
2. **CALLOUT** (WARNING) — **its own prominent block, not a table row**,
   exactly as required: *"A fully working, error-free, publishing point
   cloud on `/camera/depth_registered/points` does **not** guarantee the
   depth and color data are actually pixel-aligned. The `depth_registration`
   parameter — which controls real hardware/SDK-level alignment — defaults
   to `false` in this device's own launch file, even though the topic
   name contains the word 'registered.' The name comes from a topic
   remap (`depth/color/points` → `depth_registered/points`); the alignment
   itself is a separate, independently-defaulted setting. If you need a
   genuinely aligned RGB-D point cloud, you must explicitly set
   `depth_registration:=true` — nothing about the topic's name or the
   absence of any error will tell you this."*
3. **TEXT** — why this matters practically, not just as trivia: a learner
   building a perception pipeline that assumes color and depth line up
   pixel-for-pixel (e.g. "the object at pixel (320, 240) in the color
   image is this far away, per the depth image at the same pixel") gets
   silently wrong answers with default settings — no crash, no error, just
   quietly incorrect data.
4. **TEXT** — the per-stream FOV/resolution table, connected to Section C's
   working-principle explanation: RGB up to 1280×960 (lower FPS) or
   640×480 @ 30 FPS (this fork's own launch default — the number a learner
   actually sees); depth up to VGA (640×480) @ 30 FPS; both fixed within
   the shared 60°×49.5° cone.

**Visual requirements:** None new — `SPEC_TABLE` plus the dedicated
callout above are this section's complete visual/emphasis need.

**Video:** None.

**Exercise:** None.

**Quiz:** None at section level.

---

## Section E — Real Applications

**Objective:** Connect the two independent data streams to real robotics
use cases.

**Concepts covered:** Object perception; robot manipulation; obstacle
detection; human interaction; 3D sensing (design doc §22, Module 4 Section
E list).

**Content block sequence:**
1. **TEXT** — the standard RGB-D application list, grounded in this
   device's own real distinction from the RPLIDAR: where the RPLIDAR
   answers "is something there, and how far," this device additionally
   answers "what is it" (via RGB) and "what shape is it" (via depth) —
   richer data, over a much smaller field of view and shorter effective
   range than the RPLIDAR.
2. **TEXT** — one sentence each: object perception (recognize what's in
   the scene, using RGB); robot manipulation (a depth-aware gripper needs
   to know exact distance to an object, not just "something is near");
   obstacle detection (depth alone, within the optimal 0.6–5 m range);
   human interaction (RGB for recognition, depth for real-world scale);
   3D sensing (the registered point cloud, when actually enabled — direct
   callback to Section D's finding).
3. **CALLOUT** (TIP) — "The capstone (after both device modules) combines
   this device's close-range richness with the RPLIDAR's long-range 360°
   coverage — neither sensor alone gives a robot the full picture."

**Visual requirements:** None new.

**Video:** See Video Curation — none embedded.

**Exercise:** None.

**Quiz:** None at section level.

---

## Section F — Physical Setup

**Objective:** Physically connect the device, with the sub-model label
check already established in Section B carried forward as the first real
action.

**Concepts covered:** Cable connection; USB power (bus-powered, two
identities); confirming the exact model before connecting.

**Content block sequence:**
1. **CALLOUT** (WARNING) — direct callback to Section B: confirm the
   label reads "Astra Pro" before proceeding — this is Setup Step 0 in
   substance.
2. **TEXT** — direct callback to Module 0 Lesson 4's power-budget lesson,
   now doubly relevant: this device alone presents two simultaneous USB
   identities drawing power from one cable; connect it to the course's
   powered USB hub, not a bare laptop port — especially once the RPLIDAR
   is also connected for the capstone.
3. **TEXT** — physical connection: captive cable to USB (hub), housing
   placed with a clear, unobstructed view of the intended scene — no
   further physical assembly required (unlike the RPLIDAR, this device has
   no moving parts to keep clear).

**Visual requirements:**
- **Purpose:** show the physical connection path, and visually reinforce
  the one-cable/two-identities distinction from Section B · **Concept:**
  housing → captive cable → USB port (via powered hub), with a small
  inset showing the cable splitting logically (not physically) into two
  USB identities once it reaches the host · **Format:** simple left-to-
  right connection diagram with the logical-split inset · **Status: not
  yet generated** — new SVG, the VISUAL STANDARD's required connection
  diagram for this device.

**Video:** None.

**Exercise:** None.

**Quiz:** None at section level.

---

## Section G — Ubuntu Setup

**Objective:** Execute the complete verified setup sequence, in the exact
order confirmed in the profile — fork branch, native deps, udev rules,
rtprio, semaphore cleanup — with real expected output at every step.

**Concepts covered:** Cloning the correct fork/branch; native and ROS 2
dependencies; udev rules for two USB identities; real-time priority;
semaphore cleanup.

**Content block sequence:**

1. **CALLOUT** (WARNING) — **Gotcha #1, sequenced first, matching §2.2a
   exactly:** clone the fork, and the `jazzy` branch specifically — the
   upstream repo's `master` branch is unfixed and will not build.
2. **CODE** (bash) —
   ```bash
   cd ~/ros2_ws/src
   git clone -b jazzy https://github.com/yosefl20/ros2_astra_camera.git
   ```
   **Expected output:** a normal git clone log ending in "done." **What
   failure looks like:** cloning without `-b jazzy` silently checks out
   the repo's default branch (`master`) instead — no error at clone time,
   but the build fails later exactly as described in step 3.
3. **TEXT** — native dependencies, confirmed directly from the fork's own
   `README.MD` (fetched via curl during the profile stage — the README
   itself still says `galactic` throughout, a stale artifact addressed
   honestly in the callout below, not silently corrected):
4. **CODE** (bash) —
   ```bash
   sudo apt install libgflags-dev ros-jazzy-image-geometry ros-jazzy-camera-info-manager \
     ros-jazzy-image-transport ros-jazzy-image-publisher libgoogle-glog-dev libusb-1.0-0-dev libeigen3-dev
   git clone https://github.com/libuvc/libuvc.git
   cd libuvc && mkdir build && cd build
   cmake .. && make -j4
   sudo make install && sudo ldconfig
   ```
   **Expected output:** apt installs cleanly; libuvc's cmake/make/install
   sequence completes with no errors (libuvc has no ROS/apt package — this
   is the one genuinely source-built native dependency this device needs,
   unlike the RPLIDAR's fully apt-installable path). **What failure looks
   like:** a missing `libusb-1.0-0-dev` produces a `cmake` configuration
   error naming `libusb` specifically — install it and re-run `cmake`.
5. **CALLOUT** (INFO) — **stale-artifact finding, surfaced honestly, not
   corrected away:** the fork's own README additionally instructs
   extracting a separate `openNISdk_ROS2_xxx.tar.gz` archive into the
   workspace. This appears to be a stale instruction from before the
   OpenNI2 redistributable binaries were vendored directly into the
   repository (`astra_camera/openni2_redist/{arm,arm64,x64}/libOpenNI2.so`
   — confirmed present via the GitHub API's own file listing, and
   `CMakeLists.txt` installs directly from that in-repo path). **This
   course's own sequence has no such step, on purpose — that omission was
   confirmed correct, not an oversight.** Worth stating to the learner
   exactly this way, per the same standard the profile applied: real,
   unresolved documentation debt, named rather than silently patched.
6. **CODE** (bash) —
   ```bash
   cd ~/ros2_ws
   rosdep install --from-paths src --ignore-src -y
   colcon build --event-handlers console_direct+ --cmake-args -DCMAKE_BUILD_TYPE=Release
   ```
   **Expected output:** `rosdep` resolves `cv_bridge`/`image_geometry`
   from Jazzy's own official release (the fork's `package.xml` correctly
   declares them — the original build-failure's actual fix); `colcon
   build` completes with no errors. **What failure looks like:** `fatal
   error: cv_bridge/cv_bridge.h: No such file or directory` means the
   `master` branch was cloned instead of `jazzy` (step 2's failure mode
   surfacing here instead of at clone time).
7. **TEXT** — what a udev rule actually is, before running one: **udev**
   is the Linux subsystem that names and sets permissions on devices as
   they're plugged in. Without a rule, a device gets an auto-assigned name
   that can shift between reboots, and may default to permissions only
   root can use. The rule file below tells udev "whenever a device
   matching one of these exact vendor/product ID pairs appears, apply
   this specific name and permission" — this device needs **two** such
   entries in one rule file, one per USB identity (Section B/F).
8. **CODE** (bash) — udev rules for **both** USB identities:
   ```bash
   cd ~/ros2_ws/src/ros2_astra_camera/astra_camera/scripts
   sudo bash install.sh
   sudo udevadm control --reload-rules && sudo udevadm trigger
   ```
   **Expected output:** no output on success. **What failure looks
   like:** covered fully in Section J — this step's failure surfaces later,
   as a permission error when the driver actually tries to open a device.
9. **CODE** (bash) — confirm both identities before proceeding, exactly
   as the profile's setup sequence requires:
   ```bash
   lsusb | grep 2bc5
   ```
   **Expected output:** **two lines** — product `0403` (depth/OpenNI2)
   and product `0501` (RGB/UVC), both vendor `2bc5`. **What failure looks
   like:** one line means a cable or hub power problem (Section F) — check
   that before suspecting the driver.
10. **CALLOUT** (WARNING) — **Gotcha #2, sequenced here matching §2.2a
    exactly, before first launch:**
    ```bash
    echo "$USER    -   rtprio   99" | sudo tee /etc/security/limits.d/99-ros2-rt.conf
    ```
    Log out and back in (or reboot) for the limit to take effect. Stock
    Ubuntu 24.04 blocks real-time priority for non-root users by default,
    and the launch fails without this — confirmed by a real user's run
    (Stage 0). **Honestly flagged, not overstated:** this requirement could
    not be traced to a specific line in the fork's own C++ source — it
    lives in the closed/vendored OpenNI2 binary, not this fork's own code —
    stated as a real-user-confirmed fact, not a source-line-confirmed one.
11. **CODE** (bash) — clear any stale semaphore before a re-launch attempt
    (**verified correct command, not the earlier typo'd version**):
    ```bash
    ros2 run astra_camera clean_shm_node
    ```
    Confirmed as the actual registered executable directly from the
    fork's `CMakeLists.txt`. **What a hang (not clearing this) looks
    like:** covered in Section J — checkable directly via
    `ls /dev/shm | grep astra` (the semaphore's real name,
    `astra_device_sem`).
12. **CODE** (bash) — launch:
    ```bash
    ros2 launch astra_camera astra_pro.launch.xml
    ```
    (not `astra_pro_plus.launch.xml`, which targets a different product).

**Visual requirements:** None new — command blocks with real expected
output carry this section, matching the RPLIDAR module's own Section G
approach.

**Video:** None.

**Exercise:** None — Section I is the hands-on demo.

**Quiz:** None at section level.

---

## Section H — ROS 2 Integration

**Objective:** Understand the real integration surface for both the
OpenNI2 depth path and the separate UVC RGB path, and the single-node
architecture that hosts both.

**Concepts covered:** Node/namespace; the depth surface; the RGB surface;
per-stream QoS; frame IDs; the architecture correction (one node, two
internal driver components, not two nodes).

**Content block sequence:**
1. **TEXT** — **the architecture, stated precisely, not simplified into
   "two nodes":** this device runs as **one** ROS 2 node
   (`astra_camera_node`, package `astra_camera`), under **namespace**
   `/camera` — a prefix ROS 2 adds in front of every one of this node's
   topic and service names (`/camera/color/image_raw`, not just
   `/color/image_raw`), so a second camera on the same robot can run
   under a different prefix without its topics colliding with this one's.
   Internally, the node is composed of two independent driver components —
   an `OBCameraNode` class handling the OpenNI2 depth/IR path, and a
   separate `UVCCameraDriver` class handling the RGB path. "Two USB
   identities, two driver classes, one ROS 2 process — precise language
   matters here, because Section J's debugging paths follow the driver-
   component split, not a node-count split."
2. **IMAGE** — the new two-parallel-chains data-pipeline diagram (see
   Visual requirements — **this stage's resolved decision**).
3. **TEXT** — the depth/OpenNI2 surface: `/camera/depth/image_raw` +
   `/camera/depth/camera_info`; `/camera/ir/image_raw` +
   `/camera/ir/camera_info` (when `enable_ir`, default `true`);
   `/camera/depth_registered/points` (`sensor_msgs/msg/PointCloud2`, via
   the launch file's own topic remap) when `enable_point_cloud` (default
   `true`).
4. **CALLOUT** (WARNING) — direct forward-reference, not a repeat, of
   Section D's finding: "the point cloud topic above is named
   `depth_registered` because of a topic *remap*, not because
   `depth_registration` is on by default — it isn't. Full explanation in
   Section D; this is where you'll actually pass `depth_registration:=true`
   if you need it, in Section I."
5. **TEXT** — the RGB/UVC surface, kept visually distinct: `/camera/color/
   image_raw` + `/camera/color/camera_info`, when `enable_color` and
   `use_uvc_camera` (both default `true`) — sourced from
   `uvc_vendor_id`/`uvc_product_id` defaults `0x2bc5`/`0x0501`, confirmed
   two independent ways (the launch file's own defaults, and the udev
   rules file's `astrauvc` symlink entry for the same product ID).
6. **TEXT** — per-stream QoS, a genuinely more granular surface than the
   RPLIDAR's single fixed publisher: `color_qos`, `depth_qos`, `ir_qos`,
   and their `camera_info` counterparts are each independently
   configurable (default `"default"` — left unset, this defers to
   whatever reliability/history settings the underlying ROS 2 middleware
   itself defaults to, the same RELIABLE-by-default behavior Module 3
   Lesson 4 already established for the RPLIDAR's own publisher, rather
   than a per-stream override this device sets deliberately).
7. **TEXT** — frame IDs: base `camera_link` (confirmed as the node's own
   compiled-in default — this is *why* RViz2's Fixed Frame must be set to
   this exact string in Section I); depth `camera_depth_frame` / optical
   `camera_depth_optical_frame`; IR `camera_infra1_frame` / optical
   `camera_infra1_optical_frame`.
8. **CALLOUT** (INFO) — a small, honestly-flagged naming inconsistency,
   in the same spirit as the RPLIDAR module's stale-comment callout: every
   other optical-frame constant follows `camera_<stream>_optical_frame`
   except color, which is `camera_optical_color_frame` — "optical" and
   "color" swapped relative to the pattern. Harmless, but a real,
   source-confirmed instance of "reading the actual constants file catches
   things a summary wouldn't."

**Visual requirements — the resolved decision:**
- **Purpose:** show the real architecture accurately — two parallel
  driver-component chains converging into one ROS 2 node process, not two
  separate nodes and not one undifferentiated blob · **Concept:** physical
  world → [IR projector/receiver, OpenNI2] → USB identity `2bc5:0403` →
  `OBCameraNode` driver component, running *inside* `astra_camera_node`
  → depth/IR/point-cloud topics; physical world → [RGB lens, UVC] → USB
  identity `2bc5:0501` → `UVCCameraDriver` driver component, running
  *inside the same node process* → color topics · **Format:** two
  horizontal chains stacked vertically (matching the RPLIDAR pipeline
  diagram's own visual language for consistency across the course), each
  chain's driver-component box drawn *inside* one shared, larger
  "astra_camera_node (/camera)" boundary box — the shared boundary is
  what visually communicates "one process," while the two chains inside
  it stay visually distinct all the way to their own topic outputs · a
  small `depth_registration: false (default)` label sits on the depth
  chain's point-cloud output arrow, directly cross-referencing Section D's
  callout at the exact point in the diagram where it's relevant · **Status:
  not yet generated — new SVG, specified in full here per this stage's
  explicit resolution of the flagged decision, not deferred to Stage 7** ·
  **What the learner should understand:** this device's dual-stream nature
  is a real architectural fact (two driver components, two USB identities)
  contained within one real architectural fact (one node process) — both
  true at once, neither simplified away.

**Video:** None.

**Exercise:** None — Section I is hands-on.

**Quiz:** None at section level.

---

## Section I — Practical Demo

**Objective:** Get real color, depth, IR, and point-cloud data flowing and
visualized — including a live demonstration of the `depth_registration`
finding, not just a description of it.

**Concepts covered:** End-to-end launch; RViz2 fixed-frame configuration;
viewing each stream; demonstrating registered vs. unregistered point
clouds live.

**Content block sequence:**
1. **TEXT** — the full launch, matching Section G exactly (already
   executed through step 11, the semaphore cleanup — this is the final
   step):
2. **CODE** (bash) —
   ```bash
   ros2 launch astra_camera astra_pro.launch.xml
   ```
   **Expected output:** an `astra_camera_node` starts under `/camera`,
   publishing color, depth, IR, and a point cloud (Section H's surfaces).
   **What failure looks like:** covered fully in Section J.
3. **CALLOUT** (WARNING) — **Gotcha #3, the last of the three, exactly
   where the profile places it — immediately after launch, before
   anything else:** in RViz2, set **Fixed Frame to `camera_link`
   manually**. It does not default there. Skipping this produces a blank
   RViz2 window with no error explaining why.
4. **TEXT** — guided viewing: add the RGB Image display
   (`/camera/color/image_raw`), the Depth Image display
   (`/camera/depth/image_raw`), and the PointCloud2 display
   (`/camera/depth_registered/points`) — the same scene arrangement
   `PHOTOGRAPHY_CHECKLIST.md` specifies for this device (a room with a few
   distinct objects at varying depths), reused here for live demonstration.
5. **TEXT** — **the depth_registration demonstration, made concrete, not
   just described:** with the point cloud already visible (default
   `depth_registration:=false`), note in RViz2 whether the point cloud's
   colors look correctly placed on the 3D geometry or subtly offset —
   with a wide field-of-view scene and objects at different depths, a
   misalignment is visible once you know to look for it. Then:
6. **CODE** (bash) —
   ```bash
   ros2 launch astra_camera astra_pro.launch.xml depth_registration:=true
   ```
   **Expected output:** the same point cloud, now with color properly
   aligned to the 3D structure. **This is the live version of Section D's
   callout** — the same topic name, the same lack of any error either way,
   a real visual difference only the parameter controls.
7. **CALLOUT** (TIP) — "You just watched a single boolean parameter change
   data correctness with zero change in error output either way. This is
   the single strongest argument in this entire course for reading
   parameters, not just topic names."

**Visual requirements:** None new — existing diagrams (working-principle,
pipeline) already cover the concepts; this section's content is the live
system itself.

**Video:** None.

**Exercise:** None at section level — this section is the hands-on work;
Section L carries the assessed challenge.

**Quiz:** None at section level.

---

## Section J — Debugging

**Objective:** Walk two genuinely distinct diagnostic paths — RGB/UVC and
depth/OpenNI2 — rather than one linear ladder, per this device's real
architecture.

**Concepts covered:** The diagnostic ladder, forked at the point where
this device's two driver components genuinely diverge.

**Content block sequence:**
1. **TEXT** — framing: "The RPLIDAR module walked one linear ladder,
   because that device has one data path. This device genuinely has two —
   confirmed by two separate USB identities and two separate driver
   classes (Section H). Debugging it means first figuring out *which*
   path is broken, then walking that path's own ladder."
2. **TEXT** — **shared rungs, before the fork** (both paths depend on
   these):
   - **Connection/Setup:** correct fork, `jazzy` branch (Section G step
     1). *Failure:* cloned `master`. *Signature:* `cv_bridge.h` not found
     at build time.
   - **OS detection:** both USB identities visible. *Command:* `lsusb |
     grep 2bc5`. *Failure:* one line instead of two — cable/hub power
     problem (Module 0), not a driver problem.
   - **rtprio:** granted before first launch. *Failure:* launch fails;
     not traceable to this fork's own source (honestly flagged in Section
     G) — a real-user-confirmed requirement, stated as such.
3. **TEXT** — **Path 1: RGB/UVC — diverges here, with two distinct real
   failures, each with its own exact signature (both confirmed directly
   from `uvc_camera_driver.cpp`):**
   - *Device not found* (UVC device never enumerates, `uvc_find_device`
     exhausts its 100 retries). **Signature — a thrown exception, the
     node visibly crashes:** `"Find device error <reason>"`.
   - *Permission denied* (device enumerates, but the udev rule hasn't
     been applied/reloaded). **Signature:** `"Permission denied opening
     /dev/bus/usb/%03d/%03d"` — note this references the raw USB bus path,
     not `/dev/ttyUSBn` — a genuinely different permission surface than
     the RPLIDAR's serial port.
   - *Distinguishing them:* the first is a crash with a "device not
     found" message; the second is a logged error with the specific word
     "Permission" in it, referencing exact bus/device numbers. Different
     exact text, different root cause — don't guess, read which one you
     actually got.
4. **TEXT** — **Path 2: depth/OpenNI2 — diverges here, with its own
   distinct failure family:**
   - *Semaphore hang* (relaunching after an unclean kill without clearing
     it). **Signature:** silent hang, no error — directly checkable via
     `ls /dev/shm | grep astra` (the semaphore's real name,
     `astra_device_sem`), not just inferred.
   - *`depth_registration` silently defaulting to `false`* while assuming
     an aligned point cloud (Sections D/I). **Signature: no error at
     all** — the point cloud publishes correctly-shaped data that is
     simply not aligned to color. The sharpest, quietest failure this
     entire course has produced — no crash, no log line, just a wrong
     assumption about a default.
5. **TEXT** — **Rungs after the fork, shared again:** node startup
   (`ros2 node list` shows `astra_camera_node`); topics (`ros2 topic
   list` under `/camera/...`); data (`ros2 topic echo`, per-topic);
   visualization (RViz2 — **Fixed Frame must be `camera_link`
   manually**, Section I's Gotcha #3; if data is confirmed good but
   RViz2 shows nothing, this is almost always the cause).
6. **TEXT** — the one artifact that isn't on either live path: the fork's
   own README instructs sourcing `/opt/ros/galactic/setup.bash` throughout
   and describes a stale manual OpenNI2-tarball step this repository no
   longer needs (Section G). Neither is a system failure — both are
   documentation debt a learner following the upstream README directly
   (not this course) would hit.
7. **IMAGE** — troubleshooting flowchart (see Visual requirements).

**Visual requirements:**
- **Purpose:** give the learner a single visual reference for "which path
  am I on" before diagnosing further · **Concept:** shared rungs at top,
  explicit fork into two labeled branches (RGB/UVC; depth/OpenNI2), each
  branch showing its own real failures and exact signatures, rejoining at
  the shared node/topic/data/visualization rungs · **Format:** vertical
  flowchart with a visible branch-and-rejoin shape (not a straight line,
  unlike the RPLIDAR's) — the branch point itself labeled "which USB
  identity/driver component is affected?" · the `depth_registration`
  failure is drawn as a distinct box *without* an error-icon (every other
  box gets a small "⚠ error/hang" marker; this one is marked "✓ no error —
  check the data itself") to visually reinforce that it's categorically
  different from every other failure on the chart · **Status: not yet
  generated** — new SVG, the VISUAL STANDARD's required troubleshooting
  flowchart for this device · **What the learner should understand:**
  this device's failures split into two real families, and one real
  failure produces no error signal at all — the chart's shape itself
  teaches that, not just its labels.

**Video:** None.

**Exercise — DEBUGGING, progressive-hint format (kickoff Stage 5
requirement), built on the RGB-path's two-distinct-errors distinction:**

- **Scenario:** "Both USB identities show in `lsusb | grep 2bc5`. You run
  `ros2 launch astra_camera astra_pro.launch.xml`. The depth image and
  point cloud both work fine in RViz2. But the color image never appears,
  and the terminal shows a repeating error you don't recognize."
- **Hints:**
  1. "Depth is working, so the node itself started and the shared rungs
     (connection, OS detection, rtprio) are all fine. The problem is
     specific to one of the two driver components — which one, given what's
     missing?"
  2. "Look at the exact error text. Does it mention a device not being
     found, or something about permission?"
  3. "If it specifically says 'Permission denied opening /dev/bus/usb/...',
     that's not the same failure as the device never being found at all —
     what does a permission error, specifically, usually mean about a
     step you may have skipped or that didn't take effect?"
- **Solution:** The udev rule for the RGB/UVC identity (`0501`) either
  wasn't applied or wasn't reloaded after being applied — re-run `sudo
  udevadm control --reload-rules && sudo udevadm trigger`, or unplug/
  replug the device so it re-enumerates under the now-active rule.
- **Root cause:** The RGB and depth paths are two independent driver
  components with two independent USB identities (Section H) — one can
  fail while the other works perfectly, and the udev rule installed in
  Section G covers *both* identities in one file, but a rule not yet
  reloaded (versus not yet written) produces exactly this
  "one works, one doesn't, with a permission-specific error" symptom.

**Quiz:** None at section level (module quiz is Section K).

---

## Section K — Quiz

Scenario/diagnostic-weighted per §25, led by the `depth_registration`
finding as its own marquee item, per this stage's explicit instruction.

1. **Marquee scenario, single choice:** "You launch the Astra Pro driver.
   The node starts with no errors, and `/camera/depth_registered/points`
   publishes a real, correctly-shaped point cloud in RViz2 — no crash, no
   warning, nothing in the log. Later, a teammate points out the colors in
   the point cloud don't actually match the 3D shapes they're painted
   onto. What's actually wrong?" → **`depth_registration` defaults to
   `false` — the point cloud topic is named `depth_registered/points`
   because of a topic *remap*, not because hardware/SDK-level color-depth
   alignment is active. It must be explicitly set to `true`.**
   *Explanation: this is the sharpest failure mode either device profile
   has produced — zero error signal, a topic name that implies behavior a
   separate, independently-defaulted parameter doesn't actually deliver
   (Sections D/I).*
2. *Scenario, single choice:* "Both USB identities appear in `lsusb | grep
   2bc5`. The terminal shows `Permission denied opening
   /dev/bus/usb/003/012`. What's the most likely fix?" → **Re-apply/
   reload the udev rule (`sudo udevadm control --reload-rules && sudo
   udevadm trigger`), or unplug and replug the device so it re-enumerates
   under the now-active rule.** *Explanation: the device enumerating in
   `lsusb` and the udev rule actually being active are two different
   things — Section J's own worked example.*
3. **"Spot what's wrong" — short answer**, showing a real product label
   description: "A learner buys a depth camera whose box and printed label
   both read 'Astra Pro Plus.' They follow this module's exact setup
   sequence (the `yosefl20/ros2_astra_camera` fork, `astra_pro.launch.xml`).
   What's wrong with this plan, specifically?" → **Accepted answers:**
   "wrong device/model," "Astra Pro Plus is a different product than
   Astra Pro," "the launch file and driver path in this module target the
   plain Astra Pro, not the Plus model." *Explanation: Section A/B's own
   central disambiguation — the two products share a confusingly similar
   name but different driver support entirely.*
4. *True/False:* "This device runs as two separate ROS 2 nodes — one for
   the RGB camera, one for the depth camera." → **False.** *Explanation:
   one node (`astra_camera_node`), internally composed of two driver
   components (`OBCameraNode`, `UVCCameraDriver`) — Section H's own
   architecture correction, stated precisely rather than simplified.*
5. *Scenario, single choice:* "A previous launch was killed uncleanly.
   The next launch attempt produces no error at all, but also never
   finishes starting. What should you check?" → **Whether a stale
   semaphore is blocking startup — check `ls /dev/shm | grep astra` and
   run `ros2 run astra_camera clean_shm_node` before relaunching.**
   *(Distractor: `ros2 run astra_camera cleanup_shm_node` — the wrong,
   corrected command name; included as a distractor specifically so a
   learner who read an older or unofficial source doesn't carry the typo
   forward.)*
6. *Single choice:* "Real-time priority (`rtprio`) must be granted before
   this device's first launch on stock Ubuntu 24.04. Where in this
   fork's own C++ source is that requirement enforced?" → **It isn't
   traceable to this fork's own source — the requirement comes from the
   closed/vendored OpenNI2 binary, confirmed only by a real user's
   reported run, not by reading a specific line of this repository's own
   code.** *Explanation: an honesty check, not a trick — Section G states
   this limit directly rather than fabricating a plausible-sounding source
   citation, and this item tests whether the learner absorbed that
   distinction.*

**Recap:** The learner has moved from "why is this device legacy, and how
do you evaluate that before buying" through a fully verified setup with
three sequenced gotchas, a live demonstration of the course's sharpest
silent-failure finding, and two genuinely distinct diagnostic paths walked
with real, sourced signatures.

**Connection to Section L:** "Both device modules are complete. Section L
asks you to use this device's own genuine capability — depth at a specific
distance — for something concrete."

---

## Section L — Practical Challenge

**Objective:** Use live depth data to solve an open-ended distance-
detection task, matching the design doc's own example for this device.

**Content block sequence:**
1. **TEXT** — the challenge, matching the design doc directly: *"Detect
   and visualize the distance of an object at different positions, using
   real depth data from this device."*
2. **EXERCISE** (below).

**Exercise — INDEPENDENT:**

- **Goal:** Using the live `/camera/depth/image_raw` topic (or the point
  cloud, learner's choice), report the distance to whatever is directly in
  front of the camera's center, and demonstrate the reported distance
  changing as an object is moved closer and farther, within the device's
  optimal 0.6–5.0 m range.
- **Success criteria:**
  - Correctly subscribes to a depth-bearing topic and extracts a real
    distance value, not a placeholder.
  - Explicitly reasons about the image's center pixel (or an equivalent
    point in the point cloud) rather than an arbitrary one.
  - Demonstrates the value changing live as an object moves, and can
    explain what happens (and why) if the object moves outside the
    0.6–5.0 m optimal range — connecting back to Module 2 Lesson 1's own
    range/optimal-range distinction.
  - If using the point cloud specifically: can state whether
    `depth_registration` was left at its default and, if so, correctly
    predicts that color alignment (not raw distance accuracy) is what
    would be affected by that choice.
- **Hints available:** pointing toward `ros2 interface show
  sensor_msgs/msg/Image` to inspect the depth image's actual encoding
  rather than assuming a format; a reminder that depth images typically
  encode distance in millimeters as 16-bit values, not directly as meters.

**Visual requirements:** None new.

**Video:** None.

**Quiz:** None — assessed via the exercise.

---

## Visual Asset Summary for This Module

| Visual | Status | Notes |
|---|---|---|
| Annotated hardware diagram (Section B) | Not yet generated — new SVG | "Two sensors, one housing," front-view emphasis |
| Working-principle diagram (Section C) | Not yet generated — new SVG | Structured-light pattern distortion, RGB path drawn separately |
| Connection diagram (Section F) | Not yet generated — new SVG | One cable, logical split into two USB identities shown as an inset |
| Data-pipeline diagram (Section H) | **Not yet generated — new SVG, resolved this stage** | Two parallel driver-component chains inside one shared node-process boundary box; `depth_registration: false (default)` labeled directly on the point-cloud arrow |
| Troubleshooting flowchart (Section J) | Not yet generated — new SVG | Branch-and-rejoin shape (RGB/UVC vs. depth/OpenNI2); the `depth_registration` failure marked "no error" instead of the standard error icon |
| Product hero photography | **Not yet captured** | Still the Stage 1 placeholder — unchanged since Stage 3's check; per your note, treat `PHOTOGRAPHY_CHECKLIST.md` execution as a standing parallel task rather than something to re-flag at every future stage |

Five new SVGs specified in full this stage (all of this device's required
VISUAL STANDARD diagrams — it had zero pre-existing assets, unlike the
RPLIDAR's reused pipeline diagram). The data-pipeline diagram is the stage
2 kickoff prompt's explicitly flagged decision, resolved here rather than
deferred.

---

## Video Curation

Same standard as the RPLIDAR module: no URL embedded without being fetched
first to confirm it both resolves *and* matches its description.

**Search terms used:** `"structured light depth camera explained how it
works video"`, `"Orbbec Astra Pro ROS2 tutorial setup video -'Pro Plus'"`,
targeted `site:youtube.com` searches for both the working-principle and
product-specific angles.

**Candidates found and their disposition:**

1. **"How Do Structured-Light 3D Scanners Work?"** (Polyga,
   `youtube.com/watch?v=9mABTDIRksE`) — **existence and title confirmed**
   via oEmbed (a real structured-light scanner manufacturer's channel,
   plausibly more directly on-topic than the RPLIDAR module's rejected
   Hesai candidate). **Not included**, for the identical reason as the
   RPLIDAR module: this tool environment cannot retrieve the actual
   description or transcript, so this course's specific technical framing
   (an IR projector/receiver pair, applied to a robotics depth camera
   specifically, not a handheld product-scanning context) could not be
   confirmed as the video's actual content. Flagged for human verification
   before Stage 7, not included on partial verification.
2. **"Astra Pro Realsense RGBD Depth Camera support 3D mapping navigation
   for ROS Robotics"** (Yahboom Technology,
   `youtube.com/watch?v=k_FgJVcLSuw`) — **explicitly rejected, not
   silently skipped.** A follow-up search confirmed this is a reseller
   marketing/product video (Yahboom is a hardware reseller selling this
   exact device under its own branding), not a technical tutorial: it
   makes a generic "for ROS Robotics" claim with no distro specified —
   not confirmably ROS 2, let alone Jazzy — and its "Realsense" title tag
   is a reseller SEO mislabeling unrelated to Intel RealSense, itself a
   small real signal of low documentation care from the source. Rejected
   on two independent grounds: unconfirmable/likely-wrong distro, and
   reseller-marketing framing rather than technical instruction.
3. Two additional generic "ORBBEC ASTRA Pro Realsense depth camera"
   results — **not pursued further**, same reasoning as candidate 2 (the
   "Realsense" mislabeling pattern recurring across multiple listings from
   this device's reseller ecosystem was itself enough signal to not invest
   further verification effort here).

**Outcome: no video is embedded anywhere in Module 4**, for the same
reasons and to the same standard as Module 5. Section C's working-
principle diagram (new SVG) and the profile's own quoted, source-verified
structured-light explanation carry that section's teaching need without a
citation this stage couldn't fully stand behind.

---

## Note on `PHOTOGRAPHY_CHECKLIST.md`

Per your flag: this checklist has now been correctly labelled as an open
placeholder in Stage 1, Stage 3, and both Stage 5 modules — real, not
theoretical, work still required before either device module is genuinely
launch-ready. This design stage cannot execute it (it requires the
physical units in hand and a human behind the camera), but it should move
onto whatever tracks parallel, non-Claude-Code work for this project — not
be treated as something Stage 7 discovers fresh.

---

Waiting for approval before Stage 6 (quality review of both modules).
