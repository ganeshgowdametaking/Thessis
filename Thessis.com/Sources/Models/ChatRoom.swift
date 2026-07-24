import Foundation

struct ChatRoom: Identifiable, Codable {
    let id: String
    let participantName: String
    let lastMessage: String
    let timestamp: String
    let avatarUrl: String?
    let isOnline: Bool
    var hasUnread: Bool

    enum CodingKeys: String, CodingKey {
        case id, timestamp
        case participantName = "participant_name"
        case lastMessage = "last_message"
        case avatarUrl = "avatar_url"
        case isOnline = "is_online"
        case hasUnread = "has_unread"
    }
}

extension ChatRoom {
    static let samples: [ChatRoom] = [
        ChatRoom(
            id: "1",
            participantName: "Sarah Jenkins",
            lastMessage: "I've just reviewed the sustainable plan you sent over...",
            timestamp: "2m ago",
            avatarUrl: "person.crop.circle.fill",
            isOnline: true,
            hasUnread: true
        ),
        ChatRoom(
            id: "2",
            participantName: "Marcus Thorne",
            lastMessage: "Looking forward to our meeting on Friday!",
            timestamp: "1h ago",
            avatarUrl: "person.crop.circle.fill",
            isOnline: false,
            hasUnread: false
        ),
        ChatRoom(
            id: "3",
            participantName: "Design Collective",
            lastMessage: "Alex: Let's start the new site audit today.",
            timestamp: "3h ago",
            avatarUrl: "groups",
            isOnline: false,
            hasUnread: false
        ),
        ChatRoom(
            id: "4",
            participantName: "Elena Rodriguez",
            lastMessage: "The portfolio assets are ready for download.",
            timestamp: "Yesterday",
            avatarUrl: "person.crop.circle.fill",
            isOnline: true,
            hasUnread: false
        )
    ]
}
