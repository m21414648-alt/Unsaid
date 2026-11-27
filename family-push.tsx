import { useCallback, useEffect, useState } from 'react';
import { disablePush, enablePush, pushSupport, reconcilePush } from '@/lib/family-push';

type State = 'checking' | 'unsupported' | 'denied' | 'off' | 'on';

export function FamilyPush({ userId }: { userId: string }) {
  const { supported, ios } = pushSupport();
  const [state, setState] = useState<State>('checking');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async () => {
    if (!supported) { setState('unsupported'); return; }
    if (Notification.permission === 'denied') { setState('denied'); return; }
    try {
      if (Notification.permission === 'granted' && (await reconcilePush(userId))) { setState('on'); return; }
      setState('off');
    } catch {
      setState('off');
      setError('تعذّرت مزامنة حالة الإشعارات مع الخادم. حاول لاحقًا.');
    }
  }, [supported, userId]);

  useEffect(() => { setError(null); void check(); }, [check, userId]);

  async function turnOn() {
    setBusy(true); setError(null);
    try {
      const r = await enablePush(userId);
      setState(r === 'enabled' ? 'on' : Notification.permission === 'denied' ? 'denied' : 'off');
      if (r === 'denied' && Notification.permission !== 'denied') setError('لم يتم منح الإذن، فلم تُفعَّل الإشعارات.');
    } catch {
      setState('off'); setError('تعذّر تفعيل الإشعارات. تحقّق من الاتصال ثم حاول مرة أخرى.');
    } finally { setBusy(false); }
  }
  async function turnOff() {
    setBusy(true); setError(null);
    try { await disablePush(); setState('off'); }
    catch { setError('تعذّر إيقاف الإشعارات. ما زالت مفعّلة، حاول مرة أخرى.'); }
    finally { setBusy(false); }
  }

  return (
    <section className="family-panel" aria-labelledby="fam-push" data-testid="family-push">
      <h2 id="fam-push">إشعارات هاتف وليّ الأمر</h2>
      <p className="family-note">بعد الموافقة على ربط جهازك، يُرسل إشعار لكل استخدام لأيقونة تعبير من الطفل، حتى عند تكرار الأيقونة نفسها. فعّل الإشعارات على هذا الهاتف واسمح بها من المتصفح؛ لا تحتاج إلى إبقاء الصفحة مفتوحة.</p>
      <p className="family-note">الإشعار عام للحفاظ على الخصوصية، دون اسم الطفل أو اختياره، ويفتح صفحة العائلة لمتابعة النشاط. وصوله يعتمد على اتصال الهاتف ودعم المتصفح وإعدادات الإشعارات. يتوقف وصول إشعارات الطفل عند إلغاء ربطه.</p>
      {ios && <p className="family-note">على iPhone وiPad: أضف Unsaid إلى الشاشة الرئيسية من زر المشاركة أولًا، ثم افتحه من هناك وفعّل الإشعارات.</p>}
      {state === 'checking' && <div className="family-skeleton" role="status" aria-label="جارٍ الفحص" />}
      {state === 'unsupported' && <p className="family-status family-status--warn" data-testid="push-unsupported">هذا المتصفح أو هذه الصفحة لا تدعم إشعارات الويب، لذلك لا يمكن تفعيلها هنا. يمكنك فتح صفحة العائلة لمتابعة النشاط يدويًا.</p>}
      {state === 'denied' && <p className="family-status family-status--warn" data-testid="push-denied">الإشعارات محظورة لهذا الموقع. فعّلها من إعدادات المتصفح ثم أعد تحميل الصفحة.</p>}
      {state === 'off' && <button type="button" className="family-btn" disabled={busy} onClick={turnOn} data-testid="button-push-enable">{busy ? 'جارٍ التفعيل...' : 'تفعيل الإشعارات'}</button>}
      {state === 'on' && (
        <div className="family-row">
          <span className="family-status" data-testid="push-enabled">الإشعارات مفعّلة على هذا الجهاز</span>
          <button type="button" className="family-btn family-btn--ghost" disabled={busy} onClick={turnOff} data-testid="button-push-disable">{busy ? 'جارٍ الإيقاف...' : 'إيقاف الإشعارات'}</button>
        </div>
      )}
      {error && <p className="family-error" role="alert">{error}</p>}
    </section>
  );
}
