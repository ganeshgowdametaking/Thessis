//
import Foundation
import SwiftUI

enum ApplicantStatus: String, Codable {
    case active = "active"
    case pending = "pending"
    case offline = "offline"
    
    var color: Color {
        switch self {
        case .active: return .green
        case .pending: return Theme.amber
        case .offline: return .gray
        }
    }
}

struct Applicant: Identifiable, Codable {
    let id: String
    let name: String
    let role: String
    let company: String
    let location: String
    let imageUrl: String
    let status: ApplicantStatus
    
    // Detailed fields for the details view
    var email: String?
    var phone: String?
    var linkedIn: String?
    var coverLetter: String?
    var resumeUrl: String?
    var appliedDate: String?
    
    enum CodingKeys: String, CodingKey {
        case id, name, role, company, location, status, email, phone
        case imageUrl = "image_url"
        case linkedIn = "linkedin"
        case coverLetter = "cover_letter"
        case resumeUrl = "resume_url"
        case appliedDate = "applied_date"
    }
}

extension Applicant {
    static let samples: [Applicant] = [
        Applicant(id: "1", name: "Sarah Jenkins", role: "Product Designer", company: "Google", location: "San Francisco, CA", imageUrl: "https://i.pravatar.cc/150?u=sarah", status: .active, appliedDate: "2 days ago"),
        Applicant(id: "2", name: "David Kim", role: "UX Researcher", company: "Airbnb", location: "New York, NY", imageUrl: "https://i.pravatar.cc/150?u=david", status: .pending, appliedDate: "3 days ago"),
        Applicant(id: "3", name: "Elena Rodriguez", role: "Senior UI Designer", company: "Spotify", location: "Remote", imageUrl: "https://i.pravatar.cc/150?u=elena", status: .offline, appliedDate: "1 week ago")
    ]
}
