import Foundation
import Combine
import Supabase

class ApplicationService: ObservableObject {
    static let shared = ApplicationService()
    private let client = AuthManager.shared.client
    
    @Published var applicants: [Applicant] = []
    @Published var myReferrals: [MyReferral] = []
    @Published var isLoading = false
    
    private init() {}
    
    func fetchApplicants() async {
        await MainActor.run { isLoading = true }
        
        do {
            let fetched: [Applicant] = try await client
                .from("applicants")
                .select()
                .execute()
                .value
            
            await MainActor.run {
                self.applicants = fetched
                self.isLoading = false
            }
        } catch {
            print("❌ Error fetching applicants: \(error)")
            await MainActor.run { isLoading = false }
        }
    }
    
    func fetchMyReferrals() async {
        await MainActor.run { isLoading = true }
        
        do {
            // In a real app, you might filter by user_id here
            let fetched: [MyReferral] = try await client
                .from("referrals") // Note: This table might need creation if not existing
                .select()
                .execute()
                .value
            
            await MainActor.run {
                self.myReferrals = fetched
                self.isLoading = false
            }
        } catch {
            print("❌ Error fetching referrals: \(error)")
            await MainActor.run { isLoading = false }
        }
    }
    
    // MARK: - Real Application Logic
    @Published var myApplications: [Application] = []
    
    func fetchMyApplications() async {
        guard let userId = AuthManager.shared.currentUser?.id.uuidString else { return }
        
        do {
            let apps: [Application] = try await client
                .from("applications")
                .select()
                .eq("applicant_id", value: userId)
                .order("applied_at", ascending: false)
                .execute()
                .value
            
            await MainActor.run {
                self.myApplications = apps
            }
        } catch {
            print("Error fetching applications: \(error)")
        }
    }
    
    func applyToJob(jobId: String, coverLetter: String?) async throws {
        guard let userId = AuthManager.shared.currentUser?.id.uuidString else { 
            throw URLError(.userAuthenticationRequired)
        }
        
        let application = Application(
            id: UUID().uuidString,
            jobId: jobId,
            applicantId: userId,
            status: "pending",
            resumeUrl: nil, // TODO: Add resume selection
            coverLetter: coverLetter,
            rating: nil,
            shortlisted: false,
            notes: nil,
            appliedAt: nil, // Let DB handle default
            updatedAt: nil
        )
        
        try await client.from("applications").insert(application).execute()
        await fetchMyApplications()
    }
}
