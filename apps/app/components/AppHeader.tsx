import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { brand } from "@/lib/theme";

/** The branded gradient hero shown at the top of every tab. Brand-only; each
 *  screen supplies its own section title in the body. */
export function AppHeader() {
  return (
    <LinearGradient
      colors={[brand.indigo, brand.violet]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
    >
      <SafeAreaView edges={["top"]}>
        <View style={styles.heroRow}>
          <View style={styles.logo}>
            <MaterialCommunityIcons name="shield-check" size={26} color="#fff" />
          </View>
          <View>
            <Text style={styles.brandName}>ScamShield</Text>
            <Text style={styles.tagline}>Check. Report. Stay safe.</Text>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 20, paddingBottom: 24 },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 8 },
  logo: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: { color: "#fff", fontSize: 22, fontWeight: "800", letterSpacing: 0.2 },
  tagline: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 1 },
});
