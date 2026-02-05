import SwiftUI

struct SearchView: View {
    @State private var searchText = "Product Designer"
    @State private var selectedTab = 0 // 0: People, 1: Companies
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        NavigationStack {
            ZStack {
                Theme.stoneBg.ignoresSafeArea()
                
                VStack(spacing: 0) {
                    // Header
                    headerView
                    
                    // Segmented Control
                    tabBar
                    
                    ScrollView(showsIndicators: false) {
                        VStack(spacing: 16) {
                            if selectedTab == 0 {
                                peopleResults
                            } else {
                                companyResults
                            }
                            
                            // End of list indicator
                            loadingIndicator
                        }
                        .padding(.horizontal, 20)
                        .padding(.top, 16)
                        .padding(.bottom, 100)
                    }
                }
            }
        }
    }
    
    var headerView: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 12) {
                Button {
                    // Back logic if needed
                } label: {
                    Image(systemName: "arrow.left")
                        .font(.system(size: 20))
                        .foregroundColor(Theme.textMain)
                        .frame(width: 44, height: 44)
                        .background(Color.white.opacity(0.1))
                        .clipShape(Circle())
                }
                
                HStack {
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: 18))
                        .foregroundColor(Theme.textMuted)
                    
                    TextField("Search", text: $searchText)
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(Theme.textMain)
                    
                    if !searchText.isEmpty {
                        Button {
                            searchText = ""
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundColor(Theme.textMuted)
                        }
                    }
                }
                .padding(.horizontal, 16)
                .frame(height: 50)
                .background(Color.white)
                .cornerRadius(25)
                .shadow(color: Color.black.opacity(0.04), radius: 8, x: 0, y: 4)
            }
            
            Text("\(selectedTab == 0 ? "14" : "5") results found")
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(Theme.textSecondary)
                .padding(.leading, 56)
        }
        .padding(.horizontal, 16)
        .padding(.top, 12)
        .padding(.bottom, 12)
    }
    
    var tabBar: some View {
        HStack(spacing: 0) {
            tabButton(title: "People (14)", index: 0)
            tabButton(title: "Companies (5)", index: 1)
        }
        .padding(4)
        .background(Color.white)
        .cornerRadius(30)
        .padding(.horizontal, 20)
        .shadow(color: Color.black.opacity(0.02), radius: 10, x: 0, y: 5)
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
                .shadow(color: index == selectedTab ? Theme.primary.opacity(0.3) : .clear, radius: 8, x: 0, y: 4)
        }
    }
    
    var peopleResults: some View {
        VStack(spacing: 12) {
            ForEach([UserProfile.sample], id: \.name) { person in
                SearchResultPersonRow(person: person)
            }
        }
    }
    
    var companyResults: some View {
        VStack(spacing: 12) {
            ForEach(SearchCompany.samples) { company in
                SearchResultCompanyRow(company: company)
            }
        }
    }
    
    var loadingIndicator: some View {
        HStack(spacing: 4) {
            Circle()
                .fill(Theme.primary.opacity(0.4))
                .frame(width: 4, height: 4)
            Circle()
                .fill(Theme.primary.opacity(0.4))
                .frame(width: 4, height: 4)
            Circle()
                .fill(Theme.primary.opacity(0.4))
                .frame(width: 4, height: 4)
        }
        .padding(.vertical, 24)
    }
}
