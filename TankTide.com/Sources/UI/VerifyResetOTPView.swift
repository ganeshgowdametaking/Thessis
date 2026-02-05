import SwiftUI

struct VerifyResetOTPView: View {
    @Environment(\.dismiss) var dismiss
    let email: String
    
    @State private var otp: String = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showingResetPassword = false
    
    var body: some View {
        ZStack {
            Theme.stoneBg.ignoresSafeArea()
            
            VStack(spacing: 32) {
                // Header
                VStack(spacing: 16) {
                    ZStack {
                        Circle()
                            .fill(Theme.primary.opacity(0.1))
                            .frame(width: 80, height: 80)
                        
                        Image(systemName: "envelope.badge.shield.half.filled")
                            .font(.system(size: 32))
                            .foregroundColor(Theme.primary)
                    }
                    
                    VStack(spacing: 8) {
                        Text("Verify Identity")
                            .font(.system(size: 28, weight: .black))
                            .foregroundColor(Theme.textMain)
                        
                        Text("Enter the 6-digit code sent to\n\(email)")
                            .font(.system(size: 16))
                            .foregroundColor(Theme.textSecondary)
                            .multilineTextAlignment(.center)
                            .lineSpacing(4)
                    }
                }
                .padding(.top, 40)
                
                // OTP Input
                VStack(alignment: .leading, spacing: 12) {
                    Text("Verification Code")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(Theme.textSecondary)
                        .textCase(.uppercase)
                        .tracking(0.5)
                        .padding(.horizontal, 4)
                    
                    TextField("000000", text: $otp)
                        .font(.system(size: 32, weight: .bold, design: .monospaced))
                        .foregroundColor(Theme.textMain)
                        .multilineTextAlignment(.center)
                        .keyboardType(.numberPad)
                        .frame(height: 80)
                        .background(Color.white)
                        .cornerRadius(16)
                        .shadow(color: Color.black.opacity(0.05), radius: 10, x: 0, y: 5)
                        .overlay(
                            RoundedRectangle(cornerRadius: 16)
                                .stroke(Theme.primary.opacity(otp.count == 6 ? 0.5 : 0.1), lineWidth: 2)
                        )
                        .onChange(of: otp) { newValue in
                            let filtered = newValue.filter { "0123456789".contains($0) }
                            if filtered.count > 6 {
                                otp = String(filtered.prefix(6))
                            } else {
                                otp = filtered
                            }
                        }
                }
                .padding(.horizontal, 24)
                
                if let error = errorMessage {
                    Text(error)
                        .foregroundColor(.red)
                        .font(.system(size: 14))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 24)
                }
                
                // Verify Button
                Button {
                    handleVerify()
                } label: {
                    ZStack {
                        if isLoading {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        } else {
                            Text("Verify & Continue")
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
                .disabled(isLoading || otp.count != 6)
                .padding(.horizontal, 24)
                
                // Resend Code
                Button {
                    handleResend()
                } label: {
                    Text("Didn't receive the code? Resend")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(Theme.primary)
                }
                .disabled(isLoading)
                
                Spacer()
                
                // Back Button
                Button {
                    dismiss()
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "arrow.left")
                            .font(.system(size: 14, weight: .bold))
                        Text("Use a different email")
                            .font(.system(size: 14, weight: .bold))
                    }
                    .foregroundColor(Theme.textSecondary)
                }
                .padding(.bottom, 30)
            }
        }
        .navigationBarHidden(true)
        .dismissKeyboardOnTap()
        .fullScreenCover(isPresented: $showingResetPassword) {
            ResetPasswordView()
        }
    }
    
    private func handleVerify() {
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                try await AuthManager.shared.verifyOTP(email: email, token: otp)
                await MainActor.run {
                    isLoading = false
                    showingResetPassword = true
                }
            } catch {
                await MainActor.run {
                    isLoading = false
                    errorMessage = error.localizedDescription
                }
            }
        }
    }
    
    private func handleResend() {
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                try await AuthManager.shared.resetPassword(email: email)
                await MainActor.run {
                    isLoading = false
                    errorMessage = "Code resent successfully!"
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

#Preview {
    VerifyResetOTPView(email: "test@example.com")
}
