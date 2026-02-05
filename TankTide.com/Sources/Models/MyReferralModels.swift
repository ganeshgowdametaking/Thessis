import Foundation

enum ReferralStatus: String, Codable {
    case active = "Active"
    case closed = "Closed"
    case draft = "Draft"
}

struct MyReferral: Identifiable, Codable {
    let id: String
    let title: String
    let department: String
    let location: String
    let status: ReferralStatus
    let applicantCount: Int
    let applicantAvatars: [String] // Icons or URLs
    
    enum CodingKeys: String, CodingKey {
        case id, title, department, location, status
        case applicantCount = "applicant_count"
        case applicantAvatars = "applicant_avatars"
    }
}

struct ReferralStats: Codable {
    let totalReferrals: Int
    let totalApplicants: Int
    let activeReferrals: Int
}

extension MyReferral {
    static let samples: [MyReferral] = [
        MyReferral(
            id: "1",
            title: "Senior UX Designer",
            department: "Product Team",
            location: "Remote",
            status: .active,
            applicantCount: 3,
            applicantAvatars: ["person.crop.circle.fill", "person.crop.circle.fill", "person.crop.circle.fill"]
        ),
        MyReferral(
            id: "2",
            title: "Marketing Manager",
            department: "Growth Department",
            location: "San Francisco, CA",
            status: .closed,
            applicantCount: 12,
            applicantAvatars: ["person.crop.circle.fill"]
        ),
        MyReferral(
            id: "3",
            title: "React Developer",
            department: "Engineering",
            location: "Remote",
            status: .draft,
            applicantCount: 0,
            applicantAvatars: []
        ),
        MyReferral(
            id: "4",
            title: "Staff Accountant",
            department: "Finance & Operations",
            location: "New York, NY",
            status: .active,
            applicantCount: 2,
            applicantAvatars: ["person.crop.circle.fill", "person.crop.circle.fill"]
        )
    ]
}

extension ReferralStats {
    static let sample = ReferralStats(
        totalReferrals: 12,
        totalApplicants: 45,
        activeReferrals: 5
    )
}
