import Foundation

struct Conversation: Identifiable, Codable {
    let id: String
    let participant1: String
    let participant2: String
    let lastMessageAt: String?
    let createdAt: String?
    
    // Optional: Include participant profiles if joined
    let p1Profile: UserProfile?
    let p2Profile: UserProfile?
    
    enum CodingKeys: String, CodingKey {
        case id
        case participant1 = "participant_1"
        case participant2 = "participant_2"
        case lastMessageAt = "last_message_at"
        case createdAt = "created_at"
        case p1Profile = "p1_profile" // Expecting join
        case p2Profile = "p2_profile" // Expecting join
    }
}
