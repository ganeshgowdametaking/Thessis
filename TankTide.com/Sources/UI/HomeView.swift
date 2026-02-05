import SwiftUI
import Supabase

struct HomeView: View {
    @StateObject private var jobService = JobService.shared
    @State private var searchText = ""
    @State private var selectedTab = 0
    @State private var showingCreateReferral = false
    @State private var showingFilters = false
    
    @State private var shouldNavigateToResults = false
    
    var body: some View {
        TabView(selection: $selectedTab) {
            jobReferralsView
                .tabItem {
                    Image(systemName: "briefcase")
                }
                .tag(0)
            
            AnalyticsView()
                .tabItem {
                    Image(systemName: "chart.bar.xaxis")
                }
                .tag(1)
            
            MessagesView()
                .tabItem {
                    Image(systemName: "bubble.left")
                }
                .tag(2)
            
            NotificationsView()
                .tabItem {
                    Image(systemName: "bell")
                }
                .tag(3)
            
            ProfileView()
                .tabItem {
                    Image(systemName: "person")
                }
                .tag(4)
        }
        .accentColor(Theme.primary)
        .onAppear {
            Task {
                await jobService.fetchJobs()
            }
        }
    }
    
    var jobReferralsView: some View {
        NavigationStack {
            ZStack {
                Theme.stoneBg.ignoresSafeArea()
                
                VStack(spacing: 0) {
                // Header
                headerView
                .sheet(isPresented: $showingFilters) {
                    JobFilterView(jobs: jobService.jobs)
                }
                .navigationDestination(isPresented: $showingCreateReferral) {
                    CreateReferralView()
                }
                
                ScrollView(showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 20) {
                        // Search Bar
                        searchBar
                        
                        // Recommendations Section
                        VStack(alignment: .leading, spacing: 16) {
                            HStack {
                                Text("Recommended for you")
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundColor(Theme.textSecondary)
                                    .kerning(1.2)
                                    .textCase(.uppercase)
                                Spacer()
                            }
                            
                            if jobService.isLoading {
                                ProgressView()
                                    .frame(maxWidth: .infinity, minHeight: 100)
                            } else if jobService.jobs.isEmpty {
                                Text("No jobs found")
                                    .foregroundColor(Theme.textMuted)
                                    .frame(maxWidth: .infinity, minHeight: 100)
                            } else {
                                VStack(spacing: 12) {
                                    ForEach(jobService.jobs) { job in
                                        JobCardView(job: job)
                                    }
                                }
                            }
                        }
                    }
                    .padding(20)
                }
            }
            .navigationDestination(isPresented: $shouldNavigateToResults) {
                JobSearchResultsView(searchText: searchText, allJobs: jobService.jobs)
            }
            .onTapGesture {
                hideKeyboard()
            }
        }
    }
}
    
    var headerView: some View {
        HStack {
            Text("Job Referrals")
                .font(.system(size: 24, weight: .bold))
                .foregroundColor(Theme.textMain)
            
            Spacer()
            
            Button {
                showingCreateReferral = true
            } label: {
                Image(systemName: "plus.circle.fill")
                .font(.system(size: 22))
                .foregroundColor(Theme.primary)
                .frame(width: 44, height: 44)
                .background(Color.white)
                .clipShape(Circle())
                .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
            }
            
            Button {
                showingFilters = true
            } label: {
                Image(systemName: "line.3.horizontal.decrease.circle")
                .font(.system(size: 22))
                .foregroundColor(Theme.textMain)
                .frame(width: 44, height: 44)
                .background(Color.white)
                .clipShape(Circle())
                .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
            }
        }
        .padding(.horizontal, 20)
        .padding(.top, 24)
        .padding(.bottom, 12)
    }
    
    var searchBar: some View {
        HStack {
            Image(systemName: "magnifyingglass")
                .foregroundColor(Theme.textSecondary)
            
            TextField("Search roles or companies...", text: $searchText)
                .font(.system(size: 14))
                .foregroundColor(Theme.textMain)
                .onSubmit {
                    if !searchText.isEmpty {
                       shouldNavigateToResults = true
                    }
                }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .background(Color.white)
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.02), radius: 8, x: 0, y: 4)
    }
    
    func placeholderView(title: String, systemImage: String) -> some View {
        VStack(spacing: 20) {
            Image(systemName: systemImage)
                .font(.system(size: 60))
                .foregroundColor(Theme.primary.opacity(0.2))
            Text("\(title) View")
                .font(.headline)
                .foregroundColor(Theme.textMuted)
            
            if title == "Profile" {
                Button("Sign Out") {
                    Task {
                        try? await AuthManager.shared.client.auth.signOut()
                    }
                }
                .foregroundColor(.red)
                .padding(.top, 20)
            }
        }
    }
}

