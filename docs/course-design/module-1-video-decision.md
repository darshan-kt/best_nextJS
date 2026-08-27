## 1. Why no video in Lessons 1–2

I went back and actually searched for one before answering this, rather than re-asserting the earlier principle — four separate searches, different angles:

- ROS 2 robots showcase / "why robotics is hard" video
- Articulated Robotics' own back-catalogue for an intro-style video
- A general "why robot software is different" explainer
- A known real platform (TurtleBot 4 / Clearpath) demo video

None produced a real, nameable, verifiable video that fits the actual gap here. What exists instead falls into two buckets, neither of which is right:

- **Full ROS 2 tutorials** ("Learn ROS2 in 1 hour," "ROS2 for Beginners") — these teach nodes/topics/services immediately, which is exactly the premature-vocabulary problem from the Mike Likes Robots video, just earlier and worse, since Lessons 1–2 haven't even named ROS 2 yet.
- **Text articles, not videos** — "5 Reasons Programming Robots is Hard," "Why ROS 2?," "Why making robots is still hard" are all real, well-written, and *say* what I want Lesson 1 to say — but they're blog posts and design documents, not videos, so they don't satisfy what's actually being asked for here.

There's a structural reason this search kept coming up empty, not just bad luck: "why is robotics software hard, in general, before any framework is named" is a *course-design* framing, not a *content-creator* framing. Robotics YouTube — even the good, credible channels I validated in Phase 1 (Articulated Robotics, Robotics Back-End) — makes videos that assume the viewer already wants to learn ROS 2 specifically, and gets there fast. Nobody's making a 5-minute "here's why a warehouse delivery robot's software is a genuinely different engineering problem" video, because that's scaffolding for a *course*, not a standalone piece of content anyone searches for on its own.

Given that, the honest call is to keep Lessons 1–2 video-free, on two grounds now — the original curation-scope one, plus this new evidence:

1. §15 requires "ROS 2 version relevance" for every citation. A generic robotics-complexity video (if one existed) wouldn't clear that bar; a ROS 2-specific one (the kind that does exist) clears it by teaching mechanisms these lessons deliberately haven't introduced yet.
2. Having now actually searched and found nothing that threads that needle, forcing a mismatched video in here to satisfy §14's pattern would be worse than the diagram-only approach already in place — §15 explicitly rules out recommending a video "simply because" a slot exists for one.

The diagrams (radial six-concerns diagram, before/after monolithic-vs-modular diagram) remain this pair of lessons' visualization, and the reflection CALLOUTs remain the hook mechanism. If a suitable video surfaces later — worth another look once Module 1 is live and I can see what real learners say they wished they'd seen — that's a revision, not a gap being silently accepted now.

## 2. What the Mike Likes Robots video is actually about, and why that's a Module 2 fit

From the verified companion blog post (not guessed): it covers **ROS 2's messaging system** (topics as publish/subscribe, services as request/response, actions as request/feedback/response), **packages** (organizational units containing nodes, enabling reuse instead of building from scratch), **tools** (rosbags for recording, logging, visualization, transform libraries), and a **TurtleBot 4 autonomous-mapping example** tying it together. In other words: it's a *survey* of the ROS 2 ecosystem's major pieces, pitched at "here's the shape of the whole thing," not a deep treatment of any one piece.

That's the precise reason it's a Module 2 fit and not a Module 1 or Module 6–10 fit — it's not just "more advanced," it's pitched at exactly Module 2's altitude and no other module's:

- **Not Module 1**: Module 1's entire job is justifying *that ROS 2 should exist at all*, before naming any of its mechanisms — Lesson 3 only gets as far as introducing the word "node," and only inside one concrete pipeline example. This video already explains topics, services, actions, and packages by name. A learner who watches it in Module 1 arrives at Module 2 already knowing what Module 2 is about to teach them — and worse, arrives at Module 6 (Topics), Module 7 (Services), and Module 8 (Actions) with the "what if a robot needs continuous data flow, not request/response?" hook already spent. Those lessons are built to *introduce* that need; the video would have already answered it, flattening three lessons' worth of deliberate motivation into "oh yeah, I already know this."
- **Not Module 6–10 either**: those modules go deep on one mechanism each (writing a real publisher/subscriber, a real service server/client, a real package with `colcon`). This video doesn't go deep on any single one — it's an overview, which would undersell what those modules are for if used there instead of a hands-on-adjacent video.
- **Is Module 2**: Module 2's own stated job (from Phase 2/3) is "the ROS 2 Graph... Communication interfaces... Packages, Workspaces... teach enough to build intuition" — a deliberately shallow, breadth-first pass across exactly the set of things this video covers, before any of them get their own dedicated module. This is the one place in the curriculum where "topics, services, actions, and packages, all previewed at once, none taught deeply yet" is precisely the intended depth, not premature exposure.

The spaced-repetition design from Phase 4 depends on this ordering holding — each mechanism needs its own "first real need for it" moment (M6, M7, M8) to land, and a survey video that's already shown all three flattens that. Placing it at Module 2 instead preserves the sequence exactly as designed, while still using a video that's real, useful, and honestly matched to what it actually contains.

Module 2's own design — including deciding whether to actually use this video there — stays untouched until that stage.