import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

/** Prominent warning shown when a flagged message/email contains a link. Fixed
 *  red treatment (a safety warning reads the same in light and dark). */
export function WarningCard() {
  return (
    <View testID="link-warning" style={styles.card}>
      <View style={styles.head}>
        <MaterialCommunityIcons name="link-variant-off" size={22} color="#B91C1C" />
        <Text style={styles.title}>Do not tap links in this message</Text>
      </View>
      <Text style={styles.body}>
        Scammers use links to steal your logins and card details. If it claims to be your bank, a
        delivery, or a government agency, open their official app or website directly instead of
        tapping the link.
      </Text>
      <Text style={styles.note}>ScamShield never asks you to log in through a link.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
    padding: 16,
    gap: 8,
  },
  head: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { fontSize: 15, fontWeight: "800", color: "#B91C1C", flex: 1 },
  body: { fontSize: 13, lineHeight: 19, color: "#7F1D1D" },
  note: { fontSize: 12, fontStyle: "italic", color: "#9F1239" },
});
