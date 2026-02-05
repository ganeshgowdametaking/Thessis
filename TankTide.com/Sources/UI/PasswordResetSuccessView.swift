import SwiftUI

struct PasswordResetSuccessView: View {
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        ZStack {
            // Background
            Theme.stoneBg.ignoresSafeArea()
            
            // Decorative Elements
            VStack {
                HStack {
                    Circle()
                        .fill(Theme.primary.opacity(0.05))
                        .frame(width: 300, height: 300)
                        .blur(radius: 60)
                        .offset(x: -150, y: -150)
                    Spacer()
                }
                Spacer()
                HStack {
                    Spacer()
                    Circle()
                        .fill(Theme.primary.opacity(0.05))
                        .frame(width: 250, height: 250)
                        .blur(radius: 50)
                        .offset(x: 100, y: 100)
                }
            }
            .ignoresSafeArea()
            
            VStack(spacing: 40) {
                Spacer()
                
                // Icon Container
                ZStack {
                    // Ripple Layers
                    Circle()
                        .fill(Theme.primary.opacity(0.1))
                        .frame(width: 160, height: 160)
                        .scaleEffect(1.1)
                    
                    Circle()
                        .fill(Theme.primary.opacity(0.15))
                        .frame(width: 128, height: 128)
                    
                    Image(systemName: "checkmark")
                        .font(.system(size: 64, weight: .bold))
                        .foregroundColor(Theme.primary)
                }
                .shadow(color: Theme.primary.opacity(0.1), radius: 20, x: 0, y: 10)
                
                // Text Content
                VStack(spacing: 12) {
                    Text("Password Updated")
                        .font(.system(size: 32, weight: .black))
                        .foregroundColor(Theme.textMain)
                        .tracking(-0.5)
                    
                    Text("Your password has been successfully reset. Click below to access your account.")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(Theme.textSecondary)
                        .multilineTextAlignment(.center)
                        .lineSpacing(6)
                        .frame(maxWidth: 300)
                }
                
                // Action Button
                Button {
                    // Logic to navigate back to login or dashboard
                    AuthManager.shared.isResettingPassword = false
                    AuthManager.shared.showingResetPassword = false
                    dismiss()
                } label: {
                    Text("Go to Dashboard")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 56)
                        .background(Theme.primary)
                        .cornerRadius(12)
                        .shadow(color: Theme.primary.opacity(0.3), radius: 12, x: 0, y: 6)
                }
                .padding(.horizontal, 32)
                .padding(.top, 16)
                
                Spacer()
                Spacer().frame(height: 40)
            }
            .padding(.horizontal, 24)
        }
        .navigationBarHidden(true)
        .dismissKeyboardOnTap()
    }
}
