import Foundation

struct Application: Identifiable, Codable {
    let id: String
    let jobId: String
    let applicantId: String
    let status: String // 'pending', 'reviewed', 'shortlisted', 'rejected', 'accepted'
    let resumeUrl: String?
    let coverLetter: String?
    let rating: Double?
    let shortlisted: Bool?
    let notes: String?
    let appliedAt: String?
    let updatedAt: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case jobId = "job_id"
        case applicantId = "applicant_id"
        case status
        case resumeUrl = "resume_url"
        case coverLetter = "cover_letter"
        case rating
        case shortlisted
        case notes
        case appliedAt = "applied_at"
        case updatedAt = "updated_at"
    }
}
