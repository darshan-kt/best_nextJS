# PHASE 6 — PHYSICAL VALIDATION CHECKLIST
## Hands-On Robotics Projects with ROS 2 Jazzy — Turning Design Into Proof

## Purpose and How to Use This Document

This document is **not new design or content.** It is the ordered, concrete list of physical actions a human needs to perform on the actual Jetson + RPLIDAR S3 + D435i rig to move each already-written checkpoint in Phase 5's LMS content from **theoretically designed** to **physically validated**. Nothing here can be executed by continuing to generate content — every item below requires hands on the real robot.

**For each item:** perform the referenced step/command from the named Phase 5 file, record PASS or FAIL, and only mark it complete on PASS.

**A FAIL is not a failure of this checklist — it's exactly the kind of finding Phase 6 exists to surface.** Record it, fix the underlying document (a Phase 4 design assumption or a Phase 5 code/config value), and re-attempt — don't silently patch the robot and move on without updating the written record. The whole point of separating "theoretically designed" from "physically validated" is so a gap between them is visible and traceable, not smoothed over.

**Banner update rule:** once every item in a module or project's checklist has passed, open that document and change its status banner from:

```
> **VALIDATION STATUS: THEORETICALLY DESIGNED, NOT PHYSICALLY VALIDATED.**
```

to:

```
> **VALIDATION STATUS: PHYSICALLY VALIDATED on <date>, <Jetson module /
> JetPack version>. See PHASE 6 — PHYSICAL VALIDATION CHECKLIST.md for
> the specific run this validates.**
```

If only some items pass (e.g., sensors verified but a floor test not yet attempted), write a **partial** banner naming exactly what has and hasn't been confirmed. Never round a partial pass up to a full validation claim — that's precisely the kind of overclaiming the master file's non-negotiable rules prohibit.

---

## Order of Operations

Validation must proceed in this order, since later checklists assume earlier ones already passed:

```
Module 0
   ↓
Project 1
   ↓
Project 2  ⇄  Project 3   (can run in parallel, per Phase 1's own
                            scheduling note — both depend only on
                            Module 0 + Project 1)
   ↓
Project 4  (hard-depends on Project 3's saved map)
```

---

## MODULE 0 CHECKLIST

*(reference: `PHASE 5 — LMS CONTENT — MODULE 0 AND PROJECT 1.md`)*

```
[ ] 1. §5 Steps 1-2 — workspace + environment sanity check.
       PASS = ROS_DISTRO=jazzy, ros2 doctor clean — OR the libzstd
       workaround applied, with YOUR actual conflicting version numbers
       recorded in place of the general pattern in the troubleshooting box.

[ ] 2. RPLIDAR S3 — §6 Steps 4-5, BOTH checkpoints.
       PASS = hardware checkpoint (device node, dialout group) AND ROS
       checkpoint (/scan steady rate, sane ranges) both pass. Record the
       actual serial device path and actual baudrate confirmed against
       the physical unit's datasheet — do not leave the config placeholder.

[ ] 3. D435i — §6 Steps 6-7, in that order.
       PASS = realsense-viewer shows RGB+depth+IMU live BEFORE any ROS
       node runs, THEN /camera/color/image_raw and /camera/imu both
       confirmed live via ROS. If the JetPack 6.0 + Orin Nano USB
       detection risk (flagged in this project's correction from Phase 3)
       applies to your hardware, record how it was resolved.

[ ] 4. Standalone IMU — §6 Step 8.
       PASS = make/model actually identified; the correct branch of
       Phase 3 §3's decision framework (a/b/c/d) actually applied and
       recorded; /imu/data_raw shows real, non-zero, populated fields.
       Update robot_bringup's placeholder driver package/executable
       names with the real ones once known.

[ ] 5. Existing base driver — §6 Step 9, INCLUDING the /cmd_vel watchdog.
       PASS = node confirmed in ros2 node list, /odom confirmed
       publishing, AND the robot stops on its own after killing the
       publisher without a zero-velocity command.
       ⚠ A FAIL here is a stop-ship finding: do NOT proceed to any
       project's floor test until this specific item passes. If it
       fails, the watchdog must be added (either in the base driver
       itself or as a small wrapper node) before continuing.

[ ] 6. robot_description — §7 Step 14.
       PASS = RViz desk-test shows a complete, correctly-positioned TF
       tree using REAL measured mount offsets — replace every
       placeholder xacro property (base dimensions, wheel separation,
       sensor mount x/z) with values you actually measured on the robot.

[ ] 7. robot_bringup integration — §8 Step 19.
       PASS = the full bringup.launch.py runs every sensor
       simultaneously for a sustained 2+ minute run with no crashes or
       silent restarts.

[ ] 8. use_ekf resolution — §9.
       PASS = Configuration A or B actually determined via the real
       tf2_echo test (not assumed), the launch file's default updated
       to match, and the result documented in robot_bringup's README.
```

**Update the Module 0 banner only once all 8 items above pass.**

---

## PROJECT 1 CHECKLIST

*(reference: `PHASE 5 — LMS CONTENT — MODULE 0 AND PROJECT 1.md`, Project 1 section)*

```
[ ] 1. §5 Steps 1-6 (minimal node through observation-only decision
       logic) — confirm each intermediate log line actually matches
       predicted behavior when an object is manually presented, for
       real, at each incremental stage — don't skip straight to the
       finished node.

[ ] 2. §5 Step 7's full node — builds without error; Checkpoints 1-3
       (§9) pass against real sensor data.

[ ] 3. §5 Step 8, wheels lifted — Checkpoint 5.
       PASS = /cmd_vel's sign and magnitude actually match real
       obstacle placement tested on BOTH sides, not just one.

[ ] 4. §5 Step 9 — safety-stop test.
       PASS = physically disconnecting the LiDAR actually produces the
       ERROR log and a zeroed /cmd_vel within scan_timeout_sec.
       ⚠ Do not proceed to Step 10 without this passing, per this
       project's own Lab Safety Check.

[ ] 5. §5 Step 10 — first real floor test, Checkpoint 6.
       Record the actual number of consecutive successful trials
       against the success-criteria target of 3.

[ ] 6. Record the FINAL parameter values actually used after any
       real-world tuning (front_fov_degrees, obstacle_distance, etc.)
       back into obstacle_avoidance.yaml, and note any change from the
       documented defaults in a short dated addendum to this file.
```

**Update Project 1's banner (same file, its own separate banner) once all 6 items pass.**

---

## PROJECT 2 CHECKLIST

*(reference: `PHASE 5 — LMS CONTENT — PROJECT 2.md`)*

```
[ ] 1. Confirm python3-opencv is installed via apt only — record the
       actual output of `python3 -c "import cv2; print(cv2.__version__)"`
       as evidence, per the cv_bridge/OpenCV troubleshooting box at §5
       Step 4.

[ ] 2. Run hsv_calibrator (§5 Step 5) under your ACTUAL current lab
       lighting, for your ACTUAL chosen target object. Record the real
       calibrated hsv_lower/hsv_upper values into
       config/color_tracker.yaml, replacing the placeholder.

[ ] 3. §5 Steps 6-9 (mask preview through lost-target tracking,
       observation-only) — confirm each stage against real camera data,
       not just that the code compiles.

[ ] 4. §5 Step 11, wheels lifted — Checkpoint 5.
       PASS = correctly signed/capped angular.z, correct return-to-
       center within centroid_deadzone_px, and a confirmed STOP (not
       spin) within target_lost_timeout_sec when the object is removed.

[ ] 5. §5 Step 12 — real floor test, Checkpoint 6, in a fully-cleared
       area per this project's escalated Lab Safety Check (§3).
       Record trial count and any oscillation observed; tune
       angular_gain/centroid_deadzone_px against real behavior if needed.

[ ] 6. Treat calibration as session-dependent, not one-time: record
       each re-calibration (triggered by a lighting change) as its own
       dated entry rather than assuming Step 2's result stays valid
       indefinitely.
```

---

## PROJECT 3 CHECKLIST

*(reference: `PHASE 5 — LMS CONTENT — PROJECT 3.md`)*

```
[ ] 1. §5 Step 1 — re-verify odom→base_link is still broadcasting
       exactly as Module 0 left it (confirms no regression since then).

[ ] 2. §5 Step 2 — teleop verified wheels-lifted, correct direction per
       key, before any real driving.

[ ] 3. §5 Steps 3-6 — package built; slam_toolbox launched; a local map
       patch actually appears with the robot stationary.

[ ] 4. §5 Step 7 — THE TF CHECKPOINT (hard gate).
       PASS = tf2_echo map laser_link shows a continuous transform, AND
       view_frames' generated PDF shows one connected tree with no
       orphaned frames. Save this PDF/screenshot as evidence — this is
       exactly the artifact the doc's [PDF/IMAGE: view_frames output]
       placeholder is waiting for.

[ ] 5. §5 Steps 8-9 — a real teleop mapping pass, then the deliberate
       loop-closure test.
       PASS = walls in the overlap region are ACTUALLY single clean
       lines in your captured map, not doubled. Capture the before/
       after screenshots named as pending in §10 of that document.

[ ] 6. §5 Step 10 — a real map_saver_cli run, producing an actual
       <room_name>.yaml/.pgm pair.
       ⚠ If you use a room name other than "lab_room", you MUST also
       update Project 4's navigation.launch.py default map path (§5
       Step 4 of the Project 4 document) to match — this is a real
       cross-document dependency, not a cosmetic naming choice.

[ ] 7. §5 Step 11 — reload the saved map independently and confirm it
       visually matches the live-built one.
```

---

## PROJECT 4 CHECKLIST

*(reference: `PHASE 5 — LMS CONTENT — PROJECT 4 AND COURSE CLOSEOUT.md`)*

```
[ ] 1. Measure the ACTUAL chassis and set robot_radius identically in
       both local_costmap and global_costmap, replacing the 0.18m
       placeholder, BEFORE any goal testing.
       ⚠ An unmeasured footprint invalidates every subsequent
       safety-relevant result in this checklist — do this first.

[ ] 2. Lifecycle checkpoint — confirm ALL SIX nodes (map_server, amcl,
       planner_server, controller_server, behavior_server, bt_navigator)
       report ACTIVE via real `ros2 lifecycle get` output. Record the
       actual terminal output as evidence.

[ ] 3. §5 Step 6 — real initial pose estimate + real observed
       particle-cloud convergence. Record whether it converged on the
       first attempt or required a manual nudge to disambiguate.

[ ] 4. §5 Step 7 — first REAL short goal (0.5-1m). Path visually
       verified in RViz BEFORE physical motion; E-stop person
       positioned per this project's escalated Lab Safety Check (§3).
       PASS = an actual SUCCEEDED result from bt_navigator.

[ ] 5. §5 Step 8 — run the actual Python action-client script against
       the real, running action server. Confirm real feedback messages
       stream and a real terminal result arrives.

[ ] 6. §5 Step 9 — a real obstacle test AND a real, deliberately
       triggered recovery behavior. Record which specific behavior
       fired (spin / back_up / wait).

[ ] 7. §5 Step 10 — a real longer, multi-meter goal — only attempted
       after items 1-6 above have all passed.

[ ] 8. Record the actual arrival tolerance achieved across multiple
       real trials, compared against the ±0.15m / ±10° target from the
       success criteria — note whether controller/goal-checker
       parameters need retuning against real-world results.
```

---

## AFTER ALL FOUR PROJECTS PASS

```
✓ Update each document's banner INDIVIDUALLY — do not add one single
  "everything validated" banner, since each module/project may be
  validated at a different date or session, possibly by different people.

✓ Record the specific Jetson module, JetPack/Ubuntu version, and
  relevant library versions actually running at validation time in
  each updated banner — this is exactly the fact Module 0's environment
  sanity check exists to pin down, and it belongs in the historical
  record once confirmed, not left as "assumed" forever.

✓ Any FAIL discovered during this process that required a design or
  code change must be captured as a dated addendum in the relevant
  Phase 4 or Phase 5 document, not silently edited away with no trace
  — this preserves "theoretically designed vs. physically validated"
  as a real historical record, not just a checkbox that gets ticked.

✓ Only after all four projects show a validated banner should the
  course be described anywhere — a syllabus, marketing copy, a student
  FAQ — as "tested end-to-end on real hardware." Per the master file's
  non-negotiable rules, that claim is earned by completing this
  checklist, not assumed from the quality of the design work that
  preceded it.
```
