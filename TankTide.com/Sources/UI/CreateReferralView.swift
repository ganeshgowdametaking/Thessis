import SwiftUI

struct CreateReferralView: View {
    @Environment(\.dismiss) var dismiss
    
    // Form State
    @State private var jobTitle = ""
    @State private var company = ""
    @State private var department = ""
    @State private var location = ""
    @State private var jobType = "Select Type"
    @State private var experienceLevel = "Select Level"
    @State private var description = ""
    @State private var currentSkill = ""
    @State private var skills: [String] = ["UX Design", "Figma", "Prototyping"]
    @State private var isRemote = true
    @State private var isUrgent = false
    
    let jobTypes = ["Full-time", "Contract", "Part-time", "Freelance"]
    let experienceLevels = ["Internship", "Junior", "Mid-Level", "Senior", "Lead", "Executive"]
    
    var body: some View {
        ZStack {
            Theme.stoneBg.ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Header
                headerView
                
                ScrollView(showsIndicators: false) {
                    VStack(spacing: 28) {
                        // Basic Info Section
                        VStack(spacing: 16) {
                            formField(label: "Job Title", placeholder: "e.g. Senior Product Designer", text: $jobTitle)
                            formField(label: "Company", placeholder: "e.g. Sage & Stone", text: $company)
                            
                            HStack(spacing: 16) {
                                formField(label: "Department", placeholder: "Design", text: $department)
                                formField(label: "Location", placeholder: "City", text: $location, icon: "location.on")
                            }
                        }
                        
                        // Classification Section
                        HStack(spacing: 16) {
                            formMenu(label: "Job Type", selection: $jobType, options: jobTypes)
                            formMenu(label: "Experience Level", selection: $experienceLevel, options: experienceLevels)
                        }
                        
                        // Description Section
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Job Description")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(Theme.textMain)
                                .padding(.leading, 4)
                            
                            TextEditor(text: $description)
                                .font(.system(size: 15))
                                .foregroundColor(Theme.textMain)
                                .scrollContentBackground(.hidden) // Important for custom background
                                .frame(minHeight: 140)
                                .padding(12)
                                .background(Color.white)
                                .cornerRadius(12)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(Color.gray.opacity(0.15), lineWidth: 1)
                                )
                                .overlay(
                                    Group {
                                        if description.isEmpty {
                                            Text("Briefly describe the role, key responsibilities...")
                                                .font(.system(size: 15))
                                                .foregroundColor(Theme.textMuted.opacity(0.5))
                                                .padding(.leading, 16)
                                                .padding(.top, 20)
                                        }
                                    },
                                    alignment: .topLeading
                                )
                        }
                        
                        // Skills Section
                        skillsSection
                        
                        // Toggles Section
                        VStack(spacing: 12) {
                            toggleRow(title: "Remote Friendly", subtitle: "Position allows remote work", icon: "public", iconColor: .blue, isOn: $isRemote)
                            toggleRow(title: "Urgent Priority", subtitle: "Mark as high priority hire", icon: "notification_important", iconColor: .orange, isOn: $isUrgent)
                        }
                        
                        // Padding for bottom button
                        Spacer().frame(height: 100)
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 20)
                }
            }
            
            // Fixed Footer Button
            VStack {
                Spacer()
                Button {
                    // Create Referral Action
                    dismiss()
                } label: {
                    Text("Create Referral")
                        .font(.system(size: 17, weight: .bold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 56)
                        .background(Theme.primary)
                        .cornerRadius(12)
                        .shadow(color: Theme.primary.opacity(0.2), radius: 10, x: 0, y: 5)
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 20)
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
                    .background(Color.black.opacity(0.05))
                    .clipShape(Circle())
            }
            
            Spacer()
            
            Text("Create Referral")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(Theme.textMain)
                .tracking(-0.5)
            
            Spacer()
            
            NavigationLink(destination: MyReferralsView()) {
                Image(systemName: "folder.badge.person.crop")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(Theme.primary)
                    .frame(width: 44, height: 44)
                    .background(Color.black.opacity(0.05))
                    .clipShape(Circle())
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 8)
        .padding(.bottom, 8)
        .background(Theme.stoneBg)
    }
    
    func formField(label: String, placeholder: String, text: Binding<String>, icon: String? = nil) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label)
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(Theme.textMain)
                .padding(.leading, 4)
            
            HStack {
                if let icon = icon {
                    Image(systemName: icon == "location.on" ? "location.fill" : icon)
                        .font(.system(size: 16))
                        .foregroundColor(Theme.textMuted)
                        .padding(.leading, 12)
                }
                
                TextField(placeholder, text: text)
                    .font(.system(size: 15))
                    .padding(14)
            }
            .background(Color.white)
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.gray.opacity(0.15), lineWidth: 1)
            )
        }
    }
    
    func formMenu(label: String, selection: Binding<String>, options: [String]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label)
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(Theme.textMain)
                .padding(.leading, 4)
            
            Menu {
                ForEach(options, id: \.self) { option in
                    Button(option) {
                        selection.wrappedValue = option
                    }
                }
            } label: {
                HStack {
                    Text(selection.wrappedValue)
                        .font(.system(size: 15))
                        .foregroundColor(selection.wrappedValue.contains("Select") ? Theme.textMuted.opacity(0.5) : Theme.textMain)
                    
                    Spacer()
                    
                    Image(systemName: "chevron.down")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(Theme.textMuted)
                }
                .padding(.horizontal, 14)
                .frame(height: 54)
                .background(Color.white)
                .cornerRadius(12)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.gray.opacity(0.15), lineWidth: 1)
                )
            }
        }
    }
    
    var skillsSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Required Skills")
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(Theme.textMain)
                .padding(.leading, 4)
            
            VStack(alignment: .leading, spacing: 12) {
                FlowLayout(spacing: 8) {
                    ForEach(skills, id: \.self) { skill in
                        HStack(spacing: 6) {
                            Text(skill)
                                .font(.system(size: 13, weight: .semibold))
                            
                            Button {
                                skills.removeAll { $0 == skill }
                            } label: {
                                Image(systemName: "xmark")
                                    .font(.system(size: 10, weight: .bold))
                                    .padding(4)
                                    .background(Theme.primary.opacity(0.1))
                                    .clipShape(Circle())
                            }
                        }
                        .padding(.leading, 12)
                        .padding(.trailing, 6)
                        .padding(.vertical, 8)
                        .background(Theme.primary.opacity(0.08))
                        .foregroundColor(Theme.primary)
                        .cornerRadius(8)
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.primary.opacity(0.1), lineWidth: 1))
                    }
                }
                
                HStack {
                    Image(systemName: "plus")
                        .font(.system(size: 16))
                        .foregroundColor(Theme.textMuted)
                    
                    TextField("Add a skill and press Enter...", text: $currentSkill)
                        .font(.system(size: 14))
                        .submitLabel(.done)
                        .onSubmit {
                            if !currentSkill.isEmpty && !skills.contains(currentSkill) {
                                skills.append(currentSkill)
                                currentSkill = ""
                            }
                        }
                }
                .padding(.vertical, 4)
            }
            .padding(16)
            .background(Color.white)
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.gray.opacity(0.15), lineWidth: 1)
            )
        }
    }
    
    func toggleRow(title: String, subtitle: String, icon: String, iconColor: Color, isOn: Binding<Bool>) -> some View {
        HStack(spacing: 14) {
            ZStack {
                RoundedRectangle(cornerRadius: 8)
                    .fill(iconColor.opacity(0.1))
                    .frame(width: 40, height: 40)
                
                Image(systemName: icon == "public" ? "globe" : "exclamationmark.triangle.fill")
                    .font(.system(size: 18))
                    .foregroundColor(iconColor)
            }
            
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(Theme.textMain)
                Text(subtitle)
                    .font(.system(size: 12))
                    .foregroundColor(Theme.textMuted)
            }
            
            Spacer()
            
            Toggle("", isOn: isOn)
                .labelsHidden()
                .tint(Theme.primary)
        }
        .padding(14)
        .background(Color.white)
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.02), radius: 8, x: 0, y: 4)
    }
}
