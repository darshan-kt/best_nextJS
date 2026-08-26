import { describe, expect, it } from "vitest";

import {
  codeBlockSchema,
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
