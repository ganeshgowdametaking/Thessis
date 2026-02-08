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
            var query = client.from("jobs").select()
            
            if let userId = AuthManager.shared.currentUser?.id.uuidString {
                query = query.neq("created_by", value: userId)
            }
            
            let fetchedJobs: [Job] = try await query.execute().value
            
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
    
    func createJob(_ job: JobInsert) async throws {
        try await client
            .from("jobs")
            .insert(job)
            .execute()
        
        // Refresh local list
        await fetchJobs()
    }
}
