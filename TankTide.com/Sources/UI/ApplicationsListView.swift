import SwiftUI

struct ApplicationsListView: View {
    @StateObject private var appService = ApplicationService.shared
    @Environment(\.dismiss) var dismiss
    @State private var searchText = ""
    @State private var selectedTab = "All"
    
    let tabs = ["All (42)", "Pending (35)", "Shortlisted (7)"]
    
    var applicants: [Applicant] {
        let baseList = appService.applicants.isEmpty ? Applicant.samples : appService.applicants
        if searchText.isEmpty {
            return baseList
        } else {
            return baseList.filter {
                $0.name.localizedCaseInsensitiveContains(searchText) ||
                $0.role.localizedCaseInsensitiveContains(searchText) ||
                $0.company.localizedCaseInsensitiveContains(searchText)
            }
        }
    }
    
    var body: some View {
        ZStack {
            Theme.stoneBg.ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Header
                headerView
                
                ScrollView(showsIndicators: false) {
                    if appService.isLoading && appService.applicants.isEmpty {
                        ProgressView()
                            .padding(.top, 40)
                    } else {
                        VStack(alignment: .leading, spacing: 0) {
                            // Title Section
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Senior Product Designer")
                                    .font(.system(size: 24, weight: .bold))
                                    .foregroundColor(Theme.textMain)
                                
                                HStack(spacing: 6) {
                                    Image(systemName: "person.2.fill")
                                        .font(.system(size: 14))
                                    Text("\(applicants.count) Total Applicants")
                                        .font(.system(size: 14, weight: .medium))
                                }
                                .foregroundColor(Theme.primary)
                            }
                            .padding(.horizontal, 20)
                            .padding(.top, 16)
                            
                            // Tabs
                            VStack(spacing: 0) {
                                ScrollView(.horizontal, showsIndicators: false) {
                                    HStack(spacing: 24) {
                                        ForEach(tabs, id: \.self) { tab in
                                            Button {
                                                selectedTab = tab
                                            } label: {
                                                VStack(spacing: 12) {
                                                    Text(tab)
                                                        .font(.system(size: 14, weight: selectedTab == tab ? .bold : .medium))
                                                        .foregroundColor(selectedTab == tab ? Theme.textMain : Theme.textMuted)
                                                    
                                                    Rectangle()
                                                        .fill(selectedTab == tab ? Theme.primary : Color.clear)
                                                        .frame(height: 3)
                                                        .cornerRadius(1.5)
                                                }
                                            }
                                        }
                                    }
                                    .padding(.horizontal, 20)
                                }
                                Divider()
                                    .background(Color.gray.opacity(0.1))
                            }
                            .padding(.top, 16)
                            
                            // Search & Filter
                            HStack(spacing: 12) {
                                HStack {
                                    Image(systemName: "magnifyingglass")
                                        .foregroundColor(Theme.textSecondary)
                                    TextField("Search candidates...", text: $searchText)
                                        .font(.system(size: 15))
                                }
                                .padding(.horizontal, 16)
                                .frame(height: 48)
                                .background(Color.white)
                                .cornerRadius(14)
                                .shadow(color: Color.black.opacity(0.02), radius: 8, x: 0, y: 4)
                                
                                Button {
                                    // Filter action
                                } label: {
                                    Image(systemName: "slider.horizontal.3")
                                        .font(.system(size: 20))
                                        .foregroundColor(.white)
                                        .frame(width: 48, height: 48)
                                        .background(Theme.primary)
                                        .cornerRadius(14)
                                        .shadow(color: Theme.primary.opacity(0.2), radius: 8, x: 0, y: 4)
                                }
                            }
                            .padding(.horizontal, 20)
                            .padding(.top, 24)
                            
                            // Applicant List
                            VStack(spacing: 16) {
                                ForEach(applicants) { applicant in
                                    NavigationLink(destination: ApplicantDetailsView(applicant: applicant)) {
                                        ApplicantCard(applicant: applicant)
                                    }
                                    .buttonStyle(PlainButtonStyle())
                                }
                            }
                            .padding(.horizontal, 20)
                            .padding(.top, 24)
                            .padding(.bottom, 100)
                        }
                    }
                }
            }
        }
        .navigationBarHidden(true)
        .onAppear {
            Task {
                await appService.fetchApplicants()
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
            
            HStack(spacing: 8) {
                Image(systemName: "leaf.fill")
                    .foregroundColor(Theme.primary)
                    .font(.system(size: 20))
                Text("Sage & Stone")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(Theme.textMain)
                    .tracking(-0.5)
            }
            
            Spacer()
            
            Button {
                // Profile action
            } label: {
                Image(systemName: "person.crop.circle.fill")
                    .resizable()
                    .frame(width: 36, height: 36)
                    .foregroundColor(Theme.textMuted)
                    .overlay(
                        Circle()
                            .stroke(Color.gray.opacity(0.1), lineWidth: 1)
                    )
            }
        }
        .padding(.horizontal, 20)
        .padding(.top, 12)
        .padding(.bottom, 8)
        .background(Theme.stoneBg.opacity(0.95))
    }
}

struct ApplicantCard: View {
    let applicant: Applicant
    
    var body: some View {
        VStack(spacing: 20) {
            HStack(alignment: .top, spacing: 16) {
                // Avatar with Status
                ZStack(alignment: .bottomTrailing) {
                    Circle()
                        .fill(Theme.stoneSurface)
                        .frame(width: 56, height: 56)
                    
                    AsyncImage(url: URL(string: applicant.imageUrl)) { image in
                        image.resizable()
                    } placeholder: {
                        Color.gray.opacity(0.1)
                    }
                    .frame(width: 56, height: 56)
                    .clipShape(Circle())
                    .overlay(Circle().stroke(Color.white, lineWidth: 2))
                    
                    Circle()
                        .fill(applicant.status.color)
                        .frame(width: 14, height: 14)
                        .overlay(Circle().stroke(Color.white, lineWidth: 2))
                        .offset(x: 2, y: 2)
                }
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(applicant.name)
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(Theme.textMain)
                    
                    Text("\(applicant.role) @ \(applicant.company)")
                        .font(.system(size: 14))
                        .foregroundColor(Theme.textSecondary)
                    
                    HStack(spacing: 4) {
                        Image(systemName: "location.fill")
                            .font(.system(size: 10))
                        Text(applicant.location)
                            .font(.system(size: 12))
                    }
                    .foregroundColor(Theme.textMuted)
                    .padding(.top, 4)
                }
                
                Spacer()
            }
            
            HStack(spacing: 12) {
                Button {
                    // View Profile
                } label: {
                    Text("View Profile")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(Theme.primary)
                        .frame(maxWidth: .infinity)
                        .frame(height: 44)
                        .background(Color.white)
                        .cornerRadius(10)
                        .overlay(
                            RoundedRectangle(cornerRadius: 10)
                                .stroke(Theme.primary.opacity(0.5), lineWidth: 1)
                        )
                }
                
                Button {
                    // Shortlist
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "checkmark")
                            .font(.system(size: 12, weight: .bold))
                        Text("Shortlist")
                            .font(.system(size: 14, weight: .bold))
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 44)
                    .background(Theme.primary)
                    .cornerRadius(10)
                    .shadow(color: Theme.primary.opacity(0.2), radius: 5, x: 0, y: 2)
                }
            }
        }
        .padding(16)
        .background(Color.white)
        .cornerRadius(20)
        .shadow(color: Color.black.opacity(0.02), radius: 10, x: 0, y: 5)
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .stroke(Color.gray.opacity(0.05), lineWidth: 1)
        )
    }
}


