// SMS / MMS filtering via IdentityLookup. An iOS App Extension: iOS hands it the
// text of messages from unknown senders and the extension routes them to the
// Junk / Promotion / Transaction folders. It can defer to the API for messages
// it cannot classify offline.
//
// Constraints: the offline path must be deterministic and fast (iOS budgets it
// tightly); the network path may only contact the single host declared in the
// extension's Info.plist (ILMessageFilterExtensionNetworkURL); no user content is
// logged. Wiring is handled by the withIosMessageFilter config plugin (adds the
// target, the com.apple.developer.sms-spam-filter entitlement, and the URL).

import IdentityLookup
import Foundation

final class MessageFilterExtension: ILMessageFilterExtension {}

extension MessageFilterExtension: ILMessageFilterQueryHandling {
  func handle(
    _ queryRequest: ILMessageFilterQueryRequest,
    context: ILMessageFilterExtensionContext,
    completion: @escaping (ILMessageFilterQueryResponse) -> Void
  ) {
    let (offlineAction, offlineSubAction) = offlineClassification(for: queryRequest)

    switch offlineAction {
    case .none:
      context.deferQueryRequestToNetwork { networkResponse, error in
        let response = ILMessageFilterQueryResponse()
        if let networkResponse, error == nil {
          response.action = self.action(fromStatus: networkResponse.httpResponse?.statusCode)
        } else {
          response.action = .none
        }
        completion(response)
      }
    default:
      let response = ILMessageFilterQueryResponse()
      response.action = offlineAction
      response.subAction = offlineSubAction
      completion(response)
    }
  }

  /// Deterministic offline pass. Mirrors the API's cheap heuristic so obvious
  /// scams are caught without a round trip.
  private func offlineClassification(
    for request: ILMessageFilterQueryRequest
  ) -> (ILMessageFilterAction, ILMessageFilterSubAction) {
    let body = (request.messageBody ?? "").lowercased()
    let hasLink = body.contains("http://") || body.contains("https://") || body.contains("www.")
    let lure = ["verify", "urgent", "prize", "otp", "password", "bank", "click", "claim", "won"]
      .contains { body.contains($0) }
    if hasLink && lure {
      return (.filter, .promotionalOthers)
    }
    return (.none, .none)
  }

  private func action(fromStatus status: Int?) -> ILMessageFilterAction {
    guard let status else { return .none }
    return (200..<300).contains(status) ? .filter : .allow
  }
}
