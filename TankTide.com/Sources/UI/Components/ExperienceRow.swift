import SwiftUI

struct ExperienceRow: View {
    let experience: Experience
    let isLast: Bool
    
    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            // Logo & Timeline Line
            VStack(spacing: 0) {
                ZStack {
                    if let logo = experience.logo, let url = URL(string: logo) {
                        AsyncImage(url: url) { image in
                            image.resizable().aspectRatio(contentMode: .fit)
                        } placeholder: {
                            Image(systemName: "building.2.fill").foregroundColor(Theme.textMuted)
                        }
                        .frame(width: 32, height: 32)
                    } else {
                        Image(systemName: "building.2.fill")
                            .font(.system(size: 20))
                            .foregroundColor(Theme.primary)
                    }
                }
                
                if !isLast {
                    Rectangle()
                        .fill(Color.gray.opacity(0.1))
                        .frame(width: 2)
                        .padding(.vertical, 4)
                }
            }
            
            VStack(alignment: .leading, spacing: 4) {
                Text(experience.title)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(Theme.textMain)
                
                Text(experience.company)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(Theme.textMain)
                
                if let location = experience.location {
                    Text(location)
                        .font(.system(size: 12))
                        .foregroundColor(Theme.textSecondary)
                }
                
                Text("\(experience.startDate ?? "") - \(experience.current ? "Present" : (experience.endDate ?? ""))")
                    .font(.system(size: 12))
                    .foregroundColor(Theme.textSecondary)
                    .padding(.top, 2)
                
                if let description = experience.description {
                    Text(description)
                        .font(.system(size: 13))
                        .foregroundColor(Theme.textSecondary)
                        .padding(.top, 4)
                }
            }
            .padding(.bottom, isLast ? 0 : 24)
        }
    }
}
