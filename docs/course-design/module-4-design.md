# ROS 2 Fundamentals — Phase 5: Module 4 Design

**"Your First ROS 2 System — Turtlesim"**

Two things carried into this document from Module 3's checkpoint are settled
before the lessons: the `demo_nodes_cpp`/Turtlesim reveal question, which
Module 3's addendum explicitly deferred to this design, and the provenance of
authored terminal output, which this module makes worse before it makes it
better. Both are below.

---

# Re-litigating the reveal: why Module 3 used `demo_nodes_cpp`

Module 3's addendum left this open: *"whether reserving `demo_nodes_cpp` for
Checkpoint 3 (instead of an early Turtlesim peek) correctly protects Module
4's reveal."* It was implemented as designed but never independently argued.
Judged now against this module, as that addendum asked.

**Verdict: upheld — but it transfers a real debt into Lesson 1, and that debt
is now a design requirement rather than a footnote.**

## Three reasons it was right

**1. The register is wrong in Module 3.** Module 3's emotional register is
anxiety-resolution: *did my install work?* A turtle appearing inside that
frame is read as *relief* — its meaning becomes "the installation is fine,"
not "look at what a robot system is." Module 4's register is discovery. The
same event is worth substantially more in the second frame, and the
first-robot moment can only be spent once.

**2. It keeps the checkpoint a clean instrument.** Had Checkpoint 3 been
`ros2 run turtlesim turtlesim_node`, a failure would have had two unrelated
possible causes — a broken ROS 2 install, or a broken graphics stack — with
one identical symptom, at the exact moment the learner is least equipped to
separate them. `demo_nodes_cpp talker` is text-only, so it can only fail for
ROS 2 reasons. It measures the thing Module 3 is actually measuring.

**3. Module 4's stated goal needs the turtle unspent.** §9 of the design doc
sets this module's goal as *curiosity* — learners should finish it asking
"what are nodes, topics, services, and actions?" That question is provoked by
watching two independent programs cooperate, and it lands harder when the
whole apparatus is new.

## The strongest argument against, stated fairly

A GUI smoke test at install time would have caught VM/WSL2 graphics-passthrough
failure — **the exact risk Module 3 Lesson 1's own WARNING callout raised** —
while the learner was still in environment-fixing mode with a five-branch
troubleshooting tree in front of them. Deferring the first GUI application to
Module 4 defers that failure into a lesson whose job is wonder, not diagnosis.
A learner on WSL2 or a VM can open Module 4 Lesson 1 and get a blank screen:
precisely the inverse of the reveal this decision was protecting.

That cost is real, and it does not reverse the decision — it relocates the
work. **Module 4 Lesson 1 owns the display-failure branch that Module 3's
troubleshooting tree deliberately does not cover.** This is why Lesson 1's
guided exercise is "get the window on screen," which reads as trivial and is
in fact the highest-risk step in the module.

---

# Lesson 1 — Meet Turtlesim

**Objective:** Start a real ROS 2 application and watch a robot appear —
and, if it doesn't appear, diagnose why without leaving the lesson.

**Concepts covered:** starting ROS 2 applications; `ros2 run` as a general
shape rather than a memorized incantation; what a simulator is for; the
display/graphics dependency introduced by the first GUI node.

**Content block sequence:**
1. **TEXT** — bridge from Module 3: "Your last checkpoint ran `ros2 run demo_nodes_cpp talker` and printed lines of text. Same command shape, one word different, and this time something opens."
2. **TEXT** — what Turtlesim is, and what it is not, stated honestly rather than apologetically: a deliberately trivial simulator whose triviality is the point. The turtle is not the subject; the *system around it* is. A complicated robot at this stage would hide the architecture behind its own complexity.
3. **CODE** — confirm it's already installed: `ros2 pkg executables turtlesim`. It ships inside the `ros-jazzy-desktop` bundle installed in Module 3, so for most learners this is a confirmation, not an install. `sudo apt install ros-jazzy-turtlesim` as the fallback for anyone who installed a smaller variant.
4. **CODE** — `ros2 run turtlesim turtlesim_node`
5. **IMAGE** — the annotated Turtlesim window (below)
6. **CALLOUT** (WARNING) — **the display branch**, and the reason it lives here: "This is the first ROS 2 program in the course that opens a window. If you're on a VM or WSL2, this is the moment the graphics warning from Module 3 Lesson 1 becomes real. A window that never appears is almost never a ROS 2 problem."
7. **CODE** — display diagnostics: `echo $DISPLAY` (empty is the tell), the WSLg check on WSL2, and the VM guest-additions/3D-acceleration pointer — framed as *host-environment* fixes, deliberately outside ROS 2, because that is the actual lesson.
8. **EXERCISE** (GUIDED) — get the window on screen and keep it there.
9. **TEXT** — what actually happened: `ros2 run <package> <executable>`, identical in shape to Module 3's checkpoint. One package name and one executable name changed; nothing else did. The command didn't get more advanced, the program did.
10. **TEXT** — bridge: "The turtle is sitting still, and nothing in that window will move it. That's Lesson 2."

**Visual requirements:**
- **Purpose:** orient the learner in an unfamiliar window before asking them to do anything in it · **Concept:** the simulator as a *view onto* a running node, not the node itself · **Format:** annotated screenshot-style diagram of the Turtlesim window · **What should be shown:** the canvas, the turtle, the background colour, and — critically — a label pointing at the *terminal behind it* reading "the node is here; the window is just what it draws" · **What the learner should understand:** the window is output, not the program.

**Video requirements:** None in this lesson. Starting a single node is one command and one outcome; the annotated visual and the learner's own screen cover it. The module's video sits in Lesson 2, where there is actual motion to demonstrate.

**Practical exercise — GUIDED:** run `ros2 pkg executables turtlesim` and confirm both `turtlesim_node` and `turtle_teleop_key` are listed → run `turtlesim_node` → confirm a window with a turtle in it is visible on screen. Success criterion is deliberately *visual*, not exit-code-based: a node that starts cleanly while its window goes nowhere is exactly the WSL2/VM failure this lesson exists to catch.

**Quiz:** None at lesson level — module quiz lives in Lesson 4.

**Recap / connection to next:** "One node running, one window open, one motionless turtle. Next: making it move — from a completely separate program."

---

# Lesson 2 — Two Programs, One System

**Objective:** Drive the turtle from a second terminal, and notice the thing
that actually matters: two programs that were never told about each other
are cooperating.

**Concepts covered:** running multiple nodes; controlling a simulated robot;
discovery, observed rather than explained; the first concrete instance of
Module 2's ROS Graph on the learner's own machine.

**Content block sequence:**
1. **TEXT** — the problem: "Click the Turtlesim window and press the arrow keys. Nothing happens. There is no control in that window at all — because control isn't its job."
2. **CALLOUT** (TIP) — **spaced repetition of Module 3 Lesson 3**: "This is a brand new terminal. If you skipped the `~/.bashrc` step, `ros2` won't be found here — same failure, same fix, and this is why that step was worth doing permanently."
3. **CODE** — `ros2 run turtlesim turtle_teleop_key` in the second terminal, with its usage banner as the sign it started correctly.
4. **TEXT** — arranging the windows, and the one rule that trips up nearly everyone: the *teleop terminal* must have keyboard focus. The official ROS 2 tutorial says the same thing in its own words — "have the terminal running `turtle_teleop_key` active" — and it is worth stating plainly because the instinct is to click the window you're watching.
5. **EXERCISE** (GUIDED) — drive the turtle; draw a recognisable shape.
6. **TEXT** — **the observation the whole module turns on**: `turtlesim_node` started first, knowing nothing about teleop. `turtle_teleop_key` started second, knowing nothing about Turtlesim. Neither was given an address, a port, or a config file. They found each other anyway.
7. **IMAGE** — the invisible link (below)
8. **CALLOUT** (INFO) — the Module 2 callback: "Module 2 called this automatic discovery and drew it as a diagram. This is the same thing, on your machine, with your two terminals."
9. **EMBED** — the Turtlesim walkthrough video (below)
10. **TEXT** — a detail deliberately left unresolved: press an arrow key and the turtle moves briefly, then stops on its own, even though you never told it to stop. "That is not a bug, and the explanation is genuinely interesting. It's Module 6's."
11. **TEXT** — bridge to Lesson 3.

**Visual requirements:**
- **Purpose:** make the connection between two independent programs visible, since the entire point is that it is invisible in practice · **Concept:** two nodes exchanging data over something neither of them configured · **Format:** side-by-side panel diagram — Terminal A, Terminal B, and the Turtlesim window · **What should be shown:** an arrow from teleop to Turtlesim labelled `/turtle1/cmd_vel`, drawn as a **dashed** line with the caption "you haven't met this yet — Module 6," plus explicit "not configured" annotations on both terminals · **What the learner should understand:** the link is real, has a name, and was created without them.

**Video requirements:**
```
VIDEO TITLE: Easily Learn ROS2 Jazzy Using Turtlesim Simulation :
  Step-by-step tutorial for Learning ROS2 Jazzy
CREATOR / CHANNEL: Aleksandar Haber PhD
LINK: https://www.youtube.com/watch?v=k3NHSOq64xc
APPROXIMATE DURATION: NOT YET VERIFIED. Title, creator and platform are
  confirmed via YouTube's oEmbed metadata; publication date (18 Feb 2025,
  post-dating Jazzy's May 2024 release) via search metadata. Duration must
  be confirmed at implementation time, exactly as Module 3's video was —
  and the video dropped if it turns out to be long enough to violate §14's
  "do not overload learners with long videos."
COURSE MODULE: Module 4 — Your First ROS 2 System
LESSON: Lesson 2 — Two Programs, One System
ROS 2 VERSION RELEVANCE: Explicit Jazzy match in the title, published
  after the Jazzy release — not a re-tagged Foxy/Humble tutorial
WHY SELECTED: Turtlesim is the one topic where a still image genuinely
  underperforms; the learner needs to see motion respond to keystrokes
  before trusting their own setup. A different creator from Module 3's
  video deliberately — the course should not read as one channel's
  playlist, and §8 favours breadth of credible sources.
WHAT THE LEARNER WILL GAIN: Confirmation of what a working two-terminal
  Turtlesim session looks and behaves like, so a learner whose own setup
  misbehaves can tell "mine is broken" from "this is normal."
```

**Practical exercise — GUIDED:** open the second terminal → confirm `ros2` is available in it → run `turtle_teleop_key` → arrange windows so both are visible with the teleop terminal focused → drive the turtle into a closed shape. The window-arrangement step is a real step, not stage direction: it is where the focus rule is learned by doing rather than by being warned.

**Quiz:** None at lesson level.

**Recap / connection to next:** "Two programs, one system, no configuration. Next: looking inside the system you just built — while it's still running."

---

# Lesson 3 — Inspecting a Running System

**Objective:** Use ROS 2's introspection commands to observe a live system,
at curiosity depth — seeing the entities clearly without yet being asked to
understand them.

**Concepts covered:** `ros2 node list`, `ros2 topic list`, `ros2 service
list`, `ros2 action list`; `ros2 topic echo`; the idea that a running ROS 2
system is inspectable from outside, without modification and without stopping
it.

**Content block sequence:**
1. **TEXT** — framing: "Both programs are still running. You are about to open a third terminal and interrogate them from the outside — no code changes, no restart, no debug mode. This is normal, everyday ROS 2, and it is one of the genuinely unusual things about it."
2. **CODE** — the four `list` commands, run in the third terminal against the live system.
3. **TEXT** — reading each result, one short paragraph each, at deliberately shallow depth.
4. **CALLOUT** (INFO) — **naming the under-explanation on purpose**: "You are not expected to understand these four things yet. This lesson's job is to make sure you've *seen* them and know they exist. Each one gets a full module." Instructional honesty matters more here than usual: without it, a learner reads deliberate brevity as their own failure to keep up.
5. **IMAGE** — the inspection map (below)
6. **TEXT** — from listing to watching: a list says what exists; `echo` shows what is actually moving through it right now.
7. **CODE** — `ros2 topic echo /turtle1/cmd_vel`, with an arrow keypress producing a message.
8. **IMAGE** — anatomy of one `cmd_vel` message (below)
9. **TEXT** — **the payoff that keeps this from feeling like a toy**: `/cmd_vel` carrying a `geometry_msgs/msg/Twist` is not a Turtlesim invention. It is the standard velocity interface for real mobile robots. The commands in this lesson work unchanged on a real robot. The turtle is a toy; the interface is not.
10. **EXERCISE** (INDEPENDENT) — the four-question challenge (below)
11. **TEXT** — bridge to Lesson 4.

**Visual requirements:**
- **Purpose:** convert four unexplained command outputs into a map of the course ahead — this is the diagram that does the module's actual pedagogical work · **Concept:** the four core ROS 2 entity types and where each is taught · **Format:** four-row table/flow — command → what it reveals → one-line plain-language gloss → **the module that explains it** · **What should be shown:** `node list` → the separate programs → Module 5 · `topic list` → continuous streams of data → Module 6 · `service list` → ask-and-get-an-answer requests → Module 7 · `action list` → long-running goals you can track and cancel → Module 8 · **What the learner should understand:** they are not behind; they are on a map, and every unexplained thing on this screen has a scheduled answer.

- **Purpose:** turn a keypress into data the learner can see · **Concept:** structured messages · **Format:** annotated breakdown of one `Twist` message as printed by `echo` · **What should be shown:** the `linear:`/`angular:` split with `x/y/z` under each, one field highlighted as the one the arrow key changed, and the rest shown as zeros · **What the learner should understand:** "press up arrow" became a specific number in a specific field of a structured message — control is data, not magic.

**Practical exercise — INDEPENDENT** (goal-only, no step-by-step, per §11): with Turtlesim and teleop still running, answer four questions using nothing but the command line:
1. How many separate ROS 2 programs are running right now?
2. Which topic carries your steering commands?
3. How many services does Turtlesim offer?
4. Name one action it offers.

No commands are given back to the learner — the four they need were all in
block 2. This is the first exercise in the course where the instruction is a
goal rather than a procedure, which is the point.

**Quiz:** None at lesson level.

**Recap / connection to next:** "You can now see a running ROS 2 system from the outside. Next: what to do when what you see is *nothing* — and a name for everything you just looked at."

---

# Lesson 4 — When It Doesn't Work, and What You Just Saw

**Objective:** Diagnose a non-responding turtle using Lesson 3's inspection
tools, then get names for the four things seen and a map of where the course
goes next.

**Concepts covered:** introspection as debugging, not just curiosity; the
publisher-before-subscriber diagnostic habit; naming nodes/topics/services/
actions; the "one program = one node" misconception (§21).

**Content block sequence:**
1. **TEXT** — reframing Lesson 3: "Those four commands weren't a tour. They're the debugger. Here's the first time you need them."
2. **EXERCISE** (DEBUGGING) — the unresponsive turtle (below)
3. **TEXT** — extracting the transferable habit from the exercise: **ask whether anything is being sent before asking why nothing is arriving.** Nearly every ROS 2 communication bug resolves along that split, and the learner has now done it once on the easiest possible case.
4. **TEXT** — **what you just saw, named**: nodes, topics, services, actions — one sentence each, plus the module that owns each. Deliberately the same four-row shape as Lesson 3's diagram, so the module closes on the structure it opened with.
5. **CALLOUT** (TIP) — misconception pre-empt, per §21: "It's natural to assume one program equals one ROS 2 application. You just ran two programs that formed *one* system. Real robots run dozens at once — that's Module 5's starting point."
6. **QUIZ** — the module quiz (below)
7. **FILE** — a Turtlesim command cheat sheet PDF (§17): every command used in this module on one page — `ros2 run`, the four `list` subcommands, `ros2 topic echo`, `ros2 pkg executables` — with the display-troubleshooting checks on the reverse. The first course-supplied reference the learner will plausibly keep open on a second screen.
8. **TEXT** — recap and connection to Module 5.

**Visual requirements:** None additional. The module's three diagrams are spent, and this lesson's content is a debugging narrative plus a naming table — both of which read better as prose and a QUIZ than as a fourth image. Adding a diagram here would be filling a quota.

**Video requirements:** None. Lesson 2's video already demonstrates the working case; this lesson is about the broken one, which is better practised than watched.

**Practical exercise — DEBUGGING** (per §11: observe → investigate → use ROS 2 tools → identify root cause → fix):

> **Scenario:** The Turtlesim window is open and the turtle is visible.
> `turtle_teleop_key` is running in a second terminal and printed its usage
> banner without errors, so it started correctly and its terminal is sourced.
> You press the arrow keys. The turtle does not move.
>
> **Hint 1:** Don't start at the keyboard, and don't restart anything. Ask a
> narrower question first: *is anything being published at all?* Open a third
> terminal and run `ros2 topic echo /turtle1/cmd_vel`, then press the arrow
> keys again. Messages, or silence?
>
> **Hint 2:** Silence. So Turtlesim isn't ignoring commands — no commands are
> being sent. The problem is on the teleop side, before the topic. Teleop is
> running and healthy, so what would stop a running program from noticing
> your keystrokes?
>
> **Hint 3:** Look at which window is highlighted in your window manager.
> Which application is receiving your keyboard right now?
>
> **Solution:** The Turtlesim window had keyboard focus, not the teleop
> terminal.
> **Root cause:** `turtle_teleop_key` reads raw keystrokes from the terminal
> it is running in. A focused Turtlesim window swallows the arrow keys, and
> Turtlesim itself has no keyboard handling — so the keys go nowhere and no
> `cmd_vel` message is ever published. Nothing was broken; the input never
> reached the publisher.
> **Fix:** Click the teleop terminal to focus it, keeping the Turtlesim
> window visible but unfocused, and drive again.

Chosen over the more obvious "second terminal wasn't sourced" scenario
deliberately: sourcing was already the subject of Module 3 Lesson 3 and its
DEBUGGING exercise, and repeating it here would teach nothing new. The scenario
explicitly rules sourcing out in its opening line so the learner cannot resolve
it by pattern-matching the previous module. It is also, in practice, the single
most common first-hour Turtlesim failure — the official ROS 2 tutorial warns
about it in its own instructions.

**Quiz** (§12 — scenario- and command-selection-based, explanation-first):

1. *Scenario:* "You started `turtlesim_node` and `turtle_teleop_key` in separate terminals. You never gave either one an address, a port, or a config file, yet the arrow keys drive the turtle. What made that connection possible?" → **Automatic discovery.** *Explanation revisits Module 2's ROS Graph lesson explicitly — this is the spaced-recap link, not a new fact.*
2. *Command selection:* "Which single command tells you how many separate ROS 2 programs are currently running?" → **`ros2 node list`.**
3. *Scenario / debugging:* "`ros2 topic echo /turtle1/cmd_vel` prints nothing while you press the arrow keys, and the turtle doesn't move. Where is the problem?" → **On the publishing side — teleop isn't sending. Turtlesim is not at fault.** *Explanation names the general habit: check whether anything is being sent before investigating the receiver.*
4. *True/False:* "Turtlesim is a learning tool, so the commands you used on it don't transfer to real robots." → **False.** *Explanation: `/cmd_vel` carrying a `Twist` is the standard velocity interface on real mobile robots, and the four `list` commands work on any ROS 2 system, real or simulated.*
5. *Architecture / reach question:* "Of the four things you listed in Lesson 3, which would you expect to handle a long-running task you could monitor and cancel partway through?" → **Actions.** *Answerable purely from Lesson 3's inspection-map diagram, which glosses each entity and names its module. Tests whether the map was read, not whether actions are understood — the explanation does the teaching and points at Module 8.*

**Recap:** A window and a robot (L1) → two independent programs cooperating with no configuration (L2) → the running system inspected from outside, with names for what was found (L3) → the same tools used to diagnose a real failure, and a map of what comes next (L4).

**Connection to Module 5:** "You ran two nodes without knowing what a node is. That worked — but it stops working the moment you want to write your own. Module 5 answers the first of Lesson 3's four questions: what a node actually is, why robotics systems are split into many of them, and how to build one yourself."

---

# Terminal-output provenance — carried forward, not solved here

Every terminal output in this module is **authored, not captured**: the four
`list` outputs, the `echo` of a `Twist` message, `ros2 pkg executables
turtlesim`, and the display diagnostics. They are researched against the
official Jazzy documentation and the ROS 2 Industrial workshop material rather
than invented, but no command in this design has been run on a real Ubuntu
24.04 + Jazzy machine.

This module makes the exposure larger than Module 3's, in a specific way:
Module 3's authored outputs are mostly short and near-invariant
(`command not found`, `jazzy`, a `LANG=` line). This module's are **long,
enumerable, and machine-specific** — a learner will compare their own
`ros2 topic list` line by line against ours, and a single missing or extra
entry reads to them as a broken install. Two consequences for implementation,
independent of which verification route is chosen:

- Long outputs must be rendered as **explicitly abridged**, with a visible
  elision and a caption saying so. Even a correctly captured list will differ
  between machines, so promising an exact match is wrong regardless.
- The *shape* of the output is what the lesson teaches ("several entries,
  including one containing `cmd_vel`"), and the prose must lean on the shape,
  never on an exact count.

The verification options themselves are being decided separately and are not
assumed here. This document should not be marked implementation-ready until
that decision lands.

---

**Checkpoint:** review before Module 5 — particularly (a) whether Lesson 3's
deliberate under-explanation is the right depth or whether it will read as
evasive rather than as a map, and (b) whether the display-failure branch
inherited into Lesson 1 is sufficient for WSL2 learners, or whether that
audience needs its own dedicated path.
