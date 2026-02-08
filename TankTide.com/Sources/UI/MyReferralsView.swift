import SwiftUI

struct MyReferralsView: View {
    @StateObject private var appService = ApplicationService.shared
    @State private var selectedFilter: ReferralStatus? = nil // nil means "All"
    @State private var showingCreateReferral = false
    
    var stats: ReferralStats {
        let referrals = appService.myReferrals
        let total = referrals.count
        let applicants = referrals.reduce(0) { $0 + $1.applicantCount }
        let active = referrals.filter { $0.status == .active }.count
        
        return ReferralStats(
            totalReferrals: total,
            totalApplicants: applicants,
            activeReferrals: active
        )
    }
    
    var allReferrals: [MyReferral] {
        appService.myReferrals
    }
    
    var filteredReferrals: [MyReferral] {
        let referrals = allReferrals
        if let filter = selectedFilter {
            return referrals.filter { $0.status == filter }
        }
        return referrals
    }
    
    var body: some View {
        NavigationStack {
            ZStack {
                Theme.stoneBg.ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Header
                headerView
                
                ScrollView(showsIndicators: false) {
                    if appService.isLoading && appService.myReferrals.isEmpty {
                        ProgressView()
                            .padding(.top, 40)
                    } else {
                        VStack(spacing: 24) {
                            // Stats Carousel
                            statsCarousel
                            
                            // Filters
                            filterBar
                            
                            // Referral List
                            if filteredReferrals.isEmpty {
                                emptyState
                            } else {
                                VStack(spacing: 16) {
                                    ForEach(filteredReferrals) { referral in
                                        NavigationLink(destination: ApplicationsListView(referral: referral)) {
                                            MyReferralRow(referral: referral)
                                        }
                                        .buttonStyle(PlainButtonStyle())
                                    }
                                }
                                .padding(.horizontal, 20)
                            }
                            
                            Spacer().frame(height: 100)
                        }
                        .padding(.top, 16)
                    }
                }
            }
            }
        }
        .navigationDestination(isPresented: $showingCreateReferral) {
            CreateReferralView()
        }
        .onAppear {
            Task {
                await appService.fetchMyReferrals()
            }
        }
    }
    
    var headerView: some View {
        HStack {
            Text("My Referrals")
                .font(.system(size: 24, weight: .bold))
                .foregroundColor(Theme.textMain)
            
            Spacer()
            
            Button {
                showingCreateReferral = true
            } label: {
                Image(systemName: "plus")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(.white)
                    .frame(width: 44, height: 44)
                    .background(Theme.primary)
                    .clipShape(Circle())
                    .shadow(color: Theme.primary.opacity(0.3), radius: 8, x: 0, y: 4)
            }
        }
        .padding(.horizontal, 20)
        .padding(.top, 20)
        .padding(.bottom, 12)
        .background(Theme.stoneBg)
    }
    
    var statsCarousel: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 16) {
                ReferralStatCard(title: "Total", icon: "folder.badge.person.crop", value: "\(stats.totalReferrals)", subtitle: "Referrals made", iconColor: Theme.primary)
                ReferralStatCard(title: "Applicants", icon: "person.2.fill", value: "\(stats.totalApplicants)", subtitle: "Received", iconColor: Theme.primary)
                ReferralStatCard(title: "Active", icon: "checkmark.circle.fill", value: "\(stats.activeReferrals)", subtitle: "In progress", iconColor: Color(hex: "8FB399"))
            }
            .padding(.horizontal, 20)
        }
    }
    
    var filterBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                filterButton(title: "All", status: nil)
                filterButton(title: "Active", status: .active, dotColor: Color(hex: "8FB399"))
                filterButton(title: "Closed", status: .closed)
                filterButton(title: "Draft", status: .draft)
            }
            .padding(.horizontal, 20)
        }
    }
    
    func filterButton(title: String, status: ReferralStatus?, dotColor: Color? = nil) -> some View {
        Button {
            withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                selectedFilter = status
            }
        } label: {
            HStack(spacing: 8) {
                Text(title)
                    .font(.system(size: 14, weight: selectedFilter == status ? .bold : .medium))
                
                if let dotColor = dotColor {
                    Circle()
                        .fill(dotColor)
                        .frame(width: 6, height: 6)
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 10)
            .background(selectedFilter == status ? Theme.textMain : Color.white)
            .foregroundColor(selectedFilter == status ? .white : Theme.textMain)
            .cornerRadius(25)
            .shadow(color: selectedFilter == status ? Color.black.opacity(0.1) : Color.black.opacity(0.02), radius: 8, x: 0, y: 4)
            .overlay(
                RoundedRectangle(cornerRadius: 25)
                    .stroke(Color.gray.opacity(0.1), lineWidth: selectedFilter == status ? 0 : 1)
            )
        }
    }
    
    var emptyState: some View {
        VStack(spacing: 20) {
            ZStack {
                Circle()
                    .fill(Color(hex: "e7f0f3"))
                    .frame(width: 80, height: 80)
                Image(systemName: "doc.badge.plus")
                    .font(.system(size: 32))
                    .foregroundColor(Color(hex: "4e8597"))
            }
            
            VStack(spacing: 8) {
                Text("No referrals yet")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(Theme.textMain)

            }
            
            Button {
                showingCreateReferral = true
            } label: {
                Text("Create your first referral")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(Theme.primary)
            }
        }
        .padding(.top, 60)
    }
}
