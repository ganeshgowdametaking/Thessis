import SwiftUI

struct NotificationRow: View {
    let notification: AppNotification
    
    var body: some View {
        ZStack(alignment: .leading) {
            // Unread Indicator
            if !notification.isRead {
                Rectangle()
                    .fill(Theme.primary)
                    .frame(width: 4)
                    .padding(.vertical, 12)
                    .cornerRadius(2, corners: [.topRight, .bottomRight])
            }
            
            HStack(alignment: .top, spacing: 16) {
                // Icon / Avatar
                ZStack {
                    if let avatar = notification.avatarUrl {
                        Image(systemName: avatar)
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(width: 48, height: 48)
                            .clipShape(Circle())
                            .overlay(Circle().stroke(Color.gray.opacity(0.1), lineWidth: 1))
                        
                        // Small success check for referrals
                        if notification.type == .referral {
                            ZStack {
                                Circle()
                                    .fill(Theme.primary)
                                    .frame(width: 16, height: 16)
                                Image(systemName: "checkmark")
                                    .font(.system(size: 8, weight: .bold))
                                    .foregroundColor(.white)
                            }
                            .offset(x: 18, y: 18)
                        }
                    } else {
                        RoundedRectangle(cornerRadius: 12)
                            .fill(notification.iconBg)
                            .frame(width: 48, height: 48)
                        
                        Image(systemName: notification.icon)
                            .font(.system(size: 20))
                            .foregroundColor(notification.iconColor)
                    }
                }
                
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text(notification.title)
                            .font(.system(size: 16, weight: notification.isRead ? .semibold : .bold))
                            .foregroundColor(Theme.textMain)
                            .lineLimit(2)
                        
                        Spacer()
                        
                        Text(notification.timestamp)
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(Theme.textMuted)
                    }
                    
                    Text(notification.message)
                        .font(.system(size: 14))
                        .foregroundColor(Theme.textSecondary)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                }
                
                if notification.type == .match || notification.type == .warning {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 14))
                        .foregroundColor(Theme.textMuted.opacity(0.5))
                        .padding(.top, 4)
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 16)
            .contentShape(Rectangle()) // Makes the whole row tappable
        }
        .background(Color.white.opacity(notification.isRead ? 0.5 : 1.0))
    }
}
