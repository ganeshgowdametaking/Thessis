import SwiftUI

struct ResetPasswordView: View {
    @Environment(\.dismiss) var dismiss
    
    // State
    @State private var newPassword = ""
    @State private var confirmPassword = ""
    @State private var showNewPassword = false
    @State private var showConfirmPassword = false
    @State private var showingSuccess = false
    @State private var isLoading = false
    @State private var errorMessage: String?
    
    // Validation Logic
    var hasEightCharacters: Bool { newPassword.count >= 8 }
    var hasNumber: Bool { newPassword.rangeOfCharacter(from: .decimalDigits) != nil }
    var hasSymbol: Bool { newPassword.rangeOfCharacter(from: CharacterSet(charactersIn: "!@#$%^&*()_+-=[]{}|;':\",./<>?")) != nil }
    
    var strengthScore: Double {
        var score: Double = 0
        if hasEightCharacters { score += 0.33 }
        if hasNumber { score += 0.33 }
        if hasSymbol { score += 0.34 }
        return score
    }
    
    var strengthText: String {
        if strengthScore < 0.33 { return "Weak" }
        if strengthScore < 0.66 { return "Medium" }
        if strengthScore < 1.0 { return "Strong" }
        return "Very Strong"
    }
    
    var body: some View {
        ZStack {
            Theme.stoneBg.ignoresSafeArea()
            
            ScrollView(showsIndicators: false) {
                VStack(spacing: 32) {
                    // Logo Section
                    VStack(spacing: 16) {
                        ZStack {
                            Circle()
                                .fill(Theme.primary.opacity(0.1))
                                .frame(width: 64, height: 64)
                                .overlay(
                                    Circle()
                                        .stroke(Theme.primary.opacity(0.1), lineWidth: 1)
                                )
                            
                            Image(systemName: "leaf.fill")
                                .font(.system(size: 32))
                                .foregroundColor(Theme.primary)
                        }
                        
                        Text("Sage & Stone")
                            .font(.system(size: 28, weight: .black))
                            .foregroundColor(Theme.textMain)
                            .tracking(-0.5)
                    }
                    .padding(.top, 40)
                    
                    // Main Card
                    VStack(alignment: .leading, spacing: 24) {
                        // Header
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Reset Password")
                                .font(.system(size: 24, weight: .bold))
                                .foregroundColor(Theme.textMain)
                            Text("Please create a secure password including at least one number and symbol.")
                                .font(.system(size: 16))
                                .foregroundColor(Theme.textSecondary)
                                .lineSpacing(4)
                        }
                        
                        // Form
                        VStack(spacing: 20) {
                            // New Password
                            InputTextField(
                                label: "New Password",
                                placeholder: "••••••••",
                                text: $newPassword,
                                isSecure: true,
                                icon: "lock.fill"
                            )
                            
                            // Confirm New Password
                            InputTextField(
                                label: "Confirm New Password",
                                placeholder: "••••••••",
                                text: $confirmPassword,
                                isSecure: true,
                                icon: "lock.fill"
                            )
                            
                            // Password Strength
                            VStack(alignment: .leading, spacing: 12) {
                                HStack {
                                    Text("Password Strength")
                                        .font(.system(size: 12, weight: .semibold))
                                        .foregroundColor(Theme.textSecondary)
                                        .textCase(.uppercase)
                                        .tracking(0.5)
                                    Spacer()
                                    Text(strengthText)
                                        .font(.system(size: 12, weight: .bold))
                                        .foregroundColor(Theme.primary)
                                }
                                
                                // Strength Bar
                                GeometryReader { geo in
                                    ZStack(alignment: .leading) {
                                        Capsule()
                                            .fill(Theme.stoneSurface)
                                            .frame(height: 6)
                                        
                                        Capsule()
                                            .fill(Theme.primary)
                                            .frame(width: geo.size.width * strengthScore, height: 6)
                                            .animation(.spring(), value: strengthScore)
                                    }
                                }
                                .frame(height: 6)
                                
                                // Requirements Checklist
                                VStack(alignment: .leading, spacing: 8) {
                                    requirementItem(text: "At least 8 characters", isMet: hasEightCharacters)
                                    requirementItem(text: "Contains a number", isMet: hasNumber)
                                    requirementItem(text: "Contains a symbol", isMet: hasSymbol)
                                }
                                .padding(.top, 4)
                            }
                            
                            
                            if let error = errorMessage {
                                Text(error)
                                    .foregroundColor(.red)
                                    .font(.system(size: 14))
                                    .multilineTextAlignment(.center)
                                    .padding(.top, 4)
                            }
                            
                            // Action Button
                            Button {
                                handleUpdatePassword()
                            } label: {
                                ZStack {
                                    if isLoading {
                                        ProgressView()
                                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                    } else {
                                        Text("Update Password")
                                            .font(.system(size: 17, weight: .bold))
                                    }
                                }
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .frame(height: 56)
                                .background(Theme.primary)
                                .cornerRadius(12)
                                .shadow(color: Theme.primary.opacity(0.1), radius: 10, x: 0, y: 5)
                            }
                            .disabled(isLoading || newPassword != confirmPassword || strengthScore < 1.0)
                            .padding(.top, 8)
                            .fullScreenCover(isPresented: $showingSuccess) {
                                PasswordResetSuccessView()
                            }
                        }
                    }
                    .padding(24)
                    .background(Color.white)
                    .cornerRadius(20)
                    .shadow(color: Color.black.opacity(0.03), radius: 20, x: 0, y: 10)
                    .overlay(
                        RoundedRectangle(cornerRadius: 20)
                            .stroke(Color.black.opacity(0.05), lineWidth: 1)
                    )
                    
                    // Footer
                    Button {
                        dismiss()
                    } label: {
                        HStack(spacing: 8) {
                            Image(systemName: "arrow.left")
                                .font(.system(size: 14, weight: .bold))
                            Text("Back to Dashboard")
                                .font(.system(size: 14, weight: .bold))
                        }
                        .foregroundColor(Theme.textSecondary)
                    }
                    .padding(.bottom, 40)
                }
                .padding(.horizontal, 20)
            }
        }
        .navigationBarHidden(true)
        .dismissKeyboardOnTap()
    }
    
    func handleUpdatePassword() {
        guard newPassword == confirmPassword else {
            errorMessage = "Passwords do not match"
            return
        }
        
        guard strengthScore >= 1.0 else {
            errorMessage = "Password does not meet all requirements"
            return
        }
        
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                try await AuthManager.shared.updatePassword(newPassword: newPassword)
                await MainActor.run {
                    isLoading = false
                    showingSuccess = true
                }
            } catch {
                await MainActor.run {
                    isLoading = false
                    errorMessage = error.localizedDescription
                }
            }
        }
    }
    
    func passwordField(text: Binding<String>, show: Binding<Bool>) -> some View {
        HStack {
            if show.wrappedValue {
                TextField("••••••••", text: text)
            } else {
                SecureField("••••••••", text: text)
            }
            
            Button {
                show.wrappedValue.toggle()
            } label: {
                Image(systemName: show.wrappedValue ? "eye.slash.fill" : "eye.fill")
                    .font(.system(size: 18))
                    .foregroundColor(Theme.textSecondary)
            }
        }
        .padding(.horizontal, 16)
        .frame(height: 52)
        .background(Color.white)
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.gray.opacity(0.2), lineWidth: 1)
        )
    }
    
    func requirementItem(text: String, isMet: Bool) -> some View {
        HStack(spacing: 8) {
            Image(systemName: isMet ? "checkmark.circle.fill" : "circle")
                .font(.system(size: 16))
                .foregroundColor(isMet ? Theme.primary : Theme.textSecondary)
            
            Text(text)
                .font(.system(size: 14, weight: isMet ? .medium : .regular))
                .foregroundColor(isMet ? Theme.primary : Theme.textSecondary)
            
            Spacer()
        }
    }
}
