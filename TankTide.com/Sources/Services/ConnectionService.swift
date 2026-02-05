import Foundation
import Supabase
import Combine

class ConnectionService: ObservableObject {
    static let shared = ConnectionService()
    
    @Published var connections: [Connection] = []
    @Published var pendingRequests: [Connection] = []
    
    enum ConnectionStatus {
        case none
        case pendingSent
        case pendingReceived
        case connected
    }
    
    private let client = AuthManager.shared.client
    
    @Published var allConnections: [Connection] = [] // Store all for status checking
    
    func fetchConnections() async {
        guard let userId = AuthManager.shared.currentUser?.id.uuidString.lowercased() else { return }
        
        do {
            let fetchedConnections: [Connection] = try await client
                .from("connections")
                .select()
                .or("requester_id.eq.\(userId),addressee_id.eq.\(userId)")
                .execute()
                .value
            
            await MainActor.run {
                self.allConnections = fetchedConnections
                self.connections = fetchedConnections.filter { $0.status == "accepted" }
                self.pendingRequests = fetchedConnections.filter { $0.status == "pending" && $0.addresseeId == userId }
            }
        } catch {
            print("Error fetching connections: \(error)")
        }
    }
    
    func checkConnectionStatus(with targetUserId: String) -> (status: ConnectionStatus, connectionId: String?) {
        guard let currentUserId = AuthManager.shared.currentUser?.id.uuidString.lowercased() else { return (.none, nil) }
        let targetId = targetUserId.lowercased()
        
        if let connection = allConnections.first(where: {
            ($0.requesterId.lowercased() == currentUserId && $0.addresseeId.lowercased() == targetId) ||
            ($0.requesterId.lowercased() == targetId && $0.addresseeId.lowercased() == currentUserId)
        }) {
            if connection.status == "accepted" {
                return (.connected, connection.id)
            } else if connection.status == "pending" {
                if connection.requesterId == currentUserId {
                    return (.pendingSent, connection.id)
                } else {
                    return (.pendingReceived, connection.id)
                }
            }
        }
        
        return (.none, nil)
    }
    
    func sendRequest(to userId: String) async throws {
        guard let currentUserId = AuthManager.shared.currentUser?.id.uuidString.lowercased() else {
            print("❌ ConnectionService: No current user authenticated")
            return
        }
        
        let requestData: [String: String] = [
            "requester_id": currentUserId,
            "addressee_id": userId,
            "status": "pending"
        ]
        
        do {
            let response: Connection = try await client
                .from("connections")
                .insert(requestData)
                .select()
                .single()
                .execute()
                .value
            
            await MainActor.run {
                // Add to local state immediately to avoid re-fetch race conditions
                if !self.allConnections.contains(where: { $0.id == response.id }) {
                    self.allConnections.append(response)
                    self.updateLocalCachedStates()
                }
            }
            print("✅ ConnectionService: Request sent and state updated locally")
        } catch {
            print("❌ ConnectionService: Failed to send request: \(error)")
            throw error
        }
    }
    
    func cancelRequest(_ connectionId: String) async throws {
        do {
            try await client
                .from("connections")
                .delete()
                .eq("id", value: connectionId)
                .execute()
            
            await MainActor.run {
                // Remove from local state immediately
                self.allConnections.removeAll(where: { $0.id == connectionId })
                self.updateLocalCachedStates()
            }
            print("✅ ConnectionService: Request cancelled and removed locally")
        } catch {
            print("❌ ConnectionService: Failed to cancel request: \(error)")
            throw error
        }
    }
    
    private func updateLocalCachedStates() {
        guard let userId = AuthManager.shared.currentUser?.id.uuidString.lowercased() else { return }
        self.connections = allConnections.filter { $0.status == "accepted" }
        self.pendingRequests = allConnections.filter { $0.status == "pending" && $0.addresseeId.lowercased() == userId }
    }
    
    func updateStatus(_ connectionId: String, status: String) async throws {
        try await client
            .from("connections")
            .update(["status": status])
            .eq("id", value: connectionId)
            .execute()
        
        await fetchConnections()
    }
}
