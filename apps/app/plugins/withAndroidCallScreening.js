// Expo config plugin: wires the Android CallScreeningService into the generated
// native project during `expo prebuild`.
//
//  1. Registers ScamCallScreeningService in AndroidManifest with the
//     BIND_SCREENING_SERVICE permission and the CallScreeningService intent
//     filter, so the OS can bind it when the app holds the call-screening role.
//  2. Copies the Kotlin sources from native/android/callscreening into the app's
//     package, so they compile into the APK.

const { withAndroidManifest, withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const PACKAGE = "com.elleskay.scamshield";
const SUBDIR = "callscreening";
const SERVICE_NAME = ".callscreening.ScamCallScreeningService";

function addService(androidManifest) {
  const application = androidManifest.manifest.application[0];
  application.service = application.service || [];

  const exists = application.service.some(
    (s) => s.$ && s.$["android:name"] === SERVICE_NAME,
  );
  if (!exists) {
    application.service.push({
      $: {
        "android:name": SERVICE_NAME,
        "android:permission": "android.permission.BIND_SCREENING_SERVICE",
        "android:exported": "true",
      },
      "intent-filter": [
        {
          action: [{ $: { "android:name": "android.telecom.CallScreeningService" } }],
        },
      ],
    });
  }
  return androidManifest;
}

const withManifest = (config) =>
  withAndroidManifest(config, (config) => {
    config.modResults = addService(config.modResults);
    return config;
  });

const withKotlinSources = (config) =>
  withDangerousMod(config, [
    "android",
    (config) => {
      const srcDir = path.join(config.modRequest.projectRoot, "native", "android", SUBDIR);
      const destDir = path.join(
        config.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "java",
        ...PACKAGE.split("."),
        SUBDIR,
      );
      fs.mkdirSync(destDir, { recursive: true });
      for (const file of fs.readdirSync(srcDir)) {
        fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
      }
      return config;
    },
  ]);

module.exports = (config) => withKotlinSources(withManifest(config));
