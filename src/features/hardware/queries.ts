import { prisma } from "@/db/client";
import type {
  HardwareCategory,
  HardwareSupportStatus,
} from "@/db/generated/enums";

/**
 * Hardware device data access (application layer, §5).
 *
 * Visibility deliberately reuses the course catalogue's own rule rather
 * than inventing a second authorization path (§12, Stage 1 plan decision
 * 6): a device is publicly listed only when the section that teaches it
 * belongs to a `PUBLISHED` + `PUBLIC` course — the exact same condition as
 * `CATALOG_VISIBILITY` in `features/courses/visibility.ts`, expressed one
 * relation deeper. A device embedded inline in a lesson (`SPEC_TABLE`,
 * `DEVICE_CARD`) is not fetched through this file at all — it rides along
 * with `getLessonContentBlocks`, which is already gated by that lesson's
 * own `course:learn` check before any block is read.
 */

const PUBLIC_HOME_SECTION_FILTER = {
  homeSection: {
    course: {
      status: "PUBLISHED" as const,
      visibility: "PUBLIC" as const,
    },
  },
};

export interface HardwareDeviceCardSummary {
  id: string;
  slug: string;
  name: string;
  manufacturer: string;
  category: HardwareCategory;
  summary: string;
  heroImageSrc: string | null;
  heroImageAlt: string | null;
  supportStatus: HardwareSupportStatus;
  supportStatusNote: string | null;
}

const cardSummarySelect = {
  id: true,
  slug: true,
  name: true,
  manufacturer: true,
  category: true,
  summary: true,
  heroImageSrc: true,
  heroImageAlt: true,
  supportStatus: true,
  supportStatusNote: true,
} as const;

export interface HardwareDeviceSpecItem {
  key: string;
  label: string;
  value: string;
  unit: string | null;
  whyItMatters: string;
}

export interface HardwareDeviceTopicItem {
  topicName: string;
  messageType: string;
  description: string;
}

export interface HardwareDeviceDetail extends HardwareDeviceCardSummary {
  driverPackage: string;
  driverRepoUrl: string;
  rosDistroCompat: string[];
  specs: HardwareDeviceSpecItem[];
  topics: HardwareDeviceTopicItem[];
}

/** The `/hardware` catalog index — publicly visible devices only. */
export async function listPubliclyVisibleHardware(): Promise<
  HardwareDeviceCardSummary[]
> {
  return prisma.hardwareDevice.findMany({
    where: PUBLIC_HOME_SECTION_FILTER,
    select: cardSummarySelect,
    orderBy: { name: "asc" },
  });
}

/**
 * One device's full detail — `/hardware/[slug]` and the DEVICE_CARD
 * component's expanded state both use this. Returns null for a device
 * that doesn't exist or isn't publicly visible; the caller renders
 * `notFound()` either way, so the two cases are deliberately
 * indistinguishable to the visitor (§26 — same reasoning
 * `getCourseWithCurriculum` already applies to a private course).
 */
export async function getHardwareDeviceBySlug(
  slug: string
): Promise<HardwareDeviceDetail | null> {
  const device = await prisma.hardwareDevice.findUnique({
    where: { slug, ...PUBLIC_HOME_SECTION_FILTER },
    select: {
      ...cardSummarySelect,
      driverPackage: true,
      driverRepoUrl: true,
      rosDistroCompat: true,
      specs: {
        orderBy: { sortOrder: "asc" },
        select: { key: true, label: true, value: true, unit: true, whyItMatters: true },
      },
      topics: {
        orderBy: { sortOrder: "asc" },
        select: { topicName: true, messageType: true, description: true },
      },
    },
  });

  return device;
}

/**
 * Two or more devices for the `/hardware/compare` view. Slugs not found or
 * not publicly visible are silently absent from the result rather than
 * erroring — the page renders whatever subset resolved, same tolerance
 * `getPublishedLessonsForCourses` already applies to a missing id.
 */
export async function getHardwareDevicesForComparison(
  slugs: readonly string[]
): Promise<HardwareDeviceDetail[]> {
  if (slugs.length === 0) {
    return [];
  }

  const devices = await prisma.hardwareDevice.findMany({
    where: { slug: { in: [...slugs] }, ...PUBLIC_HOME_SECTION_FILTER },
    select: {
      ...cardSummarySelect,
      driverPackage: true,
      driverRepoUrl: true,
      rosDistroCompat: true,
      specs: {
        orderBy: { sortOrder: "asc" },
        select: { key: true, label: true, value: true, unit: true, whyItMatters: true },
      },
      topics: {
        orderBy: { sortOrder: "asc" },
        select: { topicName: true, messageType: true, description: true },
      },
    },
  });

  // Preserve the order the caller asked for (URL query order), not
  // whatever order Postgres happened to return.
  const bySlug = new Map(devices.map((device) => [device.slug, device]));
  return slugs
    .map((slug) => bySlug.get(slug))
    .filter((device): device is HardwareDeviceDetail => device !== undefined);
}

/**
 * A device by id, no visibility filter — for `SPEC_TABLE`/`DEVICE_CARD`
 * content blocks embedded in a lesson, where `getLessonContentBlocks` has
 * already resolved and authorized the lesson itself before this ever runs
 * (§12: authorization happens once, at the lesson boundary, not
 * re-derived per block).
 */
export async function getHardwareDeviceForBlock(
  id: string
): Promise<HardwareDeviceDetail | null> {
  return prisma.hardwareDevice.findUnique({
    where: { id },
    select: {
      ...cardSummarySelect,
      driverPackage: true,
      driverRepoUrl: true,
      rosDistroCompat: true,
      specs: {
        orderBy: { sortOrder: "asc" },
        select: { key: true, label: true, value: true, unit: true, whyItMatters: true },
      },
      topics: {
        orderBy: { sortOrder: "asc" },
        select: { topicName: true, messageType: true, description: true },
      },
    },
  });
}
