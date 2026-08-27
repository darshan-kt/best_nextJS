# ROS 2 Fundamentals — open items register

One place for everything deliberately left open, so nothing is silently
forgotten or assumed to be working. Items are removed only when closed, and
closing one means saying where and how.

Last reviewed: **2026-08-27**

---

## 1. Path C verification is BUILT BUT PAUSED — it has never run

**Status: paused, not running, never executed once.**

`.github/workflows/ros2-terminal-verification.yml` performs the real ROS 2
Jazzy install on a pinned `ubuntu-24.04` runner and diffs captured terminal
output against the fixtures in
`src/features/courses/content/ros2/terminal-fixtures.ts`, which `prisma/seed.ts`
renders from.

The `schedule:` trigger is **commented out** as of 2026-08-27. Dispatching the
first run is blocked pending CI credential/env configuration, and letting the
schedule fire unattended would produce a red Monday morning nobody triages —
for a job whose first run was explicitly expected to need adjustment.

`workflow_dispatch` remains enabled on purpose. It cannot fire by itself, so it
creates no unattended runs; it is the button for the supervised first run.

**Do not treat any terminal output in Modules 3 or 4 as verified.** It is
authored from the official Jazzy documentation, not captured. The captions
added by path D say as much to the learner, but that is mitigation, not
verification.

**To close:** dispatch once by hand, read the captured-output artifact
(uploaded on every run, pass or fail), fix whatever it surfaces, then uncomment
`schedule:`. Expected failure signatures are recorded in §1a below.

### 1a. Anticipated first-run failure signatures

| What goes red | What it means | Fix belongs in |
|---|---|---|
| `m4-l3-node-list` | `turtle_teleop_key` did not register as `/teleop_turtle` under the pty | the fixture, **not** the content |
| `ros2 --help` shape, re `options:` | Settles whether Jazzy's argparse prints `options:` (inferred from Ubuntu 24.04 shipping Python 3.12) or the pre-3.10 `optional arguments:` | the content, if the inference was wrong |
| Install step, at the signing key | The pinned-key staleness risk landed; ROS has moved to the `ros2-apt-source` `.deb` | Module 3 Lesson 2 content |
| Everything ROS-dependent at once | The install or Xvfb never came up | the workflow, read the step log not the diff |

---

## 2. Module 4's CODE blocks are not wired to their fixtures

Module 3's three scripts (`install-ros2-jazzy.sh`, `before-and-after.sh`,
`fix-locale.sh`) are imported into `prisma/seed.ts` from the fixtures module, so
CI diffs exactly what learners read.

Module 4's CODE blocks are **not**. They interleave commands, teaching comments
and output in a single artifact, so no pure substitution exists without
restructuring them. The Module 4 fixtures still run against a real machine — but
there is no compile-time link proving the lesson text and the fixture agree, so
they can drift apart silently.

**To close:** restructure Module 4's CODE blocks to compose from
`terminalOutput(id)` the way `ROS2_BEFORE_AND_AFTER_TRANSCRIPT` does, or accept
the drift risk explicitly and write it down here as accepted.

---

## 3. The WSL2 / VM display branch has no automated coverage

Module 4 Lesson 1 owns the display-failure branch inherited from Module 3
Lesson 1's own warning — the graphics-passthrough failure a learner on WSL2 or
a virtual machine hits the first time a ROS 2 program opens a window.

Path C cannot reach it. A GitHub runner under Xvfb is neither WSL2 nor a VM
with guest additions, so the branch this course's most at-risk learners will
actually hit is the one branch CI structurally cannot test.

**To close:** only a manual pass on a real WSL2 install and a real VM does this
(option B from the verification discussion). Nothing automated will.

---

## 4. Pinned signing-key staleness (Module 3, Lesson 2)

Module 3 hands the learner a fixed key URL and apt source line. ROS's official
instructions have since moved to a `ros2-apt-source` `.deb`. The taught path
still works and is deliberately kept — but it is the single thing in this
course most likely to break first, and it breaks silently for the learner.

Path C was the intended monitor for exactly this. **Path C is paused, so this
is currently unmonitored** — see §1.

---

## 5. Module 10 must pick up the standalone-script thread from Module 5

Module 5 Lesson 3 has the learner write their first node as a plain Python
script run with `python3` — no workspace, no package, no `colcon` — because
packaging is Module 10 and pulling it forward would teach nodes while the
learner debugs build configuration. See `module-5-design.md`, Flag 1.

That decision hands Module 10 a specific opening: *you have a loose script in
your home directory; here is why that doesn't survive a second machine or a
second developer.* If Module 10 is designed without knowing this, it will
introduce packaging as an unexplained ritual and the setup will be wasted.

**Implemented 2026-08-27.** The thread now exists in shipped content, not just
in a design document. Module 10's design pass should read, in order:

- `module-5-design.md`, **Flag 1** — the reasoning, and the trade-off accepted
- `prisma/seed.ts`, lesson slug **`writing-your-first-node`**, first block —
  the learner has already been told *"Module 10 will explain why that stops
  being good enough"*, so that promise is outstanding and load-bearing
- `public/courses/ros2-fundamentals/module-5-first-node.py` — the actual file
  the learner is left holding, whose docstring says it is deliberately not a
  package and must be run with `python3`, not `ros2 run`. This is the concrete
  artefact Module 10 should convert into a package.

**To close:** Module 10's design opens from that script — "you have a loose
file in your home directory; here is why that does not survive a second machine
or a second developer" — rather than introducing packaging as an unexplained
ritual.

**Strengthened by Module 6 (designed 2026-08-27).** Module 6 adds a second and
a third standalone script — `module-6-turtle-driver.py` and
`module-6-turtle-loop.py` — which must be started in the right combination, in
separate terminals, alongside turtlesim. Module 6 Lesson 5's debugging exercise
is *caused* by starting the wrong combination. The loose-script problem is
therefore no longer hypothetical by the time Module 10 arrives, and the same
lived experience is the motivation Module 11 (launch files) needs. Both design
passes should read `module-6-design.md`'s "Continuation" section.

---

## 6. Module 6's one video candidate is review-gated and unwatched

`module-6-design.md`'s research record carries one candidate that was neither
accepted nor rejected: **"ROS2 Publisher subscriber and DDS pipeline"**,
EraBotLabs, `https://www.youtube.com/watch?v=nKxdOQOYIKk`, verified at 242s
(4m02s), published 2024-05-10.

Length and scope are right and the pub/sub model is distribution-independent,
so the pre-Jazzy date is not disqualifying. What cannot be checked from
metadata is §15's teaching-quality and production-quality criteria — and the
title foregrounds "DDS pipeline" while Module 2 told the learner in as many
words that this course would not go deeper on DDS than one paragraph.

**To close:** a human watches all four minutes and decides two things — (a) is
the teaching and production quality good enough for this course, and (b) is DDS
named rather than walked through, leaving Module 2's declared ceiling intact.
If both hold, it embeds in Module 6 Lesson 1 after block 4. If either fails,
Module 6 ships without video, which is what Lesson 1 is designed for.

Worth noting either way: this would be **two consecutive modules with no
video** (Module 5 rejected all three of its candidates). That is a signal about
the material available at this altitude, not evidence that §14 is wrong — but a
third in a row would be worth treating as a strategy question rather than three
independent decisions.

---

## 7. QoS is not owned by any module in the curriculum

`module-6-design.md`, Flag 5. Module 6 Lesson 3 is the first place a learner
meets a QoS setting: the `10` in
`self.create_publisher(Twist, '/turtle1/cmd_vel', 10)` is a queue depth. Module
6 handles that responsibly — one sentence on what the number does, one CALLOUT
naming QoS as the family it belongs to and saying it does not matter here — so
nothing in this module is misleading.

The gap is the curriculum's, not Module 6's. Searching §9 of
`ROS2_COURSE_DESIGN.md`: QoS is not in Module 2 (explicitly excluded by the
depth ceiling recorded in `module-2-dds-depth-decision.md`), not in Module 9
(Parameters, Messages, and Interfaces), not in Module 12 (Lifecycle Nodes), and
not anywhere else. **No module teaches it.**

That matters because QoS incompatibility is one of the most common real
failures in production ROS 2: a subscriber that receives nothing from a
correctly-named, correctly-typed, actively-publishing topic. A learner who
finishes this course cannot diagnose it, and — worse — has been trained by
Module 6 Lesson 4 to conclude that name and type matching is sufficient, which
is true for everything they will meet in this course and not true in general.

**To close:** assign it. Module 9 is the most natural home (it already owns
messages and interfaces, and QoS is the other half of "what governs whether two
endpoints connect"), but Module 13 (RQt and development tools) is defensible if
it is framed as a diagnostic subject. Whichever module takes it should also
revisit Module 6 Lesson 2's contract diagram, which currently draws name and
type as the complete matching condition.

---

## Closed items, for reference

- **`demo_nodes_cpp` vs. an early Turtlesim peek** — closed 2026-08-27 in
  `module-4-design.md` ("Re-litigating the reveal"). Decision upheld; the cost
  was transferred to Module 4 Lesson 1's display branch, which is §3 above.
- **Troubleshooting-tree exhaustiveness** — closed 2026-08-27 in
  `module-3-design.md`'s addendum. A fifth branch (locale/UTF-8) was added.
- **Module 4 video duration** — closed 2026-08-27. `k3NHSOq64xc` verified at
  PT20M18S and **dropped** for violating §14; no chapters, so clip bounds would
  have meant publishing a guess.
