// Expo config plugin: adds the App Group entitlement to the iOS app and copies
// the Call Directory + Message Filter Swift sources into the iOS project for
// reference.
//
// IMPORTANT (honesty): this wires the *shared container* the app and the
// extensions use, and stages the Swift sources, but it does NOT create the two
// App Extension targets (Call Directory, Message Filter). Creating Apple
// extension targets requires manipulating the Xcode project and, to run on a
// device, an Apple Developer account with App IDs, the App Group, the
// sms-spam-filter entitlement, and provisioning profiles per extension. Generate
// the targets with @bacons/apple-targets and configure signing in EAS. See
// docs/MOBILE.md for the exact, verified-on-device procedure. None of this can be
// produced or verified in CI without Apple credentials, so it is documented, not
// claimed as proven.

const { withEntitlementsPlist, withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const APP_GROUP = "group.com.elleskay.scamshield";

const withAppGroupEntitlement = (config) =>
  withEntitlementsPlist(config, (config) => {
    const key = "com.apple.security.application-groups";
    const groups = config.modResults[key] || [];
    if (!groups.includes(APP_GROUP)) groups.push(APP_GROUP);
    config.modResults[key] = groups;
    return config;
  });

const withSwiftSources = (config) =>
  withDangerousMod(config, [
    "ios",
    (config) => {
      const srcRoot = path.join(config.modRequest.projectRoot, "native", "ios");
      const destRoot = path.join(config.modRequest.platformProjectRoot, "ScamShieldExtensions");
      for (const sub of ["CallDirectory", "MessageFilter"]) {
        const srcDir = path.join(srcRoot, sub);
        if (!fs.existsSync(srcDir)) continue;
        const destDir = path.join(destRoot, sub);
        fs.mkdirSync(destDir, { recursive: true });
        for (const file of fs.readdirSync(srcDir)) {
          fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
        }
      }
      return config;
    },
  ]);

module.exports = (config) => withSwiftSources(withAppGroupEntitlement(config));
