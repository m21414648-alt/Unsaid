import { validStrokes, type DrawingStroke, type SavedDrawing } from './drawing-model';

export const DRAWINGS_KEY = 'unsaid-drawings';
export const MAX_DRAWINGS = 2;
export type DrawingResult = { ok: true; id: string } | { ok: false; error: string };

export function readDrawings(storage: Pick<Storage, 'getItem'>): SavedDrawing[] {
  const raw = storage.getItem(DRAWINGS_KEY);
  if (raw === null) return [];
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('تعذّر قراءة الرسومات المحفوظة. لم يتم حذفها أو استبدالها.');
  }
  if (
    data?.version !== 1 || !Array.isArray(data.drawings) ||
    data.drawings.length > MAX_DRAWINGS ||
    !data.drawings.every((drawing: SavedDrawing) =>
      drawing && typeof drawing.id === 'string' &&
      typeof drawing.createdAt === 'string' && typeof drawing.updatedAt === 'string' &&
      Number.isFinite(Date.parse(drawing.createdAt)) && Number.isFinite(Date.parse(drawing.updatedAt)) &&
      (drawing.showOnBoard === undefined || typeof drawing.showOnBoard === 'boolean') &&
      validStrokes(drawing.strokes),
    ) || new Set(data.drawings.map((drawing: SavedDrawing) => drawing.id)).size !== data.drawings.length
  ) throw new Error('تعذّر قراءة الرسومات المحفوظة. لم يتم حذفها أو استبدالها.');
  return data.drawings;
}

export function storeDrawing(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  strokes: DrawingStroke[],
  id?: string,
): { drawings: SavedDrawing[]; id: string } {
  if (!strokes.length) throw new Error('ارسم شيئًا أولًا قبل الحفظ.');
  if (!validStrokes(strokes)) throw new Error('الرسم كبير جدًا أو غير صالح للحفظ.');
  const drawings = readDrawings(storage);
  const existing = id ? drawings.findIndex((drawing) => drawing.id === id) : -1;
  if (id && existing < 0) throw new Error('لم يعد الرسم موجودًا. اختر رسمًا جديدًا للحفظ.');
  if (existing < 0 && drawings.length >= MAX_DRAWINGS) {
    throw new Error('يمكنك حفظ رسمتين فقط. احذف رسمة محفوظة لإتاحة مكان لرسم جديد.');
  }
  const now = new Date().toISOString();
  const drawing: SavedDrawing = {
    id: id ?? crypto.randomUUID(),
    createdAt: existing >= 0 ? drawings[existing].createdAt : now,
    updatedAt: now,
    strokes,
    showOnBoard: existing >= 0 ? drawings[existing].showOnBoard ?? false : false,
  };
  const next = existing >= 0
    ? drawings.map((item, index) => index === existing ? drawing : item)
    : [...drawings, drawing];
  storage.setItem(DRAWINGS_KEY, JSON.stringify({ version: 1, drawings: next }));
  return { drawings: next, id: drawing.id };
}

export function removeDrawing(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  id: string,
): SavedDrawing[] {
  const drawings = readDrawings(storage);
  if (!drawings.some((drawing) => drawing.id === id)) {
    throw new Error('لم يعد الرسم موجودًا.');
  }
  const next = drawings.filter((drawing) => drawing.id !== id);
  storage.setItem(DRAWINGS_KEY, JSON.stringify({ version: 1, drawings: next }));
  return next;
}

export function setDrawingOnBoard(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  id: string,
  enabled: boolean,
): SavedDrawing[] {
  const drawings = readDrawings(storage);
  if (!drawings.some((drawing) => drawing.id === id)) {
    throw new Error('لم يعد الرسم موجودًا.');
  }
  const next = drawings.map((drawing) =>
    drawing.id === id ? { ...drawing, showOnBoard: enabled } : drawing,
  );
  storage.setItem(DRAWINGS_KEY, JSON.stringify({ version: 1, drawings: next }));
  return next;
}