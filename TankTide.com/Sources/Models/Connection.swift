import Foundation

struct Connection: Identifiable, Codable, Equatable {
    let id: String?
    let requesterId: String
    let addresseeId: String
    let status: String // 'pending', 'accepted', 'rejected'
    let createdAt: String?
    let updatedAt: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case requesterId = "requester_id"
        case addresseeId = "addressee_id"
        case status
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}
