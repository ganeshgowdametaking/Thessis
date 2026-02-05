import SwiftUI

struct ChatRoomRow: View {
    let chatRoom: ChatRoom
    
    var body: some View {
        HStack(alignment: .center, spacing: 16) {
            // Avatar with Online Status
            ZStack(alignment: .bottomTrailing) {
                UserAvatar(avatarString: chatRoom.participantName == "Design Collective" ? "person.2.fill" : chatRoom.avatarUrl, size: 56)
                
                // Online Status Indicator
                Circle()
                    .fill(chatRoom.isOnline ? Theme.primary : Color.gray.opacity(0.3))
                    .frame(width: 14, height: 14)
                    .overlay(Circle().stroke(Color.white, lineWidth: 2))
            }
            
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(chatRoom.participantName)
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(Theme.textMain)
                    
                    Spacer()
                    
                    Text(chatRoom.timestamp)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(Theme.textMuted)
                }
                
                HStack {
                    Text(chatRoom.lastMessage)
                        .font(.system(size: 14, weight: chatRoom.hasUnread ? .semibold : .medium))
                        .foregroundColor(chatRoom.hasUnread ? Theme.textMain : Theme.textSecondary)
                        .lineLimit(1)
                    
                    if chatRoom.hasUnread {
                        Spacer()
                        Circle()
                            .fill(Theme.primary)
                            .frame(width: 10, height: 10)
                    }
                }
            }
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 14)
        .background(chatRoom.hasUnread ? Theme.primary.opacity(0.05) : Color.clear)
        .cornerRadius(chatRoom.hasUnread ? 16 : 0)
        .padding(.horizontal, chatRoom.hasUnread ? 8 : 0)
    }
}
