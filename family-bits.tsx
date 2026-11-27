import { useEffect, useRef } from 'react';

const fmt = new Intl.DateTimeFormat('ar', { dateStyle: 'medium', timeStyle: 'short' });
export const fmtDate = (iso: string) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? iso : fmt.format(d); };
export const nf = new Intl.NumberFormat('ar');

export function RevokeDialog({ label, pending, error, onCancel, onConfirm }: { label: string; pending: boolean; error: string | null; onCancel: () => void; onConfirm: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !pending) onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel, pending]);
  return (
    <div className="family-overlay" onClick={() => { if (!pending) onCancel(); }}>
      <div className="family-dialog" role="alertdialog" aria-modal="true" aria-labelledby="rv-t" aria-describedby="rv-d" onClick={(e) => e.stopPropagation()} data-testid="dialog-revoke">
        <h2 id="rv-t">إلغاء الربط مع {label}؟</h2>
        <p id="rv-d" className="family-note">سيُزال الوصول فقط، فلن يتمكّن أي من الحسابين من رؤية الآخر. لا تُحذف أي بيانات من حساب الطفل، وتبقى اختياراته كما هي.</p>
        {error && <p className="family-error" role="alert">{error}</p>}
        <div className="family-row">
          <button ref={ref} type="button" className="family-btn family-btn--ghost" onClick={onCancel} disabled={pending} data-testid="button-revoke-cancel">تراجع</button>
          <button type="button" className="family-btn family-btn--danger" onClick={onConfirm} disabled={pending} data-testid="button-revoke-confirm">{pending ? 'جارٍ الإلغاء...' : 'إلغاء الربط'}</button>
        </div>
      </div>
    </div>
  );
}
