export const PAPER_WIDTH = 1000;
export const PAPER_HEIGHT = 800;
export const drawingColors = [
  { color: '#2563EB', label: 'الأزرق' },
  { color: '#EF4444', label: 'الأحمر' },
  { color: '#FFFFFF', label: 'الأبيض' },
  { color: '#FACC15', label: 'الأصفر' },
] as const;

export type DrawingPoint = { x: number; y: number };
export type DrawingStroke = { color: string; width: number; points: DrawingPoint[] };
export type SavedDrawing = {
  id: string;
  createdAt: string;
  updatedAt: string;
  strokes: DrawingStroke[];
  showOnBoard?: boolean;
};

export function validStrokes(value: unknown): value is DrawingStroke[] {
  if (!Array.isArray(value) || value.length > 2000) return false;
  let pointCount = 0;
  return value.every((stroke) => {
    if (
      !stroke || typeof stroke !== 'object' ||
      !drawingColors.some((item) => item.color === stroke.color) ||
      !Number.isFinite(stroke.width) || stroke.width < 1 || stroke.width > 100 ||
      !Array.isArray(stroke.points) || stroke.points.length === 0
    ) return false;
    pointCount += stroke.points.length;
    if (pointCount > 100000) return false;
    return stroke.points.every((point: DrawingPoint) =>
      point && Number.isFinite(point.x) && Number.isFinite(point.y) &&
      point.x >= 0 && point.x <= PAPER_WIDTH && point.y >= 0 && point.y <= PAPER_HEIGHT,
    );
  });
}