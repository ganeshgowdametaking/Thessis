import SwiftUI

struct InputTextField: View {
    let label: String
    let placeholder: String
    @Binding var text: String
    var isSecure: Bool = false
    var icon: String
    @State private var isShowingPassword = false

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(Theme.textMain)
            
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.system(size: 20))
                    .foregroundColor(Theme.textMuted)
                    .frame(width: 24)
                
                if isSecure {
                    ZStack(alignment: .leading) {
                        if text.isEmpty {
                            Text(placeholder)
                                .foregroundColor(Theme.textMuted.opacity(0.6))
                        }
                        if isShowingPassword {
                            TextField("", text: $text)
                                .foregroundColor(Theme.textMain)
                                .autocapitalization(.none)
                        } else {
                            SecureField("", text: $text)
                                .foregroundColor(Theme.textMain)
                        }
                    }
                } else {
                    ZStack(alignment: .leading) {
                        if text.isEmpty {
                            Text(placeholder)
                                .foregroundColor(Theme.textMuted.opacity(0.6))
                        }
                        TextField("", text: $text)
                            .foregroundColor(Theme.textMain)
                            .autocapitalization(.none)
                    }
                }
                
                if isSecure {
                    Button {
                        isShowingPassword.toggle()
                    } label: {
                        Image(systemName: isShowingPassword ? "eye.slash" : "eye")
                            .foregroundColor(Theme.textMuted)
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .background(Color.white)
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.gray.opacity(0.2), lineWidth: 1)
            )
            .shadow(color: Color.black.opacity(0.03), radius: 2, x: 0, y: 1)
        }
    }
}
