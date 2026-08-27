# ROS 2 Fundamentals — Phase 5: Module 5 Design

**"ROS 2 Nodes"**

Module 4 ended by promising this module answers the first of its four
questions: *what a node actually is, why robotics systems are split into many
of them rather than one big program, and how to build one yourself.* That
promise sets the shape below — definition, rationale, construction, then the
problems that only appear once there are several.

Four structural decisions are flagged up front, per the Stage 4 instruction to
raise anything that doesn't fit the approved curriculum rather than silently
adjusting it. Three of them are real conflicts.

---

## Flag 1 — Learners build a node here, but packages and `colcon` are Module 10

§9 says *"Learners should create their first ROS 2 node"* in this module.
Creating one the way ROS 2 projects normally do it requires a workspace, a
package, an `entry_point`, and a `colcon build` — **all of which are Module
10.** Pulling that forward would nearly double this module and teach its most
important idea while the learner is distracted by build tooling.

**Resolution: Lesson 3's node is a standalone Python script**, run with
`python3 my_first_node.py`. No workspace, no package, no build step. This works
because `rclpy` is importable from any Python interpreter once ROS 2 is sourced
— the sourcing from Module 3 Lesson 3 is doing that work, which is a nice
payoff for it — and the resulting node appears in `ros2 node list` exactly like
any other.

This is not a workaround dressed up as a choice. It is better here:

- It **isolates the concept from the packaging**. The learner's first node
  fails or succeeds for node reasons, never because an `entry_point` string was
  wrong. That separation is the whole point of teaching nodes before packages.
- It makes Module 10 **motivated rather than procedural**. That module can open
  with "you have a loose script in your home directory; here is why that
  doesn't survive contact with a second machine or a second developer,"
  instead of introducing packaging as an unexplained ritual.

Module 10's design must pick this thread up deliberately. Recorded in
`open-items.md` so it isn't forgotten.

## Flag 2 — §9 asks for "live coding"; the LMS has no live-coding block

There is no interactive code execution in this platform and building one is far
outside this module's scope (§40). The two available substitutes are a video of
someone typing, or a staged CODE progression.

**Resolution: a three-stage CODE progression in Lesson 3** — the node is built
in three blocks, each adding one idea (an empty node that exits; a node that
stays alive; a node that does something on a timer), with the learner running
each stage before the next is shown. This is arguably better than watching
someone type: the learner runs four programs instead of watching one, and each
intermediate stage has an observable, different outcome.

## Flag 3 — "lifecycle" is a reserved word in this course

The natural phrase for `init → create → spin → shutdown` is "the node
lifecycle." **That phrase must not be used.** *Lifecycle nodes* are a specific
ROS 2 feature with managed states, and they are Module 12. Using the word
loosely here would make Module 12 land as a contradiction rather than a new
idea.

This document and the implementation say **"the shape of a node program"**
throughout. Flagging it because it is the kind of thing that slips in during
implementation without anyone noticing until Module 12.

## Flag 4 — Module 4's misconception callout needs refining, not repeating

Module 4 Lesson 4 corrected *"one program = one ROS 2 application"* by showing
two programs forming one system. Correct, but it leaves the reverse implication
unstated: a learner now reasonably assumes **one executable = exactly one
node**, and that is also not quite true. A single executable can host several
nodes (composition).

Composition proper is a Module 11/12 concern and opening it here would be a
detour. Lesson 1 states the refinement in one sentence — *usually one, not
necessarily one* — and moves on. Enough to prevent a false rule hardening;
not enough to become a tangent.

---

## Video requirements for this module: none. Three candidates researched, all rejected.

Recorded in full because §15 requires the research, and because "no video" is
a decision that should be auditable rather than an omission.

```
CANDIDATE 1 — "ROS2 Jazzy Tutorials from Scratch: First Python Program"
  Aleksandar Haber PhD · https://www.youtube.com/watch?v=R9H24AOjA24
  VERIFIED DURATION: PT39M22S (2361s), read from player metadata
  PUBLISHED: 2025-05-28 · Jazzy-specific
  REJECTED: two independent reasons. Nearly 40 minutes violates §14 outright,
  and no chapter markers means clip bounds would be a guess. Scope is also
  wrong — it teaches package creation and publisher/subscriber pairs, which
  are Modules 10 and 6, so it would drag both forward.

CANDIDATE 2 — "[ROS2 in 5 mins] 004 — What is a ROS2 node?"
  The Construct · theconstruct.ai post, 2018-11-20
  REJECTED: right length and right scope, and The Construct is already vetted
  in this course's Phase 1 benchmark and used in Module 3 — but it targets
  ROS 2 **Bouncy** (2018), six distributions before Jazzy, and its practical
  section runs `osrf/ros2:bouncy-desktop`. Module 1 ships a callout telling
  learners to check the distribution on anything they find. Embedding a
  Bouncy video would contradict our own instruction in the same course.

CANDIDATE 3 — the official docs' "Understanding nodes" tutorial
  REJECTED: not a video. Good prose, and it informed this design, but §15 is
  about curated video and this is a documentation page.
```

**Consequence, stated plainly:** this module has no video, and with Flag 2 that
means it has neither a video nor live coding. The staged CODE progression and
four diagrams carry the load instead. If a short, Jazzy-current, node-scoped
video appears later it should be added to Lesson 1 — that is where it would
belong, and the lesson is written so that it slots in without restructuring.

---

# Lesson 1 — What a Node Actually Is

**Objective:** Turn "node" from a word the learner has heard into something
they can define, point at, and inspect — grounded entirely in the two nodes
they already ran in Module 4.

**Concepts covered:** a node as a single running process with one job; the
distinction between package name, executable name and node name; what a node
exposes to the rest of the system; `ros2 node info`.

**Content block sequence:**
1. **TEXT** — bridge: "In Module 4 you ran `ros2 node list` and got two lines back. You were told they were 'the separate programs'. That was true, and it was deliberately thin. Here is the rest of it."
2. **TEXT** — the definition, concretely: a node is one running process that does one job and announces itself to the rest of the system by name. Not a file, not a class, not a library — a *process*, currently running, that stops existing when you Ctrl+C it.
3. **CALLOUT** (INFO) — the Flag 4 refinement, in one sentence and no more: "One executable usually contains exactly one node, and everything in this module assumes that. It is possible to put several nodes in one executable, which is occasionally useful and comes up much later — worth knowing the rule has an exception, not worth chasing now."
4. **TEXT** — **three names, one thing, and why it's confusing.** In `ros2 run turtlesim turtlesim_node`, `turtlesim` is the *package*, `turtlesim_node` is the *executable*, and `/turtlesim` — the leading slash matters — is the *node name* that appeared in `ros2 node list`. Three similar words for three different things, and this is where beginners lose an hour. Teleop makes it obvious: the executable is `turtle_teleop_key`, the node is `/teleop_turtle`. They don't even match.
5. **IMAGE** — node anatomy (below)
6. **TEXT** — what a node exposes: a name, plus the topics it publishes and subscribes to, the services it offers, and the actions it offers. Those four things are exactly Module 4's four `list` commands, seen from inside one node instead of across the whole system.
7. **CODE** — `ros2 node info /turtlesim`, with abridged real-shaped output showing the Subscribers / Publishers / Service Servers / Action Servers sections. Carries an illustrative-output caption per path D.
8. **CALLOUT** (TIP) — "`ros2 node list` is the census. `ros2 node info` is the interview. When something is wrong with one node, this is the command that tells you what it thinks it's connected to — which is often not what you assumed."
9. **EXERCISE** (GUIDED) — interrogate both nodes (below)
10. **TEXT** — bridge to Lesson 2: "You can now describe what a node is and inspect one. The more interesting question is why a robot has dozens of them instead of one program that does everything."

**Visual requirements:**
- **Purpose:** give "node" a concrete shape before any code exists · **Concept:** a node as a named process with four kinds of connection point · **Format:** a labelled single-node diagram — one rounded box for the node, its name on it, with four labelled ports/edges · **What should be shown:** the node box named `/turtlesim`, the package and executable names shown *outside* it as "how it was started" rather than as parts of it, and the four connection types (publishes / subscribes / services / actions) as distinct ports · **What the learner should understand:** the node is the running thing; the package and executable are how you launched it; the four ports are how it meets everything else.

**Practical exercise — GUIDED:** with turtlesim and teleop running from Module 4, run `ros2 node info /turtlesim` and `ros2 node info /teleop_turtle`, then answer two questions from the output alone: which node *publishes* `/turtle1/cmd_vel` and which *subscribes* to it, and which of the two offers services. The point is to read the direction of a connection correctly — publisher versus subscriber is the single most common misreading of this output, and getting it right here is what makes Module 6 land.

**Quiz:** None at lesson level — module quiz lives in Lesson 4.

**Recap / connection to next:** "A node is a named, running process that exposes four kinds of connection. Next: why anyone would build a robot out of dozens of them."

---

# Lesson 2 — Why Systems Are Split Into Nodes

**Objective:** Understand the engineering rationale for modularity — including
what it costs — and see one of its benefits demonstrated live rather than
asserted.

**Concepts covered:** separation of concerns; independent failure and restart;
reuse across robots; language independence; distribution across machines; and
the real costs of a many-node design.

**Content block sequence:**
1. **TEXT** — the question posed honestly: "Splitting a program into a dozen communicating processes is more work than writing one program. Nobody does that for elegance. Here is what it buys."
2. **TEXT** — a real robot's breakdown: a mobile robot running a laser-scanner driver, a localisation node, a path planner, a motor controller, a battery monitor, a camera driver. Each is one job, written and tested separately, often by different people or different organisations entirely.
3. **IMAGE** — a real robot's node graph (below)
4. **TEXT** — the four things this buys, each concrete: **independent failure** (the planner crashing doesn't take the motor driver with it); **reuse** (a lidar driver written for one robot works on the next one unchanged); **language independence** (a Python node and a C++ node interoperate with no bridge, because they talk over topics rather than function calls); **distribution** (nodes can run on different computers on the same network — the heavy vision node on a workstation, the motor driver on the robot).
5. **EXERCISE** (GUIDED) — kill and restart teleop (below). Placed here, mid-lesson, deliberately: the claim in block 4 about independent failure is one the learner can falsify in thirty seconds, so they should.
6. **TEXT** — what just happened, and why it's the whole argument: teleop was killed and turtlesim didn't notice, didn't error, and didn't need restarting. When teleop came back it reconnected with no configuration. In a single-program design, that's a crash; here it's a component being restarted.
7. **CALLOUT** (INFO) — the Module 1 callback: "Module 1 argued monolithic robotics software doesn't scale, and drew it as a diagram. You just did the experiment."
8. **TEXT** — **the honest cost side**, because a module that only sells the benefits produces engineers who over-split systems: more processes means more to start and supervise; a bug can now live *between* two nodes rather than inside either; debugging spans several terminals; and data crossing a process boundary is not free. The judgement — how many nodes, split where — is real engineering, and this course's later modules (launch files in Module 11, RQt in Module 13) exist largely to manage exactly these costs.
9. **CALLOUT** (WARNING) — the practical form of that: "'One node per job' is the guideline, but 'job' is doing a lot of work in that sentence. A node per *sensor* is usually right. A node per *function* usually isn't — you end up with forty processes and a debugging problem."
10. **TEXT** — bridge to Lesson 3.

**Visual requirements:**
- **Purpose:** make "dozens of nodes, each one job" concrete rather than abstract · **Concept:** a realistic multi-node robot system · **Format:** a node graph of a real mobile robot — boxes for nodes, labelled arrows for what flows between them · **What should be shown:** six to eight named nodes (lidar driver, localisation, planner, motor controller, battery monitor, camera driver) with the data flowing between them, and **one node visibly shaded as "written by someone else, reused unchanged"** to make the reuse argument visual rather than verbal · **What the learner should understand:** this is what a real robot's software actually looks like, and no single person wrote all of it.

**Practical exercise — GUIDED:** with both Module 4 programs running, press Ctrl+C in the teleop terminal only. Confirm the turtle is still on screen and turtlesim's terminal shows no error. Run `ros2 node list` and confirm `/teleop_turtle` is gone while `/turtlesim` remains. Restart teleop and confirm the arrow keys work again immediately, with nothing reconfigured. Four observable outcomes, no new commands.

**Quiz:** None at lesson level.

**Recap / connection to next:** "You've seen why systems are split up, and what it costs. Next: writing one yourself — about fifteen lines."

---

# Lesson 3 — Writing Your First Node

**Objective:** Write, run and inspect a node the learner wrote, understanding
every line of it, with no package and no build system in the way.

**Concepts covered:** `rclpy`; the shape of a node program (`init` → create →
`spin` → `shutdown`); subclassing `Node`; the node's logger; timers as the
standard way to make a node *do* something repeatedly.

**Content block sequence:**
1. **TEXT** — scope, stated up front so it doesn't feel like a shortcut: "This is a plain Python file you run with `python3`. No workspace, no package, no build step. Those exist and they matter — they're Module 10 — but none of them is what a node *is*, and dragging them in now would mean debugging build configuration instead of learning this."
2. **CALLOUT** (INFO) — why it works at all, tying back to Module 3: "You can `import rclpy` from an ordinary Python script because sourcing `/opt/ros/jazzy/setup.bash` put ROS 2's Python libraries on this shell's path. That's the same sourcing from Module 3 Lesson 3, doing something visible for the first time."
3. **CODE** — **stage 1**: the four-line skeleton — `rclpy.init()`, create a `Node("my_first_node")`, `rclpy.shutdown()`. Runs and exits immediately. That's the expected outcome and the lesson says so.
4. **TEXT** — what stage 1 proves and what it doesn't: a node existed. It also died instantly, so `ros2 node list` in another terminal would never have caught it. A node that doesn't stay alive isn't useful.
5. **CODE** — **stage 2**: add `rclpy.spin(node)`. Now it stays running. Explained properly rather than as an incantation: `spin` hands control to ROS 2 and says "keep this node alive and call my code when something happens." It's the reason the program doesn't exit, and the reason Ctrl+C is how you stop it.
6. **EXERCISE** (GUIDED) — write and run it, and catch it in the census (below)
7. **IMAGE** — the shape of a node program (below)
8. **CODE** — **stage 3**: add a timer and a log line, so the node visibly *does* something once a second. Introduces `self.get_logger().info(...)` and `create_timer`, and with it the callback idea that Module 6 depends on entirely.
9. **CALLOUT** (TIP) — "`print()` works, but use `self.get_logger().info()`. Log lines carry the node's name and a timestamp, they show up in `/rosout` alongside every other node's, and in a system with twelve nodes running that difference is the difference between debuggable and not."
10. **CODE** — the C++ equivalent (§18 secondary track): the same node in `rclcpp`, shown once, side by side conceptually. Framed explicitly: "You are not expected to write this, and this course stays in Python. Read it for one reason — to see that `init`, a node object, a timer, `spin` and `shutdown` are all there, in the same order. The concept transfers; only the syntax changes."
11. **FILE** — `module-5-first-node.py`, the finished stage-3 script as a download (§17: downloadable source code), so a learner who fought a typo can diff against a known-good copy rather than restarting.
12. **TEXT** — bridge to Lesson 4.

**Visual requirements:**
- **Purpose:** make the shape of every ROS 2 program visible once, so it's recognisable forever after · **Concept:** `init` → create node → `spin` → `shutdown`, and where the learner's own code attaches · **Format:** a vertical flow with the actual code lines beside each stage · **What should be shown:** the four stages mapped to their real lines, with the timer callback drawn as a branch *off* `spin` — because the single most common beginner misreading is that `spin` is a wait, when it's the thing that runs your callbacks · **What the learner should understand:** every ROS 2 node program has this shape; their code lives in the callbacks, not in a main loop they write themselves. **Must not be titled or labelled "lifecycle"** — see Flag 3.

**Practical exercise — GUIDED:** create `my_first_node.py`, run stage 1 and observe it exit immediately, add `spin` and observe it stay alive, then — **in a second terminal, while it's still running** — run `ros2 node list` and find their own node's name in the output alongside nothing else. That last step is the moment the module lands: the thing they wrote is in the same census as turtlesim was.

**Quiz:** None at lesson level.

**Recap / connection to next:** "You've written a node, run it, and found it in the system's own list. Next: what happens when there are several of them — including the one mistake that produces the strangest symptoms in this whole module."

---

# Lesson 4 — Naming, Discovery, and Many Nodes

**Objective:** Control what a node is called, understand how nodes find each
other, run several at once, and diagnose the name collision that produces
Module 5's most confusing failure.

**Concepts covered:** node naming and why it matters; renaming at launch with
`--ros-args -r __node:=`; discovery; what actually happens when two nodes share
a name; running multiple nodes deliberately.

**Content block sequence:**
1. **TEXT** — why a name is not cosmetic: it's the address other tooling uses. `ros2 node info` takes a name. Every debugging command you've learned takes a name. A node called `my_first_node` in a system of thirty is a node you cannot talk about.
2. **CODE** — renaming without editing the file: `ros2 run <pkg> <exe> --ros-args -r __node:=left_wheel`, and the equivalent for the learner's own script. Introduces remapping in its narrowest, most useful form — full remapping is Module 9's.
3. **TEXT** — discovery, now explained rather than observed: in Module 4 the two programs found each other and it was presented as something to notice. What actually happens is that each node announces itself and what it publishes and subscribes to; the middleware matches them. No central server, no master process — which is a genuine difference from ROS 1, and connects back to Module 1's ROS 1 comparison.
4. **CALLOUT** (INFO) — the practical consequence learners hit: "Because there's no central master, start order doesn't matter — you saw that in Module 4. It also means a node on another machine on the same network may join your system without you doing anything. Useful, occasionally surprising, and the reason `ROS_DOMAIN_ID` exists — Module 9."
5. **TEXT** — **what actually happens when two nodes share a name**: ROS 2 does not stop you. Both run. Both appear — and `ros2 node list` shows the name twice, which is the only warning you get. Tools that take a node name now behave unpredictably, because the name no longer identifies one thing.
6. **IMAGE** — the name collision (below)
7. **EXERCISE** (DEBUGGING) — the duplicate-name failure (below)
8. **EXERCISE** (INDEPENDENT) — run a three-node system with names of the learner's choosing (below)
9. **QUIZ** — the module quiz (below)
10. **TEXT** — recap and connection to Module 6.

**Visual requirements:**
- **Purpose:** show why a duplicate name is worse than an error — it's an ambiguity · **Concept:** two distinct processes claiming one address · **Format:** two identical node boxes both labelled `/my_first_node`, with a tooling command pointing at the name and its arrow *forking* to both · **What should be shown:** `ros2 node info /my_first_node` at the bottom with a question mark where the answer should be, and `ros2 node list` printing the same name twice as the only visible symptom · **What the learner should understand:** nothing crashed, and that's exactly the problem — the system is now ambiguous rather than broken, which is far harder to notice.

**Practical exercise — DEBUGGING** (per §11: observe → investigate → use ROS 2 tools → identify root cause → fix):

> **Scenario:** You start your node from Lesson 3 in one terminal. In a second
> terminal you start it again — same script, because you want two of them
> running. Both terminals look completely healthy and both are logging once a
> second, exactly as expected.
>
> Then `ros2 node info /my_first_node` starts returning results that don't
> match what you expect, and behave differently each time you run it. Nothing
> has errored. Nothing has crashed.
>
> **Hint 1:** Before investigating either node, take the census. Run
> `ros2 node list` and read every line — including the ones that look like
> duplicates of each other. Count them.
> **Hint 2:** The same name appears twice. That's not a display bug: there are
> genuinely two nodes, and they are genuinely both called the same thing. Now
> reconsider what `ros2 node info /my_first_node` can possibly mean.
> **Hint 3:** Every node-targeting command takes a *name*, not a process. What
> should a command do when the name it was given identifies two things?
>
> **Solution:** Both processes claimed the node name `my_first_node`, because
> the name is hard-coded in the script and you ran the script twice.
> **Root cause:** A node's name is its address in the system, and ROS 2 does
> not enforce uniqueness — it will let two nodes share a name and carry on.
> Every tool that resolves a name is then ambiguous, which is why the results
> looked inconsistent rather than wrong. Nothing failed; the question simply
> stopped having one answer.
> **Fix:** Give each instance a distinct name at launch rather than editing the
> file twice: run the second one with
> `python3 my_first_node.py --ros-args -r __node:=my_second_node`, then confirm
> with `ros2 node list` that two *different* names appear.

Chosen over a crash-style bug deliberately. Every debugging exercise so far in
this course has had a visible failure to work backwards from — a `command not
found`, a `Permission denied`, a turtle that won't move. This one has no error
at all, and learning that *inconsistency is itself a symptom* is the step up
this module should provide.

**Practical exercise — INDEPENDENT:** start three copies of the Lesson 3 node
simultaneously, each with a distinct, meaningful name of the learner's own
choosing (something like `left_wheel`, `right_wheel`, `battery_monitor`).
Confirm with `ros2 node list` that all three appear with distinct names, then
use `ros2 node info` on exactly one of them and explain how the system knew
which one was meant. Goal only, no procedure — every command needed appeared
earlier in this module.

**Quiz** (§12 — scenario, architecture and command-selection questions, explanation-first):

1. *Scenario:* "`ros2 node list` shows `/my_first_node` twice. Nothing has errored and both terminals look healthy. What has happened, and why is it a problem?" → **Two processes claim the same node name; every name-targeting tool is now ambiguous.** *Explanation: ROS 2 does not enforce name uniqueness, so this never announces itself as an error — the inconsistency is the symptom.*
2. *Architecture:* "Your robot's path planner crashes. What happens to the motor controller node running alongside it?" → **It keeps running, unaffected.** *Explanation names independent failure as the concrete benefit of process separation, and points back to the kill-teleop exercise where the learner saw it.*
3. *Command selection:* "You want to know which topics one specific node publishes and subscribes to. Which command?" → **`ros2 node info <name>`.** *Explanation: `node list` is the census, `node info` is the interview — `topic list` would tell you what exists system-wide without saying which node is responsible.*
4. *Scenario / naming:* "In `ros2 run turtlesim turtlesim_node`, which part is the node's name?" → **None of them — the node is `/turtlesim`, which you only learn by asking the running system.** *Explanation separates package / executable / node name, and uses teleop as the case where executable and node name don't resemble each other at all.*
5. *True/False:* "Because a Python node and a C++ node are written in different languages, they need a bridge or translation layer to talk to each other." → **False.** *Explanation: they communicate over topics, not function calls, so the language boundary never arises — and this is precisely why a team can reuse someone else's driver without caring what it was written in.*

**Recap:** A node is a named running process with four kinds of connection
(L1) → systems are split into many of them for independent failure, reuse,
language independence and distribution, at a real cost in moving parts (L2) →
you wrote one, in about fifteen lines, and found it in the system's own census
(L3) → names are addresses, discovery needs no master, and duplicate names
produce ambiguity rather than errors (L4).

**Connection to Module 6:** "Your node runs, logs, and has a name — but it
doesn't talk to anything. It's a node in a system of one. Module 6 is the big
one: topics, publishers and subscribers. It answers the question Module 4 left
open on purpose — why the turtle stops moving when you let go of the arrow key
— and by the end of it your node will be driving the turtle itself, with teleop
removed entirely."

---

**Checkpoint:** review before Module 6 — particularly (a) whether the
standalone-script decision in Flag 1 holds up once written out as real lesson
text, or whether the absence of a package starts to feel like something being
hidden, and (b) whether Lesson 2's cost section is honest enough to be useful
or reads as hedging after the four benefits that precede it.
