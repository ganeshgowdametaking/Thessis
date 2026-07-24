import Foundation

struct SearchPerson: Identifiable, Codable {
    let id: String
    let name: String
    let title: String
    let company: String
    let avatar: String
    let isOnline: Bool
    let isConnected: Bool
}

struct SearchCompany: Identifiable, Codable {
    let id: String
    let name: String
    let industry: String
    let location: String
    let logo: String
    let followerCount: String
    let isFollowing: Bool
}

extension SearchPerson {
    static let samples: [SearchPerson] = [
        SearchPerson(id: "1", name: "Sarah Jenkins", title: "Senior Product Designer", company: "Stripe", avatar: "person.crop.circle.fill", isOnline: true, isConnected: false),
        SearchPerson(id: "2", name: "David Okonjo", title: "Lead UX Designer", company: "Airbnb", avatar: "person.crop.circle.fill", isOnline: false, isConnected: true),
        SearchPerson(id: "3", name: "Elena Fisher", title: "Product Designer II", company: "Spotify", avatar: "person.crop.circle.fill", isOnline: false, isConnected: false),
        SearchPerson(id: "4", name: "Marcus Chen", title: "UX Researcher", company: "Google", avatar: "person.crop.circle.fill", isOnline: false, isConnected: false),
        SearchPerson(id: "5", name: "Amara Singh", title: "Senior Designer", company: "Notion", avatar: "person.crop.circle.fill", isOnline: true, isConnected: false),
        SearchPerson(id: "6", name: "James Wilson", title: "UI Architect", company: "Figma", avatar: "person.crop.circle.fill", isOnline: true, isConnected: true)
    ]
}

extension SearchCompany {
    static let samples: [SearchCompany] = [
        SearchCompany(id: "1", name: "Stripe", industry: "Financial Services", location: "San Francisco, CA", logo: "creditcard.fill", followerCount: "450k", isFollowing: true),
        SearchCompany(id: "2", name: "Airbnb", industry: "Hospitality", location: "San Francisco, CA", logo: "house.fill", followerCount: "1.2M", isFollowing: false),
        SearchCompany(id: "3", name: "Spotify", industry: "Entertainment", location: "Stockholm, SE", logo: "music.note", followerCount: "890k", isFollowing: false),
        SearchCompany(id: "4", name: "Google", industry: "Technology", location: "Mountain View, CA", logo: "g.circle.fill", followerCount: "10M+", isFollowing: true),
        SearchCompany(id: "5", name: "Notion", industry: "Software", location: "San Francisco, CA", logo: "doc.text.fill", followerCount: "320k", isFollowing: false)
    ]
}
