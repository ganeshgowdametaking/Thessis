import SwiftUI
import Supabase
import Foundation

struct SearchResultPersonRow: View {
    let person: UserProfile
    @ObservedObject private var connectionService = ConnectionService.shared
    @State private var localStatus: ConnectionService.ConnectionStatus? = nil
    @State private var activeConversation: Conversation?
    @State private var navigateToChat = false
    
    var body: some View {
        let connectionInfo = connectionService.checkConnectionStatus(with: person.id)
        let currentStatus = localStatus ?? connectionInfo.status
        
        NavigationLink(destination: OtherProfileView(person: person)) {
            HStack(spacing: 16) {
                // Avatar with Online Status
                ZStack(alignment: .bottomTrailing) {
                    UserAvatar(avatarString: person.avatar, size: 56)
                }
                
                // Text Info
                VStack(alignment: .leading, spacing: 2) {
                    Text(person.name)
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(Theme.textMain)
                    
                    if let title = person.title, !title.isEmpty {
                        Text(title)
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(Theme.textSecondary)
                    }
                    
                    if let company = person.company, !company.isEmpty {
                        HStack(spacing: 4) {
                            Image(systemName: "building.2.fill")
                                .font(.system(size: 12))
                                .foregroundColor(Theme.primary)
                            Text(company)
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(Theme.primary)
                        }
                        .padding(.top, 2)
                    }
                }
                .lineLimit(1)
                
                Spacer()
                
                // Action Button
                Button {
                    Task {
                        if currentStatus == .connected {
                            do {
                                let conversation = try await ChatService.shared.getOrCreateConversation(with: person.id)
                                await MainActor.run {
                                    activeConversation = conversation
                                    navigateToChat = true
                                }
                            } catch {
                                print("❌ SearchResultPersonRow: Failed to start chat: \(error)")
                            }
                        } else {
                            let previousStatus = currentStatus
                            do {
                                if currentStatus == .none {
                                    withAnimation { localStatus = .pendingSent }
                                    try await connectionService.sendRequest(to: person.id)
                                    localStatus = nil
                                } else if currentStatus == .pendingSent, let id = connectionInfo.connectionId {
                                    withAnimation { localStatus = .none }
                                    try await connectionService.cancelRequest(id)
                                    localStatus = nil
                                } else if currentStatus == .pendingReceived, let id = connectionInfo.connectionId {
                                    withAnimation { localStatus = .connected }
                                    try await connectionService.updateStatus(id, status: "accepted")
                                    localStatus = nil
                                }
                            } catch {
                                print("❌ SearchResultPersonRow: Action failed: \(error)")
                                withAnimation { localStatus = previousStatus }
                            }
                        }
                    }
                } label: {
                    Text(currentStatus == .connected ? "Message" : (currentStatus == .pendingSent ? "Cancel" : "Connect"))
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(currentStatus == .connected ? Theme.primary : .white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(currentStatus == .connected ? Color.clear : (currentStatus == .pendingSent ? Color.red.opacity(0.8) : Theme.primary))
                        .cornerRadius(20)
                        .overlay(
                            RoundedRectangle(cornerRadius: 20)
                                .stroke(Theme.primary, lineWidth: currentStatus == .connected ? 1 : 0)
                        )
                }
            }
            .padding(16)
            .background(Color.white)
            .cornerRadius(20)
            .shadow(color: Color.black.opacity(0.04), radius: 10, x: 0, y: 5)
        }
        .buttonStyle(PlainButtonStyle())
        .background(
            Group {
                if let conversation = activeConversation {
                    NavigationLink(destination: ChatView(conversationId: conversation.id, participantName: person.name, participantAvatar: person.avatar ?? "person.fill"), isActive: $navigateToChat) {
                        EmptyView()
                    }
                }
            }
        )
    }
}

struct UserAvatar: View {
    let avatarString: String?
    let size: CGFloat
    var borderWidth: CGFloat = 2
    
    private var imageURL: URL? {
        guard let avatar = avatarString, !avatar.isEmpty else { return nil }
        if avatar.starts(with: "http") || avatar.starts(with: "data:") {
            return URL(string: avatar)
        } else if avatar.contains("/") || avatar.contains(".") {
            // Likely a Supabase path, though web version usually uses Base64
            // We can try to resolve it via AuthManager if needed, but for now 
            // the main issue is web profiles which use Base64.
            return try? AuthManager.shared.client.storage
                .from("avatars")
                .getPublicURL(path: avatar)
        }
        return nil
    }
    
    var body: some View {
        Group {
            if let url = imageURL {
                if url.scheme == "data" {
                    if let data = try? Data(contentsOf: url), let uiImage = UIImage(data: data) {
                        Image(uiImage: uiImage)
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } else {
                        placeholderBody
                    }
                } else {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .empty:
                            ProgressView()
                        case .success(let image):
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                        case .failure:
                            placeholderBody
                        @unknown default:
                            placeholderBody
                        }
                    }
                }
            } else if let avatar = avatarString, !avatar.isEmpty, UIImage(systemName: avatar) != nil {
                // If it's a valid SF Symbol name
                Image(systemName: avatar)
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .foregroundColor(Theme.stoneSurface)
                    .padding(size * 0.2)
            } else {
                placeholderBody
            }
        }
        .frame(width: size, height: size)
        .background(Theme.stoneBg)
        .clipShape(Circle())
        .overlay(Circle().stroke(Color.white, lineWidth: borderWidth))
    }
    
    private var placeholderBody: some View {
        Image(systemName: "person.crop.circle.fill")
            .resizable()
            .aspectRatio(contentMode: .fit)
            .foregroundColor(Theme.stoneSurface)
    }
}
