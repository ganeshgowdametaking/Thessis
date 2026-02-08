import SwiftUI
import MapKit
import Supabase

struct CreateReferralView: View {
    @Environment(\.dismiss) var dismiss
    
    @StateObject private var locationHelper = LocationSearchService()
    @State private var isCreating = false
    @State private var errorMessage: String?
    @State private var showingError = false
    @State private var showingSuggestions = false
    
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
                            
                            HStack(alignment: .top, spacing: 16) {
                                formField(label: "Department", placeholder: "Design", text: $department)
                                
                                VStack(alignment: .leading, spacing: 8) {
                                    Text("Location")
                                        .font(.system(size: 14, weight: .bold))
                                        .foregroundColor(Theme.textMain)
                                        .padding(.leading, 4)
                                    
                                    VStack(spacing: 0) {
                                        HStack {
                                            if let userId = AuthManager.shared.currentUser?.id.uuidString {
                                                // Just a placeholder for the icon if needed
                                            }
                                            Image(systemName: "location.fill")
                                                .font(.system(size: 16))
                                                .foregroundColor(Theme.textMuted)
                                                .padding(.leading, 12)
                                            
                                            ZStack(alignment: .leading) {
                                                if location.isEmpty {
                                                    Text("City")
                                                        .font(.system(size: 15))
                                                        .foregroundColor(Theme.textMuted.opacity(0.6))
                                                }
                                                TextField("", text: Binding(
                                                    get: { location },
                                                    set: { 
                                                        location = $0
                                                        locationHelper.searchQuery = $0
                                                        showingSuggestions = !$0.isEmpty
                                                    }
                                                ))
                                                .font(.system(size: 15))
                                                .foregroundColor(Theme.textMain)
                                            }
                                            .padding(14)
                                        }
                                        .background(Color.white)
                                        .cornerRadius(12)
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 12)
                                                .stroke(Color.gray.opacity(0.15), lineWidth: 1)
                                        )
                                        
                                        if showingSuggestions && !locationHelper.completions.isEmpty {
                                            VStack(alignment: .leading, spacing: 0) {
                                                ForEach(locationHelper.completions, id: \.self) { completion in
                                                    Button {
                                                        location = completion.title
                                                        showingSuggestions = false
                                                    } label: {
                                                        VStack(alignment: .leading, spacing: 2) {
                                                            Text(completion.title)
                                                                .font(.system(size: 14, weight: .semibold))
                                                                .foregroundColor(Theme.textMain)
                                                            Text(completion.subtitle)
                                                                .font(.system(size: 12))
                                                                .foregroundColor(Theme.textMuted)
                                                        }
                                                        .padding(.horizontal, 16)
                                                        .padding(.vertical, 10)
                                                        .frame(maxWidth: .infinity, alignment: .leading)
                                                    }
                                                    Divider().padding(.horizontal, 8)
                                                }
                                            }
                                            .background(Color.white)
                                            .cornerRadius(12)
                                            .shadow(color: Color.black.opacity(0.1), radius: 5, x: 0, y: 5)
                                            .padding(.top, 4)
                                        }
                                    }
                                }
                                .zIndex(10)
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
                                                .foregroundColor(Theme.textMuted.opacity(0.6))
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
                    Task {
                        await handleCreateReferral()
                    }
                } label: {
                    if isCreating {
                        ProgressView().tint(.white)
                    } else {
                        Text("Create Referral")
                            .font(.system(size: 17, weight: .bold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 56)
                            .background(Theme.primary)
                            .cornerRadius(12)
                            .shadow(color: Theme.primary.opacity(0.2), radius: 10, x: 0, y: 5)
                    }
                }
                .disabled(isCreating || jobTitle.isEmpty || company.isEmpty)
                .padding(.horizontal, 20)
                .padding(.bottom, 20)
            }
        }
        .navigationBarHidden(true)
        .alert("Error", isPresented: $showingError) {
            Button("OK", role: .cancel) { }
        } message: {
            Text(errorMessage ?? "Unknown error occurred")
        }
    }
    
    var headerView: some View {
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
                
                ZStack(alignment: .leading) {
                    if text.wrappedValue.isEmpty {
                        Text(placeholder)
                            .font(.system(size: 15))
                            .foregroundColor(Theme.textMuted.opacity(0.6))
                    }
                    TextField("", text: text)
                        .font(.system(size: 15))
                        .foregroundColor(Theme.textMain)
                }
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
                    
                    ZStack(alignment: .leading) {
                        if currentSkill.isEmpty {
                            Text("Add a skill and press Enter...")
                                .font(.system(size: 14))
                                .foregroundColor(Theme.textMuted.opacity(0.6))
                        }
                        TextField("", text: $currentSkill)
                            .font(.system(size: 14))
                            .foregroundColor(Theme.textMain)
                            .submitLabel(.done)
                            .onSubmit {
                                if !currentSkill.isEmpty && !skills.contains(currentSkill) {
                                    skills.append(currentSkill)
                                    currentSkill = ""
                                }
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
    
    private func handleCreateReferral() async {
        guard let userId = AuthManager.shared.currentUser?.id.uuidString else {
            errorMessage = "User not authenticated."
            showingError = true
            return
        }
        
        isCreating = true
        
        let job = JobInsert(
            title: jobTitle,
            company: company,
            department: department.isEmpty ? nil : department,
            location: location,
            jobType: jobType == "Select Type" ? "Full-time" : jobType,
            experienceLevel: experienceLevel == "Select Level" ? "Mid-Level" : experienceLevel,
            description: description,
            skills: skills,
            remoteAvailable: isRemote,
            urgentHiring: isUrgent,
            createdBy: userId,
            status: "active",
            createdAt: ISO8601DateFormatter().string(from: Date())
        )
        
        do {
            try await JobService.shared.createJob(job)
            await MainActor.run {
                isCreating = false
                dismiss()
            }
        } catch {
            await MainActor.run {
                isCreating = false
                errorMessage = error.localizedDescription
                showingError = true
            }
        }
    }
}
