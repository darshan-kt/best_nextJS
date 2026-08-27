# Stage 1 — Schema and Block-Type Plan (Robotics Hardware & Sensors)

Per CLAUDE.md §36. Plan only — no implementation until approved.

---

## Objective

Close the gap between the existing LMS (Course → Section → Lesson →
LessonContentBlock, nine working content-block types, Quiz/Exercise as
relational content-block children) and what
`ROBOTICS_HARDWARE_AND_SENSORS_COURSE.md` requires that prose blocks cannot
carry: structured, comparable hardware specifications (§7, §20, §21), a
device quick-reference surface (§26), and a visibly-driven legacy/deprecated
warning (§ non-negotiables). Add exactly what's missing; reuse everything
else — auth, block-rendering dispatch, the Quiz/Exercise relational pattern —
unchanged.

Also settle, per your addition to the original scope: whether the existing
IMAGE block can carry §24's full diagram list, and where the two devices'
visuals actually come from (generated / photographed / needs a design pass),
so none of that gets silently deferred into Stage 5/7.

---

## Architecture decisions

### 1. `HardwareDevice` as a new top-level model, not a content-block payload

Mirrors the existing `Quiz`/`Exercise` pattern (their own table, referenced
*from* a `LessonContentBlock` by FK) with one deliberate difference: `Quiz`
and `Exercise` are 1:1 with the block that owns them (`contentBlockId`
unique) because a quiz only ever lives in one place. A `HardwareDevice` is
**1:many** — the same RPLIDAR A2 record needs to back its own module's
SPEC_TABLE, a DEVICE_CARD elsewhere, and a comparison view, without
duplicating spec text in three places (the exact problem Stage 1's scope
item 1 names). So `LessonContentBlock.hardwareDeviceId` is a plain nullable
FK, not `@unique`.

```prisma
enum HardwareCategory {
  RGB_D_CAMERA
  LIDAR_2D
  // Deliberately not exhaustive yet — see "scaling to N devices" below.
}

enum HardwareSupportStatus {
  ACTIVELY_MAINTAINED   // official, current-distro release
  COMMUNITY_MAINTAINED  // works, confirmed, not from the vendor/upstream
  LEGACY                // works via a documented workaround; flag it
  DEPRECATED            // do not recommend; kept only for reference
}

model HardwareDevice {
  id           String  @id @default(cuid())
  slug         String  @unique   // /hardware/<slug>
  name         String             // "RPLIDAR A2"
  manufacturer String
  category     HardwareCategory

  /// One-paragraph "what problem does this solve" — §7's required opener,
  /// stored once so SPEC_TABLE/DEVICE_CARD/comparison all show the same text.
  summary String

  /// Card + comparison-view visual, independent of any lesson's own IMAGE
  /// blocks (a DEVICE_CARD must render outside lesson context entirely).
  heroImageSrc String?
  heroImageAlt String?

  driverPackage      String   // "rplidar_ros", "astra_camera"
  driverRepoUrl       String
  rosDistroCompat     String[] // ["jazzy"] — Postgres native array, grows
                                // without a migration when a distro is added
  supportStatus       HardwareSupportStatus
  supportStatusNote   String?  // required in practice for LEGACY/DEPRECATED,
                                // enforced at the application/Zod layer —
                                // see §4 below on why not a DB CHECK

  /// The module/section that owns this device's full teaching content.
  /// Nullable: Stage 1 can seed catalog rows before Stage 7 writes lessons.
  homeSectionId String?
  homeSection   Section? @relation(fields: [homeSectionId], references: [id], onDelete: SetNull)

  specs         HardwareDeviceSpec[]
  topics        HardwareDeviceTopic[]
  contentBlocks LessonContentBlock[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

/// One row per (device, spec). Not rigid columns: §3/§21 require the
/// catalog to scale to IMUs, motors, arms, GPS — devices with almost no
/// overlapping spec fields. `key` is a stable slug used for cross-device
/// comparison matching (§20); `label`/`value`/`unit` are display strings,
/// because specs are not uniformly numeric ("115200 baud" vs "0.15m–12m"
/// vs "MJPEG, 640x480").
model HardwareDeviceSpec {
  id           String @id @default(cuid())
  deviceId     String
  device       HardwareDevice @relation(fields: [deviceId], references: [id], onDelete: Cascade)
  key          String   // "range", "resolution" — matched across devices
  label        String   // "Measurement Range"
  value        String   // "0.15 m – 12 m"
  unit         String?
  /// Required, not optional — §7/non-negotiables: no spec without why it
  /// matters. Enforced by Zod at the write boundary (§9), same as every
  /// other external input in this app; the column stays String, not
  /// String? — a required field that's merely validated elsewhere would
  /// invite exactly the drift §9 exists to prevent.
  whyItMatters String
  sortOrder    Int

  @@index([deviceId, sortOrder])
}

/// One row per topic the device's driver publishes/subscribes. Mirrors
/// HardwareDeviceSpec's reasoning: a camera has 5+ topics, a LiDAR has one.
model HardwareDeviceTopic {
  id          String @id @default(cuid())
  deviceId    String
  device      HardwareDevice @relation(fields: [deviceId], references: [id], onDelete: Cascade)
  topicName   String   // "/scan"
  messageType String   // "sensor_msgs/msg/LaserScan"
  description String
  sortOrder   Int

  @@index([deviceId, sortOrder])
}
```

Add to `LessonContentBlock`:

```prisma
hardwareDeviceId String?
hardwareDevice   HardwareDevice? @relation(fields: [hardwareDeviceId], references: [id], onDelete: Restrict)
```

`onDelete: Restrict`, not `Cascade` — deleting a device that's still
referenced from a published lesson should fail loudly, not silently blank
out a block, mirroring `Course.instructorId`'s existing `Restrict` for the
same reason (§10, §41).

**Why a device isn't scoped to one `Course`:** §3 explicitly requires the
catalog to outlive this one course ("the architecture must support adding an
unlimited number of..."). `homeSectionId` points at wherever it's *taught*;
nothing stops a second course from later embedding the same
`HardwareDevice` via its own `LessonContentBlock.hardwareDeviceId`. Getting
this wrong now — scoping devices to a course — is exactly the kind of thing
Stage 1's own closing note warns about: *"If a new device requires a schema
change, that is a signal the Stage 1 model was too narrow."*

### 2. Two new `ContentBlockType` values: `SPEC_TABLE`, `DEVICE_CARD`

Both reference `hardwareDeviceId`; neither stores JSON `data` (same reason
QUIZ/EXERCISE don't — the structure already lives in a real table). One
optional JSON `data` field survives on each for *placement*-only options
that don't belong on the device itself (e.g., `{ specKeys: string[] }` to
show a filtered subset of specs inline mid-lesson rather than the full
table) — small, and validated the same way every other lightweight block
is.

**No `COMPARISON_TABLE` block type.** A comparison is "N devices side by
side," and forcing that into a single lesson's lexical flow doesn't match
how §20/§21 describe it — a browsable *catalog* feature, not lesson prose.
See decision 5.

**No new `INFOGRAPHIC` block type.** Checked directly: `imageBlockSchema` is
`{ src, alt, caption }` — the diagram's richness (labels, arrows, flow,
callouts) lives inside the authored file, not in schema fields. This is
exactly the block that already carried every diagram in the ROS 2
Fundamentals course (fan-out, timeline, contract, closed-loop — all single
`IMAGE` blocks with the complexity baked into an authored SVG). §24's full
list — annotated hardware photos, working-principle diagrams, connection
diagrams, data-pipeline diagrams, troubleshooting flowcharts — is the same
shape of asset. The one real gap is SVG support (decision 3), not a missing
block type.

### 3. SVG support: missing today, adding it

Checked `next.config.ts`: no `images.dangerouslyAllowSVG`, no
`images.contentSecurityPolicy`. Next.js's image optimizer refuses SVG
sources without the former, and strongly recommends the latter even for
same-origin content (SVG can carry `<script>`/`<foreignObject>`). Both
diagrams in this course and every future one need this, so:

```ts
images: {
  dangerouslyAllowSVG: true,
  contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  remotePatterns: [ /* unchanged */ ],
},
```

Scoped to same-origin (`/courses/...`, `/hardware/...` under `public/`) —
every SVG this course ships is authored by us, not learner-uploaded, so the
sandboxed CSP is defense-in-depth rather than a response to an actual
untrusted-input path. No component change needed: `ZoomableImage` already
uses `next/image` with `fill`, which handles SVG the same as raster once the
host config allows it.

**Not touching `ZoomableImage`'s fixed `aspect-video` (16:9) container** —
that's shared by every course's lesson diagrams today and changing it is a
wider design decision outside this stage's scope. `DEVICE_CARD`'s hero image
gets its own presentation component with a card-appropriate ratio instead of
being force-fit into 16:9.

### 4. Legacy/deprecated warning: a shared component driven by the model field

A `<HardwareSupportBanner status={device.supportStatus}
note={device.supportStatusNote} />`, rendered automatically inside both
`SpecTableBlock` and `DeviceCardBlock` whenever `supportStatus !==
"ACTIVELY_MAINTAINED"` — not a separate content block an author has to
remember to place. Directly satisfies the non-negotiable ("never present
outdated drivers without warning... driven by the model field").
`supportStatusNote` is required by a Zod refinement at the write boundary
(§9) whenever status is `LEGACY` or `DEPRECATED` — not a DB `CHECK`
constraint, consistent with how this schema already keeps conditional
validation in the Zod layer (`embedBlockSchema`'s `startSeconds`/`endSeconds`
refinement is the existing precedent) rather than duplicating it in SQL.

### 5. Comparison view and device catalog: a new route, not a lesson block

`HARDWARE 001/002` and §3's "scalable... library" framing describe something
a learner browses independent of any one lesson, the same way the course
catalog exists outside any one course's pages. Proposed:

- `GET /hardware` — index of all devices with a `homeSection` in a
  published, publicly-visible course (reuses `isPubliclyVisible` from
  `visibility.ts` transitively through the owning course — **no new
  authorization branch**, decision 6 below).
- `GET /hardware/[slug]` — one device's full card: hero image, support
  banner, spec table, topic list.
- `GET /hardware/compare?devices=slug-a,slug-b` — §20's side-by-side view.

`DeviceCardBlock` (the lesson-embedded content-block renderer) and
`/hardware/[slug]` share the same underlying `<DeviceCard>` presentational
component — one visual definition, two entry points, per §21/§34 (avoid
duplicate components).

### 6. Authorization: no new rule, reuses the existing course-visibility chain

A `SPEC_TABLE`/`DEVICE_CARD` block embedded in a lesson is gated exactly like
any other block today — it's a child of that `Lesson`, so the existing
`course:learn` check already covers it with zero new code. The standalone
`/hardware` catalog reuses `CATALOG_VISIBILITY`/`isPubliclyVisible`
transitively: a device is listed only if its `homeSection.course` is
`PUBLISHED` + `PUBLIC`, exactly the rule that already governs the course
catalogue. This is deliberate: §12 says never invent a second authorization
path when an existing one already answers the question correctly.

### 7. Visual asset sourcing — stated now, not deferred

| §24 visual type | Source | Notes |
|---|---|---|
| Annotated hardware diagram | **Generated SVG** | Same technique as the ROS 2 course's diagrams this session (HTML+SVG, Playwright-captured) |
| Working-principle diagram | **Generated SVG** | Same technique |
| Connection diagram | **Generated SVG** | Same technique |
| Data-pipeline diagram | **Generated SVG** | Same technique |
| Troubleshooting flowchart | **Generated SVG** | Same technique |
| Product hero photo | **Needs real photography or licensed manufacturer imagery** | Not resolvable from this session — no physical units, no license search done. Stage 1's own Playwright screenshots use a clearly-labelled generated placeholder (a simple category icon), never a stand-in presented as the real product |
| RViz2 visualization screenshot | **Needs real hardware + a human running it** | Cannot be generated or faked — it's a screenshot of live sensor output. `heroImageSrc`/lesson IMAGE fields render their empty/placeholder state until this exists; explicitly deferred, not silently dropped |

Stage 2's Visual Asset Strategy deliverable (already required by the kickoff
prompt) is where photography licensing gets resolved properly — flagged here
so it isn't lost between stages.

---

## Files to change

- `prisma/schema.prisma` — `HardwareCategory`, `HardwareSupportStatus` enums;
  `HardwareDevice`, `HardwareDeviceSpec`, `HardwareDeviceTopic` models;
  `SPEC_TABLE`/`DEVICE_CARD` added to `ContentBlockType`; `hardwareDeviceId`
  FK added to `LessonContentBlock`; `hardwareDevices` back-relation added to
  `Section`.
- `prisma/migrations/` — one new migration (additive only: new enum values,
  new tables, one new nullable FK column — no data-destructive step).
- `next.config.ts` — `images.dangerouslyAllowSVG`,
  `images.contentSecurityPolicy`.
- `src/features/hardware/schemas.ts` (new) — Zod schemas: device write
  input (with the `supportStatusNote`-required-for-LEGACY/DEPRECATED
  refinement), spec/topic row shapes, `SPEC_TABLE`/`DEVICE_CARD` block
  placement-option schema.
- `src/features/hardware/queries.ts` (new) — `getHardwareDevice(slug)`,
  `listPubliclyVisibleHardware()`, `getHardwareDevicesForComparison(slugs)` —
  mirrors `features/courses/queries.ts`'s existing shape and reuses
  `CATALOG_VISIBILITY`-equivalent filtering.
- `src/features/learning/queries.ts` — extend `RenderableBlock` with
  `SPEC_TABLE`/`DEVICE_CARD` kinds; extend `getLessonContentBlocks`'s
  `include` to pull `hardwareDevice.{specs,topics}`.
- `src/features/learning/components/block-renderer.tsx` — two new `case`s.
- `src/features/learning/components/blocks/spec-table-block.tsx` (new)
- `src/features/learning/components/blocks/device-card-block.tsx` (new)
- `src/components/hardware/hardware-support-banner.tsx` (new) — shared
  legacy/deprecated warning, decision 4.
- `src/components/hardware/device-card.tsx` (new) — shared presentational
  card, decision 5.
- `src/app/hardware/page.tsx`, `src/app/hardware/[slug]/page.tsx`,
  `src/app/hardware/compare/page.tsx` (new routes)
- `src/features/chat/context.ts` — grounding-text `switch` needs the same
  two new cases as `block-renderer.tsx` (flagged explicitly by that file's
  own comment; easy to miss otherwise).
- `prisma/seed.ts` — two `HardwareDevice` seed rows (RPLIDAR A2, Astra Pro)
  with real spec/topic data pulled from `docs/hardware/JAZZY_DEVICE_VERIFICATION.md`
  (§1.3/§2.3's already-verified facts — baud rate, topic name, QoS, VID:PID
  pairs), so Stage 1's own Playwright validation renders real data, not
  lorem ipsum. Support status: RPLIDAR A2 → `ACTIVELY_MAINTAINED`; Astra
  Pro → `LEGACY` with a note pointing at §2.2a's fork.

## Potential risks

- **Scope creep into Stage 2/3 content.** These two seed rows are schema
  validation fixtures, not the real device profiles — Stage 4 still owns
  the actual deep research/profile-writing. Keeping the seed data
  deliberately thin (the facts Stage 0 already verified, nothing invented)
  keeps that boundary honest.
- **`HardwareDeviceSpec.key` collisions across unrelated device types.**
  "range" means something different for a LiDAR (distance) than a
  hypothetical force sensor (newtons). Comparison-matching by bare `key` is
  fine within one `HardwareCategory` (the only real use case now, two
  devices in different categories) but will need category-scoping before
  cross-category comparison ever ships — noted here so it isn't a surprise
  later, not solved now (§34 — don't build for a requirement that doesn't
  exist yet).
- **Migration is additive and low-risk** (new enum values, new tables, one
  nullable FK) — no existing data changes shape. Still run against a
  disposable dev DB first per §41.
- **Hardware-in-the-loop drift.** Nothing in this plan reads a live device,
  opens a serial port, or renders real-time data — confirming explicitly
  since the kickoff prompt requires flagging any drift toward that on sight.

## Validation plan

- `pnpm db:generate`, `pnpm db:migrate` against the local dev DB; confirm
  the migration is additive-only by inspecting the generated SQL before
  applying.
- `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:integration`,
  `pnpm build` — the existing suite, unchanged pass bar.
- Seed the two fixture devices; `pnpm db:seed` run twice to confirm
  idempotency (existing convention).
- Playwright, as you specified: screenshot a `SPEC_TABLE` block, a
  `DEVICE_CARD` with its hero image (placeholder, per §7 above), the
  two-device `/hardware/compare` view, one generated SVG diagram rendered
  inline in a lesson (confirming `dangerouslyAllowSVG` actually works, not
  just configured), and the legacy-status banner on the Astra Pro card.
- Confirm `/hardware` is reachable signed-out (public course) and that a
  device embedded in a hypothetical `DRAFT` course's lesson is *not*
  reachable signed-out — the one authorization case actually worth
  re-testing, since it's the one place this plan touches a `Section`
  relation the existing policy checks don't already know about.

---

Waiting for go-ahead before implementing.
