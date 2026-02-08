import SwiftUI

struct MyReferralRow: View {
    let referral: MyReferral
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Status & More
            HStack {
                statusBadge
                Spacer()
                Menu {
                    Button(role: .destructive) {
                        Task {
                            try? await ApplicationService.shared.deleteReferral(id: referral.id)
                        }
                    } label: {
                        Label("Delete", systemImage: "trash")
                    }
                } label: {
                    Image(systemName: "ellipsis")
                        .foregroundColor(Theme.primary)
                        .padding(8)
                        .background(Theme.primary.opacity(0.1))
                        .clipShape(Circle())
                        .contentShape(Rectangle())
                }
            }
            
            // Info
            VStack(alignment: .leading, spacing: 4) {
                Text(referral.title)
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(Theme.textMain)
                    .opacity(referral.status == .closed ? 0.6 : 1.0)
                
                Text("\(referral.department) • \(referral.location)")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(Theme.textSecondary)
            }
            
            // Applicants
            HStack {
                if referral.applicantCount > 0 {
                    HStack(spacing: -10) {
                        ForEach(0..<min(referral.applicantAvatars.count, 3), id: \.self) { index in
                            Image(systemName: referral.applicantAvatars[index])
                                .resizable()
                                .aspectRatio(contentMode: .fit)
                                .frame(width: 32, height: 32)
                                .background(Color.white)
                                .clipShape(Circle())
                                .overlay(Circle().stroke(Color.white, lineWidth: 2))
                                .shadow(color: Color.black.opacity(0.1), radius: 2, x: 0, y: 1)
                        }
                        
                        if referral.applicantCount > 3 {
                            ZStack {
                                Circle()
                                    .fill(Color(hex: "e7f0f3"))
                                    .frame(width: 32, height: 32)
                                Text("+\(referral.applicantCount - 3)")
                                    .font(.system(size: 10, weight: .bold))
                                    .foregroundColor(Color(hex: "4e8597"))
                            }
                            .overlay(Circle().stroke(Color.white, lineWidth: 2))
                        }
                    }
                    
                    Spacer()
                    
                    Text("\(referral.applicantCount) Applicants")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(Theme.primary)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(Theme.primary.opacity(0.1))
                        .cornerRadius(8)
                } else {
                    if referral.status == .draft {
                        Text("No applicants yet")
                            .font(.system(size: 12, weight: .medium))
                            .italic()
                            .foregroundColor(Theme.textMuted)
                        
                        Spacer()
                        
                        Button {
                            // Continue editing
                        } label: {
                            HStack(spacing: 4) {
                                Image(systemName: "pencil")
                                    .font(.system(size: 12))
                                Text("Continue Editing")
                                    .font(.system(size: 12, weight: .bold))
                            }
                            .foregroundColor(Theme.primary)
                        }
                    } else {
                        Text("No applicants yet")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(Theme.textMuted)
                    }
                }
            }
            .padding(.top, 4)
        }
        .padding(20)
        .background(Color.white)
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.04), radius: 10, x: 0, y: 4)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(referral.status == .draft ? Color.gray.opacity(0.1) : Color.clear, style: StrokeStyle(lineWidth: 1, dash: [5]))
        )
    }
    
    @ViewBuilder
    var statusBadge: some View {
        switch referral.status {
        case .active:
            Text("Active")
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(Color(hex: "5c7c64"))
                .padding(.horizontal, 10)
                .padding(.vertical, 4)
                .background(Color(hex: "eff5f1"))
                .cornerRadius(6)
                .overlay(RoundedRectangle(cornerRadius: 6).stroke(Color(hex: "d6e6db"), lineWidth: 1))
        case .closed:
            Text("Closed")
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(Color.gray)
                .padding(.horizontal, 10)
                .padding(.vertical, 4)
                .background(Color.gray.opacity(0.1))
                .cornerRadius(6)
                .overlay(RoundedRectangle(cornerRadius: 6).stroke(Color.gray.opacity(0.2), lineWidth: 1))
        case .draft:
            Text("Draft")
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(Color.blue)
                .padding(.horizontal, 10)
                .padding(.vertical, 4)
                .background(Color.blue.opacity(0.1))
                .cornerRadius(6)
                .overlay(RoundedRectangle(cornerRadius: 6).stroke(Color.blue.opacity(0.2), lineWidth: 1))
        }
    }
}
