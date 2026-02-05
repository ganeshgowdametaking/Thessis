import Foundation
import Supabase
import Combine
import AuthenticationServices

class AuthManager: NSObject, ObservableObject, ASWebAuthenticationPresentationContextProviding {
    static let shared = AuthManager()
    
    // Hardcoded for simplicity in Native Demo (ideally use Info.plist)
    let client: SupabaseClient
    
    @Published var currentUser: User?
    @Published var showingResetPassword = false

    private override init() {
        let url = URL(string: "https://fvprdknorvuqggwxfqly.supabase.co")!
        let key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2cHJka25vcnZ1cWdnd3hmcWx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MDU4MTcsImV4cCI6MjA2NjE4MTgxN30.7yujzc8OsaBfwSYKeWqgwYGfZW7VI9Gcxqhs6y16WNY"
        
        self.client = SupabaseClient(
            supabaseURL: url,
            supabaseKey: key,
            options: SupabaseClientOptions(
                auth: .init(emitLocalSessionAsInitialSession: true)
            )
        )
        
        super.init()
        
        Task {
            for await session in client.auth.authStateChanges {
                await MainActor.run {
                    self.currentUser = session.session?.user
                }
            }
        }
    }
    
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        return UIApplication.shared.windows.first { $0.isKeyWindow } ?? ASPresentationAnchor()
    }

    func signInWithGoogle() async throws {
        let url = try await client.auth.getOAuthSignInURL(
            provider: .google,
            redirectTo: URL(string: "tanktide://login-callback")
        )
        
        return try await withCheckedThrowingContinuation { continuation in
            let session = ASWebAuthenticationSession(
                url: url,
                callbackURLScheme: "tanktide"
            ) { callbackURL, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }
                
                guard let callbackURL = callbackURL else {
                    continuation.resume(throwing: NSError(domain: "Auth", code: 0, userInfo: [NSLocalizedDescriptionKey: "No callback URL"]))
                    return
                }
                
                Task {
                    do {
                        try await self.client.auth.handle(callbackURL)
                        continuation.resume()
                    } catch {
                        continuation.resume(throwing: error)
                    }
                }
            }
            
            session.presentationContextProvider = self
            session.prefersEphemeralWebBrowserSession = false // Allow sharing cookies with Safari
            session.start()
        }
    }

    func handleSession(from url: URL) {
        if url.host == "reset-password" || url.path.contains("reset-password") {
            print("🔑 AuthManager: Detected password reset link")
            Task {
                await MainActor.run {
                    self.showingResetPassword = true
                }
            }
        }
        
        Task {
            do {
                try await client.auth.handle(url)
                print("✅ AuthManager: Session handled successfully from URL: \(url)")
            } catch {
                print("❌ AuthManager: Failed to handle session from URL: \(error)")
            }
        }
    }
    
    func resetPassword(email: String) async throws {
        try await client.auth.resetPasswordForEmail(
            email,
            redirectTo: URL(string: "https://tanktide.com/?reset=true")
        )
    }
    
    func updatePassword(newPassword: String) async throws {
        try await client.auth.update(
            user: UserAttributes(password: newPassword)
        )
    }
}
