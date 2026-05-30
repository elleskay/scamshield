import { ConfigContext, ExpoConfig } from "expo/config";

// Dynamic config. Extends the static app.json and registers the native
// call/SMS config plugins (Continuous Native Generation applies them during
// `expo prebuild`). Everything else stays in app.json.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? "ScamShield (unofficial)",
  slug: config.slug ?? "scamshield",
  plugins: [
    ...(config.plugins ?? []),
    "./plugins/withAndroidCallScreening",
    "./plugins/withIosAppGroup",
  ],
});
