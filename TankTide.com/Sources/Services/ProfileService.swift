import Foundation
import Combine
import Supabase

class ProfileService: ObservableObject {
    static let shared = ProfileService()
    private let client = AuthManager.shared.client
    
    @Published var currentUserProfile: UserProfile?
    @Published var isLoading = false
    
    private init() {}
    
    func fetchCurrentProfile() async {
        guard let userId = try? await client.auth.session.user.id else { return }
        
        await MainActor.run { isLoading = true }
        
        do {
            let profile: UserProfile = try await client
                .from("profiles")
                .select()
                .eq("id", value: userId)
                .single()
                .execute()
                .value
            
            await MainActor.run {
                self.currentUserProfile = profile
                self.isLoading = false
            }
        } catch {
            print("❌ Error fetching profile: \(error)")
            await MainActor.run { isLoading = false }
        }
    }
    func searchProfiles(query: String) async -> [UserProfile] {
        guard !query.isEmpty else { return [] }
        let currentUserId = AuthManager.shared.currentUser?.id.uuidString.lowercased()
        
        do {
            let profiles: [UserProfile] = try await client
                .from("profiles")
                .select()
                .ilike("full_name", pattern: "%\(query)%") // Case-insensitive search
                .execute()
                .value
            
            // Filter out current user
            return profiles.filter { $0.id.lowercased() != currentUserId }
        } catch {
            print("❌ Error searching profiles: \(error)")
            return []
        }
    }
    
    func getProfile(id: String) async -> UserProfile? {
        do {
            return try await client
                .from("profiles")
                .select()
                .eq("id", value: id)
                .single()
                .execute()
                .value
        } catch {
            print("❌ Error fetching profile by ID \(id): \(error)")
            return nil
        }
    }
}
