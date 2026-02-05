import SwiftUI
import Supabase

struct LoginView: View {
    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var isSignUp = false
    @State private var isLoggedIn = false
    @State private var successMessage: String?
    @State private var showingForgotPassword = false
    @StateObject private var authManager = AuthManager.shared

    @State private var fullName = ""
    @State private var confirmPassword = ""
    @State private var showConfirmPassword = false
    
    var body: some View {
        if authManager.currentUser != nil && !authManager.isResettingPassword {
            HomeView()
        } else {
            loginContent
                .onTapGesture {
                    UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                }
                .fullScreenCover(isPresented: $authManager.showingResetPassword) {
                    ResetPasswordView()
                }
        }
    }

    var loginContent: some View {
        ZStack {
            Theme.stoneBg
                .ignoresSafeArea()
                .contentShape(Rectangle())
                .onTapGesture {
                    UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                }

            ScrollView {
                VStack(spacing: 0) {
                    // New Brand Header
                    VStack(spacing: 24) {
                        Image("logo2")
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(height: 80)
                            .padding(.top, 60)
                            

                    }
                    .padding(.bottom, 32)

                    // Error Alert Box (Sage & Stone Style)
                    if let error = errorMessage {
                        HStack(alignment: .top, spacing: 12) {
                            Image(systemName: "exclamationmark.circle.fill")
                                .foregroundColor(.red)
                                .font(.system(size: 20))
                                .padding(.top, 2)
                            
                            VStack(alignment: .leading, spacing: 2) {
                                Text("System")
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundColor(Color(hex: "991b1b"))
                                Text(error)
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundColor(Color(hex: "b91c1c"))
                            }
                        }
                        .padding(16)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.red.opacity(0.05))
                        .cornerRadius(12)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color.red.opacity(0.1), lineWidth: 1)
                        )
                        .padding(.horizontal, 24)
                        .padding(.bottom, 24)
                        .transition(.scale.combined(with: .opacity))
                    }

                    // Segmented Control
                    pickerView
                        .padding(.horizontal, 24)
                        .padding(.bottom, 32)
                    
                    // Form Area
                    VStack(spacing: 20) {
                        if isSignUp {
                            InputTextField(
                                label: "Full Name",
                                placeholder: "e.g. Jane Doe",
                                text: $fullName,
                                icon: "person"
                            )
                        }

                        InputTextField(
                            label: "Email Address",
                            placeholder: "Please enter your email",
                            text: $email,
                            icon: "envelope"
                        )
                        
                        VStack(alignment: .trailing, spacing: 12) {
                            InputTextField(
                                label: "Password",
                                placeholder: "Please enter your password",
                                text: $password,
                                isSecure: true,
                                icon: "lock"
                            )
                            
                            if isSignUp && !password.isEmpty {
                                PasswordStrengthView(password: password)
                            }
                            
                            if isSignUp {
                                InputTextField(
                                    label: "Confirm Password",
                                    placeholder: "••••••••",
                                    text: $confirmPassword,
                                    isSecure: true,
                                    icon: "lock"
                                )
                            }
                            
                            if !isSignUp {
                                Button("Forgot Password?") {
                                    showingForgotPassword = true
                                }
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(Theme.primary)
                                .sheet(isPresented: $showingForgotPassword) {
                                    ForgotPasswordView()
                                }
                            }
                        }
                        
                        if let success = successMessage {
                            Text(success)
                                .foregroundColor(Theme.primary)
                                .font(.caption)
                                .multilineTextAlignment(.center)
                                .padding(.top, 4)
                        }
                        
                        // Action Button
                        Button {
                            handleAuth()
                        } label: {
                            ZStack {
                                if isLoading {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                } else {
                                    Text(isSignUp ? "Sign Up" : "Sign In")
                                        .font(.system(size: 16, weight: .bold))
                                }
                            }
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 52)
                            .background(Theme.primary)
                            .cornerRadius(isSignUp ? 26 : 12) // Rounded implementation
                            .shadow(color: Theme.primary.opacity(0.2), radius: 8, x: 0, y: 4)
                        }
                        .disabled(isLoading)
                        .padding(.top, 8)
                    }
                    .padding(.horizontal, 24)

                    // Divider
                    HStack(spacing: 8) {
                        Rectangle()
                            .fill(Color.gray.opacity(0.1))
                            .frame(height: 1)
                        
                        Text("Or continue with")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(Theme.textMuted)
                            .lineLimit(1)
                            .fixedSize()
                        
                        Rectangle()
                            .fill(Color.gray.opacity(0.1))
                            .frame(height: 1)
                    }
                    .padding(.horizontal, 24)
                    .padding(.vertical, 24)
                    
                    // Social Stack
                    VStack(spacing: 12) {
                        socialButton(
                            title: isSignUp ? "Sign up with Google" : "Continue with Google",
                            icon: "google_logo",
                            color: .white,
                            textColor: Theme.textMain,
                            showBorder: true,
                            isCapsule: isSignUp,
                            action: handleGoogleSignIn
                        )
                    }
                    .padding(.horizontal, 24)
                    
                    // New Footer Section
                    if isSignUp {
                        Button {
                            withAnimation { isSignUp = false }
                        } label: {
                            Text("Already have an account? Sign in")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(Theme.textMuted)
                        }
                        .padding(.top, 40)
                        .padding(.bottom, 40)
                    } else {
                        Spacer().frame(height: 80)
                    }
                }
            }
        }
    }

    var pickerView: some View {
        HStack(spacing: 0) {
            Button {
                withAnimation { isSignUp = false }
            } label: {
                Text("Sign In")
                    .font(.system(size: 14, weight: isSignUp ? .medium : .semibold))
                    .frame(maxWidth: .infinity)
                    .frame(height: 48)
                    .background(!isSignUp ? Theme.primary : Color.clear)
                    .foregroundColor(!isSignUp ? .white : Theme.textMuted)
                    .cornerRadius(8)
            }
            
            Button {
                withAnimation { isSignUp = true }
            } label: {
                Text("Create Account")
                    .font(.system(size: 14, weight: isSignUp ? .semibold : .medium))
                    .frame(maxWidth: .infinity)
                    .frame(height: 48)
                    .background(isSignUp ? Theme.primary : Color.clear)
                    .foregroundColor(isSignUp ? .white : Theme.textMuted)
                    .cornerRadius(8)
            }
        }
        .padding(4)
        .background(Theme.stoneSurface)
        .cornerRadius(12)
    }

    func socialButton(title: String, icon: String, color: Color, textColor: Color, showBorder: Bool = false, isCapsule: Bool = false, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 12) {
                if icon == "google_logo" {
                    Image("google_logo")
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(width: 20, height: 20)
                } else {
                    Image(systemName: "link")
                        .font(.system(size: 18))
                }
                
                Text(title)
                    .font(.system(size: 14, weight: .bold))
            }
            .frame(maxWidth: .infinity)
            .frame(height: 52)
            .background(color)
            .foregroundColor(textColor)
            .cornerRadius(isCapsule ? 26 : 12)
            .overlay(
                RoundedRectangle(cornerRadius: isCapsule ? 26 : 12)
                    .stroke(showBorder ? Color.gray.opacity(0.2) : Color.clear, lineWidth: 1)
            )
        }
    }

    func handleGoogleSignIn() {
        Task {
            do {
                try await AuthManager.shared.signInWithGoogle()
                // Session listener in AuthManager will handle the UI update via authManager.currentUser
            } catch {
                await MainActor.run {
                    self.errorMessage = "Google Sign In failed: \(error.localizedDescription)"
                }
            }
        }
    }

    func testBasicNetwork() {
        print("--- Diagnostic Started ---")
        errorMessage = "Testing network..."
        
        guard let url = URL(string: "https://www.google.com") else { return }
        
        URLSession.shared.dataTask(with: url) { data, response, error in
            DispatchQueue.main.async {
                if let httpResponse = response as? HTTPURLResponse {
                    print("📡 Status Code: \(httpResponse.statusCode)")
                }
                
                if let error = error {
                    print("❌ Basic Network Fail: \(error.localizedDescription)")
                    self.errorMessage = "App Network Blocked: \(error.localizedDescription)"
                } else if let data = data, let string = String(data: data, encoding: .utf8) {
                    print("✅ Basic Network Success! Received \(data.count) bytes.")
                    print("--- Response Preview ---")
                    print(String(string.prefix(500)))
                    print("-------------------------")
                    self.errorMessage = nil
                    self.successMessage = "App Network reached Google! (Status \( (response as? HTTPURLResponse)?.statusCode ?? 0 )). If Sign In still fails, it's specific to Supabase."
                } else {
                    print("❌ Basic Network Fail: Received unreadable data")
                    self.errorMessage = "App Network Blocked: Received unreadable data (Check Hotspot)"
                }
            }
        }.resume()
    }

    func testPlainHTTP() {
        print("--- Plain HTTP Test Started ---")
        errorMessage = "Testing plain HTTP..."
        
        // Use a plain HTTP URL that is known to be reachable and simple
        guard let url = URL(string: "http://neverssl.com") else { return }
        
        URLSession.shared.dataTask(with: url) { data, response, error in
            DispatchQueue.main.async {
                if let httpResponse = response as? HTTPURLResponse {
                    print("📡 Plain HTTP Status: \(httpResponse.statusCode)")
                }
                
                if let error = error {
                    print("❌ Plain HTTP Fail: \(error.localizedDescription)")
                    self.errorMessage = "Plain HTTP failed: \(error.localizedDescription)"
                } else if let data = data, let string = String(data: data, encoding: .utf8) {
                    print("✅ Plain HTTP Success! Received \(data.count) bytes.")
                    print("--- Plain Response Preview ---")
                    print(String(string.prefix(1000))) // Show more for plain HTTP
                    print("------------------------------")
                    self.errorMessage = nil
                    self.successMessage = "Plain HTTP reached! If HTTPS fails, your hotspot is blocking secure traffic."
                }
            }
        }.resume()
    }

    func handleAuth() {
        isLoading = true
        errorMessage = nil
        successMessage = nil
        
        if isSignUp && password != confirmPassword {
            errorMessage = "Passwords do not match"
            isLoading = false
            return
        }
        
        print("Starting auth for: \(email)")
        
        Task {
            do {
                if isSignUp {
                    try await AuthManager.shared.client.auth.signUp(email: email, password: password)
                    print("Sign up success")
                    successMessage = "Verification email sent!"
                } else {
                    let response = try await AuthManager.shared.client.auth.signIn(email: email, password: password)
                    print("Sign in success: \(response.user.id)")
                    withAnimation {
                        isLoggedIn = true
                    }
                }
            } catch {
                print("--- Auth Failure Details ---")
                print("Error type: \(type(of: error))")
                print("Description: \(error.localizedDescription)")
                let nsError = error as NSError
                print("Domain: \(nsError.domain)")
                print("Code: \(nsError.code)")
                print("----------------------------")
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }
}

struct PasswordStrengthView: View {
    let password: String
    
    var strength: Int {
        var score = 0
        if password.count > 6 { score += 1 }
        if password.rangeOfCharacter(from: .uppercaseLetters) != nil { score += 1 }
        if password.rangeOfCharacter(from: .decimalDigits) != nil { score += 1 }
        if password.rangeOfCharacter(from: CharacterSet(charactersIn: "!@#$%^&*()_+-=[]{}|;':\",./<>?")) != nil { score += 1 }
        return score
    }
    
    var strengthText: String {
        switch strength {
        case 0, 1: return "Weak"
        case 2: return "Medium"
        case 3: return "Strong"
        case 4: return "Very Strong"
        default: return ""
        }
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 6) {
                ForEach(1...4, id: \.self) { index in
                    Capsule()
                        .fill(index <= strength ? Theme.primary : Color.gray.opacity(0.1))
                        .frame(height: 6)
                }
            }
            
            HStack(spacing: 4) {
                Text("Password strength:")
                    .font(.system(size: 12))
                    .foregroundColor(Theme.textMuted)
                Text(strengthText)
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(Theme.primary)
            }
            .padding(.leading, 4)
        }
        .padding(.vertical, 4)
    }
}
