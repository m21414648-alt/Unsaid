import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGetFamilyDeviceRequests, useDecideFamilyDevice, getGetFamilyDeviceRequestsQueryKey, getGetFamilyLinksQueryKey } from '@workspace/api-client-react';
import { useFamilyAccount, errorStatus } from '@/hooks/use-family';
import { fmtDate } from './family-bits';
import '@/pages/family.css';

export function FamilyRequests() {
  const { userId } = useFamilyAccount();
  const qc = useQueryClient();
  const list = useGetFamilyDeviceRequests({ query: { queryKey: [...getGetFamilyDeviceRequestsQueryKey(), userId],
    enabled: Boolean(userId), retry: 1, refetchInterval: 5000 } });
  const decision = useDecideFamilyDevice();
  const [error, setError] = useState<string | null>(null);
  async function decide(id: string, approved: boolean) {
    setError(null);
    try {
      await decision.mutateAsync({ id, data: { approved } });
      await Promise.all([qc.invalidateQueries({ queryKey: getGetFamilyDeviceRequestsQueryKey() }),
        qc.invalidateQueries({ queryKey: getGetFamilyLinksQueryKey() })]);
    } catch (e) {
      setError(errorStatus(e) === 409 ? 'الطلب لم يعد متاحًا أو وصل الحساب إلى حد الأجهزة المرتبطة.' : 'تعذّر حفظ القرار. حاول مرة أخرى.');
      void list.refetch();
    }
  }
  if (!list.isError && !list.data?.length) return null;
  return (
    <section className="settings-card settings-code-card" aria-labelledby="device-requests-title" data-testid="family-device-requests">
      <h2 id="device-requests-title">طلب ربط جهاز وليّ أمر</h2>
      <p className="family-note">وافق فقط إذا كنت تعرف الجهاز. طابق رقم الطلب مع الرقم الظاهر على جهاز وليّ أمرك. إدخال أرقام الربط وحده لا يتيح نشاطك.</p>
      {list.isError && <p className="family-error" role="alert">تعذّر تحديث الطلبات. <button className="family-btn" onClick={() => list.refetch()}>إعادة المحاولة</button></p>}
      {list.data?.map((request) => (
        <div key={request.id} className="family-panel" data-testid={`device-request-${request.id}`}>
          <strong>طلب <bdi>{request.pairingLabel}</bdi></strong>
          <p className="family-note">{fmtDate(request.createdAt)}</p>
          <div className="family-row">
            <button className="family-btn" disabled={decision.isPending} onClick={() => decide(request.id, true)} data-testid={`approve-device-${request.id}`}>الموافقة على الربط</button>
            <button className="family-btn family-btn--ghost" disabled={decision.isPending} onClick={() => decide(request.id, false)} data-testid={`reject-device-${request.id}`}>رفض</button>
          </div>
        </div>
      ))}
      {error && <p className="family-error" role="alert">{error}</p>}
    </section>
  );
}