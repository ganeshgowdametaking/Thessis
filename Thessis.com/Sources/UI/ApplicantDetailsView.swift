import SwiftUI

struct ApplicantDetailsView: View {
    @Environment(\.dismiss) var dismiss
    let applicant: Applicant
    
    @State private var isShortlisted = false
    @State private var showFullLetter = false
    
    var body: some View {
        ZStack {
            Theme.stoneBg.ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Custom Navigation Bar
                navBar
                
                ScrollView(showsIndicators: false) {
                    VStack(spacing: 32) {
                        // Profile Header
                        headerSection
                        
                        Divider().background(Color.gray.opacity(0.1))
                        
                        // Contact Section
                        contactSection
                        
                        // Skills Section
                        skillsSection
                        
                        // Cover Letter Section
                        coverLetterSection
                        
                        // Resume Section
                        resumeSection
                        
                        Spacer().frame(height: 100)
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 12)
                }
            }
        }
        .navigationBarHidden(true)
    }
    
    var navBar: some View {
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
            
            Text("Applicant")
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(Theme.textMuted)
                .textCase(.uppercase)
                .tracking(1.2)
            
            Spacer()
            
            Button {
                // More options
            } label: {
                Image(systemName: "ellipsis")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(Theme.textMain)
                    .frame(width: 40, height: 40)
                    .background(Color.white.opacity(0.8))
                    .clipShape(Circle())
                    .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Theme.stoneBg.opacity(0.9).blur(radius: 0.5))
    }
    
    var headerSection: some View {
        VStack(spacing: 24) {
            ZStack(alignment: .bottomTrailing) {
                AsyncImage(url: URL(string: applicant.imageUrl)) { image in
                    image.resizable()
                } placeholder: {
                    Color.gray.opacity(0.1)
                }
                .frame(width: 112, height: 112)
                .clipShape(Circle())
                .overlay(Circle().stroke(Color.white, lineWidth: 4))
                .shadow(color: Color.black.opacity(0.1), radius: 10, x: 0, y: 5)
                
                Circle()
                    .fill(applicant.status.color)
                    .frame(width: 24, height: 24)
                    .overlay(Circle().stroke(Color.white, lineWidth: 3))
                    .offset(x: -4, y: -4)
            }
            
            VStack(spacing: 4) {
                HStack(spacing: 8) {
                    Text(applicant.name)
                        .font(.system(size: 28, weight: .bold))
                        .foregroundColor(Theme.textMain)
                }
                
                Text(applicant.role)
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(Theme.primary)
                
                
                // Formatted date logic
                if let dateStr = applicant.appliedDate,
                   let date = ISO8601DateFormatter().date(from: dateStr) {
                    let formattedString: String = {
                        let formatter = RelativeDateTimeFormatter()
                        formatter.unitsStyle = .full
                        return formatter.localizedString(for: date, relativeTo: Date())
                    }()
                    
                    Text("Applied \(formattedString)")
                        .font(.system(size: 14))
                        .foregroundColor(Theme.textMuted)
                } else {
                    Text("Applied recently")
                        .font(.system(size: 14))
                        .foregroundColor(Theme.textMuted)
                }
            }
            
            Button {
                withAnimation(.spring()) {
                    isShortlisted.toggle()
                }
            } label: {
                HStack(spacing: 12) {
                    Image(systemName: isShortlisted ? "checkmark.circle.fill" : "check")
                        .font(.system(size: 18, weight: .bold))
                    Text(isShortlisted ? "Shortlisted" : "Shortlist Candidate")
                        .font(.system(size: 16, weight: .bold))
                }
                .foregroundColor(.white)
                .frame(maxWidth: 240)
                .frame(height: 52)
                .background(isShortlisted ? Color(hex: "8FB399") : Theme.primary)
                .cornerRadius(26)
                .shadow(color: (isShortlisted ? Color(hex: "8FB399") : Theme.primary).opacity(0.2), radius: 10, x: 0, y: 5)
            }
        }
    }
    
    var contactSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            sectionHeader(title: "Contact", icon: "contact.page")
            
            VStack(spacing: 0) {
                if let email = applicant.email {
                    contactRow(icon: "envelope", label: "Email", value: email, isLink: true)
                } else {
                    contactRow(icon: "envelope", label: "Email", value: "Not provided", isLink: false)
                }
                
                if let phone = applicant.phone {
                    Divider().padding(.leading, 64)
                    contactRow(icon: "phone", label: "Phone", value: phone, isLink: true)
                }
                
                if let linkedIn = applicant.linkedIn {
                    Divider().padding(.leading, 64)
                    contactRow(icon: "link", label: "LinkedIn", value: linkedIn, isLink: true)
                }
            }
            .background(Color.white)
            .cornerRadius(20)
            .shadow(color: Color.black.opacity(0.02), radius: 10, x: 0, y: 5)
        }
    }
    
    var skillsSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            sectionHeader(title: "Skills", icon: "bolt.fill")
            
            FlowLayout(spacing: 8) {
                if let skills = applicant.skills, !skills.isEmpty {
                    ForEach(skills, id: \.self) { skill in
                        Text(skill)
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(Theme.primary)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(Theme.primary.opacity(0.1))
                            .cornerRadius(10)
                    }
                } else {
                    Text("No skills listed")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(Theme.textMuted)
                }
            }
        }
    }
    
    var coverLetterSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            sectionHeader(title: "Cover Letter", icon: "quote.opening")
            
            VStack(alignment: .leading, spacing: 12) {
                Text(applicant.coverLetter ?? "No cover letter provided.")
                    .font(.system(size: 15))
                    .foregroundColor(Theme.textSecondary)
                    .lineSpacing(6)
                    .lineLimit(showFullLetter ? nil : 3)
                
                Button {
                    withAnimation { showFullLetter.toggle() }
                } label: {
                    HStack(spacing: 4) {
                        EmptyView() // Space
                        Text(showFullLetter ? "Read less" : "Read full letter")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(Theme.primary)
                        Image(systemName: showFullLetter ? "chevron.up" : "chevron.down")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(Theme.primary)
                    }
                }
            }
            .padding(20)
            .background(Color.white)
            .cornerRadius(20)
            .shadow(color: Color.black.opacity(0.02), radius: 10, x: 0, y: 5)
        }
    }
    
    var resumeSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            sectionHeader(title: "Resume", icon: "doc.text.fill")
            
            HStack(spacing: 16) {
                ZStack {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.red.opacity(0.05))
                        .frame(width: 48, height: 48)
                    Image(systemName: "doc.text.fill")
                        .font(.system(size: 24))
                        .foregroundColor(.red)
                }
                
                VStack(alignment: .leading, spacing: 4) {
                    Text(applicant.resumeUrl != nil ? "Resume.pdf" : "No resume uploaded")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(Theme.textMain)
                        .lineLimit(1)
                    
                    if applicant.resumeUrl != nil {
                        Text("PDF • Click below to view")
                            .font(.system(size: 12))
                            .foregroundColor(Theme.textMuted)
                    }
                    
                    HStack(spacing: 12) {
                        Button("View") { }
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(Theme.textMain)
                            .padding(.vertical, 8)
                            .frame(maxWidth: .infinity)
                            .background(Theme.stoneBg)
                            .cornerRadius(8)
                        
                        Button { } label: {
                            HStack(spacing: 6) {
                                Image(systemName: "arrow.down.doc.fill")
                                    .font(.system(size: 12))
                                Text("Download")
                            }
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(Theme.primary)
                            .padding(.vertical, 8)
                            .frame(maxWidth: .infinity)
                            .background(Theme.primary.opacity(0.1))
                            .cornerRadius(8)
                        }
                    }
                    .padding(.top, 12)
                }
                
                Spacer()
            }
            .padding(16)
            .background(Color.white)
            .cornerRadius(20)
            .shadow(color: Color.black.opacity(0.02), radius: 10, x: 0, y: 5)
        }
    }
    
    func sectionHeader(title: String, icon: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 20))
                .foregroundColor(Theme.primary)
            Text(title)
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(Theme.textMain)
        }
    }
    
    func contactRow(icon: String, label: String, value: String, isLink: Bool = false) -> some View {
        HStack(spacing: 16) {
            ZStack {
                Circle()
                    .fill(Theme.stoneBg)
                    .frame(width: 40, height: 40)
                Image(systemName: icon)
                    .font(.system(size: 16))
                    .foregroundColor(Theme.textMuted)
            }
            
            VStack(alignment: .leading, spacing: 2) {
                Text(label)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(Theme.textMuted)
                Text(value)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(Theme.textMain)
            }
            
            Spacer()
            
            Image(systemName: isLink ? "arrow.up.right" : "chevron.right")
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(Color.gray.opacity(0.3))
        }
        .padding(16)
        .contentShape(Rectangle())
    }
}
