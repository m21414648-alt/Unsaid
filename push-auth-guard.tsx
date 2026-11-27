import { useEffect } from 'react';
import { useFamilyAccount } from '@/hooks/use-family';
import { synchronizePushAccount } from '@/lib/family-push';

/** Keep approved guest-device subscriptions; drop them when the family identity changes. */
export function PushAuthGuard() {
  const { isLoaded, userId } = useFamilyAccount();
  useEffect(() => {
    if (!isLoaded) return;
    void synchronizePushAccount(userId ?? null).catch(() => undefined);
  }, [isLoaded, userId]);
  return null;
}
