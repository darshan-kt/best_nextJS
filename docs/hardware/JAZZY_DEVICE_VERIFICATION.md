# Stage 0 — Hardware & Driver Verification: Jazzy / Ubuntu 24.04

**Scope:** RPLIDAR A2 and Orbbec Astra Pro, target platform ROS 2 Jazzy on
Ubuntu 24.04. Investigation only, per the Stage 0 kickoff prompt — no course
content, no schema changes.

**Method, stated plainly.** This session has no physical RPLIDAR A2 or Astra
Pro attached, and no Ubuntu 24.04 / Jazzy machine to build on directly (this
machine runs 22.04 / Humble). Nothing below claims to have been run live. What
follows is desk research against real upstream sources — repo READMEs, source
code, the official `ros/rosdistro` release index, and real user bug reports —
fetched and read during this session, each cited with a commit SHA or URL and
the date checked (2026-08-27). This is the same evidentiary standard the ROS 2
Fundamentals course used throughout (e.g. reading `turtlesim`'s source to
confirm its command-timeout behavior rather than asserting it from memory),
extended here because the kickoff prompt's Verification Rule requires it
explicitly for this course. Anything not confirmable this way is marked
**UNVERIFIED — needs a human with the physical device** rather than guessed.

---

## 1. RPLIDAR A2

### 1.1 The kickoff prompt's starting point needed correcting

The kickoff prompt names `Slamtec/sllidar_ros2` as the package to verify.
Checked directly: that repo's README lists support for `rolling, humble,
galactic, foxy` only — Jazzy is not mentioned — and it has **never been
released through the official ROS build farm for any distribution**. It is
source-only, `colcon build` in your own workspace, for every distro including
the ones it does list.

More importantly, it is not the package a learner following official ROS
install instructions would actually reach. Cross-checking `ros/rosdistro`'s
`jazzy/distribution.yaml` and `humble/distribution.yaml` directly (not
inferred — grepped the raw release manifests) shows the package that resolves
via `apt install ros-jazzy-rplidar-ros` is built from a **different, sibling
repository**: `Slamtec/rplidar_ros`, `ros2` branch. Same manufacturer, same
underlying node, restructured and — critically — actually released.

This is exactly the kind of discrepancy the Verification Rule says to trust
upstream on rather than smooth over. **Recommendation: teach `rplidar_ros`,
not `sllidar_ros2`.** The rest of this section covers `rplidar_ros`.

### 1.2 Jazzy release status — confirmed via rosdistro, not inferred

`jazzy/distribution.yaml` (`ros/rosdistro`, checked 2026-08-27) contains:

```yaml
  rplidar_ros:
    release:
      tags:
        release: release/jazzy/{package}/{version}
      url: https://github.com/ros2-gbp/rplidar_ros-release.git
      version: 2.1.0-4
    source:
      type: git
      url: https://github.com/Slamtec/rplidar_ros.git
      version: ros2
    status: developed
```

This is a real, buildfarm-produced binary release — the strongest available
evidence short of running it, since it means Slamtec's actual `ros2` branch
source already compiled cleanly against Jazzy's `rclcpp` on the official
infrastructure. `sudo apt install ros-jazzy-rplidar-ros` is expected to work
without a source build.

**Known caveat, from the maintainers directly (not speculation):** the
released version (2.1.0-4) is roughly two years behind the `ros2` branch's
current head. [GitHub issue #164](https://github.com/Slamtec/rplidar_ros/issues/164)
has a Slamtec-relayed response, quoted verbatim: *"Indeed there is no newer
release version available for now... it's unlikely to be released before Q1
next year."* This doesn't block A2 support — the A2 has been supported since
early versions — but it means a learner hitting a bug fixed only in the
unreleased head has no `apt upgrade` path, only a source build. Worth one
sentence in the course; not worth blocking on.

**Community alternative, also officially released for Jazzy:**
`rplidar_driver` (`frozenreboot/rplidar_driver`), status `maintained` in the
same `jazzy/distribution.yaml`. Not the primary recommendation — Slamtec's own
repo is the more authoritative source for their own hardware — but worth a
footnote as a live alternative if `rplidar_ros`'s release lag ever becomes a
real problem for a specific learner.

### 1.3 A2-specific verified facts (from source, not the README)

Fetched `Slamtec/rplidar_ros` at commit `24cc9b6` (2025-04-27, `ros2` branch):

- **A2 is explicitly supported**, with three SKU-specific launch pairs:
  `rplidar_a2m7_launch.py`, `rplidar_a2m8_launch.py`, `rplidar_a2m12_launch.py`
  (driver only), and a `view_` variant of each that additionally launches
  RViz2. A learner needs to know which A2 sub-model they have — this is a
  genuine, real beginner trap worth its own callout.
- **Baud rate is model-specific and this matters.** `rplidar_a2m8_launch.py`
  defaults `serial_baudrate` to `115200`. `rplidar_a3_launch.py`, fetched for
  contrast, defaults to `256000` with the source comment `#for A3 is 256000`.
  Wrong baud rate is a classic real symptom: the device shows up in `lsusb`
  and the serial port opens, but scan data is garbled or absent — a natural
  debugging-exercise scenario.
- **Node/package:** package `rplidar_ros`, executable `rplidar_node`.
- **Topic and type**, from `src/rplidar_node.cpp` line 86: parameter
  `topic_name` defaults to `"scan"` (i.e. `/scan`), message type
  `sensor_msgs/msg/LaserScan`.
- **QoS — directly answers the kickoff prompt's ask.** Line 440:
  `create_publisher<sensor_msgs::msg::LaserScan>(topic_name,
  rclcpp::QoS(rclcpp::KeepLast(10)))`. `rclcpp::QoS`'s default reliability is
  **RELIABLE**, not best-effort — unlike some sensor drivers that use
  `SensorDataQoS()` (best-effort), which would silently fail to connect to a
  default-reliable RViz2 subscription. Here, RViz2's default LaserScan display
  should subscribe with **no QoS override needed**. This is a specific,
  falsifiable claim from the driver's own source, not a general assumption
  about "sensor QoS."
  - **UNVERIFIED — needs live hardware:** whether RViz2 actually renders a
    correct-looking scan, since that also depends on `frame_id` and TF being
    set up, which nothing in this static check can confirm.
- **udev rule**, from `scripts/rplidar.rules`: `KERNEL=="ttyUSB*",
  ATTRS{idVendor}=="10c4", ATTRS{idProduct}=="ea60", MODE:="0777",
  SYMLINK+="rplidar"`. Vendor `10c4` / product `ea60` is the Silicon Labs
  CP2102 USB-UART bridge — the standard chip in the RPLIDAR A-series adapter
  cable. `scripts/create_udev_rules.sh` correctly references `colcon_cd
  rplidar_ros` (its own package name).
  - **Contrast worth teaching:** the *other* repo's
    (`sllidar_ros2`) equivalent script still says `colcon_cd rplidar_ros2` —
    the old package name, stale and wrong for the code around it. One more
    small, concrete point in favor of `rplidar_ros` as the cleaner path, and
    a good "read the script before running it as root" teaching moment.

### 1.3a Verified setup sequence (Stage 4/5: lift this directly)

```bash
# 1. Install the officially released Jazzy package — no source build needed.
sudo apt install ros-jazzy-rplidar-ros

# 2. udev rule, so the device gets a stable /dev/rplidar symlink instead of
#    a shifting /dev/ttyUSBn. Do this once, not as a build step.
#    Vendor 10c4 / product ea60 = the CP2102 USB-UART bridge on the A-series
#    adapter cable — confirmed at scripts/rplidar.rules in the package source.
echo 'KERNEL=="ttyUSB*", ATTRS{idVendor}=="10c4", ATTRS{idProduct}=="ea60", MODE:="0777", SYMLINK+="rplidar"' \
  | sudo tee /etc/udev/rules.d/rplidar.rules
sudo udevadm control --reload-rules && sudo udevadm trigger

# 3. Confirm A2 sub-model before launching — this determines which launch
#    file and baud rate are correct. Check the label on the unit itself
#    (A2M7 / A2M8 / A2M12), or use dmesg after plugging in.
dmesg | grep -i "cp210\|ttyUSB"

# 4. Launch with RViz2, using the correct SKU (A2M8 shown; swap a2m8 for
#    a2m7 or a2m12 to match the actual unit):
ros2 launch rplidar_ros view_rplidar_a2m8_launch.py
```

Expected: `/scan` (`sensor_msgs/msg/LaserScan`) publishing at the driver's
scan rate, RViz2 opens with the bundled `rviz/rplidar_ros.rviz` config and
subscribes without any QoS changes (§1.3 confirmed the publisher already
uses RELIABLE, matching RViz2's default). If scan data looks garbled rather
than absent, re-check step 4's launch file against the unit's actual SKU —
§1.3's baud-rate mismatch is the most likely cause.

### 1.4 Confidence rating

**HIGH** that `ros-jazzy-rplidar-ros` installs and the A2 driver builds and
starts. Grounded in an actual Jazzy buildfarm release, not inference. A
beginner following the README's own commands (apt install, one launch
command, correct baud rate for their specific A2 sub-model) should reproduce
this without needing to debug a source build.

**UNVERIFIED, needs a human with the device:** exact `dmesg`/`lsusb` output on
first plug-in, actual `/scan` message field values, RViz2 render quality,
whether the `/dev/rplidar` symlink appears cleanly on Ubuntu 24.04
specifically (udev behavior itself is distro-independent, so this is low
risk, but "low risk" is not "confirmed").

---

## 2. Orbbec Astra Pro

### 2.1 Two candidate drivers exist; only one is officially Jazzy-native, and it doesn't cover this device

Orbbec now maintains two separate, non-overlapping ROS 2 driver lines:

**`orbbec/ros2_astra_camera`** — the repo the kickoff prompt names. Confirmed
via `ros/rosdistro`: **not released for any distro, ever** (no `astra_camera`
or `ros2_astra_camera` entry in `humble/distribution.yaml` or
`jazzy/distribution.yaml` — checked directly, not inferred). Source-only. Its
`master` branch's actual last commit is **2023-11-08**
(`f7e71d9`) — the repo-level "last push" timestamp is more recent because of
activity on other branches/tags, but the driver code itself hasn't moved
since then. This matches the kickoff prompt's "low activity since ~2023"
characterization exactly.

**`orbbec/OrbbecSDK_ROS2`** — Orbbec's current, actively developed driver
(`v2-main` branch, last commit **2026-08-07** — three weeks before this check,
genuinely active). Officially released for Jazzy: `jazzy/distribution.yaml`
has an `orbbec_camera_v2` entry built from this repo, status `developed`. Its
README carries explicit Foxy/Humble/Jazzy and Ubuntu 20.04/22.04/24.04
support badges, and states in prose: *"It supports ROS2 **Foxy**, **Humble**,
and **Jazzy** distributions."*

**The catch, and it's the whole story for this device:** `OrbbecSDK_ROS2`'s
own supported-device table (fetched directly, not summarized) lists **Astra
2, Astra+, Astra Pro Plus, Astra Mini Pro, Astra Mini S Pro** — plain
**"Astra Pro" is not in it.** "Astra Pro Plus" is a different, newer product;
the name similarity is a real trap for a learner searching Orbbec's own docs
and landing on the wrong table. **The modern, actively-maintained,
official-Jazzy-release driver does not support the device this course is
built around.** The Astra Pro is genuinely stuck on the legacy path — this
confirms the kickoff prompt's premise rather than contradicting it, but now
with a citable reason: it's not that Orbbec abandoned Jazzy support in
general, it's that they moved to a newer sensor generation and the original
Astra Pro's OpenNI2-era hardware isn't part of it.

### 2.2 The legacy path fails to build on Jazzy exactly as expected — with a real, working community fix

Searched `orbbec/ros2_astra_camera`'s issues for `jazzy` and `24.04`. Found a
real user's build log on real hardware
([issue #15](https://github.com/orbbec/ros2_astra_camera/issues/15), comment
dated 2025-02-17, translated from the original): building on **Ubuntu 24.04 +
ROS 2 Jazzy** fails with:

```
fatal error: cv_bridge/cv_bridge.h: No such file or directory
fatal error: image_geometry/pinhole_camera_model.h: No such file or directory
```

Checked `jazzy/distribution.yaml`: `cv_bridge` and `image_geometry` (part of
`vision_opencv`) **are** released for Jazzy (`4.1.0-1`, status `developed`) —
so this isn't a genuine unavailability, it's a dependency-declaration gap
between what the driver's `package.xml` lists and what its build actually
needs, the kind of thing `rosdep install --from-paths src --ignore-src -y`
either papers over or doesn't depending on whether the packages are declared.

**A working fix exists, independently confirmed by multiple real users on
real hardware, not just claimed:** a community fork,
[`yosefl20/ros2_astra_camera`](https://github.com/yosefl20/ros2_astra_camera),
branch `jazzy` (head commit `d92408f`, 2025-03-20). In the same issue thread,
a second user (`AndreasKunar`, 2025-07-05) confirms running it successfully on
a real Raspberry Pi 5, Ubuntu 24.04, ROS 2 Jazzy, and posts specific real
gotchas from that actual run:

- Use branch `jazzy`, not `master` (`master` is the unfixed original).
- Real-time priority (`rtprio`) is blocked for non-root users by default on a
  stock 24.04 install, which breaks the launch until a
  `/etc/security/limits.d/` entry grants it.
- In RViz2, "Fixed Frame" must be set to `camera_link` manually.

Independently, a second, unrelated contributor opened
[PR #20](https://github.com/orbbec/ros2_astra_camera/pull/20) — "fix
compatibility with ROS2 Jazzy and Kilted" — directly against the official
repo, still unmerged. Two independent people arriving at compatible fixes is
stronger evidence than one, though neither is upstream yet.

**Confirmed this fork actually targets the right device**, not just Astra Pro
Plus: its `astra_camera/launch/` directory (fetched, `jazzy` branch) contains
`astra_pro.launch.xml` by name, distinct from `astro_pro_plus.launch.xml`.
Its `package.xml` correctly declares `cv_bridge` and `image_geometry` as
`<depend>`s — which is very likely the actual fix for the build error above,
though that's an inference from reading the manifest, not a diff I traced
line-by-line against upstream.

**Honesty about this fork's weight:** 3 stars, 2 forks, single maintainer,
last commit March 2025. This is not "officially maintained" by any
reasonable definition. The confidence here comes from the issue thread's real
user reports of it working on real hardware, not from the fork's popularity.

### 2.2a Verified setup sequence (Stage 4/5: lift this directly)

This is not a troubleshooting appendix — every step below is required for a
first-time success on Jazzy/24.04, sourced from the two real users in
[issue #15](https://github.com/orbbec/ros2_astra_camera/issues/15) who
actually ran it (`yosefl20`'s fork itself; `AndreasKunar`'s confirmation
comment, 2025-07-05). Treat steps 1, 4, and 6 as mandatory, not optional
hardening — skipping any one of them reproduces a real failure mode a real
user hit, not a hypothetical one.

```bash
# 1. Clone the FORK, and the jazzy BRANCH specifically. The upstream repo's
#    master branch is the unfixed original from §2.2 and will not build.
cd ~/ros2_ws/src
git clone -b jazzy https://github.com/yosefl20/ros2_astra_camera.git

# 2. Native dependencies the upstream README documents (libuvc built from
#    source, OpenNI2) — unchanged by the fork, still required.
sudo apt install libgflags-dev libusb-1.0-0-dev libeigen3-dev libgoogle-glog-dev

# 3. ROS 2 dependencies. The fork's package.xml correctly declares
#    cv_bridge and image_geometry (§2.2's fix for the reported build
#    failure) — rosdep pulls them from Jazzy's own official release,
#    confirmed present in jazzy/distribution.yaml (vision_opencv 4.1.0-1).
cd ~/ros2_ws
rosdep install --from-paths src --ignore-src -y
colcon build --event-handlers console_direct+ --cmake-args -DCMAKE_BUILD_TYPE=Release

# 4. udev rules — two separate USB identities for one physical device
#    (§2.3). Both entries are required; the depth engine and the RGB
#    camera enumerate independently.
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
#    launch fails without this — confirmed by AndreasKunar's real run.
echo "$USER    -   rtprio   99" | sudo tee /etc/security/limits.d/99-ros2-rt.conf
# Log out and back in (or reboot) for the limit to take effect.

# 7. If this is not the first launch attempt and a previous one was
#    killed uncleanly, clear the semaphore hang (§2.4) before launching —
#    this is silent and produces no error, only a hang.
ros2 run astra_camera cleanup_shm_node

# 8. Launch, using the plain Astra Pro's own launch file — not
#    astro_pro_plus.launch.xml, which targets a different, newer product.
ros2 launch astra_camera astra_pro.launch.xml
```

Expected: an `astra_camera_node` under namespace `/camera`, publishing color,
depth, IR and a registered point cloud per §2.3's parameter defaults. In
RViz2, "Fixed Frame" must be set to `camera_link` manually — it does not
default there, and a learner leaving it on the wrong frame will see nothing
render and no error explaining why (§AndreasKunar's confirmed real gotcha).

### 2.3 The UVC/RGB vs OpenNI2/depth split — confirmed with exact device IDs

Central to how this device must be taught (per the kickoff prompt). Confirmed
from two independent, converging sources:

1. `orbbec/ros2_astra_camera`'s udev rules file,
   `astra_camera/scripts/56-orbbec-usb.rules` (master branch): the Astra Pro
   enumerates as **two separate USB devices**, both vendor `2bc5` (Orbbec):
   - `idProduct=="0403"` → symlinked `astra_pro` — the OpenNI2 depth/IR engine.
   - `idProduct=="0501"` → symlinked `astrauvc` — the UVC RGB camera, shared
     with several other Orbbec models that reuse the same RGB module.
2. The `yosefl20` fork's `astra_pro.launch.xml` independently hard-codes
   `uvc_vendor_id` default `0x2bc5` and `uvc_product_id` default `0x0501` —
   the exact same numbers, from a completely different file. Two sources
   agreeing on the same VID:PID pair is real corroboration, not a repeated
   assumption.

One physical device, two USB identities, one OpenNI2-based ROS node
(`astra_camera_node`, package `astra_camera`) that talks to both — `lsusb`
after plugging in an Astra Pro should show two distinct entries at vendor
`2bc5`, and a learner expecting one is exactly the misconception this course
needs to preempt on sight.

Also confirmed from `astra_pro.launch.xml`: `enable_color`, `enable_depth`,
and `enable_ir` are independent toggles (all default `true`); default color
format is MJPEG at 640×480@30fps; the node republishes a registered point
cloud on `<camera_name>/depth_registered/points` when `enable_point_cloud` is
set.

### 2.4 The `/dev/shm` semaphore hang — confirmed, with the exact mitigation command

Confirmed directly in the original repo's documentation (not the fork,
since this is inherited, un-fixed behavior): if the camera process is killed
uncleanly, a semaphore file is left in `/dev/shm`, and the next launch hangs.
Mitigation, run before launching: `ros2 run astra_camera cleanup_shm_node`.
This is real, upstream-documented behavior, worth its own debugging-exercise
scenario rather than a footnote — it produces exactly the "everything looks
fine, nothing errors, it just hangs" symptom this course's own established
debugging-exercise format (from the ROS 2 course) is built to teach.

### 2.5 Recommended path

Ordered per the kickoff prompt's fallback priority:

1. **(a) Patch the build — recommended.** Use `yosefl20/ros2_astra_camera`,
   branch `jazzy`, targeting the plain Astra Pro via `astra_pro.launch.xml`.
   §2.2a is the full setup sequence — branch name, `rtprio` limit, and the
   RViz2 fixed-frame setting are steps 1, 6, and the expected-result note
   there, not buried troubleshooting. Stage 4/5 should lift §2.2a directly
   rather than re-deriving it.
2. **(b) Humble container bridging DDS to the Jazzy host** — not needed as
   the primary path given (a) has real, working evidence behind it, but worth
   keeping in reserve and mentioning briefly: if a learner's specific Astra
   Pro unit or kernel combination hits something the fork doesn't cover, this
   is the documented fallback, and the kickoff prompt is right that it
   becomes a legitimate teaching topic in its own right (DDS working across a
   distro boundary) rather than pure workaround noise.
3. **(c) Other community forks** — not pursued; (a) already has independent
   multi-user confirmation on real hardware, which is stronger evidence than
   anything else found.

**Do not substitute a different camera model.** Confirmed the Astra Pro
remains a real, distinct, named product in Orbbec's own current
documentation (it appears by name in `OrbbecSDK_ROS2`'s device table as
explicitly *out of scope* for that SDK, which is different from not existing)
— the kickoff prompt's instruction not to silently swap devices is upheld.

### 2.6 Confidence rating

**MEDIUM.** Every individual claim above is traced to a real upstream source
with a citation, and the Jazzy build failure plus its fix are corroborated by
independent real users on real hardware, not just a fork existing. What keeps
this at MEDIUM rather than HIGH: the fork is small (single maintainer, 3
stars) and unmerged upstream, so there's real risk it silently stops tracking
Jazzy point-releases; and nothing here confirms actual depth-image quality,
point cloud accuracy, or whether every one of the driver's parameters behaves
as documented — only that it builds and that named users report it running.
A beginner following the fork's README plus the three gotchas in §2.2 has a
real, reproducible path, but it's meaningfully more fragile than the RPLIDAR
path.

---

## 3. Summary table

| | RPLIDAR A2 | Orbbec Astra Pro |
|---|---|---|
| Recommended package | `rplidar_ros` (`Slamtec/rplidar_ros`, `ros2` branch) — **not** `sllidar_ros2` | `ros2_astra_camera`, fork `yosefl20/ros2_astra_camera`, branch `jazzy` |
| Jazzy install path | `apt install ros-jazzy-rplidar-ros` (official release) | Source build from the fork; not on any buildfarm |
| Confidence | HIGH | MEDIUM |
| Primary teaching hook | SKU-specific launch files + baud rate mismatch as a debugging exercise | Legacy status, dual-USB-identity split, `/dev/shm` hang as a debugging exercise |
| Fallback if primary path fails | `rplidar_driver` (`frozenreboot/rplidar_driver`), also Jazzy-released | Humble container bridging DDS to the Jazzy host |

---

## 4. Sources cited (all fetched 2026-08-27)

- `Slamtec/sllidar_ros2`, `main` branch, commit `3430009` — README, source, udev script.
- `Slamtec/rplidar_ros`, `ros2` branch, commit `24cc9b6` — README, `src/rplidar_node.cpp`, launch files, udev script.
- `ros/rosdistro`, `jazzy/distribution.yaml` and `humble/distribution.yaml` (raw, `master` branch) — release status for `rplidar_ros`, `rplidar_driver`, `astra_camera`/`ros2_astra_camera`, `orbbec_camera_v2`, `vision_opencv`.
- [Slamtec/rplidar_ros#164](https://github.com/Slamtec/rplidar_ros/issues/164) — release-lag discussion, Slamtec maintainer response quoted.
- `orbbec/ros2_astra_camera`, `master` branch, commit `f7e71d9` (2023-11-08) — README, udev rules, `/dev/shm` documentation.
- `orbbec/OrbbecSDK_ROS2`, `v2-main` branch, commit `8e7cad2` — README, supported-device table, distro support badges.
- [orbbec/ros2_astra_camera#15](https://github.com/orbbec/ros2_astra_camera/issues/15) — real Jazzy/24.04 build failure and fix, multiple independent users.
- [orbbec/ros2_astra_camera#20](https://github.com/orbbec/ros2_astra_camera/pull/20) — independent unmerged Jazzy/Kilted fix.
- `yosefl20/ros2_astra_camera`, `jazzy` branch, commit `d92408f` (2025-03-20) — launch files, `package.xml`.

## 5. What Stage 2 (device research profiles) still needs to fetch fresh

This document answers Stage 0's build/run question. It deliberately does not
cover, and Stage 2 should fetch independently rather than assume from here:
full technical specifications with tolerances, Orbbec's and Slamtec's own
product/datasheet pages, pricing, physical dimensions, and power draw — none
of that was needed to answer "does it build on Jazzy," and none of it should
be treated as verified by this document.
