import { describe, expect, it } from "vitest";

import {
  calloutBlockSchema,
  codeBlockSchema,
  embedBlockSchema,
  fileBlockSchema,
  imageBlockSchema,
  textBlockSchema,
  videoBlockSchema,
} from "./schemas";

/**
 * Content-block payload validation (§9).
 *
 * `LessonContentBlock.data` is an untyped JSON column — these schemas are
 * the only thing standing between a malformed row and a crashed render.
 * Coverage here is deliberately adversarial: missing fields, wrong types,
 * and the empty-string edge each schema's `.min(1)` exists to catch.
 */

describe("textBlockSchema", () => {
  it("accepts a non-empty body", () => {
    expect(textBlockSchema.safeParse({ body: "Hello." }).success).toBe(true);
  });

  it("rejects an empty body", () => {
    expect(textBlockSchema.safeParse({ body: "" }).success).toBe(false);
  });

  it("rejects a missing body", () => {
    expect(textBlockSchema.safeParse({}).success).toBe(false);
  });

  it("rejects a non-string body", () => {
    expect(textBlockSchema.safeParse({ body: 42 }).success).toBe(false);
  });
});

describe("imageBlockSchema", () => {
  it("accepts a valid image with an optional caption", () => {
    const result = imageBlockSchema.safeParse({
      src: "https://example.com/photo.jpg",
      alt: "A photo",
      caption: "Figure 1",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid image without a caption", () => {
    expect(
      imageBlockSchema.safeParse({
        src: "https://example.com/photo.jpg",
        alt: "A photo",
      }).success
    ).toBe(true);
  });

  it("rejects a non-URL src", () => {
    expect(
      imageBlockSchema.safeParse({ src: "not-a-url", alt: "A photo" }).success
    ).toBe(false);
  });

  it("rejects a missing alt", () => {
    expect(
      imageBlockSchema.safeParse({ src: "https://example.com/photo.jpg" })
        .success
    ).toBe(false);
  });
});

describe("videoBlockSchema", () => {
  it("accepts a valid video without a poster", () => {
    expect(
      videoBlockSchema.safeParse({
        src: "https://example.com/video.mp4",
        title: "Intro",
      }).success
    ).toBe(true);
  });

  it("rejects a non-URL poster", () => {
    expect(
      videoBlockSchema.safeParse({
        src: "https://example.com/video.mp4",
        title: "Intro",
        posterSrc: "not-a-url",
      }).success
    ).toBe(false);
  });
});

describe("codeBlockSchema", () => {
  it("accepts code with no language or filename", () => {
    expect(codeBlockSchema.safeParse({ code: "const x = 1;" }).success).toBe(
      true
    );
  });

  it("accepts code with a language and filename", () => {
    expect(
      codeBlockSchema.safeParse({
        code: "const x = 1;",
        language: "typescript",
        filename: "example.ts",
      }).success
    ).toBe(true);
  });

  it("rejects empty code", () => {
    expect(codeBlockSchema.safeParse({ code: "" }).success).toBe(false);
  });
});

describe("embedBlockSchema", () => {
  const valid = {
    provider: "youtube",
    videoId: "dQw4w9WgXcQ",
    title: "Understanding ROS 2 topics",
    creator: "Articulated Robotics",
  };

  it("accepts a valid YouTube embed", () => {
    expect(embedBlockSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts optional whySelected and durationLabel", () => {
    expect(
      embedBlockSchema.safeParse({
        ...valid,
        whySelected: "Clearest explanation of topics available.",
        durationLabel: "12 min",
      }).success
    ).toBe(true);
  });

  it("rejects a video id that isn't exactly 11 characters", () => {
    expect(
      embedBlockSchema.safeParse({ ...valid, videoId: "short" }).success
    ).toBe(false);
  });

  it("rejects a video id with characters YouTube ids never contain", () => {
    // A URL-injection attempt: this is what strict videoId validation
    // (rather than trusting an authored embed URL directly) rules out.
    expect(
      embedBlockSchema.safeParse({ ...valid, videoId: "abc/def?ghi" }).success
    ).toBe(false);
  });

  it("rejects a provider other than youtube", () => {
    expect(
      embedBlockSchema.safeParse({ ...valid, provider: "vimeo" }).success
    ).toBe(false);
  });
});

describe("calloutBlockSchema", () => {
  it("accepts a valid callout without a title", () => {
    expect(
      calloutBlockSchema.safeParse({ variant: "TIP", body: "Use tab completion." })
        .success
    ).toBe(true);
  });

  it("accepts every documented variant", () => {
    for (const variant of ["INFO", "TIP", "WARNING", "DANGER"]) {
      expect(
        calloutBlockSchema.safeParse({ variant, body: "Body text." }).success
      ).toBe(true);
    }
  });

  it("rejects an undocumented variant", () => {
    expect(
      calloutBlockSchema.safeParse({ variant: "SUCCESS", body: "Body text." })
        .success
    ).toBe(false);
  });

  it("rejects an empty body", () => {
    expect(calloutBlockSchema.safeParse({ variant: "INFO", body: "" }).success).toBe(
      false
    );
  });
});

describe("fileBlockSchema", () => {
  it("accepts a valid file with only the required fields", () => {
    expect(
      fileBlockSchema.safeParse({
        href: "https://example.com/cheatsheet.pdf",
        label: "ROS 2 command cheat sheet",
      }).success
    ).toBe(true);
  });

  it("rejects a non-URL href", () => {
    expect(
      fileBlockSchema.safeParse({ href: "not-a-url", label: "Cheat sheet" })
        .success
    ).toBe(false);
  });

  it("rejects a missing label", () => {
    expect(
      fileBlockSchema.safeParse({ href: "https://example.com/file.pdf" }).success
    ).toBe(false);
  });
});
