export type RedactionPoint = {
  x: number;
  y: number;
};

export type RedactionPolygon = {
  points: RedactionPoint[];
};

export type RedactionHandle = {
  cursor: "nesw-resize" | "nwse-resize";
  pointIndex: number;
  redactionIndex: number;
};

export type RedactionCanvasMetrics = {
  displayHeight: number;
  displayWidth: number;
};

const REDACTION_HANDLE_HIT_RADIUS_PX = 18;

function clampUnit(value: number): number {
  return Math.min(Math.max(Number.isFinite(value) ? value : 0, 0), 1);
}

function normalizedPoint(point: RedactionPoint): RedactionPoint {
  return {
    x: Number(clampUnit(point.x).toFixed(6)),
    y: Number(clampUnit(point.y).toFixed(6)),
  };
}

export function rectToRedaction(start: RedactionPoint, end: RedactionPoint): RedactionPolygon | null {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);
  if (width < 0.005 || height < 0.005) {
    return null;
  }

  return {
    points: [
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + height },
      { x, y: y + height },
    ].map(normalizedPoint),
  };
}

function redactionCenter(redaction: RedactionPolygon): RedactionPoint {
  const total = redaction.points.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 });
  const count = Math.max(1, redaction.points.length);
  return { x: total.x / count, y: total.y / count };
}

export function pointInsideRedaction(point: RedactionPoint, redaction: RedactionPolygon): boolean {
  if (redaction.points.length < 3) {
    return false;
  }

  let inside = false;
  for (
    let index = 0, previousIndex = redaction.points.length - 1;
    index < redaction.points.length;
    previousIndex = index++
  ) {
    const current = redaction.points[index];
    const previous = redaction.points[previousIndex];
    const intersects =
      current.y > point.y !== previous.y > point.y &&
      point.x < ((previous.x - current.x) * (point.y - current.y)) / (previous.y - current.y || 1e-9) + current.x;
    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}

export function redactionAtPoint(point: RedactionPoint, redactions: RedactionPolygon[]): number {
  for (let index = redactions.length - 1; index >= 0; index -= 1) {
    if (pointInsideRedaction(point, redactions[index])) {
      return index;
    }
  }
  return -1;
}

function redactionHandleCursor(redaction: RedactionPolygon, pointIndex: number): RedactionHandle["cursor"] {
  const point = redaction.points[pointIndex];
  const center = redactionCenter(redaction);
  return (point.x - center.x) * (point.y - center.y) >= 0 ? "nwse-resize" : "nesw-resize";
}

export function redactionHandleAtPoint(
  point: RedactionPoint,
  redactions: RedactionPolygon[],
  activeRedactionIndex: number,
  metrics: RedactionCanvasMetrics,
): RedactionHandle | null {
  if (activeRedactionIndex < 0) {
    return null;
  }

  const redaction = redactions[activeRedactionIndex];
  if (!redaction) {
    return null;
  }

  for (let pointIndex = 0; pointIndex < redaction.points.length; pointIndex += 1) {
    const handlePoint = redaction.points[pointIndex];
    const dx = (handlePoint.x - point.x) * metrics.displayWidth;
    const dy = (handlePoint.y - point.y) * metrics.displayHeight;
    if (Math.hypot(dx, dy) <= REDACTION_HANDLE_HIT_RADIUS_PX) {
      return {
        cursor: redactionHandleCursor(redaction, pointIndex),
        pointIndex,
        redactionIndex: activeRedactionIndex,
      };
    }
  }
  return null;
}

export function resizeRedactionPoint(
  redaction: RedactionPolygon,
  pointIndex: number,
  point: RedactionPoint,
): RedactionPolygon {
  return {
    points: redaction.points.map((existingPoint, index) =>
      index === pointIndex ? normalizedPoint(point) : existingPoint,
    ),
  };
}

export function moveRedaction(redaction: RedactionPolygon, dx: number, dy: number): RedactionPolygon {
  const minX = Math.min(...redaction.points.map((point) => point.x));
  const maxX = Math.max(...redaction.points.map((point) => point.x));
  const minY = Math.min(...redaction.points.map((point) => point.y));
  const maxY = Math.max(...redaction.points.map((point) => point.y));
  const safeDx = Math.min(Math.max(dx, -minX), 1 - maxX);
  const safeDy = Math.min(Math.max(dy, -minY), 1 - maxY);
  return {
    points: redaction.points.map((point) => normalizedPoint({ x: point.x + safeDx, y: point.y + safeDy })),
  };
}

export function rotateRedaction(redaction: RedactionPolygon, degrees: number): RedactionPolygon {
  const center = redactionCenter(redaction);
  const radians = degrees * (Math.PI / 180);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return {
    points: redaction.points.map((point) => {
      const dx = point.x - center.x;
      const dy = point.y - center.y;
      return normalizedPoint({
        x: center.x + dx * cos - dy * sin,
        y: center.y + dx * sin + dy * cos,
      });
    }),
  };
}
