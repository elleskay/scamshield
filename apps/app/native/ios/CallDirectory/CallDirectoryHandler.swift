// CallKit Call Directory extension. An iOS App Extension target, separate from
// the main app, that supplies blocked and identified numbers to the system.
// iOS calls it out of process; JavaScript cannot do this. The app writes the
// number set to a shared App Group container; this extension reads it and hands
// it to CallKit.
//
// Wiring (withIosCallDirectory config plugin): adds the extension target, the
// App Group entitlement (group.com.elleskay.scamshield) to both the app and the
// extension, and enables it under Settings > Phone > Call Blocking & ID.

import CallKit
import Foundation

class CallDirectoryHandler: CXCallDirectoryProvider {
  private let appGroup = "group.com.elleskay.scamshield"

  override func beginRequest(with context: CXCallDirectoryExtensionContext) {
    context.delegate = self

    // CallKit requires ascending numerical order.
    for entry in loadBlockedNumbers() {
      context.addBlockingEntry(withNextSequentialPhoneNumber: entry)
    }
    for (number, label) in loadIdentifiedNumbers() {
      context.addIdentificationEntry(withNextSequentialPhoneNumber: number, label: label)
    }

    context.completeRequest()
  }

  /// Blocked set the JS app wrote to the shared App Group container.
  private func loadBlockedNumbers() -> [CXCallDirectoryPhoneNumber] {
    guard
      let defaults = UserDefaults(suiteName: appGroup),
      let raw = defaults.array(forKey: "blockedNumbers") as? [NSNumber]
    else { return [] }
    return raw.map { $0.int64Value }.sorted()
  }

  private func loadIdentifiedNumbers() -> [(CXCallDirectoryPhoneNumber, String)] {
    guard
      let defaults = UserDefaults(suiteName: appGroup),
      let raw = defaults.dictionary(forKey: "identifiedNumbers") as? [String: String]
    else { return [] }
    return raw
      .compactMap { key, label in Int64(key).map { ($0, label) } }
      .sorted { $0.0 < $1.0 }
  }
}

extension CallDirectoryHandler: CXCallDirectoryExtensionContextDelegate {
  func requestFailed(for extensionContext: CXCallDirectoryExtensionContext, withError error: Error) {
    NSLog("CallDirectory request failed: \(error.localizedDescription)")
  }
}
