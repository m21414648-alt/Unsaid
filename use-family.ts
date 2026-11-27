import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/react';
import {
  getGetFamilyLinksQueryKey, getGetFamilyProfileQueryKey, getGetLinkedChildActivityQueryKey,
  useCreateFamilyCode, useGetFamilyLinks, useGetFamilyProfile, useGetLinkedChildActivity,
  useInitializeFamilyProfile, useLinkFamilyAccount, useUnlinkFamilyAccount,
  useGetFamilyDeviceSession, getGetFamilyDeviceSessionQueryKey,
} from '@workspace/api-client-react';

export function useFamilyAccount() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const device = useGetFamilyDeviceSession({ query: { queryKey: getGetFamilyDeviceSessionQueryKey(), enabled: Boolean(isLoaded && !isSignedIn), retry: 1, staleTime: 10000, refetchInterval: isSignedIn ? false : 30000 } });
  const loaded = Boolean(isLoaded && (isSignedIn || !device.isLoading));
  const owner = isSignedIn ? userId ?? null : device.data?.active ? device.data.ownerId : null;
  return { isLoaded: loaded, isSignedIn: Boolean(owner), userId: owner, enabled: Boolean(loaded && owner),
    isGuest: Boolean(!isSignedIn && owner), clerkSignedIn: Boolean(isSignedIn) };
}

export function useFamilyProfile() {
  const { enabled, userId } = useFamilyAccount();
  return useGetFamilyProfile({ query: { queryKey: [...getGetFamilyProfileQueryKey(), userId], enabled, retry: 1, staleTime: 0 } });
}

export function useLinks(enabled: boolean) {
  const { userId } = useFamilyAccount();
  return useGetFamilyLinks({ query: { queryKey: [...getGetFamilyLinksQueryKey(), userId], enabled: enabled && Boolean(userId), retry: 1, staleTime: 0, refetchInterval: enabled ? 15000 : false } });
}

export function useLinkedActivity(id: string) {
  const { enabled, userId } = useFamilyAccount();
  return useGetLinkedChildActivity(id, { query: { queryKey: [...getGetLinkedChildActivityQueryKey(id), userId], enabled, retry: 1, staleTime: 0, refetchInterval: enabled ? 15000 : false } });
}

export function useFamilyActions() {
  const qc = useQueryClient();
  const { userId } = useFamilyAccount();
  const profileKey = [...getGetFamilyProfileQueryKey(), userId];
  const linksKey = [...getGetFamilyLinksQueryKey(), userId];
  const initialize = useInitializeFamilyProfile({ mutation: { onSuccess: (p) => { qc.setQueryData(profileKey, p); } } });
  const code = useCreateFamilyCode();
  const link = useLinkFamilyAccount({ mutation: { onSuccess: () => { void qc.invalidateQueries({ queryKey: linksKey }); } } });
  const unlink = useUnlinkFamilyAccount({ mutation: { onSuccess: () => { void qc.invalidateQueries({ queryKey: linksKey }); } } });
  return { initialize, code, link, unlink };
}

export function errorStatus(e: unknown): number | null {
  return typeof e === 'object' && e && 'status' in e && typeof (e as { status: unknown }).status === 'number' ? (e as { status: number }).status : null;
}
