import Foundation
import Combine
import Supabase

class ChatService: ObservableObject {
    static let shared = ChatService()
    private let client = AuthManager.shared.client
    
    @Published var chatRooms: [ChatRoom] = []
    @Published var messages: [Message] = []
    @Published var isLoading = false
    
    private init() {}
    
    func fetchChatRooms() async {
        await MainActor.run { isLoading = true }
        
        do {
            // In the mobile app, we might need to use 'conversations' and map them to 'ChatRoom' 
            // if the 'chat_rooms' view is not available or doesn't have all data.
            // But let's try to fetch them like the web version if possible.
            // For now, let's stick to the web's 'conversations' logic for fetching rooms.
            let response: [Conversation] = try await client
                .from("conversations")
                .select("*, p1_profile:profiles!conversations_participant_1_fkey(*), p2_profile:profiles!conversations_participant_2_fkey(*)")
                .execute()
                .value
            
            await MainActor.run {
                // Map conversations to ChatRooms
                self.chatRooms = response.compactMap { conv in
                    let isP1Me = conv.participant1.lowercased() == AuthManager.shared.currentUser?.id.uuidString.lowercased()
                    let otherProfile = isP1Me ? conv.p2Profile : conv.p1Profile
                    
                    return ChatRoom(
                        id: conv.id,
                        participantName: otherProfile?.name ?? "Unknown",
                        lastMessage: "No messages yet", // Would need another join or fetch
                        timestamp: conv.lastMessageAt ?? "Now",
                        avatarUrl: otherProfile?.avatar,
                        isOnline: false,
                        hasUnread: false
                    )
                }
                self.isLoading = false
            }
        } catch {
            print("❌ Error fetching chat rooms: \(error)")
            await MainActor.run { isLoading = false }
        }
    }
    
    func getOrCreateConversation(with otherUserId: String) async throws -> Conversation {
        guard let currentUserId = AuthManager.shared.currentUser?.id.uuidString.lowercased() else {
            throw NSError(domain: "Auth", code: 0, userInfo: [NSLocalizedDescriptionKey: "Not authenticated"])
        }
        
        let targetId = otherUserId.lowercased()
        
        // 1. Check if conversation exists
        let existing: [Conversation] = try await client
            .from("conversations")
            .select("*, p1_profile:profiles!conversations_participant_1_fkey(*), p2_profile:profiles!conversations_participant_2_fkey(*)")
            .or("and(participant_1.eq.\(currentUserId),participant_2.eq.\(targetId)),and(participant_1.eq.\(targetId),participant_2.eq.\(currentUserId))")
            .execute()
            .value
        
        if let first = existing.first {
            return first
        }
        
        // 2. Create new one
        let _: Bool = try await client
            .from("conversations")
            .insert(["participant_1": currentUserId, "participant_2": targetId])
            .execute()
            .value
            
        // Fetch it again to get the profiles and ID
        return try await getOrCreateConversation(with: otherUserId)
    }
    
    func fetchMessages(for conversationId: String) async {
        do {
            let response: [Message] = try await client
                .from("messages")
                .select()
                .eq("conversation_id", value: conversationId)
                .order("created_at", ascending: true)
                .execute()
                .value
            
            await MainActor.run {
                self.messages = response
            }
        } catch {
            print("❌ Error fetching messages: \(error)")
        }
    }
    
    func sendMessage(to conversationId: String, content: String) async throws {
        guard let currentUserId = AuthManager.shared.currentUser?.id.uuidString.lowercased() else { return }
        
        let messageData: [String: AnyEncodable] = [
            "conversation_id": AnyEncodable(conversationId),
            "sender_id": AnyEncodable(currentUserId),
            "content": AnyEncodable(content)
        ]
        
        try await client
            .from("messages")
            .insert(messageData)
            .execute()
        
        // Update last_message_at in conversation
        try await client
            .from("conversations")
            .update(["last_message_at": AnyEncodable(ISO8601DateFormatter().string(from: Date()))])
            .eq("id", value: conversationId)
            .execute()
            
        await fetchMessages(for: conversationId)
    }
}

// Helper for dynamic dictionary insertion with Supabase
struct AnyEncodable: Encodable {
    private let _encode: (Encoder) throws -> Void
    init<T: Encodable>(_ value: T) {
        _encode = value.encode
    }
    func encode(to encoder: Encoder) throws {
        try _encode(encoder)
    }
}
