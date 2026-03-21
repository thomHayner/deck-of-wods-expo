import SwiftUI

@main
struct DeckOfWODsWatchApp: App {
    // Activate WCSession as early as possible
    @WKApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}

class AppDelegate: NSObject, WKApplicationDelegate {
    func applicationDidFinishLaunching() {
        _ = PhoneConnector.shared
        HealthKitManager.shared.requestAuthorization()
    }
}
