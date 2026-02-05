import SwiftUI

struct JobDetailsView: View {
    let job: Job
    @Environment(\.dismiss) var dismiss
    @State private var isStarred = false
    
    var body: some View {
        ZStack {
            Theme.stoneBg.ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Header
                headerView
                
                ScrollView(showsIndicators: false) {
                    VStack(alignment: .center, spacing: 24) {
                        // Company Info
                        VStack(spacing: 16) {
                            ZStack {
                                RoundedRectangle(cornerRadius: 16)
                                    .fill(Color.white)
                                    .shadow(color: Color.black.opacity(0.05), radius: 10, x: 0, y: 4)
                                
                                Image(systemName: job.logo ?? "briefcase.fill")
                                    .font(.system(size: 36))
                                    .foregroundColor(Color(hex: job.logoBg ?? "#5F7261"))
                            }
                            .frame(width: 80, height: 80)
                            
                            VStack(spacing: 4) {
                                Text(job.title)
                                    .font(.system(size: 24, weight: .heavy))
                                    .foregroundColor(Theme.textMain)
                                    .multilineTextAlignment(.center)
                                
                                Text("\(job.company) • \(job.location)")
                                    .font(.system(size: 16, weight: .medium))
                                    .foregroundColor(Theme.textSecondary)
                            }
                        }
                        .padding(.top, 8)
                        
                        // Quick Stats
                        HStack(spacing: 12) {
                            statBadge(icon: "payments", text: job.salary ?? "Competitive")
                            statBadge(icon: "schedule", text: "Posted \(job.postedDate ?? "Recently")")
                        }
                        
                        Divider().padding(.horizontal, 24).padding(.vertical, 8)
                        
                        // About Section
                        VStack(alignment: .leading, spacing: 12) {
                            Text("About the Role")
                                .font(.system(size: 18, weight: .bold))
                                .foregroundColor(Theme.textMain)
                            
                            Text(job.about)
                                .font(.system(size: 16))
                                .lineSpacing(6)
                                .foregroundColor(Theme.textSecondary)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 24)
                        
                        // Responsibilities Section
                        VStack(alignment: .leading, spacing: 16) {
                            Text("Responsibilities")
                                .font(.system(size: 18, weight: .bold))
                                .foregroundColor(Theme.textMain)
                            
                            VStack(alignment: .leading, spacing: 12) {
                                ForEach(job.responsibilities ?? [], id: \.self) { resp in
                                    HStack(alignment: .top, spacing: 12) {
                                        ZStack {
                                            Circle()
                                                .fill(Theme.primary.opacity(0.1))
                                                .frame(width: 22, height: 22)
                                            Image(systemName: "checkmark")
                                                .font(.system(size: 10, weight: .bold))
                                                .foregroundColor(Theme.primary)
                                        }
                                        .padding(.top, 2)
                                        
                                        Text(resp)
                                            .font(.system(size: 16))
                                            .foregroundColor(Theme.textSecondary)
                                    }
                                }
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 24)
                        
                        // Skills Section
                        VStack(alignment: .leading, spacing: 16) {
                            Text("Skills & Requirements")
                                .font(.system(size: 18, weight: .bold))
                                .foregroundColor(Theme.textMain)
                            
                            FlowLayout(spacing: 8) {
                                ForEach(job.skills ?? [], id: \.self) { skill in
                                    Text(skill)
                                        .font(.system(size: 14, weight: .medium))
                                        .padding(.horizontal, 16)
                                        .padding(.vertical, 10)
                                        .background(Color.white)
                                        .cornerRadius(20)
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 20)
                                                .stroke(Color.gray.opacity(0.1), lineWidth: 1)
                                        )
                                        .shadow(color: Color.black.opacity(0.02), radius: 2, x: 0, y: 1)
                                }
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 24)
                        
                        // Hiring Manager Section
                        VStack(alignment: .leading, spacing: 16) {
                            Text("Hiring Manager")
                                .font(.system(size: 18, weight: .bold))
                                .foregroundColor(Theme.textMain)
                            
                            HStack(spacing: 16) {
                                Image(systemName: job.hiringManagerImage ?? "person.crop.circle.fill")
                                    .font(.system(size: 44))
                                    .foregroundColor(Theme.primary.opacity(0.3))
                                    .frame(width: 56, height: 56)
                                    .background(Color.white)
                                    .clipShape(Circle())
                                    .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
                                
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(job.hiringManagerName ?? "Hiring Manager")
                                        .font(.system(size: 16, weight: .bold))
                                        .foregroundColor(Theme.textMain)
                                    Text(job.hiringManagerTitle ?? "Recruiter")
                                        .font(.system(size: 14))
                                        .foregroundColor(Theme.textSecondary)
                                }
                                
                                Spacer()
                                
                                Button {
                                } label: {
                                    Text("Message")
                                        .font(.system(size: 14, weight: .bold))
                                        .padding(.horizontal, 16)
                                        .padding(.vertical, 8)
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 10)
                                                .stroke(Theme.primary, lineWidth: 1.5)
                                        )
                                        .foregroundColor(Theme.primary)
                                }
                            }
                            .padding(16)
                            .background(Color.white)
                            .cornerRadius(16)
                            .shadow(color: Color.black.opacity(0.04), radius: 10, x: 0, y: 4)
                        }
                        .padding(.horizontal, 24)
                        .padding(.bottom, 120) // Give space for footer
                    }
                }
            }
            
            // Sticky Footer
            VStack {
                Spacer()
                VStack(spacing: 0) {
                    Divider()
                    HStack {
                        Button {
                            // Apply logic
                        } label: {
                            HStack {
                                Text("Apply Now")
                                    .font(.system(size: 18, weight: .bold))
                                Image(systemName: "arrow.right")
                                    .font(.system(size: 16, weight: .bold))
                            }
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 56)
                            .background(Theme.primary)
                            .cornerRadius(16)
                            .shadow(color: Theme.primary.opacity(0.2), radius: 10, x: 0, y: 5)
                        }
                    }
                    .padding(20)
                    .padding(.bottom, 12) // Extra bottom padding for home indicator
                    .background(Color.white.opacity(0.95))
                    .blur(radius: 0) // Just to ensure clean background
                }
                .background(Color.white)
                .shadow(color: Color.black.opacity(0.05), radius: 10, x: 0, y: -5)
            }
            .ignoresSafeArea(edges: .bottom)
        }
        .navigationBarHidden(true)
    }
    
    var headerView: some View {
        HStack {
            Button {
                dismiss()
            } label: {
                Image(systemName: "arrow.left")
                    .font(.system(size: 20))
                    .foregroundColor(Theme.textMain)
                    .frame(width: 44, height: 44)
                    .background(Color.white)
                    .clipShape(Circle())
                    .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 1)
            }
            
            Spacer()
            
            Text("Job Details")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(Theme.textMain)
            
            Spacer()
            
            Button {
                withAnimation { isStarred.toggle() }
            } label: {
                Image(systemName: isStarred ? "bookmark.fill" : "bookmark")
                    .font(.system(size: 20))
                    .foregroundColor(isStarred ? Theme.primary : Theme.textMain)
                    .frame(width: 44, height: 44)
            }
        }
        .padding(.horizontal, 20)
        .padding(.top, 12)
    }
    
    func statBadge(icon: String, text: String) -> some View {
        HStack(spacing: 8) {
            Image(systemName: icon == "payments" ? "banknote" : "clock")
                .font(.system(size: 16))
                .foregroundColor(Theme.primary)
            Text(text)
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(Theme.textMain)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(Color.gray.opacity(0.05))
        .cornerRadius(10)
    }
}


