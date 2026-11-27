import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'wouter';
import BottomNavigation from '@/components/bottom-navigation';
import DrawingPad, { DrawingPreview } from '@/components/drawing-pad';
import FeatherIcon from '@/components/feather-icon';
import { useFontSettings } from '@/context/font-settings';
import { useDrawingDraft } from '@/context/drawing-draft';
import { drawingColors } from '@/lib/drawing-model';
import type { DrawingStroke } from '@/lib/drawing-model';
import useSavedDrawings from '@/hooks/use-saved-drawings';
import './touch.css';

type Message = { kind: 'ok' | 'error'; text: string } | null;

const MAX = 2;

export default function Touch() {
  const { fontSize } = useFontSettings();
  const { savedDrawings, storageError, saveDrawing, deleteDrawing, setOnBoard } = useSavedDrawings();
  const {
    strokes, setStrokes, color, setColor, tool, setTool,
    loadedId, setLoadedId, dirty, setDirty, resetDraft,
  } = useDrawingDraft();
  const [message, setMessage] = useState<Message>(null);

  useEffect(() => {
    document.title = 'لمستي — Unsaid';
    document.documentElement.lang = 'ar';
    document.documentElement.dir = 'rtl';
  }, []);

  const confirmDiscard = (text: string) => !dirty || window.confirm(text);
  const guard = () => {
    if (!confirmDiscard('لديك رسمة لم تُحفظ. هل تريد المغادرة وفقدانها؟')) return false;
    if (dirty) resetDraft();
    return true;
  };
  const empty = strokes.length === 0;
  const full = savedDrawings.length >= MAX && !loadedId;
  const loadedExists = useMemo(() => savedDrawings.some((d) => d.id === loadedId), [savedDrawings, loadedId]);
  const targetId = loadedExists ? loadedId : null;
  const canSave = !empty && (targetId !== null || savedDrawings.length < MAX);

  const onChange = (next: DrawingStroke[]) => {
    setStrokes(next);
    setDirty(true);
    setMessage(null);
  };

  const save = () => {
    if (!canSave) {
      setMessage({ kind: 'error', text: empty ? 'ارسم شيئًا أولًا قبل الحفظ.' : 'لا توجد مساحة. احذف رسمة محفوظة أولًا.' });
      return;
    }
    const r = targetId ? saveDrawing(strokes, targetId) : saveDrawing(strokes);
    if (r.ok) {
      setLoadedId(r.id);
      setDirty(false);
      setMessage({ kind: 'ok', text: targetId ? 'تم تحديث الرسمة المحفوظة.' : 'تم حفظ رسمتك.' });
    } else setMessage({ kind: 'error', text: r.error });
  };

  const startNew = () => {
    if (!confirmDiscard('لديك تغييرات لم تُحفظ. هل تريد البدء برسمة جديدة؟')) return;
    setStrokes([]);
    setLoadedId(null);
    setDirty(false);
    setMessage(null);
  };

  const clearPaper = () => {
    if (empty) return;
    if (!window.confirm('هل تريد مسح الورقة؟')) return;
    setStrokes([]);
    setDirty(true);
    setMessage(null);
  };

  const open = (id: string, s: DrawingStroke[]) => {
    if (!confirmDiscard('لديك تغييرات لم تُحفظ. هل تريد استبدالها بالرسمة المحفوظة؟')) return;
    setStrokes(s);
    setLoadedId(id);
    setDirty(false);
    setMessage(null);
  };

  const remove = (id: string) => {
    if (!window.confirm('هل تريد حذف هذه الرسمة المحفوظة؟')) return;
    const r = deleteDrawing(id);
    if (r.ok) {
      if (loadedId === id) {
        setLoadedId(null);
        if (strokes.length) setDirty(true);
      }
      setMessage({ kind: 'ok', text: 'تم حذف الرسمة.' });
    } else setMessage({ kind: 'error', text: r.error });
  };

  const fmt = (t: number | string) => {
    try {
      return new Date(t).toLocaleDateString('ar', { day: 'numeric', month: 'long' });
    } catch {
      return '';
    }
  };

  const toggleOnBoard = (id: string, enabled: boolean) => {
    const result = setOnBoard(id, enabled);
    setMessage(result.ok
      ? { kind: 'ok', text: enabled
        ? 'تمت إضافة الرسمة إلى الأيقونات الأساسية.'
        : 'تمت إزالة الرسمة من الأيقونات الأساسية، وهي ما زالت محفوظة هنا.' }
      : { kind: 'error', text: result.error });
  };

  return (
    <main
      className="settings-screen touch-screen"
      dir="rtl"
      lang="ar"
      style={{ '--communication-font-size': `${fontSize}px` } as CSSProperties}
    >
      <div className="settings-shell touch-shell">
        <header className="settings-header">
          <Link href="/settings" className="settings-back" data-testid="link-back-to-settings" onClick={(e) => { if (!guard()) e.preventDefault(); }}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M19 12H5m0 0 6-6m-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>العودة للإعدادات</span>
          </Link>
          <div className="settings-heading">
            <span className="settings-heading__eyebrow">ارسم ما تشعر به</span>
            <h1>لمستي</h1>
            <p>اختر لونًا وارسم على الورقة بحرية.</p>
          </div>
        </header>

        <section className="settings-card touch-card" aria-label="لوحة الرسم">
          <div className="touch-tools" role="group" aria-label="الأدوات">
            <button type="button" className="touch-btn" aria-pressed={tool === 'brush'} onClick={() => setTool('brush')} data-testid="button-tool-brush">
              <FeatherIcon width="1.3em" height="1.3em" aria-hidden="true" />
              <span>ريشة</span>
            </button>
            <button type="button" className="touch-btn" aria-pressed={tool === 'eraser'} onClick={() => setTool('eraser')} data-testid="button-tool-eraser">
              <svg viewBox="0 0 24 24" width="1.3em" height="1.3em" fill="none" aria-hidden="true">
                <path d="m8 20-4.3-4.3a1.5 1.5 0 0 1 0-2.1L13.6 3.7a1.5 1.5 0 0 1 2.1 0l4.6 4.6a1.5 1.5 0 0 1 0 2.1L12 19.8M8 20h12M6.5 10.8l6.7 6.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>ممحاة</span>
            </button>
            <div className="touch-colors" role="group" aria-label="الألوان">
              {drawingColors.map((c) => (
                <button
                  key={c.color}
                  type="button"
                  className="touch-color"
                  style={{ '--swatch': c.color } as CSSProperties}
                  aria-pressed={tool === 'brush' && color === c.color}
                  aria-label={c.label}
                  title={c.label}
                  onClick={() => { setColor(c.color); setTool('brush'); }}
                  data-testid={`button-color-${c.label}`}
                />
              ))}
            </div>
          </div>

          <div className="touch-paper" data-testid="canvas-paper">
            <DrawingPad strokes={strokes} onChange={onChange} color={color} tool={tool} />
          </div>

          <div className="touch-actions">
            <button type="button" className="touch-btn touch-btn--primary" onClick={save} disabled={!canSave} data-testid="button-save-drawing">
              {targetId ? 'تحديث المحفوظة' : 'حفظ الرسمة'}
            </button>
            <button type="button" className="touch-btn" onClick={startNew} data-testid="button-new-drawing">جديدة</button>
            <button type="button" className="touch-btn" onClick={clearPaper} disabled={empty} data-testid="button-clear-paper">مسح الورقة</button>
          </div>

          <p className="touch-count" data-testid="text-saved-count">
            المحفوظ: <span dir="ltr">{savedDrawings.length}/{MAX}</span>
            {full && ' — المعرض ممتلئ، احذف رسمة لحفظ جديدة.'}
            {dirty && ' — توجد تغييرات لم تُحفظ.'}
          </p>
          {message && (
            <p className={`touch-msg touch-msg--${message.kind}`} role={message.kind === 'error' ? 'alert' : 'status'} data-testid={`status-${message.kind}`}>
              {message.text}
            </p>
          )}
          {storageError && (
            <p className="touch-msg touch-msg--error" role="alert" data-testid="status-storage-error">{storageError}</p>
          )}
        </section>

        <section className="settings-card touch-card touch-gallery" aria-labelledby="touch-gallery-title" data-testid="gallery-saved">
          <h2 id="touch-gallery-title">رسماتي المحفوظة</h2>
          {savedDrawings.length === 0 ? (
            <p className="touch-empty" data-testid="text-gallery-empty">لا توجد رسمات محفوظة بعد.</p>
          ) : (
            <ul className="touch-list">
              {savedDrawings.map((d) => (
                <li key={d.id} className="touch-item" data-testid={`card-drawing-${d.id}`}>
                  <div className="touch-thumb">
                    <DrawingPreview strokes={d.strokes} />
                  </div>
                  <span className="touch-date">{fmt(d.updatedAt ?? d.createdAt)}{loadedId === d.id ? ' — مفتوحة' : ''}</span>
                  <div className="touch-item__actions">
                    <button
                      type="button"
                      className="touch-btn"
                      aria-pressed={!!d.showOnBoard}
                      onClick={() => toggleOnBoard(d.id, !d.showOnBoard)}
                      data-testid={`button-toggle-board-${d.id}`}
                    >
                      {d.showOnBoard ? 'إزالة من الأيقونات الأساسية' : 'إضافة للأيقونات الأساسية'}
                    </button>
                    <button type="button" className="touch-btn" onClick={() => open(d.id, d.strokes)} data-testid={`button-open-drawing-${d.id}`}>فتح</button>
                    <button type="button" className="touch-btn touch-btn--danger" onClick={() => remove(d.id)} data-testid={`button-delete-drawing-${d.id}`}>حذف</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <BottomNavigation onBeforeNavigate={guard} />
    </main>
  );
}
