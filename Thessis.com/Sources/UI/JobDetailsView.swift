import SwiftUI
import UniformTypeIdentifiers
import Supabase

struct JobDetailsView: View {
    let job: Job
    @Environment(\.dismiss) var dismiss
    @State private var isStarred = false
    private var hasApplied: Bool {
        appService.myApplications.contains { $0.jobId == job.id }
    }
    @State private var showingApplySheet = false
    @State private var showingFilePicker = false
    @State private var email = AuthManager.shared.currentUser?.email ?? ""
    @State private var selectedResume: URL?
    @State private var isApplying = false
    @State private var showSuccessAlert = false
    @State private var errorMessage: String?
    
    @StateObject private var appService = ApplicationService.shared
    
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
                            statBadge(icon: "schedule", text: "Posted \(job.postedDate ?? "Recently")")
                        }
                        
                        // Apply Now Button
                        if hasApplied {
                            HStack {
                                Text("Applied")
                                    .font(.system(size: 18, weight: .bold))
                                Image(systemName: "checkmark.circle.fill")
                                    .font(.system(size: 16, weight: .bold))
                            }
                            .foregroundColor(Theme.primary)
                            .frame(maxWidth: .infinity)
                            .frame(height: 56)
                            .background(Theme.primary.opacity(0.1))
                            .cornerRadius(16)
                            .padding(.horizontal, 24)
                        } else {
                            Button {
                                showingApplySheet = true
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
                            .padding(.horizontal, 24)
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
                        .padding(.bottom, 40)
                    }
                }
            }
        }
        .navigationBarHidden(true)
        .onAppear {
            Task {
                await appService.fetchMyApplications()
            }
        }
        .sheet(isPresented: $showingApplySheet) {
            applySheet
        }
    }
    
    var applySheet: some View {
        NavigationView {
            ZStack {
                Theme.stoneBg.ignoresSafeArea()
                
                VStack(spacing: 28) {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Email Address")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(Theme.textSecondary)
                        
                        TextField("Enter your email", text: $email)
                            .padding()
                            .foregroundColor(Theme.textMain)
                            .background(Theme.stoneSurface)
                            .cornerRadius(14)
                            .overlay(
                                RoundedRectangle(cornerRadius: 14)
                                    .stroke(Color.black.opacity(0.05), lineWidth: 1)
                            )
                            .keyboardType(.emailAddress)
                            .autocapitalization(.none)
                    }
                    
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Resume")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(Theme.textSecondary)
                        
                        Button {
                            showingFilePicker = true
                        } label: {
                            HStack {
                                Image(systemName: "doc.fill")
                                    .font(.system(size: 20))
                                    .foregroundColor(Theme.primary)
                                
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(selectedResume?.lastPathComponent ?? "Select Resume")
                                        .font(.system(size: 16, weight: .semibold))
                                        .foregroundColor(selectedResume == nil ? Theme.textMuted : Theme.primary)
                                    
                                    if selectedResume == nil {
                                        Text("PDF or DOCX supported")
                                            .font(.system(size: 12))
                                            .foregroundColor(Theme.textMuted)
                                    }
                                }
                                
                                Spacer()
                                
                                Image(systemName: selectedResume == nil ? "plus.circle.fill" : "checkmark.circle.fill")
                                    .font(.system(size: 24))
                                    .foregroundColor(selectedResume == nil ? Theme.textMuted.opacity(0.5) : Theme.primary)
                            }
                            .padding(20)
                            .frame(maxWidth: .infinity)
                            .background(Theme.stoneSurface)
                            .cornerRadius(16)
                            .overlay(
                                RoundedRectangle(cornerRadius: 16)
                                    .stroke(selectedResume == nil ? Color.black.opacity(0.05) : Theme.primary.opacity(0.3), lineWidth: 1.5)
                            )
                        }
                    }
                    .fileImporter(
                        isPresented: $showingFilePicker,
                        allowedContentTypes: [.pdf, .rtf, UTType(filenameExtension: "docx")!],
                        allowsMultipleSelection: false
                    ) { result in
                        switch result {
                        case .success(let urls):
                            selectedResume = urls.first
                        case .failure(let error):
                            errorMessage = error.localizedDescription
                        }
                    }
                    
                    if let error = errorMessage {
                        HStack(spacing: 8) {
                            Image(systemName: "exclamationmark.triangle.fill")
                            Text(error)
                        }
                        .foregroundColor(Theme.urgent)
                        .font(.system(size: 14, weight: .medium))
                        .padding()
                        .background(Theme.urgent.opacity(0.1))
                        .cornerRadius(10)
                    }
                    
                    Spacer()
                    
                    Button {
                        Task {
                            await handleApply()
                        }
                    } label: {
                        if isApplying {
                            ProgressView().tint(.white)
                        } else {
                            HStack(spacing: 12) {
                                Text("Submit Application")
                                    .font(.system(size: 18, weight: .bold))
                                Image(systemName: "paperplane.fill")
                                    .font(.system(size: 16))
                            }
                        }
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 60)
                    .background(selectedResume == nil || email.isEmpty ? Color.gray.opacity(0.3) : Theme.primary)
                    .cornerRadius(18)
                    .shadow(color: (selectedResume == nil || email.isEmpty ? Color.clear : Theme.primary.opacity(0.3)), radius: 10, x: 0, y: 5)
                    .disabled(isApplying || email.isEmpty || selectedResume == nil)
                    .padding(.bottom, 10)
                }
                .padding(24)
            }
            .navigationTitle("Job Application")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button {
                        showingApplySheet = false
                    } label: {
                        Text("Cancel")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(Theme.textMain)
                    }
                }
            }
        }
    }
    
    func handleApply() async {
        guard let resumeURL = selectedResume else {
            errorMessage = "Please select a resume."
            return
        }
        
        isApplying = true
        errorMessage = nil
        
        do {
            // Start accessing the security-scoped resource
            if resumeURL.startAccessingSecurityScopedResource() {
                defer { resumeURL.stopAccessingSecurityScopedResource() }
                
                let fileData = try Data(contentsOf: resumeURL)
                let base64String = fileData.base64EncodedString()
                let mimeType = resumeURL.pathExtension.lowercased() == "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                let dataURI = "data:\(mimeType);base64,\(base64String)"
                
                try await appService.applyToJob(
                    jobId: job.id,
                    email: email,
                    resumeBase64: dataURI
                )
                
                await MainActor.run {
                    isApplying = false
                    showingApplySheet = false
                }
            } else {
                errorMessage = "Could not access the file."
                isApplying = false
            }
        } catch {
            await MainActor.run {
                errorMessage = error.localizedDescription
                isApplying = false
            }
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
            
            Text("Job Details")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(Theme.textMain)
            
            Spacer()
            
            // Empty space to maintain center alignment of title
            Spacer().frame(width: 44)
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


