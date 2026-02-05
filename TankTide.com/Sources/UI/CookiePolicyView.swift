import SwiftUI

struct CookiePolicyView: View {
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        ZStack {
            Theme.stoneBg.ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Header
                headerView
                
                ScrollView(showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 0) {
                        // Intro Section
                        introSection
                        
                        Divider().padding(.horizontal, 20).opacity(0.5)
                        
                        // Main Sections
                        VStack(spacing: 32) {
                            explanationSection(title: "What are Cookies?", content: "Cookies are small text files placed on your device to store data that can be recalled by a web server in the domain that placed the cookie. We use cookies and similar technologies for storing and honoring your preferences and settings, enabling you to sign in, providing interest-based advertising, combating fraud, and analyzing how our products perform.")
                            
                            explanationSection(title: "How We Use Them", content: "We use cookies to understand site usage and to improve the content and offerings on our sites. For example, we may use cookies to personalize your experience at our web pages (e.g., to recognize you by name when you return to our site).")
                            
                            cookieCategoriesSection
                            
                            managePreferencesSection
                            
                            contactBox
                        }
                        .padding(.horizontal, 20)
                        .padding(.top, 24)
                        
                        // Bottom safe area spacer
                        Spacer().frame(height: 50)
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
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(Theme.primary)
                    .frame(width: 44, height: 44)
                    .background(Color.black.opacity(0.05))
                    .clipShape(Circle())
            }
            
            Spacer()
            
            Text("Cookie Policy")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(Theme.textMain)
                .tracking(-0.5)
            
            Spacer()
            
            Button {
                // Share action
            } label: {
                Image(systemName: "square.and.arrow.up")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(Theme.primary)
                    .frame(width: 44, height: 44)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .background(Theme.stoneBg)
        .overlay(
            Divider().opacity(0.5), alignment: .bottom
        )
    }
    
    var introSection: some View {
        Text("At Sage & Stone, we value your privacy. This policy explains how we use cookies to improve your experience and protect your data while you use our services.")
            .font(.system(size: 16))
            .foregroundColor(Theme.textSecondary)
            .lineSpacing(4)
            .padding(24)
    }
    
    func explanationSection(title: String, content: String) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(Theme.primary)
            Text(content)
                .font(.system(size: 14))
                .foregroundColor(Theme.textSecondary)
                .lineSpacing(4)
        }
    }
    
    var cookieCategoriesSection: some View {
        VStack(alignment: .leading, spacing: 20) {
            HStack {
                Text("Cookie Categories")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(Theme.primary)
                Spacer()
                Text("Updated Mar 2024")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(Theme.textMuted)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Theme.stoneSurface)
                    .cornerRadius(20)
            }
            
            VStack(spacing: 16) {
                // Strictly Necessary
                cookieCard(
                    icon: "checkmark.shield.fill",
                    color: Theme.primary,
                    title: "Strictly Necessary",
                    subtitle: "Essential for site function",
                    name: "auth_token",
                    purpose: "Used to authenticate user sessions securely.",
                    duration: "Session (until browser closes)"
                )
                
                // Analytics
                cookieCard(
                    icon: "chart.bar.fill",
                    color: .blue,
                    title: "Analytics",
                    subtitle: "Performance tracking",
                    name: "_ga, _gid",
                    purpose: "Distinguishes users to calculate visitor, session, and campaign data.",
                    duration: "2 years"
                )
                
                // Marketing
                cookieCard(
                    icon: "megaphone.fill",
                    color: .orange,
                    title: "Marketing",
                    subtitle: "Personalized advertising",
                    name: "ads_id",
                    purpose: "Used to deliver relevant advertisements to users.",
                    duration: "6 months"
                )
            }
        }
    }
    
    func cookieCard(icon: String, color: Color, title: String, subtitle: String, name: String, purpose: String, duration: String) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(color.opacity(0.1))
                        .frame(width: 40, height: 40)
                    Image(systemName: icon)
                        .font(.system(size: 18))
                        .foregroundColor(color)
                }
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(Theme.textMain)
                    Text(subtitle)
                        .font(.system(size: 12))
                        .foregroundColor(Theme.textMuted)
                }
            }
            
            VStack(alignment: .leading, spacing: 12) {
                cookieDetailRow(label: "Name", value: name, isCode: true, color: color)
                cookieDetailRow(label: "Purpose", value: purpose)
                cookieDetailRow(label: "Duration", value: duration)
            }
            .padding(.leading, 4)
        }
        .padding(20)
        .background(Color.white)
        .cornerRadius(24)
        .shadow(color: Color.black.opacity(0.04), radius: 10, x: 0, y: 5)
        .overlay(
            RoundedRectangle(cornerRadius: 24)
                .stroke(Color.gray.opacity(0.1), lineWidth: 1)
        )
    }
    
    func cookieDetailRow(label: String, value: String, isCode: Bool = false, color: Color = .primary) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label.uppercased())
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(Theme.textMuted)
                .tracking(1.2)
            
            if isCode {
                Text(value)
                    .font(.system(size: 14, weight: .medium, design: .monospaced))
                    .foregroundColor(color)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(color.opacity(0.05))
                    .cornerRadius(6)
            } else {
                Text(value)
                    .font(.system(size: 14))
                    .foregroundColor(Theme.textSecondary)
            }
        }
    }
    
    var managePreferencesSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Manage Preferences")
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(Theme.primary)
            
            VStack(spacing: 12) {
                preferenceLinkRow(icon: "globe", title: "Manage in Chrome", isExternal: true)
                preferenceLinkRow(icon: "safari.fill", title: "Manage in Safari", isExternal: true)
                preferenceLinkRow(icon: "gearshape.fill", title: "iOS Settings", isExternal: false)
            }
        }
    }
    
    func preferenceLinkRow(icon: String, title: String, isExternal: Bool) -> some View {
        Button {
            // Action to open link or settings
        } label: {
            HStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(Theme.stoneSurface)
                        .frame(width: 32, height: 32)
                    Image(systemName: icon)
                        .font(.system(size: 16))
                        .foregroundColor(Theme.textSecondary)
                }
                
                Text(title)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(Theme.textMain)
                
                Spacer()
                
                Image(systemName: isExternal ? "arrow.up.right" : "chevron.right")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(Theme.textMuted)
            }
            .padding(16)
            .background(Color.white)
            .cornerRadius(16)
            .shadow(color: Color.black.opacity(0.02), radius: 8, x: 0, y: 4)
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(Color.gray.opacity(0.1), lineWidth: 1)
            )
        }
    }
    
    var contactBox: some View {
        VStack(spacing: 16) {
            ZStack {
                Circle()
                    .fill(Theme.primary.opacity(0.1))
                    .frame(width: 50, height: 50)
                Image(systemName: "envelope.fill")
                    .font(.system(size: 20))
                    .foregroundColor(Theme.primary)
            }
            
            VStack(spacing: 8) {
                Text("Still have questions?")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(Theme.textMain)
                Text("Our Data Protection Officer is here to help with any privacy concerns.")
                    .font(.system(size: 14))
                    .foregroundColor(Theme.textSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 20)
            }
            
            Button {
                if let url = URL(string: "mailto:privacy@sageandstone.com") {
                    UIApplication.shared.open(url)
                }
            } label: {
                Text("Contact Privacy Team")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 12)
                    .background(Theme.primary)
                    .cornerRadius(12)
            }
            .padding(.top, 4)
        }
        .padding(32)
        .frame(maxWidth: .infinity)
        .background(Theme.primary.opacity(0.05))
        .cornerRadius(24)
        .padding(.top, 8)
    }
}
