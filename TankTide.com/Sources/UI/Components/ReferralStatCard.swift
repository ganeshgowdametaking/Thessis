import SwiftUI

struct ReferralStatCard: View {
    let title: String
    let icon: String
    let value: String
    let subtitle: String
    let iconColor: Color
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text(title)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(Color(hex: "4e8597")) // secondary-text from design
                Spacer()
                Image(systemName: icon)
                    .font(.system(size: 20))
                    .foregroundColor(iconColor)
            }
            
            Spacer()
            
            VStack(alignment: .leading, spacing: 4) {
                Text(value)
                    .font(.system(size: 32, weight: .bold))
                    .foregroundColor(Theme.textMain)
                
                Text(subtitle)
                    .font(.system(size: 12))
                    .foregroundColor(Color.gray.opacity(0.6))
            }
        }
        .padding(20)
        .frame(width: 170, height: 128)
        .background(Color.white)
        .cornerRadius(20)
        .shadow(color: Color.black.opacity(0.04), radius: 10, x: 0, y: 5)
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .stroke(Color.gray.opacity(0.05), lineWidth: 1)
        )
    }
}
