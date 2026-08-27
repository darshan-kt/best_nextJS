# ROS 2 Fundamentals — Phase 5: Module 3 Design

**"ROS 2 Installation and Environment Setup"**

One structural note before the lessons: the EXERCISE block type was described in Stage 4's own template as "Turtlesim-based." This module can't honor that literally — Turtlesim doesn't exist until Module 4, and this module's whole job is getting to the point where it *could*. Every exercise below is real hands-on work against the learner's actual machine and actual ROS 2 install instead — still "on your own machine, not a simulator" per the locked-in decision, just not Turtlesim specifically yet. Flagging this once here rather than re-justifying it per lesson.

**Checkpoint mapping, flagged up front as asked:** all three checkpoints live together in Lesson 4, not one-per-lesson. This isn't a forced fit — it's the natural shape of the content: "can `ros2` run" → "can it find packages" → "can a node run" is a cumulative ladder where each check presupposes the previous one passed. Splitting them across lessons would break that logic (you can't meaningfully test "can a node run" before "can ROS 2 run" is already true). Lessons 1–3 build toward the ladder; Lesson 4 climbs it.

---

## Lesson 1 — Choosing Your Setup

**Objective:** Decide how to run Ubuntu 24.04 for this course (native, dual-boot, VM, or WSL2) based on real trade-offs, and reconfirm the Jazzy version pin before touching any installation.

**Concepts covered:** supported operating systems; Ubuntu 24.04 as a hard requirement for this install path; native/dual-boot/VM/WSL2 trade-offs; distribution selection.

**Content block sequence:**
1. **TEXT** — bridge from Module 2: "You know what ROS 2 is built from. Now you'll put it on your machine — starting with deciding *how*."
2. **TEXT** — the four options, honestly: native (best performance and Gazebo compatibility, but claims a machine or a partition), dual-boot (native performance, keeps your other OS, more setup friction), VM (safest to undo, some performance/GPU-passthrough cost), WSL2 (convenient if already on Windows, but graphics support has real caveats)
3. **CALLOUT** (WARNING) — "If you'll run Gazebo in a VM or WSL2 (Module 14), GPU/graphics passthrough is the single most common source of pain in those setups — not now, but worth knowing before you commit."
4. **TEXT** — reconfirm the pin: "This course targets Jazzy Jalisco specifically, which requires Ubuntu 24.04 — no other Ubuntu version installs it via the method this course teaches. If you're on a different version, that's the first thing to fix, before anything ROS 2-related."
5. **CALLOUT** (INFO) — cross-reference: "This is the same Jazzy/24.04 pin from Module 0's Environment Checklist and Module 1's version note — nothing new here, just time to act on it."
6. **TEXT** — bridge to Lesson 2

**Visual requirements:**
- **Purpose:** support a deliberate setup choice · **Concept:** native/dual-boot/VM/WSL2 trade-offs · **Format:** a 4-column comparison table rating each option on performance, setup ease, "easy to undo," and Gazebo/GPU readiness · **What should be shown:** the four options scored across those four criteria · **What the learner should understand:** there's no universal "best" — it's a real trade-off matched to their situation.

**Video requirements:** None. The right setup is host-environment-specific (VM software, WSL2 config); any single video covers at most one of four paths, so the comparison diagram serves this lesson better than a video could.

**Practical exercise:** **GUIDED** — confirm the chosen setup actually boots Ubuntu 24.04 (`lsb_release -a`, checking the Release line reads `24.04`) before proceeding. Genuinely hands-on already, even with no ROS 2 involved yet — the module's exercise-heavy mandate starts here, not at "first ROS 2 command."

**Quiz:** None at lesson level — module quiz lives in Lesson 4 alongside the checkpoints.

**Recap / connection to next:** "Ubuntu 24.04 confirmed. Next: actually installing ROS 2 Jazzy onto it — and understanding exactly what that puts on your machine."

---

## Lesson 2 — Installing ROS 2 Jazzy

**Objective:** Install ROS 2 Jazzy while understanding *what* is being installed and *where* it lives — not running commands blindly.

**Concepts covered:** the installation process; where ROS 2 lives on disk; concrete continuation of Module 2 Lesson 3's distribution/package concept.

**Content block sequence:**
1. **TEXT** — bridge: "Module 2 said a distribution is a tested bundle of ROS 2 plus community packages. Installing Jazzy means putting a real copy of that bundle on your machine — and it's worth knowing exactly where it lands."
2. **TEXT** — the process conceptually, before commands: add a package source (so your system knows where to fetch Jazzy from), then install the `ros-jazzy-desktop` bundle via the same package manager you'd use for any other Ubuntu software — nothing ROS-specific or mysterious about the mechanism itself.
3. **CODE** — the real install commands (apt repository setup, then `sudo apt install ros-jazzy-desktop`), as a runnable reference, appearing *after* the conceptual framing.
4. **TEXT** — where it lands: everything installs under `/opt/ros/jazzy/`. "This is the literal, physical answer to 'where did all those packages from Module 2 actually go?'"
5. **IMAGE** — an annotated snippet of the `/opt/ros/jazzy/` directory tree, a few real subdirectories labeled with what they're for
6. **EMBED** — verified installation walkthrough (full citation below), as the live-demonstration reinforcement of the process just taught
7. **CALLOUT** (TIP) — "The video installs the full desktop bundle, matching this course. If you see a different distro name on screen anywhere you look this up later, stop and check you're not following stale instructions."
8. **TEXT** — bridge to Lesson 3: "ROS 2 is on disk now. Open a brand new terminal and type `ros2` — it won't work yet. That's not a mistake. That's Lesson 3's problem."

**Visual requirements:**
- **Purpose:** make installation concrete, not abstract · **Concept:** where ROS 2 physically lives, tied to Module 2's package/distribution concept · **Format:** annotated directory-tree diagram · **What should be shown:** `/opt/ros/jazzy/` with 3–4 real labeled subdirectories · **What the learner should understand:** installing a distribution means real, inspectable files in a real location — not magic.

**Video requirements:**
```
VIDEO TITLE: Install ROS2 Jazzy Jalisco on Ubuntu 24.04 | ROS2 Tutorial
CREATOR / CHANNEL: The Construct Robotics Institute
LINK: https://www.youtube.com/watch?v=ZGds6NuZLzo
APPROXIMATE DURATION: ~5 minutes, per the channel's own description of
  this exact video ("in just 5 minutes") — sourced from the creator's
  own stated claim, not independently timestamp-verified, but not a
  guess either.
COURSE MODULE: Module 3 — ROS 2 Installation and Environment Setup
LESSON: Lesson 2 — Installing ROS 2 Jazzy
ROS 2 VERSION RELEVANCE: Exact match — title and content are explicitly
  Jazzy Jalisco on Ubuntu 24.04, confirmed via YouTube's oEmbed metadata,
  not an older distribution
WHY SELECTED: The Construct is a source already evaluated as credible in
  this course's Phase 1 benchmark analysis; the creator's own description
  scopes it "system setup to installation verification," matching this
  lesson and Lesson 4 precisely; short enough not to violate §14's
  "do not overload learners with long videos"
WHAT THE LEARNER WILL GAIN: A real screen recording of the exact install
  just taught conceptually — confirms what success looks like on screen
  before they run it themselves
```

**Practical exercise:** **GUIDED** — run the real install commands on the learner's own machine, following along with the video. The module's central "make it real" moment.

**Quiz:** None at lesson level.

**Recap / connection to next:** "ROS 2 Jazzy is physically on your machine under `/opt/ros/jazzy/`. Next: why your terminal doesn't know that yet, and how to fix it — permanently."

---

## Lesson 3 — Sourcing and Environment Variables

**Objective:** Understand what sourcing actually does and why a fresh terminal doesn't automatically know about ROS 2, via a live, observable before/after.

**Concepts covered:** environment variables; sourcing; why it's necessary; terminal setup.

**Content block sequence:**
1. **TEXT** — real-world problem: "Open a brand new terminal and type `ros2 --help`. You'll see `command not found: ros2` — even though you just installed it. This isn't a bug. It's how this stage of installation is supposed to look."
2. **TEXT** — environment variables, conceptually: a terminal only knows about programs whose location is listed in variables like `PATH`. Installing ROS 2 didn't automatically add its location there.
3. **TEXT** — sourcing, conceptually: `/opt/ros/jazzy/setup.bash` is a script that sets up every environment variable ROS 2 needs, for *this terminal session only*. "Sourcing" runs it in a way that changes your current shell's environment, not a throwaway subprocess's.
4. **CODE** — the actual before/after: `ros2 --help` (fails) → `source /opt/ros/jazzy/setup.bash` → `ros2 --help` again (works) — the concrete SEE IT moment.
5. **CALLOUT** (WARNING) — "Sourcing only affects the terminal window you ran it in. A *new* terminal will be missing `ros2` again — expected, not broken. Making it automatic is next."
6. **TEXT** — making it permanent: adding the source line to `~/.bashrc` so every new terminal runs it automatically — explained as a deliberate choice, not a magic incantation to copy-paste without understanding.
7. **CALLOUT** (TIP) — ties back to Module 2 Lesson 2: "This is the moment the 'ROS 2 Client Library' layer from Module 2 becomes usable in your terminal — sourcing is literally what connects your shell to that layer."

**Visual requirements:**
- **Purpose:** make the invisible effect of sourcing visible · **Concept:** environment variables / sourcing · **Format:** a styled before/after terminal-output rendering (not a screenshot — matches the CODE block's visual treatment) · **What should be shown:** `ros2 --help` failing, then succeeding, side by side · **What the learner should understand:** sourcing is a real, observable state change in their current terminal, not a black box.

**Video requirements:** None. This is a single, narrow, terminal-native concept better taught by the live before/after in block 4 than by a video — no video was needed or sought for something this small.

**Practical exercise:** **GUIDED**, three steps with an observable outcome: confirm `ros2 --help` fails in a fresh terminal → source `setup.bash` and confirm it now works → add the source line to `~/.bashrc` and open a *third*, genuinely new terminal to confirm it works without manual sourcing.

**Quiz:** None at lesson level.

**Recap / connection to next:** "Your terminal knows about ROS 2 permanently now. Next: formally verifying everything actually works — and what to do, precisely, if it doesn't."

---

## Lesson 4 — Verification and Troubleshooting

**Objective:** Run the three checkpoints in sequence, and — when one fails — diagnose it systematically using a real decision tree, never "reinstall and hope."

**Concepts covered:** the three checkpoints; the four most common real installation failure modes and their actual fixes.

**Content block sequence:**
1. **TEXT** — framing: "Three increasingly specific checks. If one fails, the tree below tells you exactly where to look."
2. **TEXT** — **Checkpoint 1 — Can ROS 2 run?**: `ros2 doctor` or `ros2 --help`; what success looks like.
3. **TEXT** — **Checkpoint 2 — Can the terminal find ROS 2 packages?**: `ros2 pkg list`; expect a long list — this is Module 2 Lesson 3's "packages" concept, now confirmed real and discoverable.
4. **TEXT** — **Checkpoint 3 — Can a ROS 2 node run?**: `ros2 run demo_nodes_cpp talker` (a built-in demo pair, deliberately *not* Turtlesim — that reveal stays Module 4's) — expect visible published-message output.
5. **IMAGE** — the troubleshooting decision tree (below), as a real flowchart branching on symptom
6. **TEXT** — walks each branch of the tree in prose, matching the diagram exactly (four failure modes below)
7. **CALLOUT** (DANGER) — the conflicting-install trap specifically: "If ROS 1 or a different ROS 2 distribution is also installed on this machine, having *both* sourced at once causes confusing, hard-to-explain failures. Only ever source one distribution per terminal."
8. **EXERCISE** (DEBUGGING) — the module's debugging exercise (below)
9. **EXERCISE** (INDEPENDENT) — closing challenge: without looking back at this lesson's text, run all three checkpoints from a freshly opened terminal and confirm all three pass — proving understanding, not copy-paste
10. **QUIZ** — the module quiz (below)
11. **TEXT** — recap and connection to Module 4

**Visual requirements:**
- **Purpose:** turn "something's wrong" into a systematic diagnosis, not guesswork · **Concept:** the four real failure modes below · **Format:** a decision-tree flowchart, symptom at the top of each branch, diagnostic command in the middle, fix at the leaf · **What should be shown:** all four branches from the table below, laid out so a learner can find their exact symptom without reading the whole thing linearly · **What the learner should understand:** every failure here has a specific, checkable cause — never "just reinstall."

**The troubleshooting content itself** (core content, not summarized as "check your installation"):

| Failure mode | Symptom | Diagnostic step | Fix |
|---|---|---|---|
| **Wrong Ubuntu version** | `apt install ros-jazzy-desktop` fails immediately, or the repository-setup step fails | `lsb_release -a` — confirm the Release line reads exactly `24.04` | Jazzy's standard install path only supports Ubuntu 24.04 (Noble). On 22.04, 20.04, or a different Linux entirely, this install method cannot proceed — upgrade to 24.04 first. |
| **Forgot to source** | `command not found: ros2` despite a successful-looking install | `echo $ROS_DISTRO` — empty means not sourced in this terminal | `source /opt/ros/jazzy/setup.bash` in this terminal; if it should persist, confirm the line is actually in `~/.bashrc` (`grep ros ~/.bashrc`) and that a genuinely new terminal was opened to test, not just a cleared screen |
| **Permission issues** | Install fails with "Permission denied," or `apt` complains about locks/repository access | Confirm `sudo` was used only for the install/repository steps — a common overcorrection is `sudo`-ing `ros2 run` itself, which creates root-owned files that break every future non-sudo run | Re-run install steps with `sudo` only where genuinely needed; if `sudo` was mistakenly used on a `ros2` command, check `ls -la ~/.ros` and `chown -R $USER:$USER ~/.ros` if root-owned files appear |
| **Existing conflicting ROS installs** | `ros2` behaves strangely, unexpected packages appear or don't, or discovery seems inconsistent | `echo $ROS_DISTRO` — confirm it reads exactly `jazzy`; check `~/.bashrc` for more than one `source /opt/ros/.../setup.bash` line | Comment out or remove any other distribution's source line, leaving only Jazzy's; open a fresh terminal and recheck `$ROS_DISTRO` |

**Video requirements:** None additional — the decision tree and Lesson 2's video already cover this lesson's video needs; a dedicated troubleshooting video wasn't sought, since the fixes above are specific enough to teach directly rather than demonstrate.

**Practical exercise — DEBUGGING** (using the permission-issues failure mode, chosen because it's the subtlest of the four and produces a genuine "aha," not a repeat of something just taught):

> **Scenario:** Checkpoints 1 and 2 both passed. Checkpoint 3 fails: `ros2 run demo_nodes_cpp talker` produces a `Permission denied` error trying to write to a log directory.
>
> **Hint 1:** Check who owns the ROS 2 log directory: `ls -la ~/.ros`. Does anything in there look like it's *not* owned by your own username?
> **Hint 2:** If `root` owns files under `~/.ros`, think back — was any `ros2` command ever run with `sudo` by mistake, even once, earlier in this module?
>
> **Solution:** Running any `ros2` command with `sudo` creates log/config files owned by root under `~/.ros`. Every later run without `sudo` then fails trying to write to those same, now-inaccessible files.
> **Root cause:** `sudo` runs a command as root, including any files it creates as a side effect. ROS 2 itself never needs root privileges to run — only the apt installation step genuinely does.
> **Fix:** `sudo chown -R $USER:$USER ~/.ros`, then re-run Checkpoint 3 normally.

**Practical exercise — INDEPENDENT:** run all three checkpoints from a fresh terminal, from memory, no reference material.

**Quiz** (§12 — scenario/troubleshooting-based):
1. *Scenario:* "`ros2 --help` says command not found in a brand new terminal. Most likely cause?" → **Not sourced in this terminal yet.**
2. *Scenario:* "`ros2 pkg list` returns nothing. Which checkpoint does this correspond to, and what's the likely next step?" → **Checkpoint 2; recheck `$ROS_DISTRO`/sourcing, or confirm install actually completed.**
3. *True/False:* "It's fine to run `sudo ros2 run <package> <node>` if you're having trouble." → **False** — creates root-owned files that break future non-sudo runs, exactly the DEBUGGING exercise's root cause.
4. *Scenario:* "ROS 1 and ROS 2 Jazzy are both installed and both sourced in `~/.bashrc`. Safest practice?" → **Only source one distribution per terminal session — comment out the ones not in use.**

**Recap:** Ubuntu confirmed (L1) → ROS 2 physically installed (L2) → the terminal connected to it (L3) → three checkpoints passed, and a real fix for four common failures either applied or now understood (L4).

**Connection to Module 4:** "Every checkpoint just passed used a plain demo node, deliberately not Turtlesim — that's next. Module 4 is the first time you'll run and control an actual simulated robot, and everything that makes `ros2 run` work today is what makes that possible."

---

**Checkpoint:** review before Module 4 — particularly whether the decision-tree's four branches are actually exhaustive enough for a real class of learners, and whether reserving `demo_nodes_cpp` for Checkpoint 3 (instead of an early Turtlesim peek) correctly protects Module 4's reveal.