# ROS 2 Fundamentals — Phase 5: Module 6 Design

**"Topics, Publishers, and Subscribers"**

§9 says this "must be one of the strongest modules." It is also the module
carrying the most inherited debt in the course: Module 4 deliberately refused to
explain why the turtle stops moving when you let go of an arrow key, Module 5
ended by promising that *"by the end of it your node will be driving the turtle
itself, with teleop removed entirely,"* and Module 2 promised that how any of
this works in code is Module 6's job. All three promises are load-bearing and
all three are paid off below — the first in Lesson 1, the second in Lesson 3,
the third across the whole module.

Six structural decisions are flagged up front, per the Stage 4 instruction to
raise anything that doesn't fit the approved curriculum rather than silently
adjusting it. Two of them contradict the design document directly.

---

## Flag 1 — Five lessons, not four

Every module since Module 3 has been four lessons. This one is five.

§9 lists nine concepts for this module (pub/sub architecture, topics,
publishers, subscribers, message types, message flow, multiple publishers,
multiple subscribers, topic inspection), five commands, and three artefacts the
learner must build (a publisher, a subscriber, a multi-node system). That is
close to twice Module 5's load, and the module is explicitly designated as one
that should be strong rather than economical.

The split that falls out of the material is: the model (L1), the type system
and inspection (L2), writing a publisher (L3), writing a subscriber and closing
a loop (L4), and what happens when there is more than one of either (L5).
Compressing to four means merging L3 and L4 — publisher and subscriber in one
lesson — and that is exactly the merge to avoid, because the subscriber's
callback-on-arrival is a genuinely different idea from the publisher's
send-on-a-timer, and collapsing them is how learners end up thinking a
subscription is a kind of polling.

**Estimated size: roughly 68 content blocks and seven diagrams**, against
Module 5's 46 and four. Flagged so this is a decision taken now rather than a
surprise discovered during implementation.

## Flag 2 — §9's own example diagram teaches the misconception §21 warns about

§9 draws the module's central concept like this:

```text
Publisher
    │
    │ /robot/sensor_data
    ▼
   TOPIC
    │
    ├────────────► Subscriber A
    │
    └────────────► Subscriber B
```

The box in the middle is wrong, and it is wrong in the specific way that
produces the most durable beginner misconception about ROS 2: that a topic is a
*thing* — a broker, a server, a process — sitting between publisher and
subscriber, which something has to run and which can fail. It cannot fail,
because it does not exist. Discovery (taught in Module 5 Lesson 4) matches a
publisher and a subscriber that named the same string with the same message
type, and after that the data travels directly between the two processes.

This also sets up a specific later failure: a learner who believes in a topic
process will look for it when data stops flowing, instead of checking the two
endpoints — which is the only place the fault can be.

**Resolution: every diagram in this module draws the topic as a *label on the
connection*, never as a node.** The fan-out shape §9 wants is preserved — one
publisher, several subscribers, the topic name shown once — but the name sits
on the arrows rather than in a box. Lesson 1 block 6 states the point in prose
as well, because the diagram alone won't dislodge an assumption the learner
arrived with.

Deviating from an example in the design document, so: flagged rather than
silently corrected.

## Flag 3 — `ros2 topic list` and `ros2 topic echo` are already taught

§9 lists both under this module. Both were taught in Module 4 Lesson 3, and
`echo` in particular did real work there: it is the tool behind Module 4's
debugging exercise and the "ask whether anything is being published before
asking why nothing is arriving" habit that lesson exists to install.

**Resolution: this module does not re-teach them, and does not pretend they are
new.** Lesson 1 uses `echo` immediately, as something the learner already owns,
to collect evidence for the turtle question. Lesson 2 adds only the `-t` flag to
`list`. The genuinely new commands here are `ros2 topic info`,
`ros2 topic pub`, and `ros2 interface show`.

The gain from this is worth naming: because `echo` is already fluent, Lesson 1
can spend its attention on *what the output means* rather than on how to
produce it, and the module's opening evidence-gathering costs the learner
nothing.

## Flag 4 — `ros2 interface show` overlaps Module 9

§9 lists `ros2 interface show` under this module. It also gives Module 9
"Messages", "Standard interfaces", "Interface inspection", "Custom interfaces"
and the `.msg` file format. Both cannot own the same ground.

**Resolution, stated as a boundary Module 9's design can rely on:**

- **Module 6 owns *reading* an existing definition.** `ros2 interface show` on
  exactly two types — `geometry_msgs/msg/Twist` and `turtlesim/msg/Pose` —
  to answer the question "what fields does this topic's message have, and where
  did the numbers in `echo` come from?" The type is presented as a *contract
  that must match on both ends*, which is a topics concept, not an interfaces
  concept.
- **Module 9 owns everything else**: the `.msg` format itself, writing custom
  interfaces, the standard-interface landscape (`std_msgs`, `sensor_msgs`,
  `nav_msgs`), and interface inspection as a subject rather than a lookup.

Lesson 2 block 6 says this to the learner explicitly, so the shallow treatment
reads as a deliberate boundary rather than as the whole story.

## Flag 5 — the `10` in `create_publisher` is a QoS setting, and QoS has no owner anywhere in this course

`self.create_publisher(Twist, '/turtle1/cmd_vel', 10)` is the first line of
ROS 2 code in this course whose meaning the course has not scoped. That `10` is
a queue depth — one policy out of the family called QoS — and a learner who
searches for it lands on reliability, durability, history and depth within one
click.

Module 2's design declared a depth ceiling in the learner-facing text itself:
*"this course won't go deeper than this paragraph on DDS itself."* The audit in
`module-2-dds-depth-decision.md` records that the lesson did not even use the
allowance it was granted — "QoS", "reliability" and "durability" appear nowhere.

**Two separate problems, two separate resolutions.**

*In this module:* the `10` gets one honest sentence — a send queue, how many
messages ROS 2 will hold if a subscriber or the network can't keep up, and 10
is the conventional default and the correct choice here — plus one CALLOUT
naming QoS as the family the setting belongs to and stating plainly that it
matters enormously for sensor data and not at all for driving a turtle. Naming
it once is the right call: silence would leave a learner who googles the number
believing they had missed something, which is the exact failure Module 1's
"check the distribution on anything you find" callout exists to prevent. The
callout ends with a named forward-pointer — *"Module 9 is where you actually
learn what this number does and how to choose a different one"* — the same
pattern Module 5 used for packaging ("Module 10 will explain why that stops
being good enough"): a promise the learner can hold onto rather than a topic
quietly dropped.

*Beyond this module:* **QoS was not assigned to any module in §9** — not
Module 2 (explicitly excluded), not 9, not 12. Decided at Stage 5 review
(2026-08-27): **Module 9 owns it.** It already owns messages and interfaces,
and QoS is the other half of "what governs whether two endpoints connect" —
Module 6 Lesson 2 draws name and type as the complete matching condition, and
QoS compatibility is the third condition that lesson doesn't mention. This
module's Lesson 3 callout now names Module 9 by number, which makes that
assignment a promise this course has made to the learner, not just a note in
this file. `open-items.md` item 7 is updated accordingly — the gap itself is
closed; what remains open is Module 9 actually designing the material that
pays the promise off, and revisiting Lesson 2's contract diagram once it does.

## Flag 6 — `ros2 topic hz` is not in §9's command list, and is added anyway

§9 lists five commands for this module. `ros2 topic hz` is not among them.

This module's central mechanism is a *rate* — turtlesim discards a command that
is more than one second old (Flag 6a below), so a publisher's timer period is
the difference between smooth motion and stuttering. Lesson 3 has the learner
deliberately slow their timer until the turtle stutters. Without `topic hz`
there is no way to measure the thing the lesson is about; the learner can only
infer the rate from the code they wrote, which is precisely the assumption a
debugging habit should not rest on.

**Resolution: `ros2 topic hz` appears once, in a Lesson 3 CALLOUT**, as the
tool that measures the rate the learner just chose. One command, one block, no
exercise depends on it. Flagged because adding to the approved command surface
is a curriculum change, however small.

### Flag 6a — the one-second figure is verified, not inferred

The claim that turtlesim stops the turtle one second after the last command
underpins Lesson 1's entire payoff, so it was read from source rather than
recalled. From `turtle.cpp` on the `jazzy` branch of `ros/ros_tutorials`:

```cpp
if (nh_->now() - last_command_time_ > rclcpp::Duration(1.0, 0)) {
  lin_vel_x_ = 0.0;
  lin_vel_y_ = 0.0;
  ang_vel_ = 0.0;
}
```

One second exactly, on the distribution this course pins. Implementation should
cite the behaviour, not the C++ — the learner has not met `rclcpp` beyond
Module 5's one comparison block — but the number is safe to state as fact.

## Continuation — packaging is still deferred, and the case for Module 10 is now stronger

Module 5 Flag 1 made the learner's first node a standalone `python3` script,
with packaging deferred to Module 10. That holds here: both scripts in this
module are standalone files.

It is worth recording what this module adds to that thread. After Lesson 5 the
learner has **two** loose scripts that must be started in the right combination,
in separate terminals, alongside turtlesim — and Lesson 5's debugging exercise
is caused precisely by starting the wrong combination. That is now motivation
for Module 10 (packaging) *and* Module 11 (launch files), from lived experience
rather than assertion. `open-items.md` item 5 is updated accordingly.

---

## Video requirements: one review-gated candidate, two rejections

Recorded in full per §15. Durations were read from YouTube player metadata
(`lengthSeconds`), not estimated.

```
CANDIDATE 1 — "ROS2 Publisher subscriber and DDS pipeline:
               ROS2 Framework overview - ROS2 beginners tutorial"
  EraBotLabs · https://www.youtube.com/watch?v=nKxdOQOYIKk
  VERIFIED DURATION: 242s (4m02s), read from player metadata
  PUBLISHED: 2024-05-10 (thirteen days before Jazzy's release)
  SCOPE, from the description: the publish-subscribe model, loose coupling,
  scalability, flexibility, and publishers/subscribers in practice — Lesson 1's
  territory almost exactly, at Lesson 1's altitude.
  STATUS: REVIEW-GATED, not accepted, not rejected.

  Four minutes is the right length, and pub/sub is a distribution-independent
  concept, so the pre-Jazzy publish date is not disqualifying the way Module 5
  candidate 2's Bouncy demonstration was. But §15 requires evaluating teaching
  quality and production quality, and neither is verifiable from metadata. Two
  specific concerns: the channel is not among the sources vetted in this
  course's Phase 1 benchmark, and the title foregrounds "DDS pipeline" while
  Module 2 told the learner in as many words that this course would not go
  deeper on DDS than one paragraph. A four-minute video that walks the DDS
  pipeline would contradict our own stated boundary in the same course — the
  same failure mode that rejected Module 5's candidate 2.

  GATE, to be passed by a human watching all four minutes:
    (a) teaching and production quality are good enough to sit in this course;
    (b) DDS is named as "the thing that carries the data" and not walked
        through, keeping Module 2's declared ceiling intact.
  If both hold, it embeds in Lesson 1 after block 4, where §14's preferred
  THEORY → SHORT VIDEO → HANDS-ON pattern puts it. If either fails, nothing
  changes: Lesson 1 is designed to work without it.

CANDIDATE 2 — "Intro to ROS Part 4: Nodes, Topics, Publishers, and
               Subscribers with C++"
  DigiKey · https://www.youtube.com/watch?v=g4iY2EZ1KR8
  VERIFIED DURATION: 2133s (35m33s), read from player metadata
  PUBLISHED: 2025-10-16
  REJECTED: three independent reasons. 35 minutes violates §14 outright, and
  more severely than the 20m18s Module 4 candidate already dropped for it. The
  primary track of this course is Python (§18) and this is a C++ tutorial. And
  it re-teaches nodes, which is Module 5's ground, so it would arrive as
  revision wearing the clothes of new material.

CANDIDATE 3 — "[ROS2 in 5 mins] 005 — How to work with ros2 topics
               from the command line"
  The Construct · theconstruct.ai post, 2018-11-25
  REJECTED, for the same reason its sibling episode was rejected in Module 5.
  Right length, right scope, and The Construct is vetted in this course's
  Phase 1 benchmark — but the post states outright that it targets ROS 2
  Crystal while the video shows ROS 2 Bouncy, six and seven distributions
  before Jazzy, running against `osrf/ros2:nightly`. Module 1 ships a callout
  telling learners to check the distribution on anything they find. This course
  cannot embed a Bouncy demonstration and keep that instruction honest.
```

**Consequence, stated plainly:** unless the gate on candidate 1 is passed, this
module ships without video, as Module 5 did. Seven diagrams and six exercises
carry the load. That is now two consecutive modules with no video, which is
worth watching — it is a signal about the available material at this altitude,
not about §14 being wrong.

---

# Lesson 1 — The Publish/Subscribe Model

**Objective:** Understand a topic as a *named, one-way, many-to-many stream of
discrete messages with nothing in the middle* — and pay off Module 4's deferred
question with evidence the learner collects themselves.

**Concepts covered:** publish/subscribe; the topic as a name rather than an
object; anonymity and decoupling; messages as discrete events rather than a
held connection; the command-timeout safety pattern; why pub/sub instead of
function calls.

**Content block sequence:**
1. **TEXT** — the debt, named up front: "Module 4 asked you to hold on to a question rather than look it up — why the turtle moves briefly and stops when you press an arrow key and let go. Here is the answer. It turns out you can't explain it without explaining the whole model, which is why it waited."
2. **TEXT** — the model, stated once and precisely: a publisher sends a message to a *name*. Every node that has subscribed to that name gets its own copy. The publisher does not know who is subscribed, how many are, or whether anyone is at all — and behaves identically in every case.
3. **IMAGE** — the fan-out (below)
4. **TEXT** — the three properties that follow, each named: **one-way** (there is no reply; if you need one you want a service, Module 7), **anonymous** (the publisher never learns who received anything), **many-to-many** (any number of publishers, any number of subscribers, on the same name).
5. **CALLOUT** (WARNING) — §21's misconception, head-on: "A topic is not a function call. `publish()` returns immediately, returns nothing, and succeeds in exactly the same way whether ten nodes are listening or none. If you are waiting for an answer, you are reaching for the wrong mechanism — that's Module 7."
6. **TEXT** — **and it is not a server either**, which is Flag 2's point in prose: there is no process called `/turtle1/cmd_vel`. Nothing is running "the topic". Discovery — Module 5 Lesson 4 — matched two nodes that named the same string with the same message type, and from then on the data goes directly between them. The name is a rendezvous, not a place.
7. **CALLOUT** (INFO) — the practical consequence, which is the payoff for block 6: "There is nothing to start and nothing that can crash in the middle. When data stops flowing there are exactly two places the fault can be — the publisher or the subscriber — and that is why `ros2 topic info` is worth learning in the next lesson. It also means `ros2 topic list` showing a topic tells you someone is publishing or subscribing to that name *right now*; topics don't persist on their own."
8. **TEXT** — set up the experiment, using a command the learner already owns: run `echo`, press one arrow key, release, watch both the terminal and the turtle.
9. **CODE** — `ros2 topic echo /turtle1/cmd_vel`, one keypress: **exactly one message, then silence.** Carries an illustrative-output caption per path D.
10. **TEXT** — the answer, in two halves, neither of which is guessable alone: **(a)** teleop publishes exactly one message per keypress — it is not streaming while the key is down, and the echo output proves it; **(b)** turtlesim discards a command that is more than one second old and sets the velocity to zero. One message therefore buys up to one second of motion, and then the turtle stops on its own.
11. **IMAGE** — the one-second timeline (below)
12. **TEXT** — **why this is a safety pattern, not a turtlesim quirk.** If a subscriber keeps executing the last command it received, then a publisher that crashes, or a network link that drops, leaves a real robot driving at its last commanded speed with nobody steering. Continuous-command topics are built so that *silence means stop*. The cost is that driving a robot means publishing repeatedly, forever, for as long as you want it to move — which is a fact about your code, and it lands in Lesson 3.
13. **EXERCISE** (GUIDED) — measure the timeout (below)
14. **TEXT** — bridge to Lesson 2: "You know what a topic is and what travels over one. You do not yet know what governs the *shape* of what travels — why those six numbers and not some others."

**Visual requirements:**
- **Purpose:** establish the fan-out shape while actively preventing the broker misconception · **Concept:** one publisher, one name, several independent subscribers, nothing in between · **Format:** a horizontal fan — publisher on the left, three subscribers on the right, arrows from the publisher to each · **What should be shown:** the topic name `/robot/sensor_data` as a **label on the arrows**, never as a box or node (Flag 2); the publisher drawn with an explicit annotation that it has no knowledge of the right-hand side — a greyed region or a "the publisher cannot see any of this" bracket over the three subscribers; and each subscriber receiving its own copy rather than sharing one · **What the learner should understand:** the arrows are the topic; there is no thing in the middle to start, configure, or blame.
- **Purpose:** turn one keypress into a timeline so the delay is visible rather than asserted · **Concept:** one discrete message producing a bounded window of motion · **Format:** a single horizontal time axis, roughly two seconds wide, with events marked on it · **What should be shown:** the keypress at t=0; exactly one message published at t=0; the turtle moving from t=0; the one-second mark annotated as "turtlesim: last command is now stale"; velocity dropping to zero there; and the axis continuing empty afterwards to make the point that nothing further arrives · **What the learner should understand:** the stop was caused by the *absence* of a second message, not by anything anyone sent.

**Practical exercise — GUIDED:** with turtlesim, teleop and `ros2 topic echo /turtle1/cmd_vel` all running, make three observations. **One:** press an arrow key once and count the messages in the echo terminal — one. **Two:** press once more and watch the turtle rather than the terminal; it moves for about a second and stops. **Three:** hold the key down; the terminal fills with messages (the *terminal's* key auto-repeat is generating them, not teleop streaming) and the turtle moves continuously until you let go, then stops about a second later. Three observations, no new commands, and between them they contain the whole answer.

**Quiz:** None at lesson level — module quiz lives in Lesson 5.

**Recap / connection to next:** "A topic is a name that messages are sent to and copied from, with nothing in between and no reply. The turtle stops because silence means stop. Next: what decides the shape of a message."

---

# Lesson 2 — Message Types and Reading a Topic

**Objective:** Be able to walk up to an unfamiliar topic in an unfamiliar system
and find out everything about it from the command line.

**Concepts covered:** message types as a contract; reading a type name;
`ros2 topic list -t`; `ros2 interface show`; `ros2 topic info` and endpoint
counts; name *and* type must both match; `/turtle1/pose` as the return channel.

**Content block sequence:**
1. **TEXT** — the gap Module 4 left: you saw the *shape* of a `cmd_vel` message — a linear group, an angular group, six numbers — and were told what it meant. You were not told where that shape comes from, or how you would find out for a topic nobody had explained to you. Both are one command away.
2. **CODE** — `ros2 topic list -t`, the same census as Module 4 with the type in brackets after each name. Illustrative-output caption per path D.
3. **TEXT** — reading a type name: `geometry_msgs/msg/Twist` is package / kind / type. **`geometry_msgs` is not turtlesim's package** — it is a standard interface package shared across the entire ROS 2 ecosystem, which is why Module 4 could truthfully say the command you ran works unchanged on a real robot. `turtlesim/msg/Pose`, by contrast, belongs to turtlesim alone.
4. **CODE** — `ros2 interface show geometry_msgs/msg/Twist`, showing the two `Vector3` fields and the definition's own comments. Illustrative-output caption per path D.
5. **TEXT** — join it up: those six numbers in Module 4's echo output were `linear.x`, `linear.y`, `linear.z`, `angular.x`, `angular.y`, `angular.z`, and the arrow key set exactly one of them. The definition is where the shape is decided; `echo` is where you see it filled in.
6. **CALLOUT** (INFO) — the Flag 4 boundary, stated to the learner: "You are reading a definition here, not writing one. Where message definitions come from, what the `.msg` file format is, and how to create your own are Module 9's — as is the wider landscape of standard interfaces. What matters now is narrower and more useful: every topic has a type, and you can always look it up."
7. **CODE** — `ros2 topic info /turtle1/cmd_vel`, showing Type, Publisher count and Subscription count. Illustrative-output caption per path D.
8. **TEXT** — the counts are the point, and they are a new kind of question. Module 4's habit was *is data flowing?*, answered by `echo`. This one is *is anyone connected?*, answered by `info` — and the two failures look identical from the outside while having completely different causes. A topic with one publisher and zero subscribers is a node shouting into an empty room; zero publishers and one subscriber is a node waiting for something that will never come.
9. **IMAGE** — the contract (below)
10. **TEXT** — **the name is not enough — the type must match too.** Two nodes that use the same topic name with different message types do not connect to each other, and nothing announces this. They are, as far as the system is concerned, two unrelated conversations that happen to have the same name.
11. **TEXT** — the other direction, which the learner has not looked at once: everything so far has been commands going *into* turtlesim. `/turtle1/pose` is turtlesim reporting its own state back out — continuously, many times a second, whether or not anything is subscribed.
12. **CODE** — `ros2 topic echo /turtle1/pose` streaming `x`, `y`, `theta` and the two velocities, alongside `ros2 interface show turtlesim/msg/Pose`. Illustrative-output caption per path D.
13. **CALLOUT** (TIP) — "This is the general shape of every robot: commands in on one topic, state out on another. Swap `turtlesim` for a real mobile base and the names barely change."
14. **EXERCISE** (GUIDED) — profile a topic you were told nothing about (below)
15. **TEXT** — bridge to Lesson 3: "You can read any topic in any system. Next you write to one."

**Implementation note, required before authoring block 10:** the design states
that a name/type mismatch silently fails to connect. The *exact* Jazzy tooling
output in that situation — whether `ros2 topic list -t` prints the name twice
with two types, and what `ros2 topic info` reports — must be confirmed against
a real system before any output is authored for it. If it cannot be confirmed,
block 10 stays as the prose claim above with no CODE block. Do not invent the
output; this is exactly the kind of plausible-looking terminal text path D
exists to keep out of the course.

**Visual requirements:**
- **Purpose:** show that a connection requires two things to match, not one — the fact block 10 depends on · **Concept:** name and type together as the matching condition · **Format:** three nodes on the left, one subscriber on the right, with the match/no-match outcome drawn on each connection · **What should be shown:** a publisher with the right name and right type connecting; a publisher with the **right name and wrong type** not connecting, drawn with a broken arrow and annotated "no error, no warning, no connection"; a publisher with the **wrong name and right type** likewise not connecting; the topic name and type shown as a paired label on each arrow rather than as a box (Flag 2) · **What the learner should understand:** two independent things must agree, both failures are silent, and both look the same from the outside.

**Practical exercise — GUIDED:** `/turtle1/color_sensor` has not been mentioned anywhere in this course. Using only the commands from this lesson, answer four questions about it: what is its message type; what fields does that type have; how many publishers and subscribers does it currently have; and — the one that takes some thought — what would you have to *do* to make its values change? Four questions, four commands, and the point is that an unfamiliar topic is no harder to investigate than a familiar one.

*Verified, and the reason this topic was chosen:* turtlesim publishes `/turtle1/color_sensor` with type `turtlesim/msg/Color`, reporting the canvas colour underneath the turtle (confirmed in `turtle.cpp` on the `jazzy` branch). The default background is a uniform blue, so simply driving around changes **nothing** — the values only move when the turtle crosses a line it has already drawn, because the pen draws onto the same canvas the sensor samples. A learner who expects movement to change a "sensor" reading and finds it constant has to go and look at what the field names actually mean, which is the entire skill this exercise is for. Implementation must not phrase the question in a way that promises the values will change.

**Quiz:** None at lesson level.

**Recap / connection to next:** "Every topic has a name, a type, and a live count of who is on each end — all three inspectable from the terminal. Next: putting your own node on the publishing end."

---

# Lesson 3 — Writing a Publisher

**Objective:** The learner's own node drives the turtle, with teleop closed —
delivering the promise Module 5 ended on.

**Concepts covered:** `create_publisher`; constructing and populating a message;
publishing from a timer callback; the queue-size argument; why the publish rate
is a design decision rather than a detail.

**Content block sequence:**
1. **TEXT** — the promise being paid, quoted back: Module 5 ended with *"by the end of it your node will be driving the turtle itself, with teleop removed entirely."* This is that lesson. Same shape of file as Module 5 — a plain Python script run with `python3`, no workspace and no package, for the reasons Module 5 Lesson 3 gave and Module 10 will resolve.
2. **TEXT** — what has to be true before writing a line, assembled from what the learner already knows: publish to the **same name** turtlesim subscribes to (Lesson 2's `topic info` proves which), with the **same type** (`geometry_msgs/msg/Twist`), **more often than once a second** (Lesson 1's timeout). Three facts, all already earned.
3. **CODE** — the driver node, complete and about twenty-five lines: subclass `Node` as in Module 5, `self.create_publisher(Twist, '/turtle1/cmd_vel', 10)`, a timer at 2 Hz, and a callback that builds a `Twist`, sets `linear.x` and `angular.z`, and publishes it. The turtle drives in a circle.
4. **TEXT** — what running it just proved, and it is worth stopping on: teleop is not running. Nothing is reading the keyboard. The only thing steering the turtle is a file the learner wrote, and turtlesim cannot tell the difference — because from turtlesim's side there is no difference. Lesson 1's anonymity property, now demonstrated rather than asserted.
5. **CALLOUT** (INFO) — the `10`, per Flag 5: "That third argument is a send queue — how many outgoing messages ROS 2 will hold for you if a subscriber or the network can't keep up. 10 is the conventional default and the right choice here. It belongs to a family of delivery settings called QoS, which matters a great deal for high-rate sensor data and not at all for driving a turtle. If you go looking, that is what you will find; you are not missing a prerequisite. Module 9 is where you actually learn what this number does and how to choose a different one — for now, treat 10 as a safe default that needs no justification."
6. **TEXT** — **the rate is not arbitrary.** At 2 Hz a message arrives every half-second, comfortably inside turtlesim's one-second window. Slow the timer past one second and the turtle stutters — moving, stopping, moving — because each command expires before its replacement arrives. That is not a bug in the code. It is Lesson 1's safety rule doing exactly what it is for, seen from the publishing side for the first time.
7. **CALLOUT** (TIP) — `ros2 topic hz /turtle1/cmd_vel` (Flag 6): "You chose a rate in your code. This measures the rate that actually reached the topic — and on a busy machine, or with slow work in a callback, those are not always the same number."
8. **EXERCISE** (GUIDED) — write it, run it, and break it deliberately (below)
9. **IMAGE** — publisher anatomy (below)
10. **TEXT** — look at your own node from outside it: with the driver running, `ros2 topic info /turtle1/cmd_vel` reports **Publisher count: 1**, and that publisher is the learner's script. The tooling does not mark it as different from teleop, because there is nothing to mark. Every inspection command from Module 4 and Lesson 2 now works on code the learner wrote.
11. **CODE** — the C++ equivalent (§18 secondary track), publisher only, framed as in Module 5: "Not something you are expected to write, and this course stays in Python. Read it for one reason — `create_publisher`, a message object, a timer, and a `publish` call are all there, in the same order and with the same arguments. The concept transfers; only the syntax changes."
12. **FILE** — `module-6-turtle-driver.py`, the finished script as a download (§17), so a learner fighting a typo can diff rather than restart.
13. **TEXT** — bridge to Lesson 4: "Your node can talk. It still can't hear anything — it drives the same circle whether the turtle is in open space or wedged against a wall."

**Visual requirements:**
- **Purpose:** make the four decisions behind every publisher visible at once, and locate them in the code · **Concept:** what a publisher needs, and what triggers a send · **Format:** the node as a single box with the four elements called out against the real lines beside it · **What should be shown:** the four things — message **type**, topic **name**, queue **size**, and something that calls `publish()` — with the timer callback drawn as a branch off `spin`, reusing the visual vocabulary of Module 5's node-shape diagram so the two read as the same family; the outgoing arrow labelled with the topic name, not terminating in a box (Flag 2) · **What the learner should understand:** `create_publisher` only declares the intent to publish; nothing is sent until something calls `publish()`, and choosing what does the calling — here, a timer — is the design decision.

**Practical exercise — GUIDED:** create `turtle_driver.py` from the lesson, close teleop entirely, and run it alongside turtlesim — the turtle should drive a steady circle. Then change the timer period from `0.5` to `2.0` seconds, run it again, and watch the turtle stutter. Explain in one sentence why, using the number from Lesson 1. Then set it back. The exercise deliberately has the learner *cause* the failure rather than read about it, because the stutter is the single most convincing demonstration in this module that a topic carries discrete messages rather than a continuous connection.

**Quiz:** None at lesson level.

**Recap / connection to next:** "You wrote a node that drives a robot, and the robot cannot tell it from the official tool. Next: a node that reacts to what it is told."

---

# Lesson 4 — Writing a Subscriber, and Closing the Loop

**Objective:** Receive messages in a callback, understand that as the same
mechanism as Module 5's timer with a different trigger, and combine both
directions into a node whose behaviour depends on data it did not generate.

**Concepts covered:** `create_subscription`; the callback signature; message
arrival as a trigger; a subscriber with no publisher; publisher and subscriber
in one node; the reactive control loop.

**Content block sequence:**
1. **TEXT** — the connection Module 5 set up explicitly: a timer says *"call this every second."* A subscription says *"call this every time a message arrives on this name."* Same machinery, same `spin` doing the calling, different trigger. Module 5's exact words were that a subscriber is the same idea with a message arriving instead of a second passing — this is that, cashed in.
2. **CODE** — the listener node, about twenty lines: `self.create_subscription(Pose, '/turtle1/pose', self.pose_callback, 10)`, and a callback that logs `x`, `y` and `theta`. Note that the callback takes the message as its one argument — the learner did not call it, so ROS 2 hands the message in.
3. **TEXT** — what running it proves, including the part that looks like a failure: log lines appear only while turtlesim is running. Close turtlesim and the listener goes quiet — no error, no warning, no exit. A subscriber with nothing publishing to it is a completely valid, completely silent program, and that silence is indistinguishable from a bug. The next block has you cause that exact silence on purpose, so you meet it under controlled conditions rather than the first time it happens by accident.
4. **EXERCISE** (GUIDED) — the silent subscriber (below)
5. **IMAGE** — one mechanism, two triggers (below)
6. **CALLOUT** (TIP) — "Do not do slow work inside a callback. `rclpy.spin` runs your callbacks one at a time by default, so a callback that takes a second stops everything else in that node for a second — including the timer that was supposed to be publishing. The symptom is a node that mysteriously stops sending, and the cause is never where people look first."
7. **TEXT** — now combine them, and name what the combination is: a node with both a subscription and a publisher is the standard shape of nearly every real ROS 2 node. Read something, decide something, write something. Sensor in, command out. Everything from a battery monitor to a path planner is that shape at different scales.
8. **CODE** — the closed loop: subscribe to `/turtle1/pose`, publish to `/turtle1/cmd_vel`, and reverse the turn direction when `x` passes a threshold near the wall, so the turtle patrols back and forth instead of grinding into the edge. Both halves in one class, both created in `__init__`.
9. **TEXT** — what makes this different from every program the learner has written so far, in this course or possibly at all: the node's behaviour is now determined by data it did not produce and cannot predict. Nothing in the file says which way the turtle will turn. That is a control loop, at the smallest size one can be.
10. **IMAGE** — the closed loop (below)
11. **FILE** — `module-6-turtle-loop.py` as a download (§17).
12. **EXERCISE** (INDEPENDENT) — keep the turtle inside a box (below)
13. **TEXT** — bridge to Lesson 5: "Every diagram in this module so far has had exactly one publisher. Real systems don't, and the difference is not a detail."

**Visual requirements:**
- **Purpose:** collapse two things that look different in code into one mechanism · **Concept:** callbacks, and what triggers them · **Format:** a single `spin` block with two branches drawn off it, deliberately symmetrical · **What should be shown:** one branch labelled "every 0.5 seconds → `timer_callback()`", the other "message arrives on `/turtle1/pose` → `pose_callback(msg)`", both drawn identically below the trigger, with the note that `spin` is what calls both and the learner never calls either · **What the learner should understand:** they are the same thing; only the trigger differs — and this is why `spin` is not a wait.
- **Purpose:** show the loop as a loop, since the whole point is that it closes · **Concept:** a two-topic cycle between two nodes · **Format:** two boxes and two arrows forming a visible ring · **What should be shown:** turtlesim and the learner's node as the only two boxes; `/turtle1/pose` on the arrow one way, `/turtle1/cmd_vel` on the arrow back (labels on arrows, Flag 2); the decision — "past the wall? turn the other way" — marked inside the learner's node, which is the only place in the ring where anything is decided · **What the learner should understand:** neither node is in charge; the behaviour is a property of the cycle.

**Practical exercise — GUIDED** (§11's worked example for this material is
*"subscriber receives no messages"*, with wrong topic name among the listed
causes — this exercise walks it deliberately rather than presenting it as a
mystery, for the reason given below):

> **Step 1 — cause the silence on purpose.** In `listener.py`, change the
> subscribed name from `/turtle1/pose` to `/turtle/pose` — drop the `1`. Run
> it alongside turtlesim. Confirm: no error, no warning, no exit. It just sits
> there, silent, exactly like the failure case in block 3.
>
> **Step 2 — establish whether the data exists at all**, before touching your
> own code. In a second terminal, run `ros2 topic echo /turtle1/pose` while
> the turtle is moving. You should see a steady stream of messages. That rules
> out the publisher: turtlesim is fine, and the data is real.
>
> **Step 3 — interrogate your own node**, not the topic. Run
> `ros2 node info` on your listener and read what it says it subscribes to.
> Compare that string, character by character, against the name
> `ros2 topic list` actually shows for turtlesim's pose topic.
>
> **Step 4 — fix it and confirm the fix**, not just the symptom. Correct the
> string back to `/turtle1/pose`, restart the listener, and use
> `ros2 node info` again to confirm the name it now lists matches
> `ros2 topic list` exactly — don't rely on the log lines resuming as your
> only evidence, since that would be checking the symptom rather than the
> cause.

Deliberately **guided rather than a debugging exercise**, and that is a
considered choice, not a downgrade. §11's DEBUGGING format is for a mystery the
learner has to work backwards from; the skill this exercise teaches — establish
whether the data exists before investigating why you aren't receiving it — is
not new here. It is Module 4's `echo`-first habit ("ask whether anything is
being published before asking why nothing is arriving"), applied for the first
time to code the learner wrote themselves. Presenting a *reapplication* of an
already-taught habit as if it were a fresh diagnostic mystery would be
borrowing DEBUGGING's weight for content that hasn't earned it — and this
course's rhythm is one DEBUGGING exercise per module (Modules 3 through 5 each
have exactly one). Lesson 5 below is where that slot belongs this module: its
exercise has no correct answer to discover by inspecting one node harder, which
this one does.

**Practical exercise — INDEPENDENT:** extend the closed loop so the turtle stays
inside a box rather than only reversing on one axis — turning away when it
approaches any of the four edges. Goal only, no procedure. Every element needed
is in this lesson; the work is in deciding what "approaching an edge" means when
you have `x`, `y` and `theta` and the window is about eleven units square.

**Quiz:** None at lesson level.

**Recap / connection to next:** "A callback is a callback; only the trigger
differs. A node that subscribes and publishes is a control loop. Next: what
happens when several nodes want the same topic."

---

# Lesson 5 — Many Publishers, Many Subscribers

**Objective:** Understand and inspect what actually happens with several nodes
on one topic, diagnose the conflict that produces, and assemble a multi-node
system.

**Concepts covered:** fan-out to multiple subscribers; multiple publishers and
the absence of arbitration; `ros2 topic pub`; endpoint counts as a diagnostic;
the "one topic, one authority" rule.

**Content block sequence:**
1. **TEXT** — every diagram in this module has had one publisher and, mostly, one subscriber. A real robot has a dozen nodes and topics with several of each. Both directions scale, but they do not scale the same way, and only one of them is safe by default.
2. **TEXT** — **many subscribers is the easy case.** Each subscriber receives its own copy. The publisher's code, cost and behaviour do not change; nothing needs configuring; adding a subscriber cannot break an existing one. And the learner has been doing it since Module 4 without being told — `ros2 topic echo /turtle1/cmd_vel` was a *second subscriber* on that topic alongside turtlesim, and neither noticed the other.
3. **CALLOUT** (INFO) — "That is Lesson 1's fan-out claim, and you tested it two modules ago by accident. Every time you have run `echo` on a live topic you have added a subscriber to a running system and changed nothing about it. That is why `echo` is safe to use on a robot that is actually working."
4. **IMAGE** — fan-out, with `echo` in it (below)
5. **TEXT** — **many publishers is the case that bites.** ROS 2 permits it and does not arbitrate. Messages from every publisher arrive at the subscriber interleaved in arrival order, and the subscriber has no way to tell which came from where — a message carries no sender. On a command topic like `cmd_vel`, that means two things are steering one robot and the most recent message always wins.
6. **CODE** — `ros2 topic pub --rate 2 /turtle1/cmd_vel geometry_msgs/msg/Twist "{linear: {x: 2.0}, angular: {z: 1.8}}"` — a publisher with no code at all, from the command line. Illustrative-output caption per path D. *(Implementation note: use `--rate 2`, not the `--rate 1` in the official tutorial. At exactly 1 Hz the publish interval and turtlesim's one-second expiry are the same number, and whether the turtle glides or stutters depends on scheduling jitter — which would undercut Lesson 3's carefully-drawn line.)*
7. **TEXT** — why `ros2 topic pub` earns its place beyond this demonstration: it lets you exercise a subscriber before the node that is supposed to feed it exists. Bringing a robot up one link at a time — drive the motors from the command line, confirm they move, *then* connect the planner — is standard practice, and this is the command that does it.
8. **CODE** — `ros2 topic info /turtle1/cmd_vel` with **Publisher count: 2**. The count is the whole diagnostic, and it is the block the next exercise depends on. Illustrative-output caption per path D.
9. **EXERCISE** (DEBUGGING) — the fight over `cmd_vel` (below)
10. **TEXT** — the rule, stated so it survives the module: **many subscribers is free; many publishers on a command topic is a design decision that needs a reason.** Real systems that genuinely need several sources of motion commands — teleoperation, autonomous navigation, an emergency stop — do not simply let them all publish. They put a single node in front that chooses between them and publishes the winner, so that exactly one thing is ever writing to the topic the robot obeys.
11. **EXERCISE** (INDEPENDENT) — run a three-node system and account for every count (below)
12. **QUIZ** — the module quiz (below)
13. **TEXT** — recap and connection to Module 7.

**Visual requirements:**
- **Purpose:** show fan-out as something the learner has already been doing, rather than as new theory · **Concept:** one publisher, several independent subscribers, each with its own copy · **Format:** the Lesson 1 fan-out diagram, revisited and made concrete · **What should be shown:** the learner's driver node publishing `/turtle1/cmd_vel`; turtlesim and a terminal running `ros2 topic echo` both drawn as subscribers of equal standing; an annotation that neither is aware of the other and the publisher is aware of neither; the topic name on the arrows, no box (Flag 2) · **What the learner should understand:** `echo` is not a special debugging channel — it is an ordinary subscriber, which is precisely why attaching one to a running system is safe.

**Practical exercise — DEBUGGING** (per §11):

> **Scenario:** Your driver node from Lesson 3 is running and the turtle is
> tracing its steady circle. You decide to steer manually as well, so you start
> `turtle_teleop_key` in another terminal without stopping the driver.
>
> Now the turtle moves erratically — mostly still circling, occasionally
> jerking in the direction you pressed, and largely ignoring the arrow keys.
> Both terminals look completely healthy. Neither has printed anything unusual.
>
> **Hint 1:** Don't restart anything and don't edit any code. Ask the narrowest
> possible question first — how many things are currently publishing to that
> topic? `ros2 topic info /turtle1/cmd_vel`.
> **Hint 2:** Publisher count: 2. Both are publishing valid `Twist` messages to
> the same name, and ROS 2 considers both entirely legitimate. So what does
> turtlesim do when two streams of commands arrive?
> **Hint 3:** Run `ros2 topic echo /turtle1/cmd_vel` and read the *sequence*
> rather than the values. Your driver's identical message, twice a second,
> forever — with your occasional keypress dropped in between. Nothing is
> combining them. Now recall from Lesson 1 how long a command survives, and
> work out how long your keypress stays in effect.
>
> **Solution:** Two publishers on one topic, with no arbitration between them.
> **Root cause:** turtlesim acts on whichever message arrived most recently; it
> cannot tell the two publishers apart, because a message does not carry a
> sender. Your driver publishes every half-second, so any keypress you make is
> overwritten within 500 milliseconds — which is exactly why the arrow keys
> feel *mostly* ignored rather than completely dead. The symptom is a precise
> consequence of the rate you chose in Lesson 3.
> **Fix:** decide which node owns the topic and stop the other one. There is a
> real alternative — remapping one publisher onto a different topic name so
> both can run without conflicting — and remapping in general is Module 9's.

This is the module's one DEBUGGING exercise, and the reason it, rather than
Lesson 4's silent subscriber, is the one that earns that format: it is a
different species from every debugging exercise in this course so far, this
module's own Lesson 4 walkthrough included. Nothing is broken. No program is
misconfigured, no string is mistyped, and both nodes are doing precisely what
they were written to do. The fault is in the *system design* — which is the
first time this course has presented a bug that cannot be fixed by correcting a
mistake, only by deciding which of two equally-valid nodes should not be
running. That is a genuinely new diagnostic skill, not a reapplication of one
the learner already has (contrast Lesson 4, above): recognizing *ambiguity* as
the failure mode, rather than an *error*, and reading a publisher count instead
of a string for the answer. Keeping the module at one DEBUGGING exercise, as
every module since Module 3 has done, and spending it here rather than
splitting it across two smaller ones is what makes that novelty legible instead
of diluted.

**Practical exercise — INDEPENDENT:** run turtlesim, the Lesson 3 driver, and
the Lesson 4 listener all at once. Then, using `ros2 topic info` on both
`/turtle1/cmd_vel` and `/turtle1/pose`, account for **every** publisher and
subscriber count the system reports — naming which of the three nodes is
responsible for each one, and predicting what each number will become before
you stop any given node. Goal only, no procedure. This is §9's "multi-node
communication system", and the accounting is the assessment: a learner who can
predict the counts understands the model, and one who cannot has been running
commands without a mental picture behind them.

**Quiz** (§12 — scenario, architecture, command-selection and true/false, explanation-first):

1. *Scenario:* "You press an arrow key in teleop once and release it. The turtle moves for about a second and stops, though nothing sent a stop command. Why?" → **Teleop published one message; turtlesim discards a command older than one second and zeroes the velocity.** *Explanation: silence means stop, and it is a safety property — a subscriber that kept obeying a stale command would drive a real robot on after its publisher crashed.*
2. *Architecture / misconception:* "Your node calls `publish()` on a topic no other node has subscribed to. What happens?" → **It returns immediately and succeeds, exactly as it would with ten subscribers.** *Explanation attacks §21's "topics work like function calls" head-on: publishing is one-way, returns nothing, and never tells you whether anyone was listening. Needing an answer means needing a service — Module 7.*
3. *Command selection:* "A node you wrote is subscribed to a topic and logging nothing. Which command tells you whether anything is publishing to that topic at all?" → **`ros2 topic info <topic>` — read the publisher count.** *Explanation separates it from `echo`, which tells you whether data is flowing right now: a topic can have a healthy publisher that simply hasn't sent anything yet, and the two commands answer different questions. `node info` is the third piece — it tells you what your node thinks it subscribed to, which is where a typo shows up.*
4. *Scenario:* "Two nodes are publishing `Twist` messages to `/turtle1/cmd_vel` at the same time. The turtle moves erratically. Which node's commands is turtlesim following?" → **Whichever message arrived most recently — there is no arbitration and no way to tell the publishers apart.** *Explanation: ROS 2 permits multiple publishers and does not merge, queue or prioritise them; a message carries no sender. Systems with several legitimate command sources put a single node in front to choose between them.*
5. *True/False:* "Two nodes using the same topic name will exchange data regardless of the message types they use." → **False.** *Explanation: name and type must both match, and a mismatch produces no error, no warning and no connection — which is why `ros2 topic list -t` and `ros2 interface show` exist, and why the type is as much part of a topic's identity as its name.*
6. *Scenario:* "Your publisher node uses a timer with a period of two seconds to send velocity commands. The turtle moves in short bursts with pauses between them. Is this a bug in your code?" → **No — the publish rate is slower than the one-second command timeout, so each command expires before its replacement arrives.** *Explanation ties the module together from the publishing side: the timeout the learner met as an observed mystery in Lesson 1 becomes a constraint their own code has to satisfy in Lesson 3, and the fix is a design decision about rate, not a correction of an error.*

Six questions rather than Module 5's five, matching the module's larger scope
and covering all three of its threads — the model, the type contract, and rate.

**Recap:** A topic is a name that carries one-way, many-to-many streams of
discrete messages, with nothing in the middle to start or blame — and silence
means stop (L1) → every topic has a type as well as a name, both must match,
and any topic can be interrogated from the terminal (L2) → you wrote a
publisher and drove the turtle with teleop closed, and learned that the publish
rate is a design decision (L3) → a subscription is a callback with a different
trigger, and a node that does both is a control loop (L4) → many subscribers is
free, many publishers on a command topic is a conflict with no arbitration
(L5).

**Connection to Module 7:** "Everything in this module was one-way. You
published and hoped; you subscribed and waited. Nothing you wrote could ever
ask a question and get an answer back — and there was no point in the module
where that was the obvious thing to want, because driving a robot genuinely is
a stream rather than a conversation.

Now think about `/spawn`, which you met in Module 4 without using: put a second
turtle on the screen, at these coordinates, with this name — and tell me
whether it worked. That is not a stream. Doing it over a topic would mean
publishing a request and then subscribing to some other topic hoping a reply
turned up, with no way to know which request the reply belonged to. Module 7 is
services: the mechanism for asking and being answered."

---

**Stage 5 review (2026-08-27) — three of four open questions resolved:**

**(a) Sizing — kept at five lessons, uncompressed.** Per-lesson block counts:
L1 14, L2 15, L3 13, L4 13, L5 13 (total 68). Lesson 2 is one block over
Lesson 1 and two over Lessons 3–5 — inside normal lesson-to-lesson variance
(Module 5's own four lessons ran 10/10/16/10), not the disproportionate load
that would justify a split. Lesson 2 does carry two distinct payoffs — reading
a message type (blocks 1–10) and the reverse/state-topic direction (blocks
11–15) — but that seam is a fact worth knowing during implementation, not a
reason to force two lessons out of a lesson that isn't oversized.

**(b) Exercise types — restored to one DEBUGGING per module.** Lesson 4's
silent-subscriber exercise is now GUIDED, not DEBUGGING: on inspection, it
reapplies Module 4's echo-first habit to the learner's own code rather than
teaching a new diagnostic skill, and presenting a reapplication as a mystery
would borrow DEBUGGING's weight for content that hadn't earned it. Lesson 5's
two-publisher conflict remains the module's one DEBUGGING exercise, matching
Modules 3 through 5's rhythm; it earns the format on a distinction the
Lesson 4 case doesn't share — nothing is broken and no string is wrong, so the
skill is recognizing ambiguity as the failure mode rather than error, read off
a publisher count rather than a string comparison.

**(c) Video gate — still open, pending a direct human decision.** Candidate:
*"ROS2 Publisher subscriber and DDS pipeline: ROS2 Framework overview - ROS2
beginners tutorial,"* EraBotLabs,
[youtube.com/watch?v=nKxdOQOYIKk](https://www.youtube.com/watch?v=nKxdOQOYIKk),
verified 242s (4m02s), published 2024-05-10. No chapter markers exist (checked
against player metadata), and this environment could not pull a working
transcript to pinpoint a DDS-specific segment within the four minutes — the
video's own description outlines three sections (the pub/sub model, its
advantages, using it in practice) and never allocates one to DDS by name, which
is suggestive that the DDS content is brief rather than a walkthrough, but that
is an inference from the outline, not a verified timestamp. At 4:02 total, the
honest gate is to watch the whole thing rather than a clipped range: confirm
(i) teaching and production quality clear the bar for this course, and (ii) DDS
is named as "the thing that carries the data" rather than walked through,
keeping Module 2's declared depth ceiling intact. If both hold, it embeds in
Lesson 1 after block 4; if either fails, Lesson 1 ships without it, which is
what it's designed for.
