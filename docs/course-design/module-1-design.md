# ROS 2 Fundamentals — Phase 5: Module 1 Design

**"What Is ROS 2 and Why Do We Need It?"**

Per §5/§9: no installation, no definitions-first. All three lessons stay pre-ROS2-tooling — the course's first hands-on moment is deliberately Module 4, after Module 3 installs anything. Terminology (node, etc.) is introduced only after the intuition for *why* it exists has been built, per §5's own rule.

---

## Lesson 1 — Why Robotics Software Is Hard

**Objective:** Identify the distinct, simultaneous concerns (sensors, actuators, perception, planning, control, communication) a robot's software must handle, and understand why that makes robotics software genuinely different from typical application software.

**Concepts covered:** What robotics software is; why it's complex; sensors; actuators; perception; planning; control; communication.

**Content block sequence:**
1. **TEXT** — real-world hook: "Imagine you're asked to write the software for a warehouse delivery robot. Where do you even start?"
2. **TEXT** — intuitive unpacking: the robot has to see (perception), decide where to go (planning), move safely (control), read its own hardware (sensors), act on the world (actuators) — and all of these have to talk to each other (communication) — all at once, not one after another
3. **IMAGE** — a robot at the center with all six concerns labeled radiating outward, each with a one-phrase concrete example
4. **TEXT** — now that the intuition exists, name each concern precisely: perception = making sense of sensor data; planning = deciding what to do next; control = actually and safely moving the hardware; etc. — jargon after understanding, per §5
5. **CALLOUT** (INFO) — reflection prompt: "Think of a robot you've seen — a robot vacuum, a warehouse robot, a drone. Can you spot its sensors? Its actuators? What do you think its 'planning' looks like?"
6. **TEXT** — bridge to Lesson 2: now that the pieces are named, the natural next question is how they fit into one program — and what happens when they don't fit well

**Visual requirements:**
- **Purpose:** build intuition for robotics software's simultaneous, distinct concerns · **Concept:** sensors/actuators/perception/planning/control/communication · **Format:** labeled radial diagram (one robot, six labeled segments) · **What should be shown:** the robot plus six labeled concerns, each with a concrete example (sensors: camera, LIDAR; actuators: wheels, arm) · **What the learner should understand:** a robot's software isn't one function — it's several genuinely different jobs running at once.

**Video requirements:** None. This lesson is about robotics complexity in general, not ROS 2 specifically — the course's video-curation strategy is scoped to ROS 2-relevant content (§15 requires a "ROS 2 version relevance" field for every citation), and a generic "how robots work" video would drift from that. The diagram carries this lesson's visualization need.

**Practical exercise:** None — explicitly justified, not omitted by default. Nothing is installed until Module 3, and the EXERCISE block type built in Stage 0 is Turtlesim-based by design; there is no ROS 2 environment to practice in yet. The reflection CALLOUT above covers this lesson's REFLECT step without stretching the EXERCISE type to a paper-only task it wasn't built for.

**Quiz:** None at the lesson level — Module 1 carries one module-level quiz, placed at the end of Lesson 3 (matching Module 0's own pattern: quizzes are module artifacts, not per-lesson ones).

**Recap / connection to next:** "You've named the jobs a robot's software has to do. Next: what actually goes wrong when you try to do all of them in one program."

---

## Lesson 2 — Monolithic vs. Modular Robotics Software

**Objective:** Understand why cramming all of a robot's concerns into one program breaks down in practice, and why dividing robotics software into cooperating, specialized pieces solves that.

**Concepts covered:** Monolithic software limitations; why modular robotics software matters; distributed robotics systems (introduced conceptually, no ROS-specific terms yet).

**Content block sequence:**
1. **TEXT** — continues the delivery-robot scenario: "Suppose you write perception, planning, and control as one big program. What happens when the planning code crashes? When you want to swap the camera?"
2. **TEXT** — concrete monolithic failure modes: one bug anywhere crashes everything; you can't test planning logic without the real camera attached; two engineers can't work on perception and control at once without conflicts; swapping one sensor means touching code that has nothing to do with sensors
3. **IMAGE** — before/after diagram: one large "Robot Software" box (tangled) vs. the same functionality as several smaller connected boxes (modular)
4. **TEXT** — introduce the fix conceptually: what if each concern were its own separate program that just... talked to the others? This is a *distributed system* — independent, cooperating processes instead of one big one
5. **CALLOUT** (TIP) — "This isn't unique to robotics — it's the same idea behind a modern website built from many small backend services instead of one giant program."
6. **TEXT** — bridge to Lesson 3: this exact idea — dividing robot software into cooperating pieces that talk to each other — is the problem ROS and ROS 2 exist to solve

**Visual requirements:**
- **Purpose:** contrast monolithic vs. modular robotics software structurally · **Concept:** modularity / distributed systems · **Format:** side-by-side before/after diagram · **What should be shown:** left — one large tangled "Robot Software" box; right — the same functionality as separate, connected boxes · **What the learner should understand:** modularity restructures the *same* work into independently-manageable pieces — it isn't about doing less.

**Video requirements:** None, same reasoning as Lesson 1 — still pre-ROS2, general software-architecture motivation. The diagram carries the visualization need.

**Practical exercise:** None — same justification as Lesson 1: still no ROS 2 environment to practice in.

**Quiz:** None at the lesson level (module quiz lands in Lesson 3).

**Recap / connection to next:** "You've seen why robotics software needs to be divided into cooperating pieces. Next: meet the tool robotics engineers actually use to build exactly that."

---

## Lesson 3 — What ROS 2 Is, and Why Not ROS 1

**Objective:** Understand what ROS/ROS 2 are at a high level, why ROS 2 exists rather than continuing with ROS 1, and be able to answer "what problem does ROS 2 solve?" in their own words.

**Concepts covered:** ROS; ROS 1; ROS 2; why ROS 2 exists; what problems ROS 2 solves — using the camera→perception→planning→control→robot example architecture from §9's Module 1 description.

**Content block sequence:**
1. **TEXT** — bridge: "ROS — the Robot Operating System — is the answer robotics engineers actually reached for, starting in 2007."
2. **TEXT** — what ROS is at a high level: not an operating system in the Linux/Windows sense — a framework and toolset for building exactly the kind of modular, cooperating robot software from Lesson 2, plus a large ecosystem of reusable robot software
3. **IMAGE** — the concrete pipeline: Camera Node → Perception Node → Planning Node → Control Node → Robot — the first time a concrete "node" architecture appears, made tangible rather than abstract
4. **TEXT** — walk the diagram: what each node might actually do, explicitly reconnecting to Lesson 2's pain points by name (swap the camera → only the Camera Node changes; a bug in planning → doesn't take down perception)
5. **TEXT** — ROS 1's limitations, kept high-level per this module's own scope (not a migration guide): no built-in protection against a single point of failure, no built-in security, and mid-2000s design decisions that didn't anticipate today's multi-robot, real-time, embedded use cases. ROS 2 rebuilt the foundation rather than patching it.
6. **CALLOUT** (INFO) — version-awareness note: "This course teaches ROS 2 (Jazzy Jalisco) throughout. A tutorial that just says 'ROS' with no '2' is almost certainly ROS 1 — commands and concepts often look similar but aren't identical."
7. **TEXT** — closing reflection, verbatim per the design doc's own instruction: "Before moving to Module 2, answer this for yourself, in your own words: what problem does ROS 2 solve?"
8. **QUIZ** — the module's quiz (below)

**Visual requirements:**
- **Purpose:** make "modular robot software" concrete for the first time · **Concept:** the camera→perception→planning→control→robot pipeline · **Format:** horizontal pipeline diagram, labeled boxes with directional arrows · **What should be shown:** five stages in sequence, each explicitly labeled as a *node* (term introduced lightly here, fully defined in Module 5) · **What the learner should understand:** this is what Lesson 2's abstract "cooperating pieces" idea actually looks like in a real robot.

**Video requirements:** **None included here — deferred, not dropped.** I researched this specifically, since "what is ROS 2" is the natural fit for a curated video. Found a real, verified candidate:

```
VIDEO TITLE: Getting Started with ROS 2
CREATOR / CHANNEL: Mike Likes Robots
LINK: https://www.youtube.com/watch?v=8aoFndU7jos
APPROXIMATE DURATION: Not confirmed — title and channel were verified via
  YouTube's own oEmbed metadata endpoint, but duration wasn't retrievable
  through available tools. Needs a 30-second direct check before this
  citation is finalized for use.
COURSE MODULE: Candidate for Module 2 (Ecosystem and Fundamental
  Architecture), not Module 1
LESSON: Candidate for Module 2's ecosystem-overview lesson
ROS 2 VERSION RELEVANCE: General overview, not distribution-specific
WHY SELECTED: Confirmed real (not fabricated) via oEmbed; a companion
  blog post confirms accurate coverage of node-based communication
WHAT THE LEARNER WILL GAIN: A second, differently-voiced reinforcement
  of why ROS 2 divides robot software into communicating nodes
```

On review, its actual content already covers topics, services, actions, and packages in depth — Module 6/7/8/10 territory this course hasn't introduced yet. Using it in Module 1 would front-load vocabulary ahead of its own dedicated, scaffolded lessons, so flagging it forward for Module 2's design pass rather than force-fitting it here or silently dropping the research.

**Practical exercise:** None. Same reasoning as Lessons 1–2, stated explicitly here since this is the module's last lesson: the course's first hands-on moment is deliberately Module 4, immediately after Module 3 installs ROS 2. An exercise here would either be disconnected busywork or require jumping ahead to installation, which §9 explicitly rules out for this module.

**Quiz** (§12 — scenario-based, explanation-first, not memorization):

1. *Scenario, single choice:* "A robot's camera code has a bug that crashes it. In a monolithic design, what else stops working?" → **Everything — planning and control depend on the same crashed program.** *Explanation: modularity would have contained the failure to the camera piece alone; this is precisely the motivation from Lesson 2.*
2. *Single choice:* "What is the most accurate description of what ROS/ROS 2 provides?" → **A framework and toolset for building modular, communicating robot software.** *(Distractors: "an operating system that replaces Linux," "a robot simulator," "one all-in-one control program" — each explained as a common misconception.)*
3. *True/False:* "ROS 2 was created to patch a few small bugs in ROS 1." → **False.** *Explanation: ROS 2 is a foundational redesign addressing things ROS 1's original architecture didn't anticipate — multi-robot support, real-time control, security — not a bugfix release.*
4. *Scenario, single choice:* using the pipeline diagram: "You want to upgrade only the camera hardware and its driver. Which part of the pipeline needs to change?" → **Just the Camera Node.** *Explanation: this is the entire point of dividing the system into independent nodes.*

**Recap:** This module moved from "robots need distinct capabilities" (L1) to "monolithic code can't handle that well" (L2) to "ROS 2 is the modular framework built to solve it" (L3). The learner should now be able to answer, unprompted: **what problem does ROS 2 solve?**

**Connection to Module 2:** "Module 2 opens up ROS 2's own architecture — the 'graph' of nodes, how they actually find and talk to each other, and the middleware underneath that makes it possible. You already know the *shape* of the answer from this module's camera→perception→planning→control example; Module 2 explains the machinery behind it."

---

**Checkpoint:** review before Module 2 begins — in particular, confirm the "no exercise, no video in Lessons 1–2" calls are the right ones, and weigh in on deferring the Mike Likes Robots video to Module 2 rather than using it here.