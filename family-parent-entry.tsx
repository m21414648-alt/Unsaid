import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { useGetFamilyDeviceRequest, useRequestFamilyDevice, startFamilyDeviceSession, endFamilyDeviceSession,
  getGetFamilyDeviceSessionQueryKey, getGetFamilyLinksQueryKey } from '@workspace/api-client-react';
import { errorStatus, useFamilyAccount, useFamilyProfile, useFamilyActions } from '@/hooks/use-family';

function normalize(value: string) {
  return value.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0)).replace(/[^0-9]/g, '').slice(0, 4);
}
const requestKey = (owner: string) => `unsaid:family-request:${owner}`;
function storedRequest(owner: string | null) {
  try { return owner ? localStorage.getItem(requestKey(owner)) ?? '' : ''; } catch { return ''; }
}
export function FamilyParentEntry() {
  const account = useFamilyAccount();
  const profile = useFamilyProfile();
  const actions = useFamilyActions();
  const qc = useQueryClient();
  const mutation = useRequestFamilyDevice();
  const [code, setCode] = useState('');
  const [requestId, setRequestId] = useState(() => storedRequest(account.userId));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ending, setEnding] = useState(false);
  const request = useGetFamilyDeviceRequest(requestId, { query: {
    queryKey: ['/api/family/guest/requests', requestId, account.userId],
    enabled: Boolean(requestId && account.isSignedIn), retry: 1,
    refetchInterval: (q) => q.state.data?.status === 'pending' ? 3000 : q.state.data?.status === 'approved' ? 15000 : false,
  } });
  useEffect(() => { setRequestId(storedRequest(account.userId)); setCode(''); setError(null); }, [account.userId]);
  useEffect(() => {
    if (request.data?.status === 'approved' || request.data?.status === 'revoked')
      void qc.invalidateQueries({ queryKey: getGetFamilyLinksQueryKey() });
  }, [request.data?.status, qc]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (code.length !== 4) return;
    setBusy(true); setError(null);
    try {
      if (account.clerkSignedIn && profile.data && !profile.data.initialized)
        await actions.initialize.mutateAsync({ data: { role: 'parent' } });
      const session = account.isSignedIn ? null : await startFamilyDeviceSession();
      const owner = account.userId ?? session?.ownerId;
      if (!owner) throw new Error('Session missing');
      const result = await mutation.mutateAsync({ data: { code } });
      try { localStorage.setItem(requestKey(owner), result.id); } catch { /* Cookie still secures the current request. */ }
      setRequestId(result.id); setCode('');
      // Publish identity only after saving the request, so remounts retain it.
      if (session) qc.setQueryData(getGetFamilyDeviceSessionQueryKey(), session);
      void qc.invalidateQueries({ queryKey: getGetFamilyLinksQueryKey() });
    } catch (e) {
      setError(errorStatus(e) === 429 ? 'محاولات كثيرة. انتظر ١٥ دقيقة ثم حاول مرة أخرى.'
        : 'تعذّر إرسال طلب الربط. تحقق من الأرقام وحاول مجددًا.');
    } finally { setBusy(false); }
  }
  async function leave() {
    setEnding(true); setError(null);
    try {
      await endFamilyDeviceSession();
      if (account.userId) { try { localStorage.removeItem(requestKey(account.userId)); } catch {} }
      qc.clear();
      setRequestId('');
    } catch { setError('تعذّر إنهاء الدخول. حاول مرة أخرى.'); }
    finally { setEnding(false); }
  }
  const data = request.data;
  const pending = Boolean(requestId && (!data || data.status === 'pending') && !request.isError);
  return (
    <section className="family-panel" aria-labelledby="parent-entry-title" data-testid="family-parent-entry">
      <h2 id="parent-entry-title">ربط جهاز وليّ الأمر</h2>
      <p className="family-note">أدخل الأرقام الأربعة داخل الأيقونة في إعدادات الطفل. لا تحتاج إلى إنشاء حساب. بعد ذلك وافق على طلب هذا الجهاز من إعدادات الطفل.</p>
      {!pending && (
        <form className="family-form" onSubmit={submit}>
          <input className="family-input" dir="ltr" inputMode="numeric" autoComplete="off" maxLength={4}
            value={code} onChange={(e) => setCode(normalize(e.target.value))} placeholder="0000" aria-label="أرقام الربط الأربعة" data-testid="input-link-code" />
          <button className="family-btn" disabled={busy || code.length !== 4} data-testid="button-link-submit">{busy ? 'جارٍ الإرسال...' : 'طلب الربط'}</button>
        </form>
      )}
      {pending && <div role="status" data-testid="device-request-pending">
        <p>بانتظار الموافقة من جهاز الطفل.</p>
        {data && <p>رقم الطلب: <bdi data-testid="device-pairing-label">{data.pairingLabel}</bdi></p>}
        <p className="family-note">طابق رقم الطلب قبل الموافقة. الطلب صالح لمدة ١٠ دقائق؛ أرقام الربط نفسها ثابتة. إذا لم يظهر طلب على جهاز الطفل، تحقّق من أرقام الربط.</p>
      </div>}
      {data?.status === 'approved' && <p className="family-status" role="status" data-testid="device-request-approved">تمت الموافقة على جهازك. <Link href={`/family/activity/${data.linkId}`} className="family-btn">عرض نشاط الطفل</Link></p>}
      {data && ['rejected', 'expired', 'revoked'].includes(data.status) && <p className="family-note" role="status" data-testid="device-request-ended">
        {data.status === 'rejected' ? 'لم تتم الموافقة على الطلب. يمكنك إرسال طلب جديد.' : data.status === 'expired' ? 'انتهت مدة انتظار الموافقة. يمكنك استخدام الأرقام نفسها لطلب جديد.' : 'أُلغي ربط هذا الجهاز. يلزم طلب وموافقة جديدان لعرض النشاط.'}
      </p>}
      {request.isError && <p className="family-error" role="alert">تعذّر تحديث الطلب. <button className="family-btn" onClick={() => request.refetch()}>إعادة المحاولة</button></p>}
      {error && <p className="family-error" role="alert">{error}</p>}
      {account.isGuest && <button className="family-btn family-btn--ghost" onClick={leave} disabled={ending} data-testid="button-device-signout">{ending ? 'جارٍ إنهاء الدخول...' : 'إنهاء دخول هذا الجهاز وإلغاء ربطه'}</button>}
    </section>
  );
}