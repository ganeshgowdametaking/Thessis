import SwiftUI
import Supabase
import Auth

struct ProfileView: View {
    @StateObject private var profileService = ProfileService.shared
    @Environment(\.dismiss) var dismiss
    @State private var showingEditProfile = false
    @State private var liveConnectionCount: Int = 0
    
    var profile: UserProfile {
        profileService.currentUserProfile ?? .sample
    }
    
    var body: some View {
        NavigationStack {
            ZStack {
                Theme.stoneBg.ignoresSafeArea()
                
                VStack(spacing: 0) {
                    // Header bar
                    headerBar
                    
                    if profileService.isLoading && profileService.currentUserProfile == nil {
                        VStack {
                            Spacer()
                            ProgressView("Loading your profile...")
                                .foregroundColor(Theme.textSecondary)
                            Spacer()
                        }
                    } else {
                        ScrollView(showsIndicators: false) {
                            VStack(spacing: 24) {
                                // Profile Header
                                profileHeader
                                
                                // Stats Row
                                statsRow
                                
                                // Action Buttons
                                actionButtons
                                
                                VStack(spacing: 16) {
                                    // Experience Section
                                    experienceSection
                                    
                                    // Education Section
                                    educationSection
                                    
                                    // Skills Section
                                    skillsSection
                                    
                                    // Achievements Section
                                    achievementsSection
                                    
                                    // Sign Out Button
                                    Button {
                                        Task {
                                            try? await AuthManager.shared.client.auth.signOut()
                                        }
                                    } label: {
                                        Text("Sign Out")
                                            .font(.system(size: 14, weight: .bold))
                                            .foregroundColor(.red)
                                            .frame(maxWidth: .infinity)
                                            .frame(height: 50)
                                            .background(Color.red.opacity(0.05))
                                            .cornerRadius(12)
                                    }
                                    .padding(.top, 8)
                                }
                                .padding(.horizontal, 20)
                                
                                // Safe area spacer
                                Spacer().frame(height: 100)
                            }
                        }
                    }
                }
            }
            .sheet(isPresented: $showingEditProfile) {
                EditProfileView()
            }
            .onAppear {
                Task {
                    await profileService.fetchCurrentProfile()
                    if let userId = AuthManager.shared.currentUser?.id.uuidString {
                        let count = await ConnectionService.shared.getConnectionCount(for: userId)
                        await MainActor.run {
                            self.liveConnectionCount = count
                        }
                    }
                }
            }
        }
    }
    
    var headerBar: some View {
        HStack {
            Button {
                // Back action if needed, or just a placeholder for now
            } label: {
                Image(systemName: "arrow.left")
                    .font(.system(size: 20))
                    .foregroundColor(Theme.textMain)
                    .frame(width: 44, height: 44)
            }
            
            Spacer()
            
            Text("Profile")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(Theme.textMain)
            
            Spacer()
            
            NavigationLink(destination: SettingsView()) {
                Image(systemName: "gearshape")
                    .font(.system(size: 20))
                    .foregroundColor(Theme.textMain)
                    .frame(width: 44, height: 44)
            }
        }
        .padding(.horizontal, 12)
        .padding(.top, 8)
    }
    
    var profileHeader: some View {
        VStack(spacing: 16) {
            ZStack(alignment: .bottomTrailing) {
                UserAvatar(avatarString: profile.avatar, size: 110, borderWidth: 4)
                
                Circle()
                    .fill(Color.green)
                    .frame(width: 20, height: 20)
                    .overlay(Circle().stroke(Color.white, lineWidth: 3))
                    .offset(x: -4, y: -4)
            }
            
            VStack(spacing: 4) {
                Text(profile.name)
                    .font(.system(size: 24, weight: .black))
                    .foregroundColor(Theme.textMain)
                
                Text(profile.title ?? "No Title")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(Theme.textSecondary)
                
                HStack(spacing: 4) {
                    Image(systemName: "location.fill")
                        .font(.system(size: 12))
                        .foregroundColor(Theme.primary)
                    Text(profile.location ?? "Unknown Location")
                        .font(.system(size: 14))
                        .foregroundColor(Theme.textSecondary)
                }
                .padding(.top, 2)
            }
        }
        .padding(.top, 10)
    }
    
    var statsRow: some View {
        HStack {
            statItem(value: "\(liveConnectionCount)", label: "Connections")
            divider
            statItem(value: String(format: "%.1f", profile.rating ?? 0.0), label: "Rating", isRating: true)
            divider
            statItem(value: profile.expYears ?? "0yr", label: "Exp")
        }
        .padding(.vertical, 12)
        .padding(.horizontal, 24)
    }
    
    func statItem(value: String, label: String, isRating: Bool = false) -> some View {
        VStack(spacing: 4) {
            HStack(spacing: 4) {
                Text(value)
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(Theme.textMain)
                
                if isRating {
                    Image(systemName: "star.fill")
                        .font(.system(size: 12))
                        .foregroundColor(.orange)
                }
            }
            
            Text(label.uppercased())
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(Theme.textMuted)
                .kerning(1.2)
        }
        .frame(maxWidth: .infinity)
    }
    
    var divider: some View {
        Rectangle()
            .fill(Color.gray.opacity(0.1))
            .frame(width: 1, height: 30)
    }
    
    var actionButtons: some View {
        HStack(spacing: 12) {
            Button { } label: {
                Text("Share Profile")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 48)
                    .background(Theme.primary)
                    .cornerRadius(24)
                    .shadow(color: Theme.primary.opacity(0.2), radius: 8, x: 0, y: 4)
            }
            
            Button {
                showingEditProfile = true
            } label: {
                Text("Edit Profile")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(Theme.textMain)
                    .frame(maxWidth: .infinity)
                    .frame(height: 48)
                    .background(Color.white)
                    .cornerRadius(24)
                    .overlay(RoundedRectangle(cornerRadius: 24).stroke(Color.gray.opacity(0.2), lineWidth: 1))
            }
        }
        .padding(.horizontal, 24)
    }
    
    var experienceSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text("Experience")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(Theme.textMain)
                Spacer()
                Image(systemName: "ellipsis")
                    .foregroundColor(Theme.textMuted)
            }
            
            VStack(alignment: .leading, spacing: 0) {
                ForEach(0..<(profile.experiences?.count ?? 0), id: \.self) { index in
                    if let experiences = profile.experiences {
                        ExperienceRow(experience: experiences[index], isLast: index == experiences.count - 1)
                    }
                }
            }
        }
        .padding(20)
        .background(Color.white)
        .cornerRadius(20)
        .shadow(color: Color.black.opacity(0.02), radius: 10, x: 0, y: 5)
    }
    
    var educationSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Education")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(Theme.textMain)
            
            ForEach(profile.education ?? []) { edu in
                HStack(alignment: .top, spacing: 16) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Theme.primary.opacity(0.1))
                            .frame(width: 48, height: 48)
                        
                        Image(systemName: "graduationcap.fill")
                            .font(.system(size: 20))
                            .foregroundColor(Theme.primary)
                    }
                    
                    VStack(alignment: .leading, spacing: 4) {
                        Text(edu.school)
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(Theme.textMain)
                        
                        Text(edu.degree)
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(Theme.textMain)
                        
                        Text("\(edu.startDate ?? "") - \(edu.endDate ?? "")")
                            .font(.system(size: 12))
                            .foregroundColor(Theme.textSecondary)
                    }
                }
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white)
        .cornerRadius(20)
        .shadow(color: Color.black.opacity(0.02), radius: 10, x: 0, y: 5)
    }
    
    var skillsSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Skills")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(Theme.textMain)
            
            FlowLayout(spacing: 8) {
                ForEach(profile.skills ?? []) { skill in
                    Text(skill.name)
                        .font(.system(size: 13, weight: .semibold))
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                        .background(Theme.stoneBg)
                        .cornerRadius(20)
                        .overlay(RoundedRectangle(cornerRadius: 20).stroke(Color.gray.opacity(0.1), lineWidth: 1))
                }
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white)
        .cornerRadius(20)
        .shadow(color: Color.black.opacity(0.02), radius: 10, x: 0, y: 5)
    }
    
    var achievementsSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Achievements")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(Theme.textMain)
                .padding(.horizontal, 4)
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(profile.achievements ?? []) { achievement in
                        AchievementCard(achievement: achievement)
                    }
                }
                .padding(.bottom, 10)
            }
        }
    }
}
