import Foundation
import Combine
import Supabase

class JobService: ObservableObject {
    static let shared = JobService()
    private let client = AuthManager.shared.client
    
    @Published var jobs: [Job] = []
    @Published var isLoading = false
    @Published var error: Error?
    
    private init() {}
    
    func fetchJobs() async {
        await MainActor.run { isLoading = true; error = nil }
        
        do {
            let fetchedJobs: [Job] = try await client
                .from("jobs")
                .select()
                .execute()
                .value
            
            await MainActor.run {
                self.jobs = fetchedJobs
                self.isLoading = false
            }
        } catch {
            print("❌ Error fetching jobs: \(error)")
            await MainActor.run {
                self.error = error
                self.isLoading = false
            }
        }
    }
    
    func fetchFeaturedJobs() async -> [Job] {
        do {
            return try await client
                .from("jobs")
                .select()
                .eq("isNew", value: true)
                .limit(5)
                .execute()
                .value
        } catch {
            print("❌ Error fetching featured jobs: \(error)")
            return []
        }
    }
}
