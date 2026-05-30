// Android call screening. Screens incoming calls before they ring.
//
// CallScreeningService is bound by the OS; JavaScript cannot screen calls. The
// app must hold the call-screening role (RoleManager.ROLE_CALL_SCREENING), which
// the user grants once (or, in tests, `adb shell cmd role add-role-holder`). The
// blocked-number set is read from the shared file the JS app writes (see
// BlockedNumberStore). Registered in the manifest by the withAndroidCallScreening
// config plugin with the BIND_SCREENING_SERVICE permission and intent filter.

package com.elleskay.scamshield.callscreening

import android.telecom.Call
import android.telecom.CallScreeningService

class ScamCallScreeningService : CallScreeningService() {

  override fun onScreenCall(callDetails: Call.Details) {
    val number = callDetails.handle?.schemeSpecificPart?.filter { it.isDigit() }
    val block = shouldBlock(number)

    val response = CallResponse.Builder()
      .setDisallowCall(block)
      .setRejectCall(block)
      .setSkipCallLog(false)
      .setSkipNotification(block)
      .build()

    respondToCall(callDetails, response)
  }

  /** Pure decision, so it can be reasoned about and mirrored by a JS unit test. */
  private fun shouldBlock(number: String?): Boolean {
    return BlockedNumberStore.contains(this, number)
  }
}
