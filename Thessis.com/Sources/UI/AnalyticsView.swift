import SwiftUI

struct AnalyticsView: View {
    @StateObject private var analyticsService = AnalyticsService.shared
    @State private var selectedTab = "Overview"
    let tabs = ["Overview", "Sessions", "EU Visitors", "Conversions"]
    
    var body: some View {
        ZStack {
            Theme.stoneBg.ignoresSafeArea()
            
            VStack(spacing: 0) {
                headerView
                
                ScrollView(showsIndicators: false) {
                    VStack(spacing: 24) {
                        // Chips
                        HStack(spacing: 12) {
                            StatusChip(icon: "circle.fill", label: "Live", color: Theme.primary, isLive: true)
                            StatusChip(icon: "checkmark.circle.fill", label: "Updated", color: Theme.sage, isLive: false)
                            Spacer()
                        }
                        .padding(.horizontal, 20)
                        
                        // Tabs
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 24) {
                                ForEach(tabs, id: \.self) { tab in
                                    Button {
                                        withAnimation { selectedTab = tab }
                                    } label: {
                                        VStack(spacing: 12) {
                                            Text(tab)
                                                .font(.system(size: 14, weight: .bold))
                                                .foregroundColor(selectedTab == tab ? Theme.textMain : Theme.textMuted)
                                            
                                            Rectangle()
                                                .fill(selectedTab == tab ? Theme.primary : Color.clear)
                                                .frame(height: 3)
                                        }
                                    }
                                }
                            }
                            .padding(.horizontal, 20)
                        }
                        
                        if analyticsService.isLoading {
                            ProgressView()
                                .frame(height: 200)
                        } else {
                            // Metric Grid
                            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                                MetricCardTrend(
                                    icon: "group",
                                    title: "Total Users",
                                    value: "\(analyticsService.totalUsers)",
                                    trend: "+12%",
                                    color: Theme.primary
                                )
                                
                                MetricCardStatus(
                                    icon: "work",
                                    title: "Active Jobs",
                                    value: "\(analyticsService.activeJobs)",
                                    status: "Live"
                                )
                                
                                MetricCardSimple(
                                    icon: "description",
                                    title: "Applications",
                                    value: "\(analyticsService.totalApplications)"
                                )
                                
                                MetricCardProgress(
                                    icon: "verified",
                                    title: "Verified",
                                    value: "74%",
                                    progress: 0.74,
                                    color: Theme.gold
                                )
                            }
                            .padding(.horizontal, 20)
                            
                            // Growth Analysis
                            GrowthAnalysisChart()
                                .padding(.horizontal, 20)
                            
                            // Top Companies
                            TopCompaniesChart(volumes: analyticsService.topCompanies)
                                .padding(.horizontal, 20)
                                .padding(.bottom, 100)
                        }
                    }
                    .padding(.top, 12)
                }
            }
        }
        .onAppear {
            Task {
                await analyticsService.refreshAnalytics()
            }
        }
    }
    
    var headerView: some View {
        HStack(alignment: .bottom) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Analytics")
                    .font(.system(size: 32, weight: .black))
                    .foregroundColor(Theme.textMain)
                    .tracking(-1)
                Text("Dashboard")
                    .font(.system(size: 32, weight: .black))
                    .foregroundColor(Theme.textMain)
                    .tracking(-1)
            }
            
            Spacer()
            
            Button { } label: {
                ZStack {
                    Circle()
                        .fill(Color.white)
                        .frame(width: 44, height: 44)
                        .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
                    
                    Image(systemName: "bell.fill")
                        .font(.system(size: 20))
                        .foregroundColor(Theme.sage)
                }
            }
        }
        .padding(.horizontal, 20)
        .padding(.top, 24)
        .padding(.bottom, 12)
        .background(Theme.stoneBg.opacity(0.95))
    }
}

// MARK: - Components

struct StatusChip: View {
    let icon: String
    let label: String
    let color: Color
    let isLive: Bool
    
    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: icon)
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(color)
            
            Text(label.uppercased())
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(Theme.textMain)
                .tracking(1)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(isLive ? color.opacity(0.1) : Color.white)
        .cornerRadius(20)
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .stroke(isLive ? color.opacity(0.2) : Color.gray.opacity(0.1), lineWidth: 1)
        )
    }
}

struct MetricCardTrend: View {
    let icon: String
    let title: String
    let value: String
    let trend: String
    let color: Color
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                ZStack {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(Theme.stoneBg)
                        .frame(width: 36, height: 36)
                    Image(systemName: icon == "group" ? "person.2.fill" : "circle")
                        .font(.system(size: 16))
                        .foregroundColor(Theme.sage)
                }
                
                Spacer()
                
                HStack(spacing: 2) {
                    Text(trend)
                        .font(.system(size: 10, weight: .bold))
                    Image(systemName: "arrow.up.right")
                        .font(.system(size: 8, weight: .bold))
                }
                .foregroundColor(color)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(color.opacity(0.1))
                .cornerRadius(20)
            }
            .padding(.bottom, 24)
            
            Text(title)
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(Theme.textMuted)
            
            Text(value)
                .font(.system(size: 24, weight: .black))
                .foregroundColor(Theme.textMain)
            
            // Mini sparkline representation
            Path { path in
                path.move(to: CGPoint(x: 0, y: 20))
                path.addCurve(to: CGPoint(x: 100, y: 5), control1: CGPoint(x: 30, y: 25), control2: CGPoint(x: 70, y: 0))
            }
            .stroke(color, lineWidth: 2)
            .frame(height: 25)
            .padding(.top, 8)
        }
        .padding(16)
        .background(Color.white)
        .cornerRadius(20)
        .shadow(color: Color.black.opacity(0.02), radius: 10, x: 0, y: 5)
    }
}

struct MetricCardStatus: View {
    let icon: String
    let title: String
    let value: String
    let status: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ZStack {
                RoundedRectangle(cornerRadius: 8)
                    .fill(Theme.stoneBg)
                    .frame(width: 36, height: 36)
                Image(systemName: "briefcase.fill")
                    .font(.system(size: 16))
                    .foregroundColor(Theme.sage)
            }
            .padding(.bottom, 24)
            
            Text(title)
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(Theme.textMuted)
            
            Text(value)
                .font(.system(size: 24, weight: .black))
                .foregroundColor(Theme.textMain)
            
            HStack(spacing: 4) {
                Circle()
                    .fill(Theme.primary)
                    .frame(width: 6, height: 6)
                Text(status)
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(Theme.sage)
            }
            .padding(.top, 12)
        }
        .padding(16)
        .background(Color.white)
        .cornerRadius(20)
        .shadow(color: Color.black.opacity(0.02), radius: 10, x: 0, y: 5)
    }
}

struct MetricCardSimple: View {
    let icon: String
    let title: String
    let value: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ZStack {
                RoundedRectangle(cornerRadius: 8)
                    .fill(Theme.stoneBg)
                    .frame(width: 36, height: 36)
                Image(systemName: "doc.text.fill")
                    .font(.system(size: 16))
                    .foregroundColor(Theme.sage)
            }
            .padding(.bottom, 24)
            
            Text(title)
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(Theme.textMuted)
            
            Text(value)
                .font(.system(size: 24, weight: .black))
                .foregroundColor(Theme.textMain)
        }
        .padding(16)
        .background(Color.white)
        .cornerRadius(20)
        .shadow(color: Color.black.opacity(0.02), radius: 10, x: 0, y: 5)
    }
}

struct MetricCardProgress: View {
    let icon: String
    let title: String
    let value: String
    let progress: Double
    let color: Color
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ZStack {
                RoundedRectangle(cornerRadius: 8)
                    .fill(Theme.stoneBg)
                    .frame(width: 36, height: 36)
                Image(systemName: "checkmark.seal.fill")
                    .font(.system(size: 16))
                    .foregroundColor(Theme.sage)
            }
            .padding(.bottom, 24)
            
            HStack {
                Text(title)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(Theme.textMuted)
                Spacer()
                Text(value)
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(Theme.textMain)
            }
            
            ZStack(alignment: .leading) {
                Capsule()
                    .fill(Theme.stoneBg)
                    .frame(height: 8)
                Capsule()
                    .fill(color)
                    .frame(width: 60, height: 8) // Simplified representation
            }
            .padding(.top, 8)
        }
        .padding(16)
        .background(Color.white)
        .cornerRadius(20)
        .shadow(color: Color.black.opacity(0.02), radius: 10, x: 0, y: 5)
    }
}

struct GrowthAnalysisChart: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Growth Analysis")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(Theme.textMain)
                    Text("User acquisition over 6 months")
                        .font(.system(size: 12))
                        .foregroundColor(Theme.textMuted)
                }
                Spacer()
                Image(systemName: "ellipsis")
                    .foregroundColor(Theme.textMuted)
            }
            
            HStack(alignment: .bottom, spacing: 12) {
                // Y-axis
                VStack {
                    Text("30k")
                    Spacer()
                    Text("20k")
                    Spacer()
                    Text("10k")
                    Spacer()
                    Text("0k")
                }
                .font(.system(size: 10, weight: .medium))
                .foregroundColor(Theme.textMuted)
                .frame(height: 150)
                
                // Chart Area
                ZStack {
                    // Grid lines
                    VStack {
                        Divider()
                        Spacer()
                        Divider()
                        Spacer()
                        Divider()
                        Spacer()
                        Divider()
                    }
                    
                    // Area Chart (Simplified Path)
                    AreaChartShape()
                        .fill(
                            LinearGradient(
                                colors: [Theme.sage.opacity(0.3), Theme.sage.opacity(0)],
                                startPoint: .top,
                                endPoint: .bottom
                            )
                        )
                    
                    AreaChartShape()
                        .stroke(Theme.sage, lineWidth: 2)
                }
                .frame(height: 150)
            }
            
            // X-axis
            HStack {
                Spacer().frame(width: 30) // Offset for Y-axis
                Group {
                    Text("Jan")
                    Spacer()
                    Text("Feb")
                    Spacer()
                    Text("Mar")
                    Spacer()
                    Text("Apr")
                    Spacer()
                    Text("May")
                    Spacer()
                    Text("Jun")
                }
                .font(.system(size: 10, weight: .medium))
                .foregroundColor(Theme.textMuted)
            }
        }
        .padding(20)
        .background(Color.white)
        .cornerRadius(24)
        .shadow(color: Color.black.opacity(0.03), radius: 15, x: 0, y: 8)
    }
}

struct AreaChartShape: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: 0, y: rect.height * 0.9))
        path.addCurve(to: CGPoint(x: rect.width * 0.3, y: rect.height * 0.7), control1: CGPoint(x: rect.width * 0.15, y: rect.height * 0.8), control2: CGPoint(x: rect.width * 0.2, y: rect.height * 0.7))
        path.addCurve(to: CGPoint(x: rect.width * 0.6, y: rect.height * 0.5), control1: CGPoint(x: rect.width * 0.4, y: rect.height * 0.7), control2: CGPoint(x: rect.width * 0.5, y: rect.height * 0.6))
        path.addCurve(to: CGPoint(x: rect.width, y: rect.height * 0.1), control1: CGPoint(x: rect.width * 0.8, y: rect.height * 0.3), control2: CGPoint(x: rect.width * 0.9, y: rect.height * 0.2))
        
        // For line path, don't close. For fill path, we'd add lines to bottom corners.
        // We'll handle fill by adding lines in the fill variant if needed or use this as line and a variant for fill.
        // Actually for simplicity in fill, we add:
        // path.addLine(to: CGPoint(x: rect.width, y: rect.height))
        // path.addLine(to: CGPoint(x: 0, y: rect.height))
        // path.closeSubpath()
        return path
    }
}

struct TopCompaniesChart: View {
    let volumes: [CompanyVolume]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Top Companies")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(Theme.textMain)
                    Text("Hiring volume by company")
                        .font(.system(size: 12))
                        .foregroundColor(Theme.textMuted)
                }
                Spacer()
                Text("Filter")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(Theme.sage)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(Theme.stoneBg)
                    .cornerRadius(6)
            }
            
            HStack(alignment: .bottom, spacing: 16) {
                ForEach(volumes) { item in
                    VStack(spacing: 8) {
                        ZStack(alignment: .bottom) {
                            RoundedRectangle(cornerRadius: 6)
                                .fill(Theme.stoneBg)
                                .frame(height: 120)
                            
                            RoundedRectangle(cornerRadius: 6)
                                .fill(item.color)
                                .frame(height: CGFloat(item.volume) * 1.2)
                        }
                        
                        Text(item.name)
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(Theme.textMuted)
                    }
                }
            }
        }
        .padding(20)
        .background(Color.white)
        .cornerRadius(24)
        .shadow(color: Color.black.opacity(0.03), radius: 15, x: 0, y: 8)
    }
}

struct CompanyVolume: Identifiable {
    let id = UUID()
    let name: String
    let volume: Int
    let color: Color
}
