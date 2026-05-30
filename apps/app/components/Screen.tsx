import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { AppHeader } from "./AppHeader";

/** Standard tab scaffold: branded header + a scrolling body with consistent
 *  padding. Bottom padding clears the tab bar. No router/tab-context hooks, so
 *  screens using this stay renderable in isolation (jest component tests). */
export function Screen({ children }: { children: ReactNode }) {
  return (
    <View style={styles.root}>
      <AppHeader />
      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 96, gap: 16 },
});
