import SwiftUI

struct SearchResultCompanyRow: View {
    let company: SearchCompany
    
    var body: some View {
        HStack(spacing: 16) {
            // Company Logo
            ZStack {
                RoundedRectangle(cornerRadius: 14)
                    .fill(Theme.primary.opacity(0.1))
                    .frame(width: 56, height: 56)
                
                Image(systemName: company.logo)
                    .font(.system(size: 24))
                    .foregroundColor(Theme.primary)
            }
            
            // Text Info
            VStack(alignment: .leading, spacing: 2) {
                Text(company.name)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(Theme.textMain)
                
                Text("\(company.industry) • \(company.location)")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(Theme.textSecondary)
                
                Text("\(company.followerCount) followers")
                    .font(.system(size: 12))
                    .foregroundColor(Theme.textMuted)
                    .padding(.top, 2)
            }
            .lineLimit(1)
            
            Spacer()
            
            // Action Button
            Button {
                // Follow action
            } label: {
                Text(company.isFollowing ? "Following" : "Follow")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(company.isFollowing ? Theme.textSecondary : .white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(company.isFollowing ? Theme.stoneSurface : Theme.primary)
                    .cornerRadius(20)
            }
        }
        .padding(16)
        .background(Color.white)
        .cornerRadius(20)
        .shadow(color: Color.black.opacity(0.04), radius: 10, x: 0, y: 5)
    }
}
