import SwiftUI
import Combine
import Supabase

class AnalyticsService: ObservableObject {
    static let shared = AnalyticsService()
    private let client = AuthManager.shared.client
    
    @Published var totalUsers: Int = 0
    @Published var activeJobs: Int = 0
    @Published var totalApplications: Int = 0
    @Published var topCompanies: [CompanyVolume] = []
    
    @Published var isLoading = false
    
    private init() {}
    
    @MainActor
    func refreshAnalytics() async {
        isLoading = true
        defer { isLoading = false }
        
        async let usersCount = fetchTableCount(table: "profiles")
        async let jobs = fetchAllJobs()
        async let applicationsCount = fetchTableCount(table: "applicants")
        
        do {
            let (uCount, fetchedJobs, aCount) = try await (usersCount, jobs, applicationsCount)
            
            self.totalUsers = uCount
            self.activeJobs = fetchedJobs.count
            self.totalApplications = aCount
            
            // Calculate Top Companies
            calculateTopCompanies(from: fetchedJobs)
            
        } catch {
            print("❌ Analytics refresh failed: \(error)")
        }
    }
    
    private func fetchTableCount(table: String) async throws -> Int {
        // Efficient count query
        let response = try await client
            .from(table)
            .select("*", head: true, count: .exact)
            .execute()
        
        return response.count ?? 0
    }
    
    private func fetchAllJobs() async throws -> [Job] {
        // We need actual job data to aggregate companies
        let response: [Job] = try await client
            .from("jobs")
            .select()
            .execute()
            .value
        return response
    }
    
    private func calculateTopCompanies(from jobs: [Job]) {
        let companyCounts = Dictionary(grouping: jobs, by: { $0.company })
            .mapValues { $0.count }
        
        let sortedCompanies = companyCounts.sorted { $0.value > $1.value }
        
        // Take top 5
        let top5 = sortedCompanies.prefix(5)
        
        let colors = [Theme.gold, Theme.sage, Theme.primary, Color(hex: "8FB399"), Color(hex: "E0E0E0")]
        
        self.topCompanies = top5.enumerated().map { index, element in
            CompanyVolume(
                name: element.key,
                volume: element.value,
                color: colors[index % colors.count]
            )
        }
    }
}
