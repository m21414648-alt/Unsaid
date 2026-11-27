import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRotateFamilyCode, getGetFamilyDeviceRequestsQueryKey, type FamilyCode } from '@workspace/api-client-react';
import { errorStatus, useFamilyActions, useLinks } from '@/hooks/use-family';
import { shouldDisplayLinkingCode } from '@/lib/family-code-visibility';
import './family-code-settings.css';

export default function FamilyCodeSettings() {
  const { code: codeAction } = useFamilyActions();
  const { mutate, isPending } = codeAction;
  const [code, setCode] = useState<FamilyCode | null>(null);
  const [failureMessage, setFailureMessage] = useState<string | null>(null);
  const rotate = useRotateFamilyCode();
  const qc = useQueryClient();
  const [confirmRotate, setConfirmRotate] = useState(false);
  const started = useRef(false);
  const failed = Boolean(failureMessage);
  const links = useLinks(true);
  const canShowCode = shouldDisplayLinkingCode(links);

  const generate = useCallback(() => {
    setFailureMessage(null);
    mutate(undefined, {
      onSuccess: (result) => setCode(result),
      onError: (error) => {
        const status = errorStatus(error);
        setFailureMessage(status === 403
          ? 'يلزم حساب طفل مستقل لإتمام الربط.'
          : status === 429
            ? 'تكررت المحاولات بسرعة. انتظر قليلًا ثم أعد المحاولة.'
             : 'تعذّر تجهيز الربط. حاول مرة أخرى.');
      },
    });
  }, [mutate]);

  useEffect(() => {
    if (!canShowCode) {
      started.current = false;
      setCode(null);
      setConfirmRotate(false);
      setFailureMessage(null);
      return;
    }
    if (!started.current) {
      started.current = true;
      generate();
    }
  }, [canShowCode, generate]);

  async function changeCode() {
    setFailureMessage(null);
    try {
      setCode(await rotate.mutateAsync());
      setConfirmRotate(false);
      void qc.invalidateQueries({ queryKey: getGetFamilyDeviceRequestsQueryKey() });
    } catch (error) {
      setFailureMessage(errorStatus(error) === 429 ? 'تكررت المحاولات. انتظر قليلًا ثم حاول مجددًا.' : 'تعذّر تغيير الأرقام. الأرقام الحالية لم تتغيّر.');
    }
  }

  // Do not render digits, controls, or hidden accessibility text after linking.
  if (links.isError) return (
    <p className="settings-code-card__status settings-code-card__status--error" role="alert">
      تعذّر التحقق من الأجهزة المرتبطة. أرقام الربط مخفية لحماية خصوصيتك.
      <button type="button" className="settings-code-card__retry" disabled={links.isFetching}
        onClick={() => void links.refetch()}>إعادة المحاولة</button>
    </p>
  );
  if (!canShowCode) return null;

  return (
    <section className="settings-link-token" aria-label="ربط حساب ولي الأمر" data-testid="settings-family-code">
      <div className="settings-link-token__icon" title="أرقام ربط ثابتة لجهاز وليّ الأمر">
        <svg viewBox="0 0 88 56" fill="none" aria-hidden="true">
          <path d="M14 7h53l14 21-14 21H14a7 7 0 0 1-7-7V14a7 7 0 0 1 7-7Z" fill="var(--theme-soft, #edf8ff)" stroke="currentColor" strokeWidth="1.3" />
          <circle cx="69" cy="28" r="2.5" stroke="currentColor" strokeWidth="1.3" />
        </svg>
        <input
          id="settings-family-code-input"
          className="settings-link-token__digits"
          type="text"
          dir="ltr"
          inputMode="numeric"
          autoComplete="off"
          readOnly
          value={code?.code ?? ''}
          placeholder="••••"
          aria-label="رمز الربط الذي سيدخله ولي الأمر"
          aria-describedby={code ? 'settings-family-code-status' : undefined}
          onFocus={(event) => event.currentTarget.select()}
          data-testid="input-settings-family-code"
        />
      </div>

      {!code && isPending && <span className="sr-only" role="status">جارٍ تجهيز الربط...</span>}
      {!code && failureMessage && <p className="settings-code-card__status settings-code-card__status--error" role="alert">{failureMessage}</p>}
      {code && (
        <p
          id="settings-family-code-status"
          className="sr-only"
          role="status"
          data-testid="text-settings-family-code-expiry"
        >
          هذه الأرقام ثابتة ولا تتغير إلا بطلبك. ربط جهاز جديد يحتاج موافقتك.
        </p>
      )}
      {failed && code && <p className="settings-code-card__status settings-code-card__status--error" role="alert">{failureMessage}</p>}
      {(code || failed) && (
        <button type="button" className="settings-link-token__refresh" disabled={isPending || rotate.isPending}
          onClick={code ? () => setConfirmRotate(true) : generate} data-testid="button-settings-family-code-retry"
          aria-label={code ? 'تغيير أرقام الربط' : 'إعادة المحاولة'} title={code ? 'تغيير الأرقام' : 'إعادة المحاولة'}>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      )}
      {confirmRotate && <div className="settings-code-card" role="group" aria-label="تأكيد تغيير الأرقام">
        <p className="settings-code-card__status">هل تريد تغيير الأرقام؟ ستُلغى الطلبات المنتظرة. الأجهزة التي وافقت عليها سابقًا تبقى مرتبطة؛ يمكنك إلغاء ربطها من صفحة العائلة.</p>
        <button className="settings-code-card__retry" disabled={rotate.isPending} onClick={changeCode} data-testid="button-confirm-code-change">{rotate.isPending ? 'جارٍ التغيير...' : 'تغيير الأرقام'}</button>
        <button className="settings-code-card__retry" disabled={rotate.isPending} onClick={() => setConfirmRotate(false)}>إلغاء</button>
      </div>}
    </section>
  );
}