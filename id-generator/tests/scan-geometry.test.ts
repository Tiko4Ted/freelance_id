import {
  FACE_GUIDE_ASPECT_RATIO,
  FACE_GUIDE_CENTER_X,
  FACE_GUIDE_CENTER_Y,
  FACE_GUIDE_HEIGHT_RATIO,
  getGuideBounds,
  getVisibleSourceRect,
} from "@/lib/scan/detector";
import { describe, expect, it } from "vitest";

describe("scan preview geometry", () => {
  it("maps a landscape source into a portrait object-cover preview", () => {
    const visible = getVisibleSourceRect(1280, 720, 360, 480);

    expect(visible).toEqual({
      x: 370,
      y: 0,
      width: 540,
      height: 720,
    });
  });

  it("keeps the guide centered inside the visible crop", () => {
    const guide = getGuideBounds(1280, 720, 360, 480);

    expect(guide.x + guide.width / 2).toBeCloseTo(640);
    expect(guide.y + guide.height / 2).toBeCloseTo(345.6);
    expect(guide.width / guide.height).toBeCloseTo(FACE_GUIDE_ASPECT_RATIO);
    expect(guide.width).toBeGreaterThan(0);
    expect(guide.height).toBeGreaterThan(0);
  });

  it("uses the same guide proportions for a matching landscape preview", () => {
    const guide = getGuideBounds(1280, 720, 640, 360);

    expect(guide.x + guide.width / 2).toBeCloseTo(640);
    expect(guide.y + guide.height / 2).toBeCloseTo(345.6);
    expect(guide.height).toBeCloseTo(720 * FACE_GUIDE_HEIGHT_RATIO);
    expect(guide.width).toBeCloseTo(
      720 * FACE_GUIDE_HEIGHT_RATIO * FACE_GUIDE_ASPECT_RATIO,
    );
  });

  it("keeps the visual constants explicit and shared", () => {
    expect(FACE_GUIDE_CENTER_X).toBe(0.5);
    expect(FACE_GUIDE_CENTER_Y).toBe(0.48);
    expect(FACE_GUIDE_HEIGHT_RATIO).toBe(0.72);
    expect(FACE_GUIDE_ASPECT_RATIO).toBe(0.8);
  });
});
