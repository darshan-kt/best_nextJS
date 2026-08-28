# Stage 4 — Orbbec Astra Pro: Deep Technical and Learning Profile

Per `HARDWARE_COURSE_KICKOFF_PROMPTS.md` Stage 4 and PHASE 3 of
`ROBOTICS_HARDWARE_AND_SENSORS_COURSE.md`. Profile only — no lesson content,
no LMS writes. Companion to `STAGE_4_RPLIDAR_A2_PROFILE.md`, same structure.

**Grounding, stated plainly, using the hardened VERIFICATION RULE.**
This profile starts from `docs/hardware/JAZZY_DEVICE_VERIFICATION.md` §2.2a
(Stage 0) and `STAGE_2_PHASE_1_RESEARCH_AND_ARCHITECTURE.md` §6 (Stage 2).
Per the rule hardened after the RPLIDAR profile's own methodology finding,
**every version number, config default, parameter, and source-code string
below was retrieved by fetching the raw file directly (`curl` + grep/read,
never an AI-summarized page fetch) and is marked with its retrieval
method.** AI-summarized fetches were used only for two orientation-level
checks that don't hinge on an exact string: confirming Orbbec's product
page still 404s, and confirming the fork's own (single, empty) GitHub issue
has nothing to add. Physical/optical specifications (range, FOV,
resolution) are carried forward unchanged from Stage 2's own already-cited
source (`astra-wiki.readthedocs.io`) — this stage's new work is the driver
source and ROS 2 integration surface, not a re-run of the general spec
search.

---

## 1. Full Specifications

Unchanged from `STAGE_2_PHASE_1_RESEARCH_AND_ARCHITECTURE.md` §6 (source:
`astra-wiki.readthedocs.io`, checked 2026-08-28) — carried forward, not
re-derived, since this stage's fresh research targets the driver/ROS 2
layer instead.

| Specification | Value | Why it matters |
|---|---|---|
| Depth range | 0.6 m – 8.0 m (optimal 0.6 m – 5.0 m) | Beyond the optimal band, depth noise rises sharply — plan robot behavior around the optimal figure, not the maximum. |
| Depth resolution | VGA (640×480), QVGA (320×240), or QQVGA (160×120), up to 30 FPS | Lower resolution trades detail for bandwidth/CPU cost — relevant when running alongside the RPLIDAR in the capstone. |
| RGB resolution | Up to 1280×960 (lower FPS) or 640×480 @ 30 FPS | The fork's own launch defaults (§4/§5 below) use 640×480 @ 30 FPS MJPEG — the default a learner actually sees, not the sensor's technical ceiling. |
| Field of view | 60° horizontal × 49.5° vertical (73° diagonal) | Fixed cone, directly contrasted against the RPLIDAR's full 360°. |
| Interface | USB 2.0, as **two separate USB identities** from one housing | §5 below grounds this precisely at the source-code level, beyond Stage 0's udev-rule-only confirmation. |
| Dimensions / weight | ~165 × 30 × 40 mm / ~0.3 kg | Relevant for the capstone's physical mounting. |

**Honesty about sourcing, unchanged from Stage 2:** no first-party Orbbec
datasheet for the plain Astra Pro was locatable then, and re-confirmed
still true this stage (§8 below) — Orbbec's own product page for this
exact model still 404s.

---

## 2. Working Principle, at Three Depths

**Intuition.** The Astra Pro is really two devices sharing one plastic
housing: an ordinary color camera, and a separate depth-sensing system that
projects an invisible infrared pattern onto the scene and watches how that
pattern distorts across surfaces at different distances — closer surfaces
warp the pattern differently than far ones, and the device works out depth
from that warping, the same way your two eyes infer depth by comparing
slightly different views.

**Simplified technical.** This is **structured light** depth sensing: an
infrared projector emits a fixed, known dot/pattern grid; an infrared
receiver captures how that pattern lands on the scene; because the
projector-to-receiver geometry is fixed and known, any shift in the
pattern's local spacing reveals the distance to that point (closer objects
shift the pattern more, the same triangulation-family idea as the RPLIDAR's
laser method, but applied across a whole 2D field at once instead of one
scanning point). This entire depth pipeline runs through OpenNI2 — the
IR projector and receiver are a genuinely separate system from the RGB
camera, confirmed precisely in §5 below by two independent USB identities
enumerating under one housing.

**Practical consequence.** Because RGB and depth are two independent
sensing systems, they can be enabled/disabled independently
(`enable_color`, `enable_depth`, `enable_ir` — confirmed launch-file
parameters, §5), and their data only becomes spatially aligned ("registered
point cloud," §5) through explicit processing — it is not automatically
pixel-aligned just because both come from one housing. This is the single
most important practical consequence of the working principle, and directly
explains a real, source-confirmed nuance new to this profile (§5, §6
failure mode 5): the "registered" point cloud topic name does not by itself
guarantee the underlying `depth_registration` setting is on.

---

## 3. Physical Component Inventory

Per `docs/hardware/PHOTOGRAPHY_CHECKLIST.md`'s own shot list and the
optical/USB facts confirmed in §5:

- **RGB lens** — the ordinary color camera's optical window, a UVC device
  in its own right.
- **IR projector** — emits the structured-light pattern; not visible to the
  human eye.
- **IR receiver** — captures the projected pattern's distortion; paired
  with the projector to form the OpenNI2 depth engine.
- **Housing** — a single enclosure for all three optical elements, which is
  exactly why the photography checklist's shot 1 (front view, both lens
  types visible and distinguishable) is the single most important
  disambiguation shot in that list: visually, "one housing" invites the
  "one sensor" misconception this course exists to correct.
- **Captive USB cable and connector** — fixed cable from the housing to a
  single USB connector; despite one physical cable, the device enumerates
  as **two separate USB identities** at the OS level (§5) — worth stating
  explicitly, since the physical cable count (one) does not match the
  logical device count (two).
- **Model/serial label** — must read exactly "Astra Pro," not "Astra Pro
  Plus" — the single most safety-critical label on this device from a
  driver-compatibility standpoint (§8 restates why).

---

## 4. Verified Jazzy Setup Path

**This section matches `JAZZY_DEVICE_VERIFICATION.md` §2.2a, with one
correction this stage found and already applied back to that source
document** (not left as drift between the two — see the note inline).

```bash
# 1. Clone the FORK, and the jazzy BRANCH specifically. The upstream repo's
#    master branch is the unfixed original and will not build.
cd ~/ros2_ws/src
git clone -b jazzy https://github.com/yosefl20/ros2_astra_camera.git

# 2. Native dependencies (libuvc built from source, OpenNI2 support
#    libraries) — confirmed directly from the fork's own README.MD
#    (fetched via curl this session): libgflags-dev, ros-$ROS_DISTRO-
#    image-geometry, ros-$ROS_DISTRO-camera-info-manager, ros-$ROS_DISTRO-
#    image-transport, ros-$ROS_DISTRO-image-publisher, libgoogle-glog-dev,
#    libusb-1.0-0-dev, libeigen3-dev, plus libuvc built from source
#    (git clone + cmake + make install — libuvc has no ROS/apt package).
sudo apt install libgflags-dev ros-jazzy-image-geometry ros-jazzy-camera-info-manager \
  ros-jazzy-image-transport ros-jazzy-image-publisher libgoogle-glog-dev libusb-1.0-0-dev libeigen3-dev
git clone https://github.com/libuvc/libuvc.git
cd libuvc && mkdir build && cd build
cmake .. && make -j4
sudo make install && sudo ldconfig

# 3. ROS 2 dependencies + build. The fork's package.xml correctly declares
#    cv_bridge and image_geometry (§2.2's fix for the reported build
#    failure) — rosdep pulls them from Jazzy's own official release.
cd ~/ros2_ws
rosdep install --from-paths src --ignore-src -y
colcon build --event-handlers console_direct+ --cmake-args -DCMAKE_BUILD_TYPE=Release

# 4. udev rules — many entries in one file, two of which are this device
#    (§5 below): product 0403 (depth/OpenNI2) and product 0501 (RGB/UVC),
#    both vendor 2bc5. Confirmed directly from the fork's own
#    56-orbbec-usb.rules, fetched via curl this session.
cd ~/ros2_ws/src/ros2_astra_camera/astra_camera/scripts
sudo bash install.sh
sudo udevadm control --reload-rules && sudo udevadm trigger

# 5. Confirm both USB identities are visible before launching anything.
#    Expect TWO lines at vendor 2bc5 — product 0403 (depth/OpenNI2) and
#    product 0501 (RGB/UVC). One line means a cable or hub problem, not a
#    driver problem — check that first.
lsusb | grep 2bc5

# 6. Grant real-time priority to your own user BEFORE first launch. Stock
#    Ubuntu 24.04 blocks rtprio for non-root processes by default, and the
#    launch fails without this — confirmed by a real user's run (Stage 0,
#    orbbec/ros2_astra_camera#15). Not visible in this fork's own C++
#    source (§5) — this requirement comes from the underlying OpenNI2/
#    libuvc driver internals, which are closed/vendored binaries, not this
#    fork's own code, so it can't be confirmed the same source-level way
#    as this course's other rtprio-adjacent claims. Stated honestly as a
#    real-user-confirmed fact, not a source-verified one.
echo "$USER    -   rtprio   99" | sudo tee /etc/security/limits.d/99-ros2-rt.conf
# Log out and back in (or reboot) for the limit to take effect.

# 7. If this is not the first launch attempt and a previous one was
#    killed uncleanly, clear the semaphore hang (§6 below) before
#    launching — this is silent and produces no error, only a hang.
#    CORRECTED THIS STAGE: the registered executable is `clean_shm_node`,
#    not `cleanup_shm_node` as originally documented in Stage 0 — confirmed
#    directly from the fork's CMakeLists.txt add_executable()/install()
#    block, fetched raw via curl. Already corrected in
#    JAZZY_DEVICE_VERIFICATION.md §2.2a/§2.4 and
#    STAGE_2_PHASE_1_RESEARCH_AND_ARCHITECTURE.md §9, not left as drift.
ros2 run astra_camera clean_shm_node

# 8. Launch, using the plain Astra Pro's own launch file — not
#    astra_pro_plus.launch.xml, which targets a different, newer product.
ros2 launch astra_camera astra_pro.launch.xml
```

Expected: an `astra_camera_node` under namespace `/camera`, publishing
color, depth, IR and a registered point cloud (§5's parameter defaults). In
RViz2, **Fixed Frame must be set to `camera_link` manually** — confirmed
this stage as the node's actual compiled-in default base frame
(`DEFAULT_BASE_FRAME_ID = "camera_link"` in `constants.h`, fetched via
curl), not just a real user's report — it does not default there in RViz2
because RViz2 has no way to know the node's own default without the
learner setting it, and a learner leaving it on the wrong frame sees
nothing render and no error explaining why.

**One inherited-README inconsistency this stage surfaced, informational
only — does not change the commands above:** the fork's own `README.MD`
(fetched via curl this session) still instructs `source
/opt/ros/galactic/setup.bash` throughout its "Getting Started" section and
links to the Galactic ROS 2 install guide, even on the branch literally
named `jazzy`. The branch name is the only Jazzy-specific signal in the
whole repository — the prose documentation was never updated to match. This
course's own setup sequence (above, matching §2.2a) already sources the
correct distro and doesn't inherit this gap, but it's worth a one-line
Module 4 callout: "if you read this driver's own README instead of this
course, every `source` command in it says `galactic` — that's stale, not a
sign you're on the wrong branch."

**Also confirmed, and worth noting the setup sequence already gets right by
omission:** the README additionally instructs extracting an
`openNISDk_ROS2_xxx.tar.gz` archive into the workspace — but the fork's
repository tree (confirmed via the GitHub API's recursive tree listing)
already vendors the prebuilt OpenNI2 redistributable binaries directly at
`astra_camera/openni2_redist/{arm,arm64,x64}/libOpenNI2.so`, and
`CMakeLists.txt` installs directly from that in-repo path. The manual
tarball step appears to be stale, inherited instruction from before this
vendoring existed — this course's setup sequence correctly has no such
step, and this finding confirms that was the right call, not an oversight.

---

## 5. ROS 2 Integration Surface

**Read directly from `yosefl20/ros2_astra_camera`, `jazzy` branch, fetched
raw via curl this session (2026-08-29)** — `astra_camera/launch/
astra_pro.launch.xml`, `astra_camera/include/astra_camera/constants.h`,
`astra_camera/src/ob_camera_node.cpp`, `astra_camera/src/
uvc_camera_driver.cpp`, `astra_camera/CMakeLists.txt`,
`astra_camera/package.xml`.

**Architecture correction worth stating plainly, not smoothed over:** this
device does **not** run as two separate ROS 2 nodes. It is **one node**
(`astra_camera_node`, package `astra_camera`), under namespace `/camera`
(configurable via `camera_name`), internally composed of two independent
driver components for the two USB identities — an `OBCameraNode` class
handling the OpenNI2 depth/IR path, and a separate `UVCCameraDriver` class
(confirmed as its own source file, `uvc_camera_driver.cpp`) handling the
RGB path. **The dual-stream split is real and load-bearing, but it is a
split of internal driver components and USB identities within one ROS 2
node process, not two separate nodes** — presented below as two distinct
integration surfaces precisely because collapsing them into one
undifferentiated description would hide exactly the distinction this
device exists to teach, even though "two nodes" would overstate the actual
process architecture.

### 5a. Depth/OpenNI2 surface

- **Topics** (pattern confirmed from `ob_camera_node.cpp`'s
  `setupPublishers()`: `<stream_name>/image_raw` and
  `<stream_name>/camera_info` per enabled stream):
  - `/camera/depth/image_raw` (`sensor_msgs/msg/Image`)
  - `/camera/depth/camera_info` (`sensor_msgs/msg/CameraInfo`)
  - `/camera/ir/image_raw` + `/camera/ir/camera_info` (when `enable_ir`,
    default `true`)
  - `/camera/depth_registered/points` (`sensor_msgs/msg/PointCloud2`) —
    confirmed via the launch file's own explicit remap:
    `<camera_name>/depth/color/points` → `<camera_name>/depth_registered/points`,
    active when `enable_point_cloud` (default `true`).
- **A real, source-confirmed nuance new to this profile:** `depth_registration`
  (whether depth is actually aligned to the color frame at the hardware/SDK
  level) **defaults to `false`** in this launch file — even though the
  point-cloud topic is *named* `depth_registered/points` via the remap
  above. The topic name does not by itself confirm registration is active;
  a learner wanting a genuinely pixel-aligned RGB-D point cloud must
  explicitly pass `depth_registration:=true`. This is exactly the kind of
  gap between what a name implies and what a parameter actually does that
  the RPLIDAR profile's own parameter-table finding (node defaults vs.
  launch-file overrides) also surfaced — a real, repeating pattern across
  both devices worth naming as a course-level lesson, not a one-off.
- **QoS:** each stream's image and camera_info QoS is independently
  configurable (`color_qos`, `depth_qos`, `ir_qos`,
  `color_camera_info_qos`, etc. — all default `"default"`, i.e. deferred to
  RMW's own default profile, per `getRMWQosProfileFromString()` in
  `ob_camera_node.cpp`) — a more granular QoS surface than the RPLIDAR's
  single fixed publisher.
- **Frame IDs** (from `constants.h`): base frame `camera_link`; depth frame
  `camera_depth_frame` / optical frame `camera_depth_optical_frame`; IR
  frame `camera_infra1_frame` / optical frame `camera_infra1_optical_frame`.
- **A minor, real naming inconsistency this stage caught while reading
  `constants.h` directly:** every other optical-frame constant follows the
  pattern `camera_<stream>_optical_frame` (`camera_depth_optical_frame`,
  `camera_infra1_optical_frame`, ...) — except color, which is
  `DEFAULT_COLOR_OPTICAL_FRAME_ID = "camera_optical_color_frame"`, with
  "optical" and "color" swapped relative to the pattern. Small, harmless,
  and not worth a lesson of its own, but the same category of finding as
  the RPLIDAR profile's stale comment and the fork README's typo — a third,
  independent instance of "reading the actual source catches things a
  summary wouldn't," worth keeping the pattern visible across both device
  profiles rather than treating each as a one-off curiosity.
- **Semaphore:** the `/dev/shm` hang (Stage 0 §2.4) is guarded by a named
  semaphore, confirmed this stage: `DEFAULT_SEM_NAME = "astra_device_sem"`
  (`constants.h`). A learner can directly verify a hang's cause with
  `ls /dev/shm | grep astra` rather than taking the diagnosis on faith —
  already folded back into `JAZZY_DEVICE_VERIFICATION.md` §2.4.

### 5b. RGB/UVC surface

- **Topics:** `/camera/color/image_raw` (`sensor_msgs/msg/Image`) and
  `/camera/color/camera_info` (`sensor_msgs/msg/CameraInfo`), when
  `enable_color` (default `true`) and `use_uvc_camera` (default `true`)
  are both set — confirmed from the launch file's own parameter block.
- **USB identity:** vendor `0x2bc5`, product `0x0501` (`uvc_vendor_id`/
  `uvc_product_id` launch defaults) — confirmed independently a second way
  this stage, from `56-orbbec-usb.rules`' own `astrauvc` symlink entry for
  product `0501`, matching Stage 0's original two-source corroboration
  exactly.
- **Format:** MJPEG, 640×480 @ 30 FPS (`uvc_camera_format`, `color_width`,
  `color_height`, `color_fps` defaults) — the fork's own runtime default,
  distinct from the sensor's technical ceiling noted in §1.
- **Retry behavior:** `uvc_retry_count` defaults to `100` — the driver
  retries finding the UVC device up to 100 times before giving up,
  confirmed directly in `uvc_camera_driver.cpp`'s `openCamera()` — relevant
  to failure mode 2 below.

---

## 6. Ten Most Likely Failure Modes, with Diagnostic Signatures

Each grounded in a real source fetched raw this session, or in Stage 0's
already-cited real user reports — not invented. Split across both
integration surfaces per §5, per this stage's instruction not to collapse
them.

1. **Cloned `master` instead of `jazzy` branch** (§4 step 1) — the
   upstream, unfixed original. **Diagnostic signature:** build fails with
   `cv_bridge.h`/`pinhole_camera_model.h` not found (Stage 0, real user
   build log, `orbbec/ros2_astra_camera#15`).
2. **RGB/UVC device not found or permission-denied** — `uvc_find_device`
   exhausts its 100 retries (§5b) and throws, or `uvc_open` fails with
   `UVC_ERROR_ACCESS`. **Diagnostic signature — two distinct, exact logged
   strings, confirmed directly in `uvc_camera_driver.cpp`:**
   `"Find device error <reason>"` (thrown as a C++ exception — the node
   will visibly crash, not just log a warning) if the device never
   enumerates; `"Permission denied opening /dev/bus/usb/%03d/%03d"` if it
   enumerates but the udev rule hasn't been applied/reloaded yet. These are
   two different root causes with two different exact messages — a learner
   can tell which one they hit without guessing.
3. **Depth/OpenNI2 path fails to enumerate** — the udev rule's `0403`
   entry not applied, or a cable/hub issue leaving only one of the two USB
   identities visible in `lsusb`. **Diagnostic signature:** `lsusb | grep
   2bc5` shows one line instead of two — the direct, real-hardware
   confirmation this course's own setup sequence (§4 step 5) already
   builds in as a checkpoint before proceeding, not left to be discovered
   later.
4. **`rtprio` not granted before first launch** — stock Ubuntu 24.04 blocks
   real-time priority for non-root users. **Diagnostic signature:** launch
   fails, per Stage 0's real user report; this profile could not locate a
   matching log string in the fork's own C++ source (§4 step 6's honesty
   note) since this behavior lives in the closed/vendored OpenNI2 binary,
   not this fork's own code — stated as a real-user-confirmed fact, not a
   source-line-confirmed one, and flagged as such rather than implying a
   precision this profile doesn't actually have.
5. **RViz2 Fixed Frame left on its own default instead of `camera_link`.**
   **Diagnostic signature:** blank RViz2 display, no error — confirmed this
   stage as a genuine mismatch against the node's own compiled-in base
   frame default (§4/§5a), not just an empirically-observed real-user
   report as Stage 0 originally had it.
6. **Relaunching after an unclean kill without clearing the semaphore.**
   **Diagnostic signature:** silent hang, no error — and, new this stage,
   directly checkable via `ls /dev/shm | grep astra` (the semaphore's real
   name, `astra_device_sem`, §5a) rather than inferred.
7. **`depth_registration` left at its actual default (`false`) while
   assuming the point cloud is pixel-aligned RGB-D**, because the topic is
   named `depth_registered/points`. **Diagnostic signature:** no error at
   all — the point cloud publishes, but color and depth are not truly
   aligned; a subtle, name-implies-behavior mismatch (§5a) rather than a
   crash, and arguably the most instructive "read the parameter, not just
   the topic name" failure mode either device profile has produced.
8. **Wrong launch file for the exact SKU** — `astra_pro_plus.launch.xml`
   against a plain Astra Pro unit, or vice versa. **Diagnostic signature:**
   wrong parameter defaults (different UVC VID:PID, different default
   resolutions) — likely no data, or data on unexpected topic names,
   directly paralleling the RPLIDAR's SKU-mismatch failure mode as a
   cross-device pattern worth naming in Module 5.
9. **Insufficient USB port power under a hub** — this device alone
   presents two simultaneous USB identities drawing power; add the RPLIDAR
   on the same unpowered hub/port (Module 0's own worked example) and the
   combined draw is a real, citable way to exceed a bus power budget.
   **Diagnostic signature:** intermittent enumeration, one of the two
   `lsusb` lines dropping out under load, or a stream stuttering/dropping
   specifically when both devices run together — teaches the same
   "power problems mimic driver problems" lesson Module 0 establishes
   generically, now demonstrated on this exact device.
10. **Following the fork's own README literally** — sourcing
    `/opt/ros/galactic/setup.bash` (§4's inherited-README finding) on a
    Jazzy system, or attempting to extract a separate OpenNI SDK tarball
    that the repository no longer requires (§4's vendoring finding).
    **Diagnostic signature:** either an obviously wrong/missing environment
    (`galactic` not installed) or unnecessary, confusing setup friction —
    neither is a real device or driver failure, both are documentation
    debt a learner following the upstream README directly (not this
    course) would hit and might misattribute to their own environment.

---

## 7. Unique Learning Opportunities

- **"The topic name isn't the whole story"** (failure mode 7) — a uniquely
  strong teaching moment this device offers that the RPLIDAR's simpler,
  single-topic pipeline can't: a correctly-publishing, error-free topic
  whose name implies behavior (`depth_registered/points`) that a separate,
  independently-defaulted parameter (`depth_registration: false`) doesn't
  actually deliver unless set explicitly.
- **Genuine architectural nuance, not oversimplified for teaching purposes:**
  "one node, two internal driver components, two USB identities" is a more
  precise and more interesting fact than "two nodes," and correcting that
  assumption (§5) is itself a good demonstration of reading source instead
  of assuming an architecture from a device's marketing description.
- **A precise, checkable semaphore name** (`astra_device_sem`) turns the
  `/dev/shm` hang from "trust the explanation" into "verify it yourself,"
  the same upgrade the RPLIDAR profile made to the Baud Rate Trap.
- **Two distinct, exact permission/enumeration failure strings** for the
  RGB path (`"Find device error..."` vs. `"Permission denied opening
  /dev/bus/usb/..."`) give Module 5 a genuinely differentiated pair of
  debugging exercises on the same physical symptom family, rather than one
  generic "device not found" scenario.
- **An honest limit, stated as a limit rather than papered over:** the
  `rtprio` requirement (failure mode 4) could not be traced to a specific
  line of this fork's own C++ source, because it lives in a closed/vendored
  binary. Saying so directly — rather than fabricating a plausible-looking
  source citation — is itself consistent with this course's own standard,
  and worth a one-line acknowledgment in Module 4 that not every real
  requirement is traceable to open source, even on an open-source-labeled
  driver.
- **Documentation-debt pattern-matching across both devices:** this
  profile's README-still-says-galactic finding and stale-tarball-step
  finding, set alongside the RPLIDAR profile's stale source comment and
  README typo, give Module 5 four independent, real examples of the same
  underlying lesson — official/community documentation drifts from actual
  behavior, and this course's own habit of checking source directly is
  what catches it, not luck.

---

## 8. Re-Confirmation: Orbbec's Product Page Status

Re-checked this session (2026-08-29) via `https://www.orbbec.com/product-astra-pro/2824/`
— **still returns HTTP 404.** The legacy/LEGACY-support-status determination
from Stage 0/Stage 2 is unchanged. (Direct `curl` to this specific domain
timed out repeatedly in this sandboxed environment — an infrastructure
limitation of this session, not a finding about the page itself — so this
check used a single AI-summarized fetch, appropriate per the hardened rule
since a 404-or-not status check is an orientation check, not an exact
string/value being asserted as course content.)

---

## 9. Does a Data-Pipeline SVG Exist for the Astra Pro?

**No — confirmed by directly checking `public/hardware/`, which contains
exactly one generated diagram (`rplidar-a2-data-pipeline.svg`) and nothing
for this device.** This matches Stage 3's own flag exactly (Module 3,
Lesson 3's visual requirements already noted "Status: not yet generated").

This profile does not generate one — per the kickoff prompt's Stage 4 scope
("no lesson content yet — this is the profile only"), that visual belongs
to Stage 5. What this profile *does* add, as direct input for that future
asset: the RPLIDAR's diagram is a clean six-stage line; this device's
equivalent needs to show **two parallel chains** (depth/OpenNI2 and
RGB/UVC) **converging into one node process** (§5's architecture
correction) — a genuinely different shape, not a relabeled copy of the
RPLIDAR's diagram. Flagged forward for Stage 5, not acted on here.

---

Waiting for approval before Stage 5.
