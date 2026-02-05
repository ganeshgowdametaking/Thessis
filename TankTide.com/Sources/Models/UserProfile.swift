import Foundation
import SwiftUI

struct Experience: Identifiable, Codable {
    let id: Double
    let title: String
    let company: String
    let location: String?
    let startDate: String?
    let endDate: String?
    let current: Bool
    let description: String?
    let logo: String?
    
    enum CodingKeys: String, CodingKey {
        case id, title, company, location, current, description, logo
        case startDate = "startDate"
        case endDate = "endDate"
    }
}

struct Education: Identifiable, Codable {
    let id: Double
    let degree: String
    let school: String
    let startDate: String?
    let endDate: String?
    let description: String?
    let gpa: String?
}

struct Skill: Identifiable, Codable {
    let id: Double
    let name: String
    let level: Int?
    let category: String?
}

struct Achievement: Identifiable, Codable {
    let id: Double
    let title: String
    let organization: String?
    let date: String?
    let type: String?
    let description: String?
}

struct UserProfile: Codable, Identifiable {
    let id: String // Map to actual UUID from DB
    let name: String
    let title: String?
    let company: String?
    let location: String?
    let avatar: String?
    let bio: String?
    let connectionsCount: Int?
    
    // Properties not in 'profiles' table (set to defaults/nil)
    var connections: String? = nil
    var rating: Double? = nil
    var expYears: String? = nil
    var experiences: [Experience]? = nil
    var education: [Education]? = nil
    var skills: [Skill]? = nil
    var achievements: [Achievement]? = nil

    enum CodingKeys: String, CodingKey {
        case id, title, location, bio, company
        case name = "full_name"
        case avatar = "avatar_url"
        case connectionsCount = "connections_count"
        case experiences, education, skills, achievements
    }
    
    // Custom decoding to safely map DB columns
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        
        // Decode existing columns
        id = try container.decodeIfPresent(String.self, forKey: .id) ?? UUID().uuidString
        name = try container.decodeIfPresent(String.self, forKey: .name) ?? "Unknown User"
        title = try container.decodeIfPresent(String.self, forKey: .title)
        company = try container.decodeIfPresent(String.self, forKey: .company)
        location = try container.decodeIfPresent(String.self, forKey: .location)
        avatar = try container.decodeIfPresent(String.self, forKey: .avatar)
        bio = try container.decodeIfPresent(String.self, forKey: .bio)
        connectionsCount = try container.decodeIfPresent(Int.self, forKey: .connectionsCount)
        
        // Decode rich fields (stored as JSON columns) - using try? to be robust
        experiences = try? container.decodeIfPresent([Experience].self, forKey: .experiences)
        education = try? container.decodeIfPresent([Education].self, forKey: .education)
        skills = try? container.decodeIfPresent([Skill].self, forKey: .skills)
        achievements = try? container.decodeIfPresent([Achievement].self, forKey: .achievements)
        
        // If skills failed to decode as [Skill], try as [String]
        if skills == nil {
            if let strings = try? container.decodeIfPresent([String].self, forKey: .skills) {
                skills = strings.enumerated().map { Skill(id: Double($0.0), name: $0.1, level: nil, category: nil) }
            }
        }
        
        // Initialize non-DB properties
        connections = nil
        rating = nil
        expYears = nil
    }
    
    // Memberwise init for samples
    init(id: String = UUID().uuidString, name: String, title: String?, company: String? = nil, location: String?, avatar: String?, bio: String? = nil, connectionsCount: Int? = 0, connections: String? = nil, rating: Double? = nil, expYears: String? = nil, experiences: [Experience]? = nil, education: [Education]? = nil, skills: [Skill]?, achievements: [Achievement]?) {
        self.id = id
        self.name = name
        self.title = title
        self.company = company
        self.location = location
        self.avatar = avatar
        self.bio = bio
        self.connectionsCount = connectionsCount
        self.connections = connections
        self.rating = rating
        self.expYears = expYears
        self.experiences = experiences
        self.education = education
        self.skills = skills
        self.achievements = achievements
    }
}

extension UserProfile {
    static let sample = UserProfile(
        id: "sample-user-id",
        name: "Alex Sterling",
        title: "Senior Product Designer",
        company: "TechFlow Inc.",
        location: "San Francisco, CA",
        avatar: "person.crop.circle.fill", // Using system name for now as per design
        bio: "Passionate product designer with a love for minimalist architecture and sustainable tech. Building the future of digital interactions.",
        connectionsCount: 500,
        connections: "500+",
        rating: 4.9,
        expYears: "8yr",
        experiences: [
            Experience(id: 1, title: "Senior UX Designer", company: "TechFlow Inc.", location: "San Francisco, CA", startDate: "2020-01-01", endDate: nil, current: true, description: "Leading the design of core products and mentoring junior designers.", logo: "https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg"),
            Experience(id: 2, title: "Product Designer", company: "CreativeCo", location: "New York, NY", startDate: "2017-06-01", endDate: "2019-12-31", current: false, description: "Designed user interfaces for various client projects.", logo: "https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg")
        ],
        education: [
            Education(id: 1, degree: "Masters in HCI", school: "Stanford University", startDate: "2015-09-01", endDate: "2017-06-01", description: "Focused on human-centered design and interaction.", gpa: "3.9")
        ],
        skills: [
            Skill(id: 1, name: "UI Design", level: 5, category: "Design"),
            Skill(id: 2, name: "Prototyping", level: 4, category: "Design"),
            Skill(id: 3, name: "Swift", level: 3, category: "Engineering")
        ],
        achievements: [
            Achievement(id: 1, title: "Best Mobile App", organization: "Global Design Awards 2023", date: "2023-01-01", type: "Award", description: "Awarded for exceptional user experience design."),
            Achievement(id: 2, title: "Top Mentor", organization: "Design Community 2022", date: "2022-01-01", type: "Recognition", description: "Recognized for contributions to the design mentor program.")
        ]
    )
}
