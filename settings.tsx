import { useEffect } from 'react';
import type { CSSProperties } from 'react';
import { useAuth } from '@clerk/react';
import { Link } from 'wouter';
import {
  getGetAdminFeelingProgressQueryKey,
  useGetAdminFeelingProgress,
} from '@workspace/api-client-react';
import BottomNavigation from '@/components/bottom-navigation';
import ColorSettings from '@/components/color-settings';
import AssistantSettings from '@/components/assistant-settings';
import VoiceSettings from '@/components/voice-settings';
import FeatherIcon from '@/components/feather-icon';
import FamilyCodeSettings from '@/components/family-code-settings';
import { FamilyRequests } from '@/components/family-requests';
import { useFontSettings } from '@/context/font-settings';
import { useFamilyAccount, useFamilyProfile } from '@/hooks/use-family';
import './settings.css';

const sizes = [
  { value: 14, label: 'صغير' },
  { value: 18, label: 'متوسط' },
  { value: 24, label: 'كبير' },
] as const;

type FontSize = (typeof sizes)[number]['value'];

export default function Settings() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { fontSize, setFontSize, storageWarning } = useFontSettings();
  const account = useFamilyAccount();
  const ownerProgress = useGetAdminFeelingProgress({
    query: {
      queryKey: [...getGetAdminFeelingProgressQueryKey(), userId],
      enabled: Boolean(isLoaded && isSignedIn && userId),
      retry: false,
      staleTime: 60_000,
    },
  });
  const familyProfile = useFamilyProfile();
  const profile = familyProfile.data;
  const isChildAccount = profile?.initialized && profile.role === 'child';
  const selectedIndex = sizes.findIndex((size) => size.value === fontSize);
  const selected = sizes[selectedIndex] ?? sizes[1];

  useEffect(() => {
    document.title = 'الإعدادات — Unsaid';
    document.documentElement.lang = 'ar';
    document.documentElement.dir = 'rtl';
  }, []);

  const handleSliderChange = (value: number) => {
    const nextSize = sizes[value]?.value;
    if (nextSize !== undefined) setFontSize(nextSize);
  };

  return (
    <main
      className="settings-screen"
      dir="rtl"
      lang="ar"
      style={{ '--communication-font-size': `${fontSize}px` } as CSSProperties}
    >
      <div className="settings-shell">
        <header className="settings-header">
          <Link href="/board" className="settings-back" data-testid="link-back-to-board" aria-label="العودة إلى لوحة التواصل">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M19 12H5m0 0 6-6m-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>العودة للوحة</span>
          </Link>
          <div className="settings-heading">
            <span className="settings-heading__eyebrow">مساحتك، على راحتك</span>
            <h1>الإعدادات</h1>
            <p>اختر حجم الكلام الذي يسهل عليك قراءته.</p>
          </div>
        </header>

        <section className="settings-card" aria-labelledby="font-setting-title">
          <div className="settings-card__intro">
            <span className="settings-font-icon" aria-hidden="true">أ</span>
            <div className="settings-card__title">
              <h2 id="font-setting-title">حجم الخط</h2>
              <p>حرّك المؤشر أو اختر الحجم المناسب لك.</p>
            </div>
          </div>

          <div className="settings-control">
            <div className="settings-control__topline">
              <label htmlFor="font-size-slider">اختر حجم النص</label>
              <span className="settings-current" data-testid="status-current-font-size" aria-live="polite">
                {selected.label} <span dir="ltr">{selected.value}px</span>
              </span>
            </div>

            <div className="settings-slider-wrap">
              <input
                id="font-size-slider"
                className="settings-slider"
                type="range"
                min="0"
                max="2"
                step="1"
                value={selectedIndex < 0 ? 1 : selectedIndex}
                onChange={(event) => handleSliderChange(Number(event.currentTarget.value))}
                aria-valuetext={`${selected.label}، ${selected.value} بكسل`}
                data-testid="input-font-size-slider"
                style={{ '--slider-progress': `${Math.max(selectedIndex, 0) * 50}%` } as CSSProperties}
              />
              <div className="settings-slider-ticks" aria-hidden="true"><i /><i /><i /></div>
            </div>

            <div className="settings-size-options" role="group" aria-label="أحجام الخط">
              {sizes.map((size) => (
                <button
                  key={size.value}
                  type="button"
                  className={`settings-size-option${fontSize === size.value ? ' settings-size-option--selected' : ''}`}
                  onClick={() => setFontSize(size.value as FontSize)}
                  aria-pressed={fontSize === size.value}
                  data-testid={`button-font-size-${size.value}`}
                >
                  <span className="settings-size-option__name">{size.label}</span>
                  <span className="settings-size-option__value" dir="ltr">{size.value}px</span>
                </button>
              ))}
            </div>
          </div>

          <div className="settings-preview" aria-labelledby="settings-preview-title">
            <span className="settings-preview__caption" id="settings-preview-title">معاينة النص</span>
            <p data-testid="text-font-preview">أريد أن أقول ما أشعر به.</p>
            <span className="settings-preview__hint">هكذا سيظهر النص بالحجم الذي اخترته</span>
          </div>

          {storageWarning && (
            <p className="settings-warning" role="status" data-testid="status-storage-warning">
              {storageWarning}
            </p>
          )}
        </section>

        <ColorSettings />
        <AssistantSettings />
        <Link href="/touch" className="settings-card settings-touch-entry" data-testid="link-my-touch">
          <span className="settings-font-icon" aria-hidden="true"><FeatherIcon /></span>
          <span className="settings-touch-entry__copy">
            <span className="settings-touch-entry__title">لمستي</span>
            <span>ارسم بألوانك واحفظ رسمتين من إبداعك.</span>
          </span>
          <span className="settings-touch-entry__arrow" aria-hidden="true">←</span>
        </Link>
        {ownerProgress.isSuccess && (
          <Link
            href="/admin/feelings/progress"
            className="settings-owner-progress"
            data-testid="link-owner-progress"
          >
            <span className="settings-owner-progress__copy">
              <strong>متابعة نشاط الأطفال</strong>
              <span>عرض خاص لصاحب الموقع</span>
            </span>
            <span aria-hidden="true">←</span>
          </Link>
        )}
        {isChildAccount && (
          <FamilyCodeSettings key={account.userId} />
        )}
        {isChildAccount && <FamilyRequests key={`requests:${account.userId}`} />}
        {!account.isSignedIn && (
          <section className="settings-card settings-code-card" aria-labelledby="settings-family-code-signin-title" data-testid="settings-family-code-signed-out">
            <div className="settings-code-card__intro">
              <h2 id="settings-family-code-signin-title">رمز الربط</h2>
              <p>سجّل الدخول بحساب الطفل المستقل ليظهر هنا الرمز المكوّن من ٤ أرقام الذي سيدخله ولي أمرك.</p>
            </div>
            <Link href="/sign-in?returnTo=family&role=child" className="settings-code-card__link">تسجيل الدخول بحساب الطفل</Link>
          </section>
        )}
        {account.isSignedIn && !profile && familyProfile.isLoading && (
          <section className="settings-card settings-code-card" aria-labelledby="settings-family-code-loading-title" data-testid="settings-family-code-loading">
            <div className="settings-code-card__intro">
              <h2 id="settings-family-code-loading-title">رمز الربط</h2>
              <p role="status">جارٍ التحقق من نوع الحساب...</p>
            </div>
          </section>
        )}
        {account.isSignedIn && profile?.initialized && profile.role === 'parent' && (
          <section className="settings-card settings-code-card" aria-labelledby="settings-family-code-parent-title" data-testid="settings-family-code-parent">
            <div className="settings-code-card__intro">
              <h2 id="settings-family-code-parent-title">رمز الربط</h2>
              <p>هذا حساب ولي أمر؛ الرمز يظهر في حساب الطفل المستقل. أدخل رمز الطفل من صفحة العائلة.</p>
            </div>
            <Link href="/family" className="settings-code-card__link">إدخال رمز الطفل</Link>
          </section>
        )}
        {account.isSignedIn && profile && !profile.initialized && (
          <section className="settings-card settings-code-card" aria-labelledby="settings-family-code-setup-title" data-testid="settings-family-code-setup">
            <div className="settings-code-card__intro">
              <h2 id="settings-family-code-setup-title">رمز الربط</h2>
              <p>يظهر الرمز بعد إعداد الحساب كحساب طفل مستقل. تأكد أنك تستخدم حساب الطفل؛ لا يمكن تغيير الدور بعد تأكيده.</p>
            </div>
            <Link href="/family?role=child" className="settings-code-card__link">إكمال إعداد حساب الطفل</Link>
          </section>
        )}
        {account.isSignedIn && !profile && familyProfile.isError && (
          <section className="settings-card settings-code-card" aria-labelledby="settings-family-code-error-title" data-testid="settings-family-code-error">
            <div className="settings-code-card__intro">
              <h2 id="settings-family-code-error-title">رمز الربط</h2>
              <p>تعذّر التحقق من نوع الحساب، لذلك لم يُنشأ الرمز.</p>
            </div>
            <button type="button" className="settings-code-card__retry" onClick={() => familyProfile.refetch()}>إعادة المحاولة</button>
          </section>
        )}
        <Link href="/family" className="settings-card settings-touch-entry" data-testid="link-family">
          <span className="settings-touch-entry__copy">
            <span className="settings-touch-entry__title">العائلة</span>
            <span>اربط حساب الطفل بحساب ولي الأمر وتابع النشاط.</span>
          </span>
          <span className="settings-touch-entry__arrow" aria-hidden="true">←</span>
        </Link>
        <p className="settings-footnote">يمكنك تغيير حجم الخط والألوان في أي وقت.</p>
        <VoiceSettings />
      </div>
      <BottomNavigation />
    </main>
  );
}