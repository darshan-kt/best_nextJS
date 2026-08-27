# Lesson 2 — DDS Content Audit

Actual inventory, quoting Lesson 2's designed text exactly, not restating intent.

## Every DDS-related term/concept that appears

| Where | Exact text | What it teaches |
|---|---|---|
| Block 1 (TEXT, pre-naming) | "something has to carry the data across the network, notice a node crashing mid-conversation, and figure out who's currently running" | The *job* DDS does, in plain language, before DDS is even named — data transport and liveliness/presence awareness, at the level of "what problem exists," not "how it's solved" |
| Block 2 (TEXT, the stack) | "DDS (the real networking/discovery engine)" | First naming of DDS, with a two-word functional label — networking + discovery |
| Block 4 (TEXT, the DDS paragraph) | "DDS is the industry-standard technology that actually finds other nodes and moves data between them. You don't need its internals to use ROS 2 well — this course won't go deeper than this paragraph on DDS itself." | DDS is (a) an industry standard, not ROS-specific, (b) finds nodes, (c) moves data — three function-level facts, with an explicit, stated depth boundary |
| Block 5 (CALLOUT, TIP) | "If a tutorial or error message mentions 'RMW' or a specific DDS vendor (Fast DDS, Cyclone DDS), that's this middleware layer — you're not missing something fundamental if you don't recognize it yet." | "RMW" as an acronym tied back to the already-introduced middleware layer; two vendor *names*, offered only as "if you see this word, here's what it maps to" |

That's the complete list — four appearances total, across three blocks.

## Checked against the four boundaries

**Specific DDS vendor implementations (Fast DDS, Cyclone DDS, Connext) beyond a passing mention that they exist:** Fast DDS and Cyclone DDS are named once, in the CALLOUT, as a flat list with no elaboration — no explanation of what either does differently, no comparison, no configuration, no mention of Connext at all. This is a passing mention, not a treatment. **Compliant.**

**QoS policy details beyond "reliability and durability exist as concepts":** Neither "QoS," "reliability," nor "durability" appears anywhere in Lesson 2 — the lesson doesn't even use the allowance the boundary grants it. **Compliant, and more conservative than the ceiling.**

**RTPS wire protocol:** Not mentioned. "RTPS" doesn't appear anywhere in the lesson. **Compliant.**

**Discovery protocol internals:** "Discovery" appears twice (block 2's "networking/discovery engine," block 4's "finds other nodes"), both purely as a *function* DDS performs — never *how* discovery happens (no multicast, no discovery phases, no participant/endpoint discovery distinction, no discovery-server concept). **Compliant** — this is the necessary minimum to explain why DDS matters at all (it's what makes Lesson 1's "nodes discover each other automatically" claim true), not internals.

## Conclusion

Nothing needs to be trimmed. Lesson 2 names DDS, states its two jobs (find nodes, move data) at the level of "what," explicitly declares its own depth ceiling in-text ("this course won't go deeper than this paragraph"), and the one place vendor/acronym names appear is scoped to recognition ("if you see this word elsewhere") rather than explanation. The design holds §2's intuition-only line as actually written, not just as intended.

Module 3 stays untouched, as scoped.