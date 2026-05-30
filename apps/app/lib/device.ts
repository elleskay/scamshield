import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const KEY = "scamshield.deviceToken";

/** RFC4122-ish v4. Opaque, non-secret: only used to group a device's reports. */
function randomToken(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

let cached: string | null = null;

/**
 * Per-install device token. Not a secret and not PII: it only lets the API group
 * a device's own reports and route a push when one is marked a scam. Stored in
 * the OS keychain on native (expo-secure-store), localStorage on web, ephemeral
 * if neither is available. Never sent anywhere except this app's own API.
 */
export async function getDeviceToken(): Promise<string> {
  if (cached) return cached;

  if (Platform.OS === "web") {
    try {
      const existing = globalThis.localStorage?.getItem(KEY);
      cached = existing ?? randomToken();
      if (!existing) globalThis.localStorage?.setItem(KEY, cached);
      return cached;
    } catch {
      cached = randomToken();
      return cached;
    }
  }

  try {
    const existing = await SecureStore.getItemAsync(KEY);
    cached = existing ?? randomToken();
    if (!existing) await SecureStore.setItemAsync(KEY, cached);
    return cached;
  } catch {
    cached = randomToken();
    return cached;
  }
}
