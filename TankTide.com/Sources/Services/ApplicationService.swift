import Foundation
import Combine
import Supabase

class ApplicationService: ObservableObject {
    static let shared = ApplicationService()
    private let client = AuthManager.shared.client
    
    @Published var applicants: [Applicant] = []
    @Published var myReferrals: [MyReferral] = []
    @Published var jobApplicants: [Applicant] = []
    @Published var isLoading = false
    
    private init() {}
    
    func fetchApplicants(for jobId: String) async {
        await MainActor.run { isLoading = true }
        
        do {
            // 1. Fetch all 'applications' for this job
            let applications: [Application] = try await client
                .from("applications")
                .select()
                .eq("job_id", value: jobId)
                .execute()
                .value
            
            if applications.isEmpty {
                await MainActor.run { 
                    self.jobApplicants = []
                    self.isLoading = false 
                }
                return
            }
            
            // 2. Extract applicant IDs
            let applicantIds = applications.map { $0.applicantId }
            
            // 3. Fetch 'profiles' for these applicants
            let profiles: [UserProfile] = try await client
                .from("profiles")
                .select()
                .in("id", values: applicantIds)
                .execute()
                .value
            
            // 4. Merge data into 'Applicant' view models
            let mergedApplicants = applications.compactMap { app -> Applicant? in
                guard let profile = profiles.first(where: { $0.id == app.applicantId }) else { return nil }
                
                // Map status string to enum
                let status = ApplicantStatus(rawValue: app.status.lowercased()) ?? .pending
                
                return Applicant(
                    id: app.applicantId,
                    name: profile.name,
                    role: profile.title ?? "Applicant", // Fallback
                    company: profile.company ?? "Unknown",
                    location: profile.location ?? "Remote",
                    imageUrl: profile.avatar ?? "",
                    status: status,
                    email: profile.id, // We might not have email in public profile, using ID or empty
                    phone: nil,
                    linkedIn: nil,
                    coverLetter: app.coverLetter,
                    resumeUrl: app.resumeUrl,
                    appliedDate: app.appliedAt,
                    skills: profile.skills?.map { $0.name } ?? []
                )
            }
            
            await MainActor.run {
                self.jobApplicants = mergedApplicants
                self.isLoading = false
            }
        } catch {
            print("❌ Error fetching job applicants: \(error)")
            await MainActor.run { isLoading = false }
        }
    }
    
    func fetchApplicants() async {
        await MainActor.run { isLoading = true }
        
        do {
            // This method seems to want all applicants system-wide? 
            // Or maybe it was intended to fetch profiles appearing in applications?
            // Assuming it meant to fetch profiles for exploration, but sticking to 'profiles' table
            let fetched: [Applicant] = try await client
                .from("profiles")
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
    
    func deleteReferral(id: String) async throws {
        try await client
            .from("jobs")
            .delete()
            .eq("id", value: id)
            .execute()
        
        await fetchMyReferrals()
        // Also refresh the main jobs list if JobService is already initialized
        await JobService.shared.fetchJobs()
    }
    
    // Helper struct for counting
    struct JobApplicationRef: Decodable {
        let jobId: String
        
        enum CodingKeys: String, CodingKey {
            case jobId = "job_id"
        }
    }

    func fetchMyReferrals() async {
        guard let userId = AuthManager.shared.currentUser?.id.uuidString else { return }
        await MainActor.run { isLoading = true }
        
        do {
            let fetchedJobs: [Job] = try await client
                .from("jobs")
                .select()
                .eq("created_by", value: userId)
                .order("created_at", ascending: false)
                .execute()
                .value
            
            // Fetch all applications for these jobs to get accurate counts
            let jobIds = fetchedJobs.map { $0.id }
            
            if jobIds.isEmpty {
                 await MainActor.run {
                    self.myReferrals = []
                    self.isLoading = false
                }
                return
            }

            // Use strong typing instead of [String: Any]
            let allApps: [JobApplicationRef] = try await client
                .from("applications")
                .select("job_id")
                .in("job_id", values: jobIds)
                .execute()
                .value
            
            let mapped = fetchedJobs.map { job -> MyReferral in
                let count = allApps.filter { $0.jobId == job.id }.count
                
                return MyReferral(
                    id: job.id,
                    title: job.title,
                    department: job.department ?? "Design",
                    location: job.location,
                    status: ReferralStatus(rawValue: job.status?.capitalized ?? "Active") ?? .active,
                    applicantCount: count,
                    applicantAvatars: Array(repeating: "person.crop.circle.fill", count: min(count, 3))
                )
            }
            
            await MainActor.run {
                self.myReferrals = mapped
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
            let fetched: [Application] = try await client
                .from("applications")
                .select()
                .eq("applicant_id", value: userId)
                .order("applied_at", ascending: false)
                .execute()
                .value
            
            await MainActor.run {
                self.myApplications = fetched
            }
        } catch {
            print("Error fetching applications: \(error)")
        }
    }
    
    func checkHasApplied(jobId: String) async -> Bool {
        guard let userId = AuthManager.shared.currentUser?.id.uuidString else { return false }
        
        do {
            let response = try await client
                .from("applications")
                .select("id")
                .eq("job_id", value: jobId)
                .eq("applicant_id", value: userId)
                .execute()
            
            if let data = response.value as? [Any], !data.isEmpty {
                return true
            }
        } catch {
            print("Check failed: \(error)")
        }
        
        return false
    }
    
    func applyToJob(jobId: String, email: String, resumeBase64: String, coverLetter: String? = nil) async throws {
        guard let userId = AuthManager.shared.currentUser?.id.uuidString else { 
            throw URLError(.userAuthenticationRequired)
        }
        
        // Match the exact database schema
        let applicationData: [String: String] = [
            "job_id": jobId,
            "applicant_id": userId,
            "resume_url": resumeBase64, // Assuming this stores the base64 string or URL
            "status": "pending"
            //"cover_letter": coverLetter // Add if needed and if column exists
        ]
        
        try await client.from("applications").insert(applicationData).execute()
        
        await fetchMyApplications()
    }
}
