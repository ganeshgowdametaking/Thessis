import SwiftUI

struct CheckEmailView: View {
    @Environment(\.dismiss) var dismiss
    @State private var showingResetPassword = false
    
    var body: some View {
        ZStack {
            // Background
            Theme.stoneBg.ignoresSafeArea()
            
            // Subtle Top Gradient
            VStack {
                LinearGradient(
                    gradient: Gradient(colors: [Color.white.opacity(0.4), Color.clear]),
                    startPoint: .top,
                    endPoint: .bottom
                )
                .frame(height: 200)
                Spacer()
            }
            .ignoresSafeArea()
            
            VStack(spacing: 0) {
                Spacer()
                
                VStack(spacing: 32) {
                    // Hero Icon
                    ZStack {
                        // Outer Glow
                        Circle()
                            .fill(Theme.primary.opacity(0.15))
                            .frame(width: 140, height: 140)
                            .blur(radius: 20)
                        
                        // Icon Container
                        ZStack {
                            Circle()
                                .fill(Theme.primary.opacity(0.1))
                                .frame(width: 112, height: 112)
                                .overlay(
                                    Circle()
                                        .stroke(Theme.primary.opacity(0.1), lineWidth: 1)
                                )
                            
                            Image(systemName: "envelope.fill")
                                .font(.system(size: 48))
                                .foregroundColor(Theme.primary)
                                .symbolRenderingMode(.hierarchical)
                        }
                    }
                    
                    // Typography
                    VStack(spacing: 12) {
                        Text("Check your email")
                            .font(.system(size: 32, weight: .bold))
                            .foregroundColor(Theme.textMain)
                            .tracking(-0.5)
                        
                        Text("We have sent password recovery instructions to your email.")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(Theme.textSecondary)
                            .multilineTextAlignment(.center)
                            .lineSpacing(4)
                            .frame(maxWidth: 280)
                    }
                    
                    // Primary Action
                    Button {
                        openEmailApp()
                        // For demonstration, also allow navigating to Reset
                        showingResetPassword = true
                    } label: {
                        Text("Open Email App")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 56)
                            .background(Theme.primary)
                            .cornerRadius(12)
                            .shadow(color: Theme.primary.opacity(0.3), radius: 12, x: 0, y: 6)
                    }
                    .fullScreenCover(isPresented: $showingResetPassword) {
                        ResetPasswordView()
                    }
                    
                    // Secondary Actions
                    VStack(spacing: 24) {
                        VStack(spacing: 8) {
                            Text("Did not receive the email?")
                                .font(.system(size: 14))
                                .foregroundColor(Theme.textMuted)
                            Text("Check your spam filter.")
                                .font(.system(size: 14))
                                .foregroundColor(Theme.textMuted)
                            
                            Button {
                                // Resend action
                            } label: {
                                Text("Resend email")
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundColor(Theme.primary)
                                    .padding(.horizontal, 16)
                                    .padding(.vertical, 8)
                                    .background(Theme.primary.opacity(0.05))
                                    .cornerRadius(8)
                            }
                            .padding(.top, 4)
                        }
                        
                        Button {
                            dismiss()
                        } label: {
                            HStack(spacing: 8) {
                                Image(systemName: "arrow.left")
                                    .font(.system(size: 14, weight: .bold))
                                Text("Back to log in")
                                    .font(.system(size: 14, weight: .bold))
                            }
                            .foregroundColor(Theme.textMuted)
                        }
                    }
                    .padding(.top, 8)
                }
                .padding(.horizontal, 32)
                
                Spacer()
                
                // Bottom Spacer
                Spacer().frame(height: 48)
            }
        }
        .navigationBarHidden(true)
        .dismissKeyboardOnTap()
    }
    
    func openEmailApp() {
        if let mailURL = URL(string: "message://"), UIApplication.shared.canOpenURL(mailURL) {
            UIApplication.shared.open(mailURL)
        } else if let gmailURL = URL(string: "googlegmail://"), UIApplication.shared.canOpenURL(gmailURL) {
            UIApplication.shared.open(gmailURL)
        } else if let outlookURL = URL(string: "ms-outlook://"), UIApplication.shared.canOpenURL(outlookURL) {
            UIApplication.shared.open(outlookURL)
        } else if let defaultURL = URL(string: "mailto:"), UIApplication.shared.canOpenURL(defaultURL) {
            UIApplication.shared.open(defaultURL)
        }
    }
}
