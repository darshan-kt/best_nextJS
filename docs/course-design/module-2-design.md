# ROS 2 Fundamentals — Phase 5: Module 2 Design

**"ROS 2 Ecosystem and Fundamental Architecture"**

Per §2 of the design doc: DDS stays at intuition-level throughout, never internals. Still pre-installation (Module 3 is next) — no hands-on ROS 2 tooling exists yet, so I'm applying the same "justify, don't default" standard to the no-exercise call in every lesson here, proactively, given the scrutiny Module 1 got.

---

## Lesson 1 — The ROS 2 Graph

**Objective:** Build a conceptual mental model of the ROS 2 graph — nodes as independent programs that discover and connect to each other — without installing or running anything yet.

**Concepts covered:** ROS 2 ecosystem (intro); the ROS graph; nodes (conceptual, building on Module 1's pipeline example); communication interfaces (topics named, not taught); DDS discovery behavior.

**Content block sequence:**
1. **TEXT** — bridge from Module 1: "You've seen the shape of a ROS 2 system: a camera node, a perception node, a planning node, a control node — each a separate program. This module gives that shape a name: the ROS 2 graph."
2. **TEXT** — the graph concept: every running node becomes part of one shared, live graph; nodes discover each other and connect automatically based on what they need to exchange
3. **IMAGE** — the Module 1 pipeline example redrawn as an actual node-and-edge graph, not a simple left-to-right pipeline
4. **TEXT** — communication interfaces, named but not taught: nodes mostly talk via *topics* (continuous data flow); two other mechanisms — *services* (request/response) and *actions* (longer tasks with feedback) — exist too, each earning its own module later. "How any of this actually works in code is Module 6's job — for now, just know these are the three ways the graph's connections carry data."
5. **CALLOUT** (INFO) — DDS-discovery misconception, per Phase 4: "By default, ROS 2 nodes discover each other automatically over the *local network*, not just within one program. On a shared network (a university lab, a shared office Wi-Fi), your nodes might unexpectedly 'see' someone else's robot. This is configurable (`ROS_DOMAIN_ID`), covered when it actually matters."
6. **EMBED** — reinforcement video, placed here per §14's THEORY → VIDEO pattern, now that graph/nodes/topics/services/actions have all been named (full citation below)
7. **TEXT** — bridge to Lesson 2: "You know *what* the graph is and roughly how nodes talk. Next: what's actually running underneath to make that discovery and communication possible."

**Visual requirements:**
- **Purpose:** make "the graph" concrete as a connected structure, not a list · **Concept:** the ROS 2 computation graph · **Format:** node-and-edge diagram, loosely matching real `rqt_graph` visual conventions to prime recognition for Module 13 · **What should be shown:** the camera→perception→planning→control→robot nodes, now drawn as a connected graph with labeled edges · **What the learner should understand:** this connected structure *is* "the graph" — a term used for the rest of the course.

**Video requirements:**
```
VIDEO TITLE: Getting Started with ROS 2
CREATOR / CHANNEL: Mike Likes Robots
LINK: https://www.youtube.com/watch?v=8aoFndU7jos
APPROXIMATE DURATION: Not verified. Attempted via YouTube's oEmbed
  endpoint (returned title/channel only, no duration field) and two
  direct page fetches targeting duration meta tags specifically
  (returned only static page shell, no metadata) — genuinely
  unavailable through tools accessible here, not guessed. Needs a
  direct 30-second check before this citation is used in the live
  course.
COURSE MODULE: Module 2 — ROS 2 Ecosystem and Fundamental Architecture
LESSON: Lesson 1 — The ROS 2 Graph
ROS 2 VERSION RELEVANCE: General overview, not distribution-specific;
  content is stable across recent distributions including Jazzy
WHY SELECTED: Confirmed real via YouTube's own oEmbed metadata (not
  fabricated); verified companion blog post confirms accurate coverage
  of nodes, topics/services/actions, and packages at survey depth —
  matching exactly the depth this lesson (and Lesson 3) teaches at,
  which is why it was deferred here from Module 1 rather than used
  there
WHAT THE LEARNER WILL GAIN: A second, differently-voiced synthesis of
  the graph/communication idea just taught, plus an early, intentional
  glimpse of services, actions, and packages before their own
  dedicated modules — priming recognition, not teaching depth
```

**Practical exercise:** None. Still pre-installation — nothing exists to run or inspect yet. The graph is being taught as a mental model the learner will *recognize* once Module 4 shows them a real one.

**Quiz:** None at the lesson level — the module quiz sits at the end of Lesson 3, matching Modules 0 and 1's own pattern.

**Recap / connection to next:** "You now have a name and a mental picture for how nodes connect: the graph. Next: what's actually running underneath it."

---

## Lesson 2 — The ROS 2 Stack

**Objective:** Understand the layered architecture beneath the graph — client library, middleware interface, DDS, network — at intuition level, per §2's explicit instruction not to go deep into DDS.

**Concepts covered:** the ROS 2 stack; middleware (conceptual); DDS introduction (shallow, bounded).

**Content block sequence:**
1. **TEXT** — real-world framing: "When two nodes talk, something has to carry the data across the network, notice a node crashing mid-conversation, and figure out who's currently running. You don't write that yourself — there's a whole stack underneath the graph handling it."
2. **TEXT** — the stack top to bottom: your code (the ROS 2 application) → the client library (`rclpy`/`rclcpp` — the API you actually call) → the ROS middleware interface (a translation layer) → DDS (the real networking/discovery engine) → the network
3. **IMAGE** — the layered stack diagram (ROS 2 Application → Client Library → Middleware Interface → DDS → Network), matching the design doc's own architecture
4. **TEXT** — DDS, explicitly bounded: "DDS is the industry-standard technology that actually finds other nodes and moves data between them. You don't need its internals to use ROS 2 well — this course won't go deeper than this paragraph on DDS itself."
5. **CALLOUT** (TIP) — "If a tutorial or error message mentions 'RMW' or a specific DDS vendor (Fast DDS, Cyclone DDS), that's this middleware layer — you're not missing something fundamental if you don't recognize it yet."
6. **TEXT** — bridge to Lesson 3: "You know what's underneath one node. Next: how many nodes get organized into distributable, reusable units — and where ROS 2 itself actually comes from."

**Visual requirements:**
- **Purpose:** build intuition for the machinery beneath a ROS 2 program, without teaching DDS internals · **Concept:** the ROS 2 stack · **Format:** vertical five-layer stacked-box diagram with downward arrows · **What should be shown:** each layer labeled with a one-phrase job ("your code," "the API you call," "translation layer," "networking/discovery," "the wire") · **What the learner should understand:** real machinery exists beneath every program, but they only ever write code against the top layer.

**Video requirements:** None. This is the one lesson whose content the Mike Likes Robots video doesn't meaningfully cover — its verified focus is nodes/topics/services/actions/packages/tools, not the middleware stack. No other verified candidate surfaced for this narrow a topic, and per §2's own instruction to keep DDS shallow, a deep DDS-explainer would be the wrong depth even if one existed. Including a video here just to fill a slot would repeat the exact mistake already ruled out for Module 1.

**Practical exercise:** None — same reasoning as Lesson 1: still pre-installation, and nothing in an architectural mental model gives a Turtlesim-based exercise something real to attach to yet.

**Quiz:** None at the lesson level.

**Recap / connection to next:** "You know what's running underneath one node. Next: how nodes get organized into packages — and a first look at where a distribution like Jazzy actually comes from."

---

## Lesson 3 — Distributions, Packages, and Workspaces

**Objective:** Understand, at preview depth, what a distribution, a package, and a workspace are — enough that Module 3's install and Module 10's hands-on treatment both make sense when they arrive.

**Concepts covered:** ROS 2 distributions; packages (conceptual preview); workspaces (conceptual preview) — explicitly *not* `colcon`/build mechanics, which stay Module 10's job.

**Content block sequence:**
1. **TEXT** — bridge: "ROS 2 isn't one download — it's released in named distributions (this course uses Jazzy Jalisco), and your code lives inside packages, organized inside a workspace. Module 10 covers the mechanics; this lesson is just the map."
2. **TEXT** — distributions: a tested, compatible bundle of ROS 2 plus thousands of community packages, released on a schedule with a name and support window — ties directly back to Module 1's version-pin CALLOUT and Module 0's environment checklist.
3. **TEXT** — packages: a bundle of one or more related nodes plus everything they need (code, config, dependencies) into a shareable, reusable unit — why an engineer can install someone else's camera driver instead of writing one from scratch.
4. **TEXT** — workspaces: where *your own* packages live while you develop them, kept separate from the distribution's pre-built ones.
5. **IMAGE** — nested-containment diagram: distribution (outer) contains many packages; a workspace holds the packages *you're* currently developing, visually distinguished from the distribution's own
6. **CALLOUT** (WARNING) — expectation-setter: "Module 10 is where this becomes hands-on — a real workspace, a real package. If `colcon` or `rosdep` mean nothing yet, that's expected; this lesson is the map, not the territory."
7. **TEXT** — module-level synthesis: "Nodes connect on a graph (Lesson 1); a stack underneath makes that possible (Lesson 2); packages inside a distribution organize and share the code (this lesson). Module 3 makes all of this real."
8. **QUIZ** — module quiz (below)

**Visual requirements:**
- **Purpose:** show distribution/package/workspace as containment scopes, not difficulty levels · **Concept:** distribution/package/workspace relationship · **Format:** nested-boxes diagram · **What should be shown:** Jazzy Jalisco (outer) containing many packages, with a separately-labeled "your workspace" cluster · **What the learner should understand:** these are three different *scopes* — what ROS 2 ships with vs. what you're building — not three levels of difficulty.

**Video requirements:** None additional. The Mike Likes Robots video already appeared in Lesson 1, and its packages coverage was part of that placement's justification — repeating it here would be the exact "duplicate video without justification" §15 warns against.

**Practical exercise:** None — same reasoning as Lessons 1–2, plus one more specific to this lesson: it's a deliberate *preview* of Module 10's content, and Module 10 is where the real create-workspace/build-package exercise belongs. Doing any part of it here would either be hollow (nothing installed) or duplicate Module 10's own GUIDED exercise before its concept has been properly earned.

**Quiz** (§12 — scenario/architecture, explanation-first):

1. *Single choice:* "What is a ROS 2 distribution most similar to?" → **A tested, versioned release bundle (like a Linux distribution).** *(Distractors: a single downloadable robot program; a company; a programming language.)*
2. *Scenario, single choice:* "You want to use someone else's camera driver instead of writing one yourself. What ROS 2 concept lets you do that?" → **Install their package.** *Explanation ties back to Lesson 3's reuse framing.*
3. *True/False:* "DDS is something every ROS 2 developer needs to configure by hand for their code to work." → **False.** *Explanation: DDS operates underneath the client library by default; most developers never touch it directly, consistent with Lesson 2.*
4. *Scenario, single choice, using the stack diagram:* "Your node calls a function from `rclpy`. Which layer of the stack is that?" → **The ROS 2 Client Library.** *Explanation reinforces Lesson 2's layered model.*

**Recap:** This module gave Module 1's camera→perception→planning→control shape real architecture: a graph of connected nodes (L1), a stack underneath making connection possible (L2), and packages/distributions organizing the code (L3).

**Connection to Module 3:** "You have the complete mental model now. Module 3 makes it real: installing ROS 2 Jazzy on Ubuntu 24.04, and understanding exactly what that installation puts on your machine and why sourcing it matters."

---

**Checkpoint:** review before Module 3 — in particular, confirm the Lesson 1 video placement (reinforcement *after* graph/topics/services/actions are named, not as an opener) and that Lesson 2's DDS depth actually stays as shallow as intended.