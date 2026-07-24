import SwiftUI

@main
struct TankTideApp: App {
    var body: some Scene {
        WindowGroup {
            LoginView()
                .preferredColorScheme(.dark)
                .dismissKeyboardOnTap()
                .onOpenURL { url in
                    AuthManager.shared.handleSession(from: url)
                }
        }
    }
}
