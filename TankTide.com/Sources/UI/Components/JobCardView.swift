import SwiftUI

struct JobCardView: View {
    let job: Job
    
    var body: some View {
        NavigationLink(destination: JobDetailsView(job: job)) {
            VStack(alignment: .leading, spacing: 16) {
                HStack(alignment: .top) {
                    // Logo Container
                    ZStack {
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color(hex: job.logoBg ?? "#5F7261"))
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(Color.black.opacity(0.05), lineWidth: 1)
                            )
                        
                        Image(systemName: job.logo ?? "briefcase.fill")
                            .foregroundColor(.white)
                            .font(.system(size: 24))
                    }
                    .frame(width: 56, height: 56)
                    
                    VStack(alignment: .leading, spacing: 4) {
                        Text(job.title)
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(Theme.textMain)
                        
                        Text("\(job.company) • \(job.location)")
                            .font(.system(size: 14))
                            .foregroundColor(Theme.textSecondary)
                            .lineLimit(1)
                            .truncationMode(.tail)
                    }
                    .padding(.top, 2)
                    
                    Spacer()
                    
                    // Top-Right Badge
                    if job.isUrgent == true {
                        Text("Urgent")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(Theme.urgent)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 4)
                            .background(Theme.urgent.opacity(0.1))
                            .cornerRadius(20)
                    } else if job.isNew == true {
                        Text("New")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(Theme.primary)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 4)
                            .background(Theme.primary.opacity(0.1))
                            .cornerRadius(20)
                    }
                }
                
                // Tags
                HStack(spacing: 8) {
                    TagView(text: job.type, color: Theme.stoneBg)
                    TagView(text: job.workType, color: Theme.stoneBg)
                }
            }
            .padding(16)
            .background(Color.white)
            .cornerRadius(16)
            .shadow(color: Color.black.opacity(0.05), radius: 8, x: 0, y: 2)
        }
        .buttonStyle(PlainButtonStyle()) // Avoid blue tint
    }
}

struct TagView: View {
    let text: String
    let color: Color
    var textColor: Color = Theme.stone300
    
    var body: some View {
        Text(text)
            .font(.system(size: 10, weight: .bold))
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(color)
            .foregroundColor(textColor)
            .cornerRadius(6)
    }
}

