import { getFamilyPushConfig, subscribeFamilyPush, unsubscribeFamilyPush } from '@workspace/api-client-react';

const base = import.meta.env.BASE_URL;
export const SW_URL = `${base}family-sw.js`;
export const SW_SCOPE = base;
const OWNER_KEY = 'unsaid-push-account';
let currentOwner: string | null = null;
let accountSync: Promise<void> = Promise.resolve();

export function synchronizePushAccount(owner: string | null): Promise<void> {
  currentOwner = owner;
  accountSync = accountSync.catch(() => undefined).then(async () => {
    const savedOwner = localStorage.getItem(OWNER_KEY);
    if (savedOwner !== owner || !owner) {
      const sub = await getExistingSubscription();
      if (sub && !(await sub.unsubscribe())) throw new Error('unsubscribe-failed');
      localStorage.removeItem(OWNER_KEY);
    }
  });
  return accountSync;
}
async function checkOwner(owner: string) {
  await accountSync;
  if (currentOwner !== owner) throw new Error('account-changed');
}

export function pushSupport(): { supported: boolean; ios: boolean } {
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const supported = window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  return { supported, ios };
}

function keyToBuffer(key: string): ArrayBuffer {
  const pad = '='.repeat((4 - (key.length % 4)) % 4);
  const raw = atob((key + pad).replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes.buffer;
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!pushSupport().supported) return null;
  const reg = await navigator.serviceWorker.getRegistration(SW_SCOPE);
  return reg ? reg.pushManager.getSubscription() : null;
}

function toServerBody(sub: PushSubscription) {
  const json = sub.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!json.endpoint || !p256dh || !auth) throw new Error('incomplete-subscription');
  return { endpoint: json.endpoint, keys: { p256dh, auth } };
}

/** Must be called directly from a click handler. */
export async function enablePush(owner: string): Promise<'enabled' | 'denied'> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';
  await checkOwner(owner);
  const reg = await navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE });
  await navigator.serviceWorker.ready;
  const { publicKey } = await getFamilyPushConfig();
  await checkOwner(owner);
  const existing = await reg.pushManager.getSubscription();
  const sub = existing ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBuffer(publicKey) }));
  try {
    await checkOwner(owner);
    await subscribeFamilyPush(toServerBody(sub));
    await checkOwner(owner);
    localStorage.setItem(OWNER_KEY, owner);
  } catch (e) {
    if (!existing) await sub.unsubscribe().catch(() => undefined);
    throw e;
  }
  return 'enabled';
}

/** Server delete first, then browser unsubscribe. */
export async function disablePush(): Promise<void> {
  const sub = await getExistingSubscription();
  if (!sub) return;
  await unsubscribeFamilyPush({ endpoint: sub.endpoint });
  if (!(await sub.unsubscribe())) throw new Error('unsubscribe-failed');
  localStorage.removeItem(OWNER_KEY);
}

export async function reconcilePush(owner: string): Promise<boolean> {
  await checkOwner(owner);
  if (localStorage.getItem(OWNER_KEY) !== owner) return false;
  const sub = await getExistingSubscription();
  if (!sub || Notification.permission !== 'granted') return false;
  await checkOwner(owner);
  await subscribeFamilyPush(toServerBody(sub));
  await checkOwner(owner);
  return true;
}

export async function detachLocalPush(serverToo: boolean): Promise<void> {
  try {
    const sub = await getExistingSubscription();
    if (!sub) return;
    if (serverToo) await unsubscribeFamilyPush({ endpoint: sub.endpoint }).catch(() => undefined);
    await sub.unsubscribe();
    localStorage.removeItem(OWNER_KEY);
  } catch { /* nothing to detach */ }
}
