import SwiftUI

struct EditProfileView: View {
     @Environment(\.dismiss) var dismiss
    @State private var name = UserProfile.sample.name
    @State private var headline = UserProfile.sample.title ?? ""
    @State private var location = UserProfile.sample.location ?? ""
    @State private var bio = "Passionate product designer with a love for minimalist architecture and sustainable tech. Building the future of digital interactions."
    
    var body: some View {
        ZStack {
            Theme.stoneBg.ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Header
                headerView
                
                ScrollView(showsIndicators: false) {
                    VStack(spacing: 24) {
                        // Media Section
                        mediaSection
                        
                        // Basic Info Form
                        VStack(spacing: 20) {
                            formField(label: "Display Name", text: $name)
                            formField(label: "Headline", text: $headline)
                            formField(label: "Location", text: $location, icon: "location.fill")
                            
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Bio")
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundColor(Theme.textMain)
                                
                                TextEditor(text: $bio)
                                    .font(.system(size: 15))
                                    .frame(minHeight: 100)
                                    .padding(12)
                                    .background(Color.white)
                                    .cornerRadius(12)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 12)
                                            .stroke(Color.gray.opacity(0.15), lineWidth: 1)
                                    )
                            }
                        }
                        .padding(.horizontal, 20)
                        
                        VStack(spacing: 32) {
                            let expItems: [(String, String)] = (UserProfile.sample.experiences ?? []).map { 
                                ($0.title, "\($0.company) • \($0.startDate ?? "")-\($0.endDate ?? "Present")")
                            }
                            historySection(title: "Experience", items: expItems)
                            
                            let eduItems: [(String, String)] = (UserProfile.sample.education ?? []).map { 
                                ($0.degree, "\($0.school) • \($0.startDate ?? "")-\($0.endDate ?? "Present")")
                            }
                            historySection(title: "Education", items: eduItems)
                        }
                        .padding(.horizontal, 20)
                        .padding(.bottom, 40)
                    }
                }
            }
        }
    }
    
    var headerView: some View {
        HStack {
            Button {
                dismiss()
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(Theme.textSecondary)
                    .frame(width: 44, height: 44)
            }
            
            Spacer()
            
            Text("Edit Profile")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(Theme.textMain)
            
            Spacer()
            
            Button {
                // Save action
                dismiss()
            } label: {
                Text("Save")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(Theme.primary)
                    .frame(width: 60, height: 44)
            }
        }
        .padding(.horizontal, 12)
        .padding(.top, 8)
        .background(Theme.stoneBg)
    }
    
    var mediaSection: some View {
        VStack(spacing: 0) {
            // Cover Photo
            ZStack {
                Rectangle()
                    .fill(LinearGradient(colors: [Theme.primary.opacity(0.2), Theme.primary.opacity(0.05)], startPoint: .top, endPoint: .bottom))
                    .frame(height: 140)
                    .cornerRadius(16)
                
                Button { } label: {
                    Image(systemName: "camera.fill")
                        .font(.system(size: 20))
                        .foregroundColor(.white)
                        .padding(12)
                        .background(Color.black.opacity(0.3))
                        .clipShape(Circle())
                }
            }
            .padding(.horizontal, 20)
            
            // Avatar Editor
            ZStack(alignment: .bottomTrailing) {
                Image(systemName: UserProfile.sample.avatar ?? "person.crop.circle.fill")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 100, height: 100)
                    .clipShape(Circle())
                    .overlay(Circle().stroke(Theme.stoneBg, lineWidth: 4))
                    .shadow(color: Color.black.opacity(0.1), radius: 8, x: 0, y: 4)
                
                Button { } label: {
                    Image(systemName: "pencil")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(Theme.primary)
                        .padding(8)
                        .background(Color.white)
                        .clipShape(Circle())
                        .shadow(color: Color.black.opacity(0.1), radius: 4, x: 0, y: 2)
                        .overlay(Circle().stroke(Color.gray.opacity(0.1), lineWidth: 1))
                }
                .offset(x: 2, y: 2)
            }
            .padding(.top, -50)
        }
    }
    
    func formField(label: String, text: Binding<String>, icon: String? = nil) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label)
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(Theme.textMain)
            
            HStack {
                if let icon = icon {
                    Image(systemName: icon)
                        .font(.system(size: 16))
                        .foregroundColor(Theme.textMuted)
                        .padding(.leading, 12)
                }
                
                TextField(label, text: text)
                    .font(.system(size: 15))
                    .padding(12)
            }
            .background(Color.white)
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.gray.opacity(0.15), lineWidth: 1)
            )
        }
    }
    
    func historySection(title: String, items: [(String, String)]) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(title)
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(Theme.textMain)
            
            VStack(spacing: 12) {
                ForEach(0..<items.count, id: \.self) { index in
                    HStack(spacing: 16) {
                        Image(systemName: "line.3.horizontal")
                            .foregroundColor(Theme.textMuted.opacity(0.5))
                        
                        VStack(alignment: .leading, spacing: 2) {
                            Text(items[index].0)
                                .font(.system(size: 15, weight: .bold))
                                .foregroundColor(Theme.textMain)
                            Text(items[index].1)
                                .font(.system(size: 13))
                                .foregroundColor(Theme.textSecondary)
                        }
                        
                        Spacer()
                        
                        Button { } label: {
                            Image(systemName: "pencil")
                                .foregroundColor(Theme.primary)
                        }
                    }
                    .padding(12)
                    .background(Color.white.opacity(0.5))
                    .cornerRadius(12)
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.gray.opacity(0.1), lineWidth: 1))
                }
                
                Button { } label: {
                    HStack {
                        Image(systemName: "plus")
                        Text("Add \(title)")
                    }
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(Theme.primary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Theme.primary.opacity(0.3), style: StrokeStyle(lineWidth: 2, dash: [6]))
                            .background(Theme.primary.opacity(0.02))
                    )
                }
                .padding(.top, 4)
            }
        }
    }
}
