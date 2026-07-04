import { describe, expect, it } from "vitest";

import {
  moveRedaction,
  pointInsideRedaction,
  rectToRedaction,
  redactionAtPoint,
  redactionHandleAtPoint,
  resizeRedactionPoint,
  rotateRedaction,
  type RedactionPolygon,
} from "./mediaRedactionGeometry";

function rectangle(): RedactionPolygon {
  return {
    points: [
      { x: 0.2, y: 0.2 },
      { x: 0.6, y: 0.2 },
      { x: 0.6, y: 0.5 },
      { x: 0.2, y: 0.5 },
    ],
  };
}

describe("media redaction geometry", () => {
  it("creates normalized four-point redactions from pointer drag", () => {
    expect(rectToRedaction({ x: 0.8, y: 0.7 }, { x: 0.2, y: 0.1 })).toEqual({
      points: [
        { x: 0.2, y: 0.1 },
        { x: 0.8, y: 0.1 },
        { x: 0.8, y: 0.7 },
        { x: 0.2, y: 0.7 },
      ],
    });
    expect(rectToRedaction({ x: 0.1, y: 0.1 }, { x: 0.101, y: 0.1 })).toBeNull();
  });

  it("moves redactions without letting them leave the image", () => {
    const moved = moveRedaction(rectangle(), 0.5, -0.4);

    expect(moved.points).toEqual([
      { x: 0.6, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 0.3 },
      { x: 0.6, y: 0.3 },
    ]);
  });

  it("resizes the grabbed corner only", () => {
    const resized = resizeRedactionPoint(rectangle(), 2, { x: 0.9, y: 0.9 });

    expect(resized.points[2]).toEqual({ x: 0.9, y: 0.9 });
    expect(resized.points[0]).toEqual({ x: 0.2, y: 0.2 });
  });

  it("finds handles and redactions from normalized pointer positions", () => {
    const redactions = [rectangle()];

    expect(pointInsideRedaction({ x: 0.3, y: 0.3 }, redactions[0])).toBe(true);
    expect(redactionAtPoint({ x: 0.3, y: 0.3 }, redactions)).toBe(0);
    expect(
      redactionHandleAtPoint({ x: 0.2, y: 0.2 }, redactions, 0, {
        displayHeight: 400,
        displayWidth: 600,
      }),
    ).toMatchObject({ pointIndex: 0, redactionIndex: 0 });
  });

  it("rotates the active redaction around its center", () => {
    const rotated = rotateRedaction(rectangle(), 90);

    expect(rotated.points[0].x).toBeCloseTo(0.55);
    expect(rotated.points[0].y).toBeCloseTo(0.15);
    expect(rotated.points[2].x).toBeCloseTo(0.25);
    expect(rotated.points[2].y).toBeCloseTo(0.55);
  });
});
