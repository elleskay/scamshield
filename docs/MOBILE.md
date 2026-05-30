# Mobile runbook

Everything specific to building, signing, and shipping the Expo app, plus the
native call/SMS extensions that JavaScript cannot implement.

## Why native extensions

The signature features (call blocking/identification, SMS filtering) are OS
extension points. The system, not the app, invokes them, out of process:

| Feature | iOS | Android |
|---|---|---|
| Call block / identify | Call Directory Extension (CallKit) | `CallScreeningService` + call-screening role |
| SMS filtering | `ILMessageFilterExtension` (IdentityLookup) | default-SMS role / SMS handling |
| Live caller lookup (optional) | Live Caller ID Lookup (iOS 18) | n/a |

The JS app manages data (block lists, reports, settings) and writes the shared
state the extensions read (iOS App Group container; Android local store). The
reference implementations are in `apps/_template/native/`.

## How the native code gets in

1. Expo managed workflow. You do not commit `ios/` or `android/`.
2. `app.config.ts` lists local config plugins (`withIosCallDirectory`,
   `withIosMessageFilter`, `withAndroidCallScreening`).
3. `expo prebuild` runs the plugins, which:
   - add the extension targets,
   - copy the Swift/Kotlin from `native/` into the generated projects,
   - add entitlements (App Group, `com.apple.developer.sms-spam-filter`) and
     manifest entries (`BIND_SCREENING_SERVICE`, intent filters, permissions).
4. EAS builds the prebuilt project.

Do not hand-edit the generated native projects; prebuild regenerates them.

## EAS setup

```bash
npm i -g eas-cli
eas login
eas init                  # creates the EAS project, writes the project id
eas build:configure       # creates eas.json with build profiles
```

Set `EXPO_TOKEN` as a GitHub secret for the CI build workflow. Set
`EXPO_PUBLIC_API_URL` (build-time, public) to the deployed API URL.

## Credentials

The iOS extensions each need their own App ID and provisioning profile, plus the
App Group shared with the main app, and the SMS-spam-filter entitlement (request
from Apple). Manage with `eas credentials`. Android needs the call-screening role
declared and requested at runtime; no special signing beyond the app keystore EAS
manages.

## Build vs OTA

- New native capability (permission, extension, native dep): full `eas build`,
  then store submit. OTA cannot ship native changes.
- JS/asset-only change: `eas update` to the channel. Instant, no review.

## Store review notes

- Call/SMS filtering features draw extra scrutiny. Document the legitimate
  anti-scam use and provide a test account/walkthrough in App Store / Play
  review notes.
- iOS: the Message Filter network path may only contact the single host declared
  in the extension's Info.plist; no analytics or logging of message content.
- Android: holding the default-SMS or call-screening role has Play policy
  requirements; declare the core use case.

## Testing on device

The spec gate runs Detox on a simulator/emulator, which does not exercise the
real call/SMS interception. Before any release, verify on a physical device that
the extensions are enabled (iOS Settings > Phone / Messages, Android default-apps)
and actually intercept. This is the journey check the gate cannot do (see
`docs/TESTING.md`).

## Native verification (this app)

What ships in scamshield and how each piece is verified.

Implementation:

- `apps/app/native/android/callscreening/` - `ScamCallScreeningService.kt` (OS
  call screening) + `BlockedNumberStore.kt` (reads `<filesDir>/blocklist.json`).
- `apps/app/native/ios/CallDirectory/` + `native/ios/MessageFilter/` - the
  CallKit Call Directory and IdentityLookup Message Filter extensions (Swift).
- `apps/app/plugins/withAndroidCallScreening.js` - registers the service in the
  manifest (`BIND_SCREENING_SERVICE` + intent filter) and copies the Kotlin.
- `apps/app/plugins/withIosAppGroup.js` - adds the `group.com.elleskay.scamshield`
  App Group entitlement and stages the Swift sources.
- `apps/app/lib/blocklist.ts` (`shouldBlockNumber`, the pure decision, unit-tested
  as `SCAM-NATIVE-001`) and `lib/blocklist-sync.ts` (writes the blocklist file the
  native layer reads; fed by `GET /numbers/blocklist`).

### Android: proven on an emulator

The block decision is unit-tested (`SCAM-NATIVE-001`). The OS-level screening is
verified end to end on the Android emulator:

```bash
# 1. Generate the native project (applies the config plugin) and build.
cd apps/app
npx expo prebuild --platform android --clean --no-install
cd android && ./gradlew assembleRelease         # JDK 17

# 2. Install and grant the call-screening role headlessly (emulator/userdebug).
adb install -r app/build/outputs/apk/release/app-release.apk
adb shell cmd role add-role-holder android.app.role.CALL_SCREENING com.elleskay.scamshield

# 3. Seed the blocklist the service reads (the app also syncs this on launch).
adb shell "run-as com.elleskay.scamshield sh -c 'echo [\"6580001234\"] > files/blocklist.json'"

# 4. Simulate an incoming call from the seeded scam number and confirm it is
#    rejected (DISALLOWED, no ring) rather than ringing.
adb emu gsm call 6580001234
adb shell dumpsys telecom | grep -iE "DISCONNECTED|REJECTED|6580001234"
```

A passing run is captured as a signed verification artifact under
`apps/app/verification/` (layer A checksum via spec-attest, layer B signed-commit
attestation), which is what promotes the OS-level requirement from documented to
proven.

### iOS: implemented, verified on a real device

The Swift extensions are real implementations, and the App Group plumbing is
wired by `withIosAppGroup`. They cannot be verified here: the Message Filter does
not run on the simulator, and both extensions need an Apple Developer account
(App IDs, the App Group, the `com.apple.developer.sms-spam-filter` entitlement,
and per-extension provisioning profiles). To finish and verify on a device:

1. Generate the two App Extension targets with `@bacons/apple-targets` (Call
   Directory, Message Filter) and point them at the Swift sources in
   `native/ios/`. Configure signing in `eas credentials`.
2. Build with `eas build -p ios`, install on a device.
3. Call Directory: Settings > Phone > Call Blocking & Identification > enable
   ScamShield; call from a seeded blocked number; confirm it is blocked.
4. Message Filter: Settings > Messages > Unknown & Spam > enable ScamShield; send
   a link+lure SMS from an unknown sender; confirm it lands in Junk.

Because this requires Apple infrastructure, iOS native is documented here, not
claimed as proven by the gate.
