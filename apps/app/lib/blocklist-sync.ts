import { Platform } from "react-native";
import * as FileSystem from "expo-file-system";
import { getBlocklist } from "./api";

const FILE_NAME = "blocklist.json";

/**
 * Fetch the scam-number blocklist and write it where the native call-screening
 * layer reads it (<filesDir>/blocklist.json, the path expo-file-system's
 * documentDirectory maps to on device). No-op on web. Best-effort: screening
 * still uses the last synced set if the network is down.
 */
export async function syncBlocklist(): Promise<number> {
  const numbers = await getBlocklist();
  if (Platform.OS === "web") return numbers.length;
  try {
    const path = `${FileSystem.documentDirectory ?? ""}${FILE_NAME}`;
    if (path) await FileSystem.writeAsStringAsync(path, JSON.stringify(numbers));
  } catch {
    // best-effort
  }
  return numbers.length;
}
