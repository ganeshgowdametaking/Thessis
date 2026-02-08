import SwiftUI

struct GDPRRequestView: View {
    @Environment(\.dismiss) var dismiss
    
    // State
    @State private var selectedRequestType: RequestType = .correct
    @State private var requestDetails: String = ""
    
    enum RequestType {
        case access, delete, correct
    }
    
    var body: some View {
        ZStack {
            Theme.stoneBg.ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Header
                headerView
                
                ScrollView(showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 32) {
                        // Intro
                        VStack(alignment: .leading, spacing: 8) {
                            textSection(title: "Select Request Type", subtitle: "Choose the type of action you would like to perform regarding your personal data.")
                        }
                        .padding(.top, 24)
                        
                        // Request Types
                        VStack(spacing: 16) {
                            requestTypeCard(
                                type: .access,
                                icon: "arrow.down.doc.fill",
                                color: .blue,
                                title: "Access My Data",
                                description: "Download a copy of your personal data."
                            )
                            
                            requestTypeCard(
                                type: .delete,
                                icon: "trash.fill",
                                color: .red,
                                title: "Delete My Account",
                                description: "Permanently remove your account and data."
                            )
                            
                            requestTypeCard(
                                type: .correct,
                                icon: "square.and.pencil",
                                color: Theme.primary,
                                title: "Correct My Data",
                                description: "Update incorrect personal information."
                            )
                        }
                        
                        // Request Details
                        VStack(alignment: .leading, spacing: 16) {
                            Text("Request Details")
                                .font(.system(size: 18, weight: .bold))
                            
                            ZStack(alignment: .bottomTrailing) {
                                TextEditor(text: $requestDetails)
                                    .frame(height: 140)
                                    .padding(12)
                                    .background(Color.white)
                                    .cornerRadius(16)
                                    .shadow(color: Color.black.opacity(0.04), radius: 8, x: 0, y: 4)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 16)
                                            .stroke(Color.gray.opacity(0.1), lineWidth: 1)
                                    )
                                    .overlay(
                                        placeholderOverlay, alignment: .topLeading
                                    )
                                
                                Image(systemName: "text.alignleft")
                                    .foregroundColor(Theme.textMuted.opacity(0.3))
                                    .padding(12)
                            }
                            
                            Text("Please provide as much detail as possible to help us locate your data.")
                                .font(.system(size: 12))
                                .foregroundColor(Theme.textMuted)
                                .padding(.horizontal, 4)
                        }
                        
                        // Spacer for footer
                        Spacer().frame(height: 120)
                    }
                    .padding(.horizontal, 20)
                }
            }
            
            // Fixed Footer
            footerActionView
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
                    .foregroundColor(Theme.textMain)
                    .frame(width: 44, height: 44)
                    .background(Color.white)
                    .clipShape(Circle())
                    .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
            }
            
            Spacer()
            
            Text("GDPR Data Request")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(Theme.textMain)
            
            Spacer()
            
            // Optical balance
            Rectangle()
                .fill(Color.clear)
                .frame(width: 44, height: 44)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .background(Theme.stoneBg)
        .overlay(
            Divider().opacity(0.5), alignment: .bottom
        )
    }
    
    func textSection(title: String, subtitle: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(Theme.textMain)
            Text(subtitle)
                .font(.system(size: 14))
                .foregroundColor(Theme.textSecondary)
        }
    }
    
    func requestTypeCard(type: RequestType, icon: String, color: Color, title: String, description: String) -> some View {
        let isSelected = selectedRequestType == type
        
        return Button {
            selectedRequestType = type
        } label: {
            HStack(spacing: 16) {
                ZStack {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(color.opacity(0.1))
                        .frame(width: 48, height: 48)
                    Image(systemName: icon)
                        .font(.system(size: 22))
                        .foregroundColor(color)
                }
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(Theme.textMain)
                    Text(description)
                        .font(.system(size: 12))
                        .foregroundColor(Theme.textMuted)
                }
                
                Spacer()
                
                ZStack {
                    Circle()
                        .stroke(isSelected ? color : Color.gray.opacity(0.2), lineWidth: 2)
                        .frame(width: 24, height: 24)
                    
                    if isSelected {
                        Circle()
                            .fill(color)
                            .frame(width: 12, height: 12)
                    }
                }
            }
            .padding(16)
            .background(isSelected ? Color.white : Color.clear)
            .cornerRadius(16)
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(isSelected ? color : Color.clear, lineWidth: 2)
            )
            .shadow(color: isSelected ? color.opacity(0.1) : Color.clear, radius: 10, x: 0, y: 5)
        }
    }
    
    @ViewBuilder
    var placeholderOverlay: some View {
        if requestDetails.isEmpty {
            Text("Please describe specific data or corrections you need...")
                .font(.system(size: 14))
                .foregroundColor(Theme.textMuted.opacity(0.5))
                .padding(.horizontal, 16)
                .padding(.vertical, 20)
        }
    }
    
    var footerActionView: some View {
        VStack {
            Spacer()
            VStack(spacing: 16) {
                Button {
                    dismiss()
                } label: {
                    Text("Submit Request")
                        .font(.system(size: 17, weight: .bold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 56)
                        .background(Theme.primary)
                        .cornerRadius(12)
                        .shadow(color: Theme.primary.opacity(0.3), radius: 10, x: 0, y: 5)
                }
                
                HStack(spacing: 6) {
                    Image(systemName: "clock.fill")
                        .font(.system(size: 12))
                    Text("Requests are usually processed within 30 days")
                        .font(.system(size: 12, weight: .medium))
                }
                .foregroundColor(Theme.textMuted)
            }
            .padding(24)
            .background(Theme.stoneBg)
            .overlay(
                Rectangle()
                    .fill(Color.black.opacity(0.05))
                    .frame(height: 1)
                    .frame(maxWidth: .infinity), alignment: .top
            )
        }
    }
}
