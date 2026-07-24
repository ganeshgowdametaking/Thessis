import Foundation
import Combine
import Supabase

class NotificationService: ObservableObject {
    static let shared = NotificationService()
    private let client = AuthManager.shared.client
    
    @Published var notifications: [AppNotification] = []
    @Published var isLoading = false
    
    private init() {}
    
    func fetchNotifications() async {
        await MainActor.run { isLoading = true }
        
        do {
            let fetched: [AppNotification] = try await client
                .from("notifications")
                .select()
                .execute()
                .value
            
            await MainActor.run {
                self.notifications = fetched
                self.isLoading = false
            }
        } catch {
            print("❌ Error fetching notifications: \(error)")
            await MainActor.run { isLoading = false }
        }
    }
}
