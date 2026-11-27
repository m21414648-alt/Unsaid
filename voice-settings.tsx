import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { useClerk } from '@clerk/react';
import { Mic, Square, Play, Trash2, Volume2, Save, X } from 'lucide-react';
import { useVoiceSettings } from '@/context/voice-settings';
import './voice-settings.css';
import { disablePush } from '@/lib/family-push';

const voices = [
  { id: 'female', label: 'صوت أنثوي' },
  { id: 'male', label: 'صوت ذكوري' },
] as const;

const MAX_SECONDS = 20;

function fmt(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${s} ث`;
}

export default function VoiceSettings() {
  const v = useVoiceSettings();
  const { signOut } = useClerk();
  const { recorder } = v;
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmRerecord, setConfirmRerecord] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    setNotice(null);
    setConfirmRerecord(false);
    setConfirmDeleteId(null);
  }, [v.userId]);

  const target = v.recordingTargets.find((t) => t.key === v.recordingTargetKey);
  const existing = v.recordings.find((r) => r.cardKey === v.recordingTargetKey);
  const canRecord = v.isLoaded && v.isSignedIn && !v.isBusy;
  const isRecording = recorder.status === 'recording';
  const isReady = recorder.status === 'ready';
  const micActive = recorder.status === 'recording' || recorder.status === 'requesting';
  const hasDraft = micActive || !!recorder.blob;
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const errorText = signOutError || v.error || recorder.error;

  const handleSignOut = async () => {
    setSignOutError(null);
    if (hasDraft && !window.confirm('لديك تسجيل غير محفوظ وسيتم تجاهله عند تسجيل الخروج. هل تريد المتابعة؟')) return;
    if (hasDraft) {
      v.stopAudio();
      recorder.cancel();
    }
    try {
      await disablePush();
      await signOut({ redirectUrl: import.meta.env.BASE_URL.replace(/\/$/, '') || '/' });
    } catch {
      setSignOutError('تعذّر تسجيل الخروج. حاول مرة أخرى.');
    }
  };

  const run = async (action: () => Promise<boolean>, message: string) => {
    setNotice(null);
    const ok = await action();
    if (ok) setNotice(message);
  };

  const begin = async () => {
    setConfirmRerecord(false);
    setNotice(null);
    v.stopAudio();
    await recorder.start();
  };

  const onStartClick = () => {
    if (isReady && recorder.blob) setConfirmRerecord(true);
    else void begin();
  };

  return (
    <section className="settings-card voice-settings" aria-labelledby="voice-setting-title">
      <div className="settings-card__intro">
        <span className="settings-font-icon" aria-hidden="true">
          <Volume2 size={28} />
        </span>
        <div className="settings-card__title">
          <h2 id="voice-setting-title">صوتي</h2>
          <p>اختر صوتًا يبدو طبيعيًا وواضحًا وهادئًا.</p>
        </div>
      </div>

      <div className="voice-settings__group" role="group" aria-labelledby="voice-base-title">
        <h3 id="voice-base-title" className="voice-settings__subtitle">الصوت الأساسي</h3>
        <p className="voice-settings__note">
          هذان الصوتان مولَّدان بالذكاء الاصطناعي، وليسا أصوات أشخاص حقيقيين. لا تحتاج إلى حساب لاستخدامهما.
        </p>
        <div className="voice-settings__voices">
          {voices.map((item) => (
            <div key={item.id} className="voice-settings__voice">
              <button
                type="button"
                className={`voice-settings__choice${v.voice === item.id ? ' voice-settings__choice--selected' : ''}`}
                aria-pressed={v.voice === item.id}
                disabled={!v.isLoaded || v.isBusy || micActive}
                onClick={() => void run(() => v.setVoice(item.id), `تم اختيار ${item.label}.`)}
                data-testid={`voice-${item.id}`}
              >
                {item.label}
              </button>
              <button
                type="button"
                className="voice-settings__sample"
                disabled={!v.isLoaded || v.isBusy || micActive}
                onClick={() => void run(() => v.previewVoice(item.id), '')}
                aria-label={`اسمع عيّنة من ${item.label}`}
                data-testid={`preview-${item.id}`}
              >
                <Play size={18} aria-hidden="true" />
                <span>اسمع عيّنة</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="voice-settings__group" role="group" aria-labelledby="voice-record-title">
        <h3 id="voice-record-title" className="voice-settings__subtitle">
          <Mic size={20} aria-hidden="true" /> سجّل عبارتك بصوتك
        </h3>
        <p className="voice-settings__note">
          تُحفظ تسجيلاتك في حساب خاص بك فقط، وتُزامَن بين أجهزتك. لا يتم استنساخ صوتك ولا استخدامه لتدريب الذكاء الاصطناعي. عند تفعيل تسجيلاتك، تستخدم كل بطاقة تسجيلها الخاص إن وجد.
        </p>

        {v.isSignedIn && (
          <div className="voice-settings__activation">
            <button
              type="button"
              role="switch"
              aria-checked={v.recordingsEnabled}
              className={v.recordingsEnabled ? 'voice-settings__primary' : 'voice-settings__secondary'}
              disabled={!v.isLoaded || v.isBusy || micActive}
              onClick={() => void run(
                () => v.setRecordingsEnabled(!v.recordingsEnabled),
                v.recordingsEnabled ? 'تم إيقاف استخدام التسجيلات؛ الصوت الأساسي هو المستخدم الآن.' : 'تم تفعيل تسجيلاتك بدل الصوت الآلي.',
              )}
              data-testid="toggle-personal-recordings"
            >
              <Mic size={20} aria-hidden="true" />
              <span>{v.recordingsEnabled ? 'تسجيلاتي مفعّلة' : 'تفعيل تسجيلاتي بدل الصوت الآلي'}</span>
            </button>
            <p className="voice-settings__note">
              {v.recordingsEnabled
                ? 'تستخدم البطاقات تسجيلاتك المحفوظة، والبطاقات دون تسجيل تستخدم الصوت الأساسي.'
                : 'يُستخدم الصوت الآلي حاليًا. يمكنك معاينة تسجيلاتك وتفعيلها متى أردت.'}
              {' '}إيقاف التفعيل لا يحذف أي تسجيل.
            </p>
          </div>
        )}

        {v.isSignedIn && !v.isLoaded && v.error && (
          <button type="button" className="voice-settings__secondary" onClick={() => v.reloadProfile()} data-testid="voice-reload-profile">
            إعادة تحميل الحساب
          </button>
        )}

        <label className="voice-settings__label" htmlFor="recording-target">اختر البطاقة</label>
        <select
          id="recording-target"
          className="voice-settings__select"
          value={v.recordingTargetKey}
          disabled={!canRecord || isRecording}
          onChange={(e) => {
            setConfirmRerecord(false);
            v.selectRecordingTarget(e.currentTarget.value);
          }}
          data-testid="recording-target"
        >
          {v.recordingTargets.map((t) => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>

        {target && (
          <div className="voice-settings__phrase">
            <span>قل هذه العبارة:</span>
            <strong>{target.phrase}</strong>
          </div>
        )}

        <div className="voice-settings__timer" aria-live="off">
          <span className={`voice-settings__dot${isRecording ? ' voice-settings__dot--live' : ''}`} aria-hidden="true" />
          <span dir="ltr">
            {Math.min(MAX_SECONDS, Math.floor(((isRecording ? recorder.elapsedMs : recorder.durationMs) || 0) / 1000))} / {MAX_SECONDS}
          </span>
          <span>{isRecording ? 'جارٍ التسجيل' : recorder.status === 'requesting' ? 'بانتظار إذن الميكروفون' : isReady ? 'تسجيل جاهز' : 'جاهز'}</span>
        </div>

        <div className="voice-settings__actions">
          {!isRecording ? (
            <button
              type="button"
              className="voice-settings__primary"
              disabled={!canRecord || recorder.status === 'requesting'}
              onClick={onStartClick}
              data-testid="start-recording"
            >
              <Mic size={20} aria-hidden="true" />
              <span>{isReady ? 'أعد التسجيل' : existing ? 'سجّل من جديد' : 'ابدأ التسجيل'}</span>
            </button>
          ) : (
            <button type="button" className="voice-settings__stop" onClick={recorder.stop} data-testid="stop-recording">
              <Square size={20} aria-hidden="true" />
              <span>إيقاف</span>
            </button>
          )}

          {isReady && recorder.blob && (
            <>
              <button
                type="button"
                className="voice-settings__secondary"
                disabled={v.isBusy}
                onClick={() => void v.playBlob(recorder.blob as Blob)}
                data-testid="preview-recording-draft"
              >
                <Play size={18} aria-hidden="true" />
                <span>استمع</span>
              </button>
              <button
                type="button"
                className="voice-settings__primary"
                disabled={!canRecord}
                onClick={() => void run(v.saveCurrentRecording, 'تم حفظ التسجيل.')}
                data-testid="save-recording"
              >
                <Save size={18} aria-hidden="true" />
                <span>{existing ? 'استبدال التسجيل المحفوظ' : 'احفظ التسجيل'}</span>
              </button>
            </>
          )}
          {(isReady || micActive) && (
            <button
              type="button"
              className="voice-settings__secondary"
              onClick={() => { setConfirmRerecord(false); v.stopAudio(); recorder.cancel(); }}
              data-testid="cancel-recording"
            >
              <X size={18} aria-hidden="true" />
              <span>تجاهل</span>
            </button>
          )}
        </div>

        {confirmRerecord && (
          <div className="voice-settings__confirm" role="alertdialog" aria-label="تأكيد إعادة التسجيل">
            <p>لديك تسجيل غير محفوظ. هل تريد استبداله بتسجيل جديد؟</p>
            <div className="voice-settings__actions">
              <button type="button" className="voice-settings__stop" onClick={() => void begin()} data-testid="confirm-rerecord">
                نعم، استبدله
              </button>
              <button type="button" className="voice-settings__secondary" onClick={() => setConfirmRerecord(false)} data-testid="cancel-rerecord">
                إبقاء التسجيل
              </button>
            </div>
          </div>
        )}

        <p className="voice-settings__limit">الحد الأقصى لكل تسجيل 20 ثانية و5 ميغابايت.</p>
      </div>

      {v.isSignedIn && (
        <div className="voice-settings__group">
          <h3 className="voice-settings__subtitle">تسجيلاتي المحفوظة</h3>
          {v.recordings.length === 0 ? (
            <p className="voice-settings__empty">لا توجد تسجيلات بعد. اختر بطاقة وسجّل عبارتها.</p>
          ) : (
            <ul className="voice-settings__list">
              {v.recordings.map((r) => (
                <li key={r.id} className="voice-settings__item">
                  <div className="voice-settings__item-info">
                    <strong>{r.cardLabel}</strong>
                    <span>{fmt(r.durationMs)}</span>
                  </div>
                  {confirmDeleteId === r.id ? (
                    <div className="voice-settings__confirm voice-settings__confirm--inline">
                      <p>حذف التسجيل؟ ستعود البطاقة إلى الصوت الأساسي المختار.</p>
                      <div className="voice-settings__actions">
                        <button
                          type="button"
                          className="voice-settings__stop"
                          disabled={v.isBusy || micActive}
                          onClick={async () => {
                            const ok = await v.deleteRecording(r.id);
                            setConfirmDeleteId(null);
                            setNotice(ok ? 'تم حذف التسجيل.' : null);
                          }}
                          data-testid={`confirm-delete-${r.id}`}
                        >
                          نعم، احذف
                        </button>
                        <button type="button" className="voice-settings__secondary" onClick={() => setConfirmDeleteId(null)}>
                          إلغاء
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="voice-settings__item-actions">
                      <button
                        type="button"
                        className="voice-settings__icon-btn"
                        disabled={v.isBusy || micActive}
                        onClick={() => void v.playRecording(r.id)}
                        aria-label={`تشغيل تسجيل ${r.cardLabel}`}
                        data-testid={`play-recording-${r.id}`}
                      >
                        <Play size={20} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="voice-settings__icon-btn voice-settings__icon-btn--danger"
                        disabled={v.isBusy || micActive}
                        onClick={() => setConfirmDeleteId(r.id)}
                        aria-label={`حذف تسجيل ${r.cardLabel}`}
                        data-testid={`delete-recording-${r.id}`}
                      >
                        <Trash2 size={20} aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="voice-settings__group voice-settings__account-section" role="group" aria-labelledby="voice-account-title">
        <h3 id="voice-account-title" className="voice-settings__subtitle">الحساب</h3>
        {!v.isSignedIn ? (
          <div className="voice-settings__signin">
            <p>تسجيل الصوت يحتاج إلى حساب خاص لحفظه في السحابة. الحساب اختياري، والأصوات الأساسية تعمل بدونه.</p>
            <Link href="/sign-in" className="voice-settings__primary" data-testid="link-voice-sign-in">
              تسجيل الدخول
            </Link>
          </div>
        ) : (
          <div className="voice-settings__account">
            <span>حسابك خاص، وتسجيلاتك تظهر لك وحدك.</span>
            <button type="button" className="voice-settings__secondary" disabled={v.isBusy && !hasDraft}
              data-testid="voice-sign-out"
              onClick={handleSignOut}>
              تسجيل الخروج
            </button>
          </div>
        )}
      </div>

      {notice && <p className="voice-settings__success" role="status" data-testid="status-voice-success">{notice}</p>}
      {errorText && <p className="voice-settings__error" role="alert" data-testid="error-voice">{errorText}</p>}
    </section>
  );
}

export { VoiceSettings };
