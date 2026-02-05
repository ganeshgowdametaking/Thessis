import SwiftUI

struct OtherProfileView: View {
    @State private var person: UserProfile
    
    init(person: UserProfile) {
        _person = State(initialValue: person)
    }
    @Environment(\.dismiss) var dismiss
    @StateObject private var connectionService = ConnectionService.shared
    @State private var connectionStatus: ConnectionService.ConnectionStatus = .none
    @State private var connectionId: String?
    @State private var selectedTab = 0
    @State private var activeConversation: Conversation?
    @State private var navigateToChat = false
    @State private var showingCopyToast = false
    
    var body: some View {
        ZStack {
            Theme.stoneBg.ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Custom Header with Back button
                headerBar
                
                if showingCopyToast {
                    VStack {
                        HStack(spacing: 8) {
                            Image(systemName: "doc.on.doc.fill")
                                .foregroundColor(.white)
                            Text("Link copied to clipboard!")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(.white)
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                        .background(Theme.primary)
                        .cornerRadius(20)
                        .shadow(color: Theme.primary.opacity(0.3), radius: 10, x: 0, y: 5)
                    }
                    .transition(.move(edge: .top).combined(with: .opacity))
                    .zIndex(100)
                    .padding(.top, 8)
                }
                
                ScrollView(showsIndicators: false) {
                    VStack(spacing: 0) {
                        // User Identity Section
                        identitySection
                        
                        // Action Buttons
                        actionButtons
                        
                        // Sticky Tabs
                        tabView
                        
                        // Tab Content
                        VStack(spacing: 24) {
                            if selectedTab == 0 {
                                aboutTabContent
                            } else if selectedTab == 1 {
                                experienceTabContent
                            } else {
                                skillsTabContent
                            }
                        }
                        .padding(.horizontal, 20)
                        .padding(.top, 24)
                        
                        // Safe area spacer
                        Spacer().frame(height: 100)
                    }
                }
            }
        }
        .navigationBarHidden(true)
        .onAppear {
            Task {
                await connectionService.fetchConnections()
                updateConnectionStatus()
                
                // Fetch full profile to get experiences, education, etc.
                if let fullProfile = await ProfileService.shared.getProfile(id: person.id) {
                    await MainActor.run {
                        self.person = fullProfile
                    }
                }
            }
        }
        .onChange(of: connectionService.allConnections) { _ in
            updateConnectionStatus()
        }
    }
    
    func updateConnectionStatus() {
        let result = connectionService.checkConnectionStatus(with: person.id)
        connectionStatus = result.status
        connectionId = result.connectionId
    }
    
    var headerBar: some View {
        HStack {
            Button {
                dismiss()
            } label: {
                Image(systemName: "arrow.left")
                    .font(.system(size: 20))
                    .foregroundColor(Theme.textMain)
                    .frame(width: 44, height: 44)
                    .background(Color.white)
                    .clipShape(Circle())
                    .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
            }
            
            Spacer()
            
            Menu {
                Button {
                    let profileLink = "https://tanktide.com/profile/\(person.id)"
                    UIPasteboard.general.string = profileLink
                    withAnimation(.spring()) {
                        showingCopyToast = true
                    }
                    // Hide toast after 2 seconds
                    DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                        withAnimation {
                            showingCopyToast = false
                        }
                    }
                } label: {
                    Label("Share Profile", systemImage: "square.and.arrow.up")
                }
            } label: {
                Image(systemName: "ellipsis")
                    .font(.system(size: 20))
                    .foregroundColor(Theme.textMain)
                    .frame(width: 44, height: 44)
                    .background(Color.white)
                    .clipShape(Circle())
                    .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
            }
        }
        .padding(.horizontal, 20)
        .padding(.top, 8)
    }
    
    var identitySection: some View {
        HStack(spacing: 20) {
            ZStack(alignment: .bottomTrailing) {
                UserAvatar(avatarString: person.avatar, size: 90)
                
//                if person.isOnline {
//                    Circle()
//                        .fill(Color.green)
//                        .frame(width: 18, height: 18)
//                        .overlay(Circle().stroke(Color.white, lineWidth: 2))
//                }
            }
            
            VStack(alignment: .leading, spacing: 4) {
                Text(person.name)
                    .font(.system(size: 24, weight: .black))
                    .foregroundColor(Theme.textMain)
                
                Text(person.title ?? "")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(Theme.textSecondary)
                
                HStack(spacing: 4) {
                    Image(systemName: "group")
                        .font(.system(size: 12))
                        .foregroundColor(Theme.primary)
                    Text("\(person.connectionsCount ?? 0) Connections")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(Theme.primary)
                }
                .padding(.top, 2)
            }
            Spacer()
        }
        .padding(.horizontal, 20)
        .padding(.top, 20)
    }
    
    var actionButtons: some View {
        HStack(spacing: 12) {
            // Dynamic Connect Button
            Button {
                Task {
                    let previousStatus = connectionStatus
                    let previousId = connectionId
                    
                    do {
                        if connectionStatus == .none {
                            withAnimation { connectionStatus = .pendingSent }
                            try await connectionService.sendRequest(to: person.id)
                        } else if connectionStatus == .pendingSent, let id = connectionId {
                            withAnimation { connectionStatus = .none }
                            try await connectionService.cancelRequest(id)
                        } else if connectionStatus == .pendingReceived, let id = connectionId {
                            withAnimation { connectionStatus = .connected }
                            try await connectionService.updateStatus(id, status: "accepted")
                        }
                    } catch {
                        // Rollback on error
                        print("❌ OtherProfileView: Connection action failed, rolling back status")
                        withAnimation {
                            connectionStatus = previousStatus
                            connectionId = previousId
                        }
                    }
                }
            } label: {
                Group {
                    if connectionStatus == .connected {
                        Text("Connected")
                            .transition(.opacity)
                    } else if connectionStatus == .pendingSent {
                        Text("Cancel Request")
                            .transition(.opacity)
                    } else if connectionStatus == .pendingReceived {
                        Text("Accept Request")
                            .transition(.opacity)
                    } else {
                        Text("Connect")
                            .transition(.opacity)
                    }
                }
                .font(.system(size: 15, weight: .bold))
                .foregroundColor(connectionStatus == .connected ? Theme.textMain : .white)
                .frame(maxWidth: .infinity)
                .frame(height: 48)
                .background(connectionStatus == .connected ? Color.gray.opacity(0.1) : (connectionStatus == .pendingSent ? Color.red.opacity(0.8) : Theme.primary))
                .cornerRadius(24)
                .shadow(color: connectionStatus == .connected ? Color.clear : (connectionStatus == .pendingSent ? Color.red.opacity(0.2) : Theme.primary.opacity(0.2)), radius: 8, x: 0, y: 4)
                .animation(.spring(), value: connectionStatus)
            }
            .disabled(connectionStatus == .connected)
            
            Button {
                Task {
                    do {
                        let conversation = try await ChatService.shared.getOrCreateConversation(with: person.id)
                        await MainActor.run {
                            activeConversation = conversation
                            navigateToChat = true
                        }
                    } catch {
                        print("❌ OtherProfileView: Failed to start chat: \(error)")
                    }
                }
            } label: {
                Text("Message")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(Theme.textMain)
                    .frame(maxWidth: .infinity)
                    .frame(height: 48)
                    .background(Color.white)
                    .cornerRadius(24)
                    .overlay(RoundedRectangle(cornerRadius: 24).stroke(Color.gray.opacity(0.2), lineWidth: 1))
            }
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 24)
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
    
    var tabView: some View {
        let tabs = ["About", "Experience", "Skills"]
        return VStack(spacing: 0) {
            HStack(spacing: 0) {
                ForEach(0..<tabs.count, id: \.self) { index in
                    let tab = tabs[index]
                    Button {
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                            selectedTab = index
                        }
                    } label: {
                        VStack(spacing: 12) {
                            Text(tab)
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(selectedTab == index ? Theme.textMain : Theme.textSecondary)
                            
                            Rectangle()
                                .fill(selectedTab == index ? Theme.primary : Color.clear)
                                .frame(height: 3)
                        }
                    }
                    .frame(maxWidth: .infinity)
                }
            }
            Divider()
        }
        .background(Theme.stoneBg)
    }
    
    // MARK: - Tab Contents
    
    var aboutTabContent: some View {
        VStack(alignment: .leading, spacing: 24) {
            // Bio Section
            VStack(alignment: .leading, spacing: 12) {
                Text("Bio")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(Theme.textMain)
                
                Text(person.bio ?? "No bio provided yet.")
                    .font(.system(size: 15))
                    .foregroundColor(Theme.textSecondary)
                    .lineSpacing(6)
            }
            
            // Education Section
            VStack(alignment: .leading, spacing: 16) {
                Text("Education")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(Theme.textMain)
                
                VStack(spacing: 12) {
                    ForEach(person.education ?? []) { edu in
                        educationCard(school: edu.school, degree: edu.degree, period: "\(edu.startDate ?? "") - \(edu.endDate ?? "")", logo: "graduationcap.fill")
                    }
                }
            }
            
            // Achievements Section
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    Text("Achievements")
                        .font(.system(size: 20, weight: .bold))
                        .foregroundColor(Theme.textMain)
                    Spacer()
                    Button("View all") { }
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(Theme.primary)
                }
                
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(person.achievements ?? []) { achievement in
                            AchievementCard(achievement: achievement)
                        }
                    }
                }
            }
        }
    }
    
    var experienceTabContent: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Experience")
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(Theme.textMain)
            
            VStack(spacing: 0) {
                ForEach(Array((person.experiences ?? []).enumerated()), id: \.element.id) { index, exp in
                    ExperienceRow(experience: exp, isLast: index == (person.experiences?.count ?? 0) - 1)
                }
            }
        }
    }
    
    var skillsTabContent: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Skills")
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(Theme.textMain)
            
            FlowLayout(spacing: 8) {
                ForEach(person.skills ?? []) { skill in
                    Text(skill.name)
                        .font(.system(size: 13, weight: .semibold))
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                        .background(Color.white)
                        .cornerRadius(20)
                        .overlay(RoundedRectangle(cornerRadius: 20).stroke(Color.gray.opacity(0.1), lineWidth: 1))
                        .shadow(color: Color.black.opacity(0.02), radius: 4, x: 0, y: 2)
                }
            }
        }
    }
    
    func educationCard(school: String, degree: String, period: String, logo: String) -> some View {
        HStack(alignment: .top, spacing: 16) {
            ZStack {
                RoundedRectangle(cornerRadius: 12)
                    .fill(Theme.stoneSurface)
                    .frame(width: 48, height: 48)
                
                Image(systemName: logo)
                    .font(.system(size: 20))
                    .foregroundColor(Theme.textMuted)
            }
            
            VStack(alignment: .leading, spacing: 2) {
                Text(school)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(Theme.textMain)
                Text(degree)
                    .font(.system(size: 14))
                    .foregroundColor(Theme.textSecondary)
                Text(period)
                    .font(.system(size: 12))
                    .foregroundColor(Theme.textMuted)
                    .padding(.top, 2)
            }
            Spacer()
        }
        .padding(16)
        .background(Color.white)
        .cornerRadius(20)
        .shadow(color: Color.black.opacity(0.04), radius: 8, x: 0, y: 4)
    }
}
