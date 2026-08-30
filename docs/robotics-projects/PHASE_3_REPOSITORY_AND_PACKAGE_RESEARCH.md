# PHASE 3 — REPOSITORY AND PACKAGE RESEARCH
## Hands-On Robotics Projects with ROS 2 Jazzy — Dependency Verification

This document is the Phase 3 deliverable required by the master course-design file (`HANDS_ON_ROBOTICS_PROJECTS_COURSE.md`, §35, §13). It verifies every package Phase 2's architecture depends on against current search results (August 2026), not against Phase 1's original assumptions. Where current findings changed or added risk beyond what Phase 1 assumed, that is called out explicitly rather than silently carried forward.

No LMS content, and no Phase 4 detailed project design, is produced here. This is a research-verification gate only.

---

## 1. CONSOLIDATED PACKAGE RESEARCH TABLE

Evaluated per the master file's §13 standard: maintained? Jazzy-compatible? Ubuntu-compatible? documented? reproducible? hardware-compatible?

| Package | Used By | Maintainer / Repo | Jazzy Support — Confirmed How | arm64 / Jetson Caveats | Fallback |
|---|---|---|---|---|---|
| **`rplidar_ros`** | Module 0, all 4 projects | Slamtec, synced to ROS build farm ([index.ros.org/p/rplidar_ros](https://index.ros.org/p/rplidar_ros/)) | Official docs published at `docs.ros.org/en/jazzy/p/rplidar_ros` (currently v2.1.4), explicitly lists A1/A2/A3/S1/S2/**S3**/T1 support and ships `view_rplidar_s3_launch.py` | No S3-specific arm64 issue found. Serial baudrate still differs from A-series per Phase 1 — verify against the physical unit's datasheet at bring-up, not this table. | `sllidar_ros2` (Slamtec's own alternate ROS2 wrapper, [github.com/Slamtec/sllidar_ros2](https://github.com/Slamtec/sllidar_ros2)) — also documents S1/S2/S3 support with its own launch files. Use only if `rplidar_ros` fails to build/run on this unit. |
| **`realsense-ros`** (`ros2-master` branch) | Module 0 (IMU option), Project 2 | `realsenseai/realsense-ros` (formerly IntelRealSense; maintainer org renamed) ([github.com/realsenseai/realsense-ros](https://github.com/realsenseai/realsense-ros)) | Actively maintained repo; current docs at [dev.realsenseai.com/docs/ros2-wrapper](https://dev.realsenseai.com/docs/ros2-wrapper/) | **Caveat found, not previously flagged:** an open GitHub issue ([#3393](https://github.com/IntelRealSense/realsense-ros/issues/3393)) asks specifically about D435i + Jazzy + Ubuntu 24.04 compatibility with no maintainer confirmation visible in the thread. This does not mean it's broken — the package lists Jazzy support generally — but Module 0 should treat first camera bring-up as **unverified until tested on this rig**, not assume it "just works" the way `rplidar_ros`'s more explicit S3 documentation allows. IMU enable flags (`enable_gyro`, `enable_accel`) are confirmed to exist and behave as documented; note from search: if `unite_imu_method` is changed dynamically at runtime, gyro/accel must be re-enabled for the change to take effect — a real gotcha worth a troubleshooting-table row in Module 0. | None needed at the driver level — this is the only actively maintained ROS 2 wrapper for RealSense cameras. If bring-up fails on Jazzy specifically, the documented fallback is running the D435i inside a Humble container/chroot as an interim measure — **not recommended as a course default**, only as an emergency unblock, since it would fracture the "one consistent ROS 2 distro" principle from Phase 1. |
| **`robot_localization`** (`ekf_node`) | Module 0 (`use_ekf:=true` path), Projects 3–4 | `cra-ros-pkg/robot_localization` | Released into Jazzy; ROS index shows releases through at least August 2025, i.e. actively maintained into the Jazzy lifecycle, not a stale one-time sync | No arm64-specific blocker found in search. It's a pure C++ estimation node with no GPU/vendor hardware dependency, so Jetson/arm64 risk is low relative to the driver packages above — flag as **low risk, not zero risk**, and verify with a normal `colcon build` in Module 0 like any other package. | None needed — this is the standard, effectively unopposed ROS 2 package for EKF-based sensor fusion; there is no serious competing alternative to fall back to. |
| **Single-IMU fusion pattern for `robot_localization`** | Projects 3–4 (only if Config B from Phase 2 §3 applies) | — | Confirmed supported directly: the package's own example `params/ekf.yaml` ([github.com/cra-ros-pkg/robot_localization/blob/ros2/params/ekf.yaml](https://github.com/cra-ros-pkg/robot_localization/blob/ros2/params/ekf.yaml)) and Nav2's own setup guide ([docs.nav2.org/setup_guides/odom/setup_robot_localization.html](https://docs.nav2.org/setup_guides/odom/setup_robot_localization.html)) both document the standard one-`odom0` + one-`imu0` fusion pattern — exactly Phase 2's single-IMU case. **This does not resolve which of the two available IMUs feeds it** (per Phase 1/2, that stays an open decision) — it only confirms the package handles a single IMU input cleanly once that decision is made, with no special multi-IMU config required. | — | — |
| **`slam_toolbox`** | Project 3 | `SteveMacenski/slam_toolbox`, official docs at `docs.ros.org/en/ros2_packages/jazzy/api/slam_toolbox` (v2.8.4) | Confirmed released and documented for Jazzy | None found beyond standard build tooling. | None needed — this is the de facto standard 2D SLAM package for ROS 2; no serious alternative needed for a first course pass. |
| **`navigation2`** + **`nav2_bringup`** | Project 4 | `ros-navigation/navigation2` | ROS index lists navigation2 status as **RELEASED**, last updated **2026-06-03** — current and actively maintained, supported distros explicitly include Jazzy (alongside Humble, Kilted, Rolling) | None found beyond standard build tooling. | None needed — Nav2 is the only supported ROS 2 navigation stack; no fallback required. |
| **`vision_opencv`** (meta-package: `cv_bridge` + `image_geometry`) | Project 2 | `ros-perception/vision_opencv` | Actively maintained core ROS perception repo, packaged for Jazzy through the standard build farm | **Confirmed gotcha, matches the prompt's concern:** `cv_bridge` requires OpenCV 3+ and the exact OpenCV build linked at compile time must match the OpenCV version Python's `cv2` module resolves to at runtime — the classic "cv_bridge built against a different OpenCV than what `pip`/`apt` gives Python" failure. **Course-level fix:** always install OpenCV via `apt` (`python3-opencv`, matching the `ros-jazzy-cv-bridge` binary package's own OpenCV dependency), never mix in a `pip install opencv-python` on the same system for this course — document this as a named rule in Module 0 / Project 2 setup, not just a troubleshooting-table afterthought. | If a version mismatch still occurs, rebuilding `vision_opencv` from source against the system OpenCV is the documented recovery path — no alternate bridge package is a reasonable fallback for a beginner-facing course. |
| **`image_transport`** | Project 2 (implicitly, via `realsense-ros` and `cv_bridge`-based nodes) | `ros-perception/image_common` | Core, actively maintained, ships with every ROS 2 distro's perception stack including Jazzy | None found. | None needed. |
| **`teleop_twist_keyboard`** | Module 0 verification, Project 3 (manual mapping drive) | Official ROS package, `docs.ros.org/en/jazzy/p/teleop_twist_keyboard` | Confirmed **MAINTAINED** and **RELEASED**, current version **2.4.1** for Jazzy, listed alongside Humble/Kilted/Lyrical/Rolling | None found — pure Python, no hardware dependency. | None needed. |

---

## 2. NAMED RISK — `libzstd` DEPENDENCY CONFLICT ON UBUNTU 24.04 ARM64

**Status: confirmed still open**, tracked at [ros2/ros2#1789](https://github.com/ros2/ros2/issues/1789) (opened January 2026; no confirmed fix or closure found in the current thread as of this research pass).

**What it is:** on Ubuntu 24.04 arm64 (which includes JetPack 7-based Jetson systems), Ubuntu's own security-update channel (`noble-updates`) can ship a `libzstd1` version (`1.5.5+dfsg2-2build1.1` at time of writing) newer than the exact version the ROS 2 Jazzy binary packages were built and pinned against (`1.5.5+dfsg2-2build1`). This produces an unmet-dependency error the *first time* a student runs `apt install ros-jazzy-ros-base` (or `ros-jazzy-desktop`) on a freshly-updated system — i.e., it can silently block the course's very first command before a student has written a single line of code.

**Why this matters even though the robot is assumed to already have Jazzy installed:** this course's Jetson is the *instructor/primary* rig, but any student following along on their own Jetson Orin (or reinstalling packages during Module 0 troubleshooting) can still hit this. It must be documented as a named Module 0 troubleshooting step, not silently assumed away.

**Workaround pattern to document in Module 0's install/troubleshooting section** (exact version strings must be re-verified against the error message at install time, since Ubuntu's `noble-updates` channel version drifts):

```bash
# 1. Identify the exact conflicting versions from the apt error output
apt-cache policy libzstd1

# 2. Pin the ROS-compatible version explicitly (do not blindly downgrade
#    without checking what version the apt error actually reports)
sudo apt-get install libzstd1=<version-the-ROS-binaries-require>

# 3. Hold that package so a later `apt upgrade` doesn't silently break ROS again
sudo apt-mark hold libzstd1

# 4. Retry the ROS install
sudo apt install ros-jazzy-ros-base
```

This is written as a **pattern**, not a copy-pasteable fixed command, because the exact version numbers are moving targets tied to whatever Ubuntu has most recently pushed to `noble-updates` — Module 0 must tell the student to read their own `apt` error output rather than blindly pasting a version string from this document that may already be stale by the time they run it.

---

## 3. STANDALONE IMU DRIVER — DECISION FRAMEWORK (NOT RESOLVED HERE)

Per the prompt's instruction, no specific package is named — the hardware model is still unidentified (Phase 1/2 open item). Module 0's first lab exercise resolves this using the following decision order, once the physical unit is inspected (label, datasheet, `lsusb`/`dmesg` output when plugged in):

```
IDENTIFY IMU MAKE/MODEL
        ↓
(a) Does an OFFICIAL ROS 2 Jazzy driver package exist for this exact model?
        → e.g. vendor-published package on the ROS build farm / vendor's own GitHub org
        → PREFERRED if it exists and lists Jazzy support
        ↓ (if no)
(b) Does a MAINTAINED COMMUNITY package exist for this model or its sensor family?
        → check: last commit date, open issues about build failures on Jazzy/Ubuntu 24.04,
          whether it's referenced by other current (2025-2026) ROS 2 projects
        → ACCEPTABLE if maintained and Jazzy-buildable (source build via colcon is fine —
          it does not need to be an apt binary release)
        ↓ (if no)
(c) Is the IMU already exposed as a ROS 2 topic by the SAME microcontroller/serial
    link that drives the base controller (i.e., riding along with the existing
    base software rather than needing its own driver at all)?
        → If yes, NO SEPARATE DRIVER PACKAGE IS NEEDED — robot_bringup only needs
          to document the existing topic/frame, matching how Phase 2 already treats
          the base driver itself as existing infrastructure.
        ↓ (if no to all three)
(d) Fallback: write a minimal custom ROS 2 publisher node parsing the IMU's raw
    serial/USB protocol per its datasheet, publishing sensor_msgs/Imu directly —
    this is the only case requiring new course-authored driver code, and should
    be scoped as a small, explicit Module 0 sub-step if it comes to that.
```

This keeps Module 0 unblocked without guessing at hardware that hasn't been confirmed, and keeps `robot_bringup`'s `standalone_imu.yaml`/launch entry (Phase 2 §2.2) a placeholder with a known resolution path rather than an assumption.

---

## 4. EXPLICIT CALL-OUTS — NOTHING FOUND BROKEN, ONE UNVERIFIED, ONE OPEN RISK

Per the prompt's requirement to call out anything broken, deprecated, or unmaintained so it doesn't silently make it into Module 0:

- **Nothing in this dependency set is deprecated or unmaintained.** All eight items checked (rplidar_ros, realsense-ros, robot_localization, slam_toolbox, navigation2/nav2_bringup, vision_opencv/cv_bridge, image_transport, teleop_twist_keyboard) are actively maintained with current Jazzy releases.
- **One item is unverified rather than broken:** `realsense-ros` + D435i + Jazzy + Ubuntu 24.04 specifically — general Jazzy support is documented, but there is an open, unanswered compatibility question in the project's own issue tracker. Module 0 must treat the first camera bring-up as a real verification step (per the master file's "never assume hardware is already working" rule), not a rubber-stamp.
- **One item is a genuine, currently-open install-time risk, not a package problem:** the `libzstd` conflict in §2. It sits at the OS/package-manager layer, not inside any ROS package itself, but it can block installation before any of the packages above are even reached — hence documenting it as a named Module 0 troubleshooting step rather than letting a student hit it cold.

---

## PHASE GATE

This completes the Phase 3 deliverable:

- ✅ Consolidated package research table, organized by which project(s) depend on each package (§1)
- ✅ Re-verification of Phase 1's `rplidar_ros`/`realsense-ros` conclusions against current search results, with the `sllidar_ros2` fallback made explicit (§1)
- ✅ `robot_localization` confirmed for Jazzy/arm64 and confirmed to support the single-IMU fusion pattern Phase 2's architecture requires, without resolving which IMU feeds it (§1)
- ✅ `slam_toolbox`/`navigation2`/`nav2_bringup` confirmed current (§1)
- ✅ `cv_bridge`/`vision_opencv`/`image_transport` Jazzy + OpenCV version-matching gotcha documented as a Module 0 rule, not just a troubleshooting row (§1)
- ✅ `teleop_twist_keyboard` confirmed maintained (§1)
- ✅ `libzstd` arm64 install-blocking risk confirmed still open, with a documented workaround pattern for Module 0 (§2)
- ✅ Standalone IMU driver decision framework produced without naming unconfirmed hardware (§3)
- ✅ Explicit broken/deprecated/unmaintained call-outs (§4)

Per the master file's development workflow, the next step is **Phase 4 — Detailed Project Design**, which should not proceed until this research is reviewed and approved.
