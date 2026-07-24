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
        
        guard let currentUserId = AuthManager.shared.currentUser?.id.uuidString.lowercased() else {
            await MainActor.run { isLoading = false }
            return
        }
        
        do {
            // Fetch conversations where I am participant 1 OR participant 2
            let response: [Conversation] = try await client
                .from("conversations")
                .select("*, p1_profile:profiles!conversations_participant_1_fkey(*), p2_profile:profiles!conversations_participant_2_fkey(*)")
                .or("participant_1.eq.\(currentUserId),participant_2.eq.\(currentUserId)")
                .order("last_message_at", ascending: false)
                .execute()
                .value
            
            // Fetch the last message for each conversation in parallel
            let rooms = await withTaskGroup(of: ChatRoom?.self) { group in
                for conv in response {
                    group.addTask {
                        let isP1Me = conv.participant1.lowercased() == currentUserId
                        let otherProfile = isP1Me ? conv.p2Profile : conv.p1Profile
                        
                        let lastMsg = await self.fetchLastMessage(for: conv.id)
                        
                        return ChatRoom(
                            id: conv.id,
                            participantName: otherProfile?.name ?? "Unknown",
                            lastMessage: lastMsg ?? "No messages yet",
                            timestamp: conv.lastMessageAt ?? "New",
                            avatarUrl: otherProfile?.avatar,
                            isOnline: false,
                            hasUnread: false // Logic for unread would go here
                        )
                    }
                }
                
                var results: [ChatRoom] = []
                for await room in group {
                    if let room = room {
                        results.append(room)
                    }
                }
                return results.sorted { $0.timestamp > $1.timestamp }
            }
            
            await MainActor.run {
                self.chatRooms = rooms
                self.isLoading = false
            }
        } catch {
            print("❌ Error fetching chat rooms: \(error)")
            await MainActor.run { isLoading = false }
        }
    }
    
    private func fetchLastMessage(for conversationId: String) async -> String? {
        do {
            struct MsgContent: Decodable {
                let content: String
            }
            
            let response: [MsgContent] = try await client
                .from("messages")
                .select("content")
                .eq("conversation_id", value: conversationId)
                .order("created_at", ascending: false)
                .limit(1)
                .execute()
                .value
            
            return response.first?.content
        } catch {
            return nil
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
    
    func deleteConversation(id: String) async throws {
        // Delete the conversation from the DB
        // The messages will be deleted via CASCADE in Supabase if correctly configured,
        // or we might need to delete them manually if not. 
        // For now, assume CASCADE or that we only care about the conversation entry.
        try await client
            .from("conversations")
            .delete()
            .eq("id", value: id)
            .execute()
        
        await MainActor.run {
            // Remove from local list
            self.chatRooms.removeAll { $0.id == id }
        }
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
