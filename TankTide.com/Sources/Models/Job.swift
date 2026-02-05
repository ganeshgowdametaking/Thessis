import Foundation
import SwiftUI

struct Job: Identifiable, Decodable {
    let id: String
    let title: String
    let company: String
    let location: String
    let salary: String? // Made optional
    var type: String // Mapped from job_type
    var workType: String // Mapped from remote_available
    let logo: String? // UI only
    let logoBg: String? // UI only
    var isNew: Bool? // Logic based
    var isUrgent: Bool? // Mapped from urgent_hiring
    
    let about: String // Mapped from description
    let responsibilities: [String]? // Made optional
    let skills: [String]?
    let postedDate: String? // Logic based
    
    // UI Placeholders
    let hiringManagerName: String?
    let hiringManagerTitle: String?
    let hiringManagerImage: String?
    
    // DB Fields
    let createdBy: String?
    let benefits: [String]?
    let experienceLevel: String? // Mapped via experience_level
    let applicationDeadline: String?
    let contactEmail: String?
    let applicationsCount: Int?
    let viewsCount: Int?
    let createdAt: String?
    let status: String?

    enum CodingKeys: String, CodingKey {
        case id, title, company, location, salary
        case type = "job_type"
        case description
        case skills
        case benefits
        case urgentHiring = "urgent_hiring"
        case remoteAvailable = "remote_available"
        case experienceLevel = "experience_level"
        case applicationDeadline = "application_deadline"
        case contactEmail = "contact_email"
        case createdBy = "created_by"
        case status
        case applicationsCount = "applications_count"
        case viewsCount = "views_count"
        case createdAt = "created_at"
        // UI fields that might not be in DB
        case workType = "work_type"
        case logo
        case logoBg = "logo_bg"
        case isNew = "is_new"
        case about
        case responsibilities
        case postedDate = "posted_date"
        case hiringManagerName = "hiring_manager_name"
        case hiringManagerTitle = "hiring_manager_title"
        case hiringManagerImage = "hiring_manager_image"
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        
        id = try container.decode(String.self, forKey: .id)
        title = try container.decode(String.self, forKey: .title)
        company = try container.decode(String.self, forKey: .company)
        location = try container.decode(String.self, forKey: .location)
        
        // Handle mapped fields
        if let dbType = try? container.decode(String.self, forKey: .type) {
            type = dbType
        } else {
            type = "Full-time"
        }
        
        if let dbDesc = try? container.decode(String.self, forKey: .description) {
            about = dbDesc
        } else {
            about = try container.decodeIfPresent(String.self, forKey: .about) ?? "No description available."
        }
        
        // Handle Boolean Logic
        let isRemote = try container.decodeIfPresent(Bool.self, forKey: .remoteAvailable) ?? false
        workType = isRemote ? "Remote" : "On-site"
        
        isUrgent = try container.decodeIfPresent(Bool.self, forKey: .urgentHiring) ?? false
        
        // Handle Optionals with Defaults for UI
        salary = try container.decodeIfPresent(String.self, forKey: .salary) ?? "$100k - $150k"
        logo = try container.decodeIfPresent(String.self, forKey: .logo) ?? "briefcase.fill"
        logoBg = try container.decodeIfPresent(String.self, forKey: .logoBg) ?? "#5F7261" // Theme.primary default
        
        let dbCreated = try container.decodeIfPresent(String.self, forKey: .createdAt)
        createdAt = dbCreated
        
        // Simple "New" logic: if created in last 7 days (mocked for now as true if missing)
        isNew = true 
        postedDate = "Recently"
        
        skills = try container.decodeIfPresent([String].self, forKey: .skills) ?? []
        responsibilities = try container.decodeIfPresent([String].self, forKey: .responsibilities) ?? [
            "Drive product vision and strategy.",
            "Collaborate with cross-functional teams.",
            "Ensure high quality delivery."
        ]
        
        hiringManagerName = try container.decodeIfPresent(String.self, forKey: .hiringManagerName) ?? "HR Team"
        hiringManagerTitle = try container.decodeIfPresent(String.self, forKey: .hiringManagerTitle) ?? "Recruiter"
        hiringManagerImage = try container.decodeIfPresent(String.self, forKey: .hiringManagerImage) ?? "person.crop.circle.fill"
        
        status = try container.decodeIfPresent(String.self, forKey: .status)
        
        // New Fields
        createdBy = try container.decodeIfPresent(String.self, forKey: .createdBy)
        benefits = try container.decodeIfPresent([String].self, forKey: .benefits)
        experienceLevel = try container.decodeIfPresent(String.self, forKey: .experienceLevel)
        applicationDeadline = try container.decodeIfPresent(String.self, forKey: .applicationDeadline)
        contactEmail = try container.decodeIfPresent(String.self, forKey: .contactEmail)
        applicationsCount = try container.decodeIfPresent(Int.self, forKey: .applicationsCount)
        viewsCount = try container.decodeIfPresent(Int.self, forKey: .viewsCount)
    }
    
    // Memberwise initializer for samples
    init(id: String, title: String, company: String, location: String, salary: String?, type: String, workType: String, logo: String?, logoBg: String?, isNew: Bool? = false, isUrgent: Bool? = false, about: String, responsibilities: [String]?, skills: [String]?, postedDate: String?, hiringManagerName: String?, hiringManagerTitle: String?, hiringManagerImage: String?) {
        self.id = id
        self.title = title
        self.company = company
        self.location = location
        self.salary = salary
        self.type = type
        self.workType = workType
        self.logo = logo
        self.logoBg = logoBg
        self.isNew = isNew
        self.isUrgent = isUrgent
        self.about = about
        self.responsibilities = responsibilities
        self.skills = skills
        self.postedDate = postedDate
        self.hiringManagerName = hiringManagerName
        self.hiringManagerTitle = hiringManagerTitle
        self.hiringManagerImage = hiringManagerImage
        self.createdAt = nil
        self.status = "active"
        self.createdBy = nil
        self.benefits = nil
        self.experienceLevel = nil
        self.applicationDeadline = nil
        self.contactEmail = nil
        self.applicationsCount = 0
        self.viewsCount = 0
    }
}

extension Job {
    static let samples: [Job] = [
        Job(
            id: "1",
            title: "Senior Product Designer",
            company: "Stripe",
            location: "San Francisco, CA",
            salary: "$160k - $240k",
            type: "Full-time",
            workType: "Hybrid",
            logo: "creditcard.fill",
            logoBg: "#635bff",
            isNew: true,
            about: "We are looking for a Senior Product Designer...",
            responsibilities: ["Lead design projects", "Mentor juniors"],
            skills: ["Figma", "UX"],
            postedDate: "2 days ago",
            hiringManagerName: "Sarah Connor",
            hiringManagerTitle: "Recruiter",
            hiringManagerImage: "person.crop.circle.fill"
        )
    ]
}
