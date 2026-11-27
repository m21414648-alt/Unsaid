import { useEffect, useRef, type ReactNode } from 'react';
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { arSA } from '@clerk/localizations';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useSearch } from 'wouter';
import { useColorTheme } from '@/context/color-theme';
import './account-auth.css';

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const { theme } = useColorTheme();
  const primary = theme === 'pink' ? '#9d4774' : theme === 'yellow' ? '#875c3a' : '#2563eb';
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      signInFallbackRedirectUrl={`${basePath}/settings`}
      signUpFallbackRedirectUrl={`${basePath}/settings`}
      localization={arSA}
      appearance={{
        theme: 'simple',
        options: {
          logoPlacement: 'inside',
          logoLinkUrl: basePath || '/',
          logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
        },
        variables: {
          colorPrimary: primary, colorForeground: '#172e49', colorMutedForeground: '#52647b',
          colorBackground: '#ffffff', colorInput: '#ffffff', colorInputForeground: '#172e49',
          colorDanger: '#9f1239', colorNeutral: '#304863', fontFamily: 'Cairo, sans-serif', borderRadius: '18px',
        },
        elements: {
          rootBox: { width: '100%', display: 'flex', justifyContent: 'center' },
          cardBox: { background: '#ffffff', borderRadius: '24px', width: '440px', maxWidth: '100%', overflow: 'hidden' },
          card: { background: 'transparent', border: 'none', boxShadow: 'none' },
          footer: { background: 'transparent' },
          headerTitle: { color: '#172e49' }, headerSubtitle: { color: '#52647b' },
          socialButtonsBlockButtonText: { color: '#172e49' }, formFieldLabel: { color: '#172e49' },
          footerActionLink: { color: primary }, footerActionText: { color: '#52647b' },
          dividerText: { color: '#52647b' }, identityPreviewEditButton: { color: primary },
          formFieldSuccessText: { color: '#166534' }, alertText: { color: '#9f1239' },
          logoBox: { height: '64px' }, logoImage: { height: '64px' },
          socialButtonsBlockButton: { background: '#f1f5f9' },
          formButtonPrimary: { background: primary, color: '#ffffff' },
          formFieldInput: { background: '#ffffff', color: '#172e49', borderColor: '#94a3b8' },
          footerAction: { background: '#f1f5f9' }, dividerLine: { background: '#cbd5e1' },
          alert: { background: '#fff1f2' }, otpCodeFieldInput: { color: '#172e49' },
          formFieldRow: { gap: '8px' }, main: { gap: '20px' },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      {children}
    </ClerkProvider>
  );
}

export function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) queryClient.clear();
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);
  return null;
}

export function AccountPage({ signup = false }: { signup?: boolean }) {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const rt = params.get('returnTo');
  const returningToFeelings = rt === 'feelings';
  const returningToFamily = rt === 'family';
  const childRole = returningToFamily && params.get('role') === 'child';
  const parentRole = returningToFamily && params.get('role') === 'parent';
  const familyRoleQuery = childRole ? '?role=child' : parentRole ? '?role=parent' : '';
  const familyReturnQuery = childRole ? '&role=child' : parentRole ? '&role=parent' : '';
  const returnTo = returningToFeelings ? '/feelings' : returningToFamily ? `/family${familyRoleQuery}` : '/settings';
  const returnQuery = returningToFeelings ? '?returnTo=feelings' : returningToFamily ? `?returnTo=family${familyReturnQuery}` : '';
  const forceRedirectUrl = returningToFeelings || returningToFamily ? `${basePath}${returnTo}` : undefined;
  const backLabel = returningToFeelings ? 'العودة إلى مشاعري' : returningToFamily ? 'العودة إلى العائلة' : 'العودة إلى الإعدادات';
  useEffect(() => {
    document.title = `${signup ? 'إنشاء حساب' : 'تسجيل الدخول'} — Unsaid`;
    document.documentElement.lang = 'ar';
    document.documentElement.dir = 'rtl';
  }, [signup]);
  return (
    <main className="account-screen" dir="rtl" lang="ar">
      <Link href={returnTo} className="settings-back">{backLabel}</Link>
      <div className="account-intro">
        <h1>مساحتك الخاصة، في حسابك</h1>
        <p>{childRole
          ? 'اختيارك ينشئ حسابًا مستقلًا للطفل، ولا يمكن تغيير هذا الدور. بعد تسجيل الدخول تظهر أرقام الربط داخل أيقونة صغيرة في الإعدادات ليُدخلها وليّ أمرك.'
          : parentRole
            ? 'بعد تسجيل الدخول، أدخل أرقام الربط الموجودة داخل الأيقونة في إعدادات الطفل لربط الحسابين.'
            : 'سجّل الدخول لحفظ نشاط حسابك وعباراتك المسجّلة بشكل خاص، أو لربط حساب طفل مستقل ومتابعة اختياراته.'} الأصوات الجاهزة لا تحتاج إلى حساب.</p>
      </div>
      <Show when="signed-out">
        {signup
          ? <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in${returnQuery}`} forceRedirectUrl={forceRedirectUrl} />
          : <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up${returnQuery}`} forceRedirectUrl={forceRedirectUrl} />}
      </Show>
      <Show when="signed-in"><Link href={returnTo} className="start-button">{returningToFamily ? 'المتابعة إلى العائلة' : returningToFeelings ? 'العودة إلى مشاعري' : 'العودة لتسجيل الأصوات'}</Link></Show>
    </main>
  );
}