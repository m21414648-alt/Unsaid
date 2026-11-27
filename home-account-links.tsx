import { Link } from 'wouter';
import { useAuth } from '@clerk/react';

export function HomeAccountLinks() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return null;
  return (
    <nav className="home-account" aria-label="الحساب والعائلة">
      {isSignedIn ? (
        <Link href="/family" className="home-account__link home-account__link--solid" data-testid="link-home-family">العائلة وربط الحسابات</Link>
      ) : (
        <>
          <h2 className="home-account__prompt">هل أنت وليّ أمر أم طفل؟</h2>
          <p className="home-account__hint">الطفل ينشئ حسابًا، ووليّ الأمر يدخل بأرقام الربط من إعدادات الطفل دون إنشاء حساب.</p>
          <p className="home-account__hint">اختيار «أنا طفل» ينشئ حسابًا مستقلًا للطفل، ولا يمكن تغيير هذا الدور لاحقًا.</p>
          <Link href="/family?role=parent" className="home-account__link home-account__link--solid" data-testid="link-home-parent">أنا وليّ أمر</Link>
          <Link href="/sign-in?returnTo=family&role=child" className="home-account__link" data-testid="link-home-child">أنا طفل</Link>
        </>
      )}
    </nav>
  );
}
