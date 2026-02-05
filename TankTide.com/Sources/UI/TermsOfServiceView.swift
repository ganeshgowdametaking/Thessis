import SwiftUI

struct TermsOfServiceView: View {
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        ZStack {
            Theme.stoneBg.ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Header
                headerView
                
                ScrollView(showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 0) {
                        // Meta Info
                        metaSection
                        
                        // Sections
                        VStack(spacing: 32) {
                            legalSection(number: 1, title: "Introduction", content: "Welcome to Sage & Stone. By accessing or using our mobile application, website, or any of our network and referral services (collectively, the \"Service\"), you agree to be bound by these Terms of Service (\"Terms\") and our Privacy Policy.")
                            
                            definitionsSection
                            
                            eligibilitySection
                            
                            legalSection(number: 4, title: "User Conduct", content: "You agree not to use the Service for any unlawful purpose or in any way that interrupts, damages, impairs, or renders the Service less efficient. You agree to respect the intellectual property rights of Sage & Stone and third parties.")
                            
                            // Contact Card
                            contactCard
                        }
                        .padding(.horizontal, 20)
                        
                        // Padding for scroll
                        Spacer().frame(height: 50)
                    }
                }
            }
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
                    .foregroundColor(Theme.primary)
                    .frame(width: 44, height: 44)
            }
            
            Spacer()
            
            Text("Terms of Service")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(Theme.textMain)
                .tracking(-0.5)
            
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
    
    var metaSection: some View {
        VStack(spacing: 4) {
            Text("Last Updated: October 24, 2023")
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(Theme.textSecondary)
            Text("Please read these terms carefully before using our services.")
                .font(.system(size: 12))
                .foregroundColor(Theme.textMuted)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 24)
    }
    
    func legalSection(number: Int, title: String, content: String) -> some View {
        HStack(alignment: .top, spacing: 16) {
            sectionNumber(number)
            
            VStack(alignment: .leading, spacing: 8) {
                Text(title)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(Theme.textMain)
                Text(content)
                    .font(.system(size: 14))
                    .foregroundColor(Theme.textSecondary)
                    .lineSpacing(4)
            }
        }
    }
    
    var definitionsSection: some View {
        HStack(alignment: .top, spacing: 16) {
            sectionNumber(2)
            
            VStack(alignment: .leading, spacing: 12) {
                Text("Definitions")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(Theme.textMain)
                
                Text("For the purposes of these Terms:")
                    .font(.system(size: 14))
                    .foregroundColor(Theme.textSecondary)
                
                VStack(alignment: .leading, spacing: 12) {
                    definitionRow(icon: "leaf.fill", term: "Service", definition: "refers to the Sage & Stone application and content provided therein.")
                    definitionRow(icon: "person.fill", term: "User", definition: "means you, the individual accessing or using the Service.")
                    definitionRow(icon: "doc.text.fill", term: "Content", definition: "refers to text, images, audio, video, and data available on the Service.")
                }
            }
        }
    }
    
    var eligibilitySection: some View {
        HStack(alignment: .top, spacing: 16) {
            sectionNumber(3)
            
            VStack(alignment: .leading, spacing: 12) {
                Text("Eligibility")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(Theme.textMain)
                
                Text("To use the Service, you represent and warrant that:")
                    .font(.system(size: 14))
                    .foregroundColor(Theme.textSecondary)
                
                VStack(alignment: .leading, spacing: 10) {
                    eligibilityItem("You are at least 18 years of age.")
                    eligibilityItem("You have not been previously suspended or removed from the Service.")
                    eligibilityItem("Your registration and your use of the Service is in compliance with all applicable laws.")
                }
            }
        }
    }
    
    func sectionNumber(_ number: Int) -> some View {
        Text("\(number)")
            .font(.system(size: 14, weight: .bold))
            .foregroundColor(Theme.textSecondary)
            .frame(width: 32, height: 32)
            .background(Color.gray.opacity(0.1))
            .clipShape(Circle())
    }
    
    func definitionRow(icon: String, term: String, definition: String) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: icon)
                .font(.system(size: 14))
                .foregroundColor(Theme.primary)
                .frame(width: 18, height: 18)
                .padding(.top, 2)
            
            Text("**\"\(term)\"** \(definition)")
                .font(.system(size: 14))
                .foregroundColor(Theme.textSecondary)
        }
    }
    
    func eligibilityItem(_ text: String) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Circle()
                .fill(Theme.primary)
                .frame(width: 6, height: 6)
                .padding(.top, 6)
            
            Text(text)
                .font(.system(size: 14))
                .foregroundColor(Theme.textSecondary)
        }
    }
    
    var contactCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(Theme.primary.opacity(0.1))
                        .frame(width: 40, height: 40)
                    Image(systemName: "gavel.fill")
                        .foregroundColor(Theme.primary)
                }
                
                VStack(alignment: .leading, spacing: 2) {
                    Text("Legal Team")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(Theme.textMain)
                    Text("Questions about our terms?")
                        .font(.system(size: 12))
                        .foregroundColor(Theme.textMuted)
                }
            }
            
            VStack(alignment: .leading, spacing: 10) {
                Label {
                    Text("123 Mindfulness Way, Suite 400\nSan Francisco, CA 94107")
                        .font(.system(size: 14))
                        .foregroundColor(Theme.textSecondary)
                } icon: {
                    Image(systemName: "location.fill")
                        .foregroundColor(Theme.textMuted)
                }
                
                Link(destination: URL(string: "mailto:legal@sageandstone.com")!) {
                    Label {
                        Text("legal@sageandstone.com")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(Theme.primary)
                    } icon: {
                        Image(systemName: "envelope.fill")
                            .foregroundColor(Theme.textMuted)
                    }
                }
            }
        }
        .padding(20)
        .background(Color.white)
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.04), radius: 10, x: 0, y: 5)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.gray.opacity(0.1), lineWidth: 1)
        )
    }
}
