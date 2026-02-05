import SwiftUI

struct ForgotPasswordView: View {
    @Environment(\.dismiss) var dismiss
    @State private var email: String = ""
    @State private var showingCheckEmail = false
    @State private var isLoading = false
    @State private var errorMessage: String?
    
    var body: some View {
        ZStack {
            // Background
            Theme.stoneBg.ignoresSafeArea()
            
            // Decorative Elements
            VStack {
                HStack {
                    Circle()
                        .fill(Theme.primary.opacity(0.05))
                        .frame(width: 250, height: 250)
                        .blur(radius: 50)
                        .offset(x: -100, y: -100)
                    Spacer()
                }
                Spacer()
                HStack {
                    Spacer()
                    Circle()
                        .fill(Theme.primary.opacity(0.08))
                        .frame(width: 280, height: 280)
                        .blur(radius: 60)
                        .offset(x: 120, y: 120)
                }
            }
            .ignoresSafeArea()
            
            VStack(spacing: 0) {
                Spacer()
                
                VStack(spacing: 32) {
                    // Lock Icon
                    ZStack {
                        Circle()
                            .fill(Color.white)
                            .frame(width: 100, height: 100)
                            .shadow(color: Theme.primary.opacity(0.1), radius: 20, x: 0, y: 10)
                        
                        Image(systemName: "lock.rotation")
                            .font(.system(size: 44))
                            .foregroundColor(Theme.primary)
                    }
                    
                    // Header
                    VStack(spacing: 8) {
                        Text("Reset Your Password")
                            .font(.system(size: 30, weight: .black))
                            .foregroundColor(Theme.textMain)
                            .multilineTextAlignment(.center)
                    }
                    
                    // Info Box
                    HStack(alignment: .top, spacing: 14) {
                        Image(systemName: "info.circle.fill")
                            .font(.system(size: 20))
                            .foregroundColor(Theme.primary)
                            .padding(.top, 2)
                        
                        Text("Enter the email address associated with your account and we'll send you a 6-digit code to reset your password.")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(Theme.textSecondary)
                            .lineSpacing(4)
                    }
                    .padding(20)
                    .background(Theme.primary.opacity(0.08))
                    .cornerRadius(16)
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(Theme.primary.opacity(0.15), lineWidth: 1)
                    )
                    
                    // Input Form
                    InputTextField(
                        label: "Email Address",
                        placeholder: "jane@example.com",
                        text: $email,
                        icon: "envelope.fill"
                    )
                    
                    if let error = errorMessage {
                        Text(error)
                            .foregroundColor(.red)
                            .font(.system(size: 14))
                            .multilineTextAlignment(.center)
                            .padding(.top, 8)
                    }
                    
                    // Action Button
                    Button {
                        handleResetRequest()
                    } label: {
                        ZStack {
                            if isLoading {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            } else {
                                Text("Submit Request")
                                    .font(.system(size: 17, weight: .bold))
                            }
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 56)
                        .background(Theme.primary)
                        .cornerRadius(16)
                        .shadow(color: Theme.primary.opacity(0.3), radius: 12, x: 0, y: 6)
                    }
                    .disabled(isLoading)
                    .fullScreenCover(isPresented: $showingCheckEmail) {
                        VerifyResetOTPView(email: email)
                    }
                }
                .padding(.horizontal, 24)
                
                Spacer()
                
                // Footer
                Button {
                    dismiss()
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "arrow.left")
                            .font(.system(size: 14, weight: .bold))
                        Text("Back to Sign In")
                            .font(.system(size: 14, weight: .bold))
                    }
                    .foregroundColor(Theme.textMain)
                    .padding(.bottom, 30)
                }
            }
        }
        .navigationBarHidden(true)
        .dismissKeyboardOnTap()
    }
    
    func handleResetRequest() {
        guard !email.isEmpty else {
            errorMessage = "Please enter your email address"
            return
        }
        
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                try await AuthManager.shared.resetPassword(email: email)
                await MainActor.run {
                    isLoading = false
                    showingCheckEmail = true
                }
            } catch {
                await MainActor.run {
                    isLoading = false
                    errorMessage = error.localizedDescription
                }
            }
        }
    }
}
