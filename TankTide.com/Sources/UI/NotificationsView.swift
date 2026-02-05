import SwiftUI

struct NotificationsView: View {
    @StateObject private var notificationService = NotificationService.shared
    @State private var selectedTab = "All"
    let tabs = ["All", "Unread", "Referrals", "System"]
    
    var notifications: [AppNotification] {
        notificationService.notifications.isEmpty ? AppNotification.samples : notificationService.notifications
    }
    
    var body: some View {
        ZStack {
            Theme.stoneBg.ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Header
                headerView
                
                // Tabs
                tabsView
                
                ScrollView(showsIndicators: false) {
                    if notificationService.isLoading && notificationService.notifications.isEmpty {
                        ProgressView()
                            .padding(.top, 40)
                    } else {
                        VStack(alignment: .leading, spacing: 0) {
                            sectionHeader(title: "Today")
                            
                            VStack(spacing: 0) {
                                ForEach(notifications.prefix(2)) { notification in
                                    NotificationRow(notification: notification)
                                    if notification.id != notifications.prefix(2).last?.id {
                                        Divider().padding(.leading, 84)
                                    }
                                }
                            }
                            .background(Color.white)
                            
                            sectionHeader(title: "Yesterday")
                                .padding(.top, 8)
                            
                            VStack(spacing: 0) {
                                ForEach(notifications.suffix(3)) { notification in
                                    NotificationRow(notification: notification)
                                    if notification.id != notifications.suffix(3).last?.id {
                                        Divider().padding(.leading, 84)
                                    }
                                }
                            }
                            .background(Color.white)
                            
                            // Bottom safe area spacer
                            Spacer().frame(height: 100)
                        }
                    }
                }
            }
            .onAppear {
                Task {
                    await notificationService.fetchNotifications()
                }
            }
        }
    }
    
    var headerView: some View {
        HStack {
            Text("Notifications")
                .font(.system(size: 28, weight: .black))
                .foregroundColor(Theme.textMain)
            
            Spacer()
            
            Button {
                // Mark all read action
            } label: {
                Image(systemName: "checkmark.circle.badge.checkmark")
                    .font(.system(size: 20))
                    .foregroundColor(Theme.primary)
                    .frame(width: 44, height: 44)
                    .background(Color.white)
                    .clipShape(Circle())
                    .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
            }
        }
        .padding(.horizontal, 20)
        .padding(.top, 24)
        .padding(.bottom, 16)
        .background(Theme.stoneBg)
    }
    
    var tabsView: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 24) {
                ForEach(tabs, id: \.self) { tab in
                    Button {
                        withAnimation(.spring()) {
                            selectedTab = tab
                        }
                    } label: {
                        VStack(spacing: 12) {
                            Text(tab)
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(selectedTab == tab ? Theme.textMain : Theme.textMuted)
                            
                            Rectangle()
                                .fill(selectedTab == tab ? Theme.primary : Color.clear)
                                .frame(height: 3)
                                .cornerRadius(1.5)
                        }
                    }
                }
            }
            .padding(.horizontal, 24)
        }
        .background(Theme.stoneBg)
        .overlay(
            Rectangle()
                .fill(Color.gray.opacity(0.1))
                .frame(height: 1)
                .offset(y: 22),
            alignment: .bottom
        )
    }
    
    func sectionHeader(title: String) -> some View {
        Text(title.uppercased())
            .font(.system(size: 12, weight: .bold))
            .foregroundColor(Theme.textMuted)
            .kerning(1.2)
            .padding(.horizontal, 24)
            .padding(.vertical, 16)
    }
}
