import Foundation
import Supabase

struct Message: Identifiable, Codable, Equatable {
    let id: String
    let conversationId: String
    let senderId: String
    let content: String
    var isRead: Bool
    let createdAt: String?
    
    // UI Helper
    var isFromMe: Bool { senderId == AuthManager.shared.currentUser?.id.uuidString }
    
    enum CodingKeys: String, CodingKey {
        case id
        case conversationId = "conversation_id"
        case senderId = "sender_id"
        case content
        case isRead = "read"
        case createdAt = "created_at"
    }
}

extension Message {
    static let sarahSamples: [Message] = [
        Message(
            id: "1",
            conversationId: "c1",
            senderId: "other",
            content: "Hi there! I've reviewed the documents you sent over for the sustainable architecture project.",
            isRead: true,
            createdAt: ISO8601DateFormatter().string(from: Date().addingTimeInterval(-3600))
        ),
        Message(
            id: "2",
            conversationId: "c1",
            senderId: "current_user_id_placeholder", // Mock ID
            content: "That's great news! Do you have any initial thoughts on the structural changes?",
            isRead: true,
            createdAt: ISO8601DateFormatter().string(from: Date().addingTimeInterval(-3500))
        ),
        Message(
            id: "3",
            conversationId: "c1",
            senderId: "other",
            content: "The solar integration looks feasible. I'd like to discuss the orientation of the north-facing glass panels tomorrow if you're available?",
            isRead: true,
            createdAt: ISO8601DateFormatter().string(from: Date().addingTimeInterval(-3400))
        ),
        Message(
            id: "4",
            conversationId: "c1",
            senderId: "current_user_id_placeholder",
            content: "Absolutely. Does 10:00 AM work for you?",
            isRead: true,
            createdAt: ISO8601DateFormatter().string(from: Date().addingTimeInterval(-3300))
        )
    ]
}
