import SwiftUI

struct JobSearchResultsView: View {
    let searchText: String
    let allJobs: [Job]
    @Environment(\.dismiss) var dismiss
    
    @State private var selectedTab = 0 // 0: Jobs, 1: People
    @StateObject private var profileService = ProfileService.shared
    @State private var foundProfiles: [UserProfile] = []
    
    var filteredJobs: [Job] {
        if searchText.isEmpty {
            return allJobs
        } else {
            return allJobs.filter {
                $0.title.localizedCaseInsensitiveContains(searchText) ||
                $0.company.localizedCaseInsensitiveContains(searchText)
            }
        }
    }
    
    var body: some View {
        ZStack {
            Theme.stoneBg.ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Header
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
                    
                    Text("Results for \"\(searchText)\"")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(Theme.textMain)
                        .lineLimit(1)
                    
                    Spacer()
                    
                    // Invisible spacer for balance
                    Color.clear.frame(width: 44, height: 44)
                }
                .padding(.horizontal, 20)
                .padding(.top, 12)
                .padding(.bottom, 16)
                
                // Tabs
                HStack(spacing: 0) {
                    tabButton(title: "Jobs (\(filteredJobs.count))", index: 0)
                    tabButton(title: "People (\(foundProfiles.count))", index: 1)
                }
                .padding(4)
                .background(Color.white)
                .cornerRadius(30)
                .padding(.horizontal, 20)
                .padding(.bottom, 16)
                .shadow(color: Color.black.opacity(0.02), radius: 10, x: 0, y: 5)
                
                ScrollView(showsIndicators: false) {
                    if selectedTab == 0 {
                        // Jobs List
                        VStack(alignment: .leading, spacing: 16) {
                            if filteredJobs.isEmpty {
                                emptyStateView(type: "jobs")
                            } else {
                                VStack(spacing: 12) {
                                    ForEach(filteredJobs) { job in
                                        JobCardView(job: job)
                                    }
                                }
                                .padding(.horizontal, 20)
                            }
                        }
                        .padding(.bottom, 40)
                    } else {
                        // People List
                        VStack(alignment: .leading, spacing: 16) {
                            if profileService.isLoading {
                                ProgressView()
                                    .padding(.top, 40)
                            } else if foundProfiles.isEmpty {
                                emptyStateView(type: "people")
                            } else {
                                VStack(spacing: 12) {
                                    ForEach(Array(foundProfiles.enumerated()), id: \.offset) { _, person in
                                        SearchResultPersonRow(person: person)
                                    }
                                }
                                .padding(.horizontal, 20)
                            }
                        }
                        .padding(.bottom, 40)
                    }
                }
            }
        }
        .navigationBarHidden(true)
        .onAppear {
            performSearch()
        }
    }
    
    func emptyStateView(type: String) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 48))
                .foregroundColor(Theme.textMuted.opacity(0.5))
            
            let status = AuthManager.shared.currentUser == nil ? " (Not Logged In)" : ""
            Text("No \(type) found matching \"\(searchText)\"" + status)
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(Theme.textSecondary)
                .multilineTextAlignment(.center)
            
            if AuthManager.shared.currentUser == nil {
                Text("Please sign in to search for people.")
                    .font(.system(size: 12))
                    .foregroundColor(Theme.textMuted)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 60)
    }
    
    func tabButton(title: String, index: Int) -> some View {
        Button {
            withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                selectedTab = index
            }
        } label: {
            Text(title)
                .font(.system(size: 14, weight: index == selectedTab ? .bold : .medium))
                .foregroundColor(index == selectedTab ? .white : Theme.textSecondary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(index == selectedTab ? Theme.primary : Color.clear)
                .cornerRadius(25)
        }
    }

    func performSearch() {
        Task {
            // Fetch connections and applications first so results show correct button status
            await ConnectionService.shared.fetchConnections()
            await ApplicationService.shared.fetchMyApplications()
            
            // Always fetch profiles too when searching
            let profiles = await profileService.searchProfiles(query: searchText)
            await MainActor.run {
                self.foundProfiles = profiles
            }
        }
    }
}
