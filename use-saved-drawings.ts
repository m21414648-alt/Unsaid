import { useEffect, useState } from 'react';
import { type DrawingStroke, type SavedDrawing } from '@/lib/drawing-model';
import { DRAWINGS_KEY, readDrawings, removeDrawing, setDrawingOnBoard, storeDrawing, type DrawingResult } from '@/lib/drawing-storage';

function loadState(): { savedDrawings: SavedDrawing[]; storageError: string | null } {
  try {
    return { savedDrawings: readDrawings(localStorage), storageError: null };
  } catch {
    return {
      savedDrawings: [],
      storageError: 'تعذّر الوصول إلى الرسومات المحفوظة. لم يتم حذفها أو استبدالها.',
    };
  }
}

export default function useSavedDrawings() {
  const [state, setState] = useState(loadState);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === DRAWINGS_KEY || event.key === null) setState(loadState());
    };
    const handleLocalChange = () => setState(loadState());
    window.addEventListener('storage', handleStorage);
    window.addEventListener('unsaid-drawings-changed', handleLocalChange);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('unsaid-drawings-changed', handleLocalChange);
    };
  }, []);

  const saveDrawing = (strokes: DrawingStroke[], id?: string): DrawingResult => {
    try {
      const saved = storeDrawing(localStorage, strokes, id);
      setState({ savedDrawings: saved.drawings, storageError: null });
      window.dispatchEvent(new Event('unsaid-drawings-changed'));
      return { ok: true, id: saved.id };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof DOMException
          ? 'تعذّر حفظ الرسم على الجهاز. قد تكون الذاكرة ممتلئة أو التخزين غير متاح. رسمك الحالي ما زال على الورقة.'
          : error instanceof Error ? error.message : 'تعذّر حفظ الرسم. حاول مجددًا.',
      };
    }
  };

  const deleteDrawing = (id: string): DrawingResult => {
    try {
      const savedDrawings = removeDrawing(localStorage, id);
      setState({ savedDrawings, storageError: null });
      window.dispatchEvent(new Event('unsaid-drawings-changed'));
      return { ok: true, id };
    } catch {
      return { ok: false, error: 'تعذّر حذف الرسم من الجهاز. لم يتم تغيير الرسومات المحفوظة.' };
    }
  };

  const setOnBoard = (id: string, enabled: boolean): DrawingResult => {
    try {
      const savedDrawings = setDrawingOnBoard(localStorage, id, enabled);
      setState({ savedDrawings, storageError: null });
      window.dispatchEvent(new Event('unsaid-drawings-changed'));
      return { ok: true, id };
    } catch {
      return { ok: false, error: 'تعذّر تغيير ظهور الرسمة في الأيقونات الأساسية. لم يتم تغيير الرسومات المحفوظة.' };
    }
  };

  return { ...state, saveDrawing, deleteDrawing, setOnBoard };
}