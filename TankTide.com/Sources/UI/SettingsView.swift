import SwiftUI
import Supabase
import Auth

struct SettingsView: View {
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        ZStack {
            Theme.stoneBg.ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Header
                headerView
                
                NavigationStack {
                    ScrollView(showsIndicators: false) {
                        VStack(spacing: 32) {
                            // Profile Overview
                            profileOverview
                            
                            // Settings Groups
                            VStack(spacing: 24) {
                                settingsGroup(items: [
                                    ("person", "Account"),
                                    ("shield", "Privacy"),
                                    ("doc.shield", "Cookie Policy"),
                                    ("shield.lefthalf.filled", "GDPR Request"),
                                    ("lock", "Security"),
                                    ("notifications", "Notifications")
                                ])
                                
                                settingsGroup(items: [
                                    ("support_agent", "Help Center"),
                                    ("doc", "Terms of Service")
                                ])
                            }
                            
                            // Logout & Footer
                            VStack(spacing: 16) {
                                Button {
                                    Task {
                                        try? await AuthManager.shared.client.auth.signOut()
                                    }
                                } label: {
                                    HStack {
                                        Image(systemName: "rectangle.portrait.and.arrow.right")
                                        Text("Log Out")
                                            .fontWeight(.bold)
                                    }
                                    .foregroundColor(.red)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 16)
                                    .background(Color.red.opacity(0.05))
                                    .cornerRadius(32)
                                }
                                
                                Text("Version 2.4.0 (Build 102)")
                                    .font(.system(size: 12))
                                    .foregroundColor(Theme.textMuted)
                            }
                            .padding(.horizontal, 24)
                        }
                        .padding(.bottom, 40)
                    }
                }
            }
        }
        .navigationBarHidden(true)
    }
    
    var headerView: some View {
        HStack {
            Button {
                dismiss()
            } label: {
                Image(systemName: "chevron.left")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(Theme.textMain)
                    .frame(width: 44, height: 44)
            }
            
            Spacer()
            
            Text("Settings")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(Theme.textMain)
            
            Spacer()
            
            // Mirror back button for centering
            Rectangle()
                .fill(Color.clear)
                .frame(width: 44, height: 44)
        }
        .padding(.horizontal, 12)
        .padding(.top, 8)
    }
    
    var profileOverview: some View {
        VStack(spacing: 12) {
            ZStack(alignment: .bottomTrailing) {
                Image(systemName: UserProfile.sample.avatar ?? "person.crop.circle.fill")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 100, height: 100)
                    .clipShape(Circle())
                    .overlay(Circle().stroke(Color.white, lineWidth: 4))
                    .shadow(color: Color.black.opacity(0.1), radius: 8, x: 0, y: 4)
                
                Image(systemName: "checkmark.seal.fill")
                    .font(.system(size: 20))
                    .foregroundColor(Theme.primary)
                    .background(Circle().fill(Color.white).padding(2))
                    .offset(x: 2, y: 2)
            }
            
            VStack(spacing: 4) {
                Text(UserProfile.sample.name)
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(Theme.textMain)
                
                Text("jane.doe@sageandstone.com") // Placeholder as per design
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(Theme.textSecondary)
                
                Text("Premium Member")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(Theme.primary)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Theme.primary.opacity(0.1))
                    .cornerRadius(20)
                    .padding(.top, 4)
            }
        }
        .padding(.top, 10)
    }
    
    func settingsGroup(items: [(String, String)]) -> some View {
        VStack(spacing: 0) {
            ForEach(0..<items.count, id: \.self) { index in
                if items[index].1 == "Terms of Service" {
                    NavigationLink(destination: TermsOfServiceView()) {
                        settingsRowContent(icon: items[index].0, title: items[index].1)
                    }
                    .buttonStyle(PlainButtonStyle())
                } else if items[index].1 == "Cookie Policy" {
                    NavigationLink(destination: CookiePolicyView()) {
                        settingsRowContent(icon: items[index].0, title: items[index].1)
                    }
                    .buttonStyle(PlainButtonStyle())
                } else if items[index].1 == "GDPR Request" {
                    NavigationLink(destination: GDPRRequestView()) {
                        settingsRowContent(icon: items[index].0, title: items[index].1)
                    }
                    .buttonStyle(PlainButtonStyle())
                } else {
                    Button { } label: {
                        settingsRowContent(icon: items[index].0, title: items[index].1)
                    }
                }
                
                if index < items.count - 1 {
                    Divider().padding(.leading, 72)
                }
            }
        }
        .background(Color.white)
        .cornerRadius(24)
        .padding(.horizontal, 24)
        .shadow(color: Color.black.opacity(0.02), radius: 10, x: 0, y: 5)
    }
    
    func settingsRowContent(icon: String, title: String) -> some View {
        HStack(spacing: 16) {
            ZStack {
                RoundedRectangle(cornerRadius: 12)
                    .fill(Theme.stoneSurface)
                    .frame(width: 40, height: 40)
                
                // Mapping design icons to SF Symbols
                Image(systemName: mapIcon(icon))
                    .foregroundColor(Theme.textMain)
            }
            
            Text(title)
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(Theme.textMain)
            
            Spacer()
            
            Image(systemName: "chevron.right")
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(Color.gray.opacity(0.3))
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }
    
    // Helper to map material icons to SF Symbols
    func mapIcon(_ name: String) -> String {
        switch name {
        case "person": return "person.fill"
        case "shield": return "shield.fill"
        case "lock": return "lock.fill"
        case "notifications": return "bell.fill"
        case "support_agent": return "headphones"
        case "doc": return "doc.text.fill"
        case "doc.shield": return "checkmark.shield.fill"
        case "shield.lefthalf.filled": return "shield.lefthalf.filled"
        default: return "gearshape.fill"
        }
    }
}
