import Foundation
import Supabase

class ConversationService: ObservableObject {
    static let shared = ConversationService()
    
    @Published var conversations: [Conversation] = []
    @Published var messages: [String: [Message]] = [:] // Map conversationId to messages
    
    private let client = AuthManager.shared.client
    
    func fetchConversations() async {
        guard let userId = AuthManager.shared.currentUser?.id.uuidString else { return }
        
        do {
            let fetchedConversations: [Conversation] = try await client
                .from("conversations")
                .select()
                .or("participant_1.eq.\(userId),participant_2.eq.\(userId)")
                .order("last_message_at", ascending: false)
                .execute()
                .value
            
            await MainActor.run {
                self.conversations = fetchedConversations
            }
        } catch {
            print("Error fetching conversations: \(error)")
        }
    }
    
    func fetchMessages(for conversationId: String) async {
        do {
            let fetchedMessages: [Message] = try await client
                .from("messages")
                .select()
                .eq("conversation_id", value: conversationId)
                .order("created_at", ascending: true)
                .execute()
                .value
            
            await MainActor.run {
                self.messages[conversationId] = fetchedMessages
            }
        } catch {
            print("Error fetching messages: \(error)")
        }
    }
    
    func sendMessage(conversationId: String, content: String) async throws {
        guard let userId = AuthManager.shared.currentUser?.id.uuidString else { return }
        
        let message = Message(
            id: UUID().uuidString,
            conversationId: conversationId,
            senderId: userId,
            content: content,
            isRead: false,
            createdAt: nil
        )
        
        try await client.from("messages").insert(message).execute()
        
        // Update conversation timestamp
        try await client
            .from("conversations")
            .update(["last_message_at": ISO8601DateFormatter().string(from: Date())])
            .eq("id", value: conversationId)
            .execute()
            
        await fetchMessages(for: conversationId)
    }
    
    func createConversation(with userId: String) async throws -> String {
        guard let currentUserId = AuthManager.shared.currentUser?.id.uuidString else { return "" }
        
        // Check if exists
        let existing = conversations.first { 
            ($0.participant1 == currentUserId && $0.participant2 == userId) ||
            ($0.participant1 == userId && $0.participant2 == currentUserId)
        }
        
        if let existing = existing {
            return existing.id
        }
        
        let newConv = Conversation(
            id: UUID().uuidString,
            participant1: currentUserId,
            participant2: userId,
            lastMessageAt: nil,
            createdAt: nil,
            p1Profile: nil,
            p2Profile: nil
        )
        
        try await client.from("conversations").insert(newConv).execute()
        await fetchConversations()
        return newConv.id
    }
}
