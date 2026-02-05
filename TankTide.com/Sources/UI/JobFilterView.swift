import SwiftUI

import MapKit

struct JobFilterView: View {
    @Environment(\.dismiss) var dismiss
    @StateObject private var locationService = LocationSearchService()
    
    // Filter State
    @State private var selectedJobTypes: Set<String> = ["Full-time"]
    @State private var selectedExperience: Set<String> = ["Associate", "Mid-Senior"]
    @State private var selectedLocation: String = "Hybrid"
    @State private var selectedSortOption: String = "Most Relevant"
    
    @State private var locationSearchText = ""
    
    let jobs: [Job]
    
    var filteredCount: Int {
        jobs.filter { job in
            let matchesType = selectedJobTypes.isEmpty || selectedJobTypes.contains(job.type)
            // Simplified matching for experience as job model doesn't strictly have this field yet,
            // but for demonstration we'll assume it matches if the set isn't empty. 
            // In a real app we'd map job.experienceLevel to these values.
            let matchesExperience = true 
            
            let matchesLocationType: Bool
            if selectedLocation == "Remote" {
                matchesLocationType = job.location.contains("Remote")
            } else if selectedLocation == "Hybrid" {
               matchesLocationType = true // Broad matching for demo
            } else if selectedLocation == "On-site" {
                matchesLocationType = !job.location.contains("Remote")
            } else {
                matchesLocationType = true // "Any" case
            }
            
            let matchesLocationText = locationSearchText.isEmpty || job.location.localizedCaseInsensitiveContains(locationSearchText)
            
            return matchesType && matchesExperience && matchesLocationType && matchesLocationText
        }.count
    }
    
    let jobTypes = ["Full-time", "Part-time", "Contract", "Freelance", "Internship"]
    let experienceLevels = ["Entry Level", "Associate", "Mid-Senior", "Director"]
    
    var body: some View {
        ZStack {
            Theme.stoneBg.ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Top Handle
                Capsule()
                    .fill(Color.gray.opacity(0.2))
                    .frame(width: 40, height: 6)
                    .padding(.top, 12)
                
                // Header
                headerView
                
                Divider()
                
                ScrollView(showsIndicators: false) {
                    VStack(spacing: 24) {
                        // Sort By
                        filterSection(title: "Sort by") {
                            Menu {
                                ForEach(["Most Relevant", "Most Recent"], id: \.self) { option in
                                    Button {
                                        selectedSortOption = option
                                    } label: {
                                        HStack {
                                            Text(option)
                                            if selectedSortOption == option {
                                                Image(systemName: "checkmark")
                                            }
                                        }
                                    }
                                }
                            } label: {
                                dropdownLabel(text: selectedSortOption)
                            }
                        }
                        
                        // Job Type
                        filterSection(title: "Job Type") {
                            Menu {
                                ForEach(jobTypes, id: \.self) { type in
                                    Button {
                                        if selectedJobTypes.contains(type) {
                                            selectedJobTypes.remove(type)
                                        } else {
                                            selectedJobTypes.insert(type)
                                        }
                                    } label: {
                                        HStack {
                                            Text(type)
                                            if selectedJobTypes.contains(type) {
                                                Image(systemName: "checkmark")
                                            }
                                        }
                                    }
                                }
                            } label: {
                                dropdownLabel(text: selectedJobTypes.isEmpty ? "Select Job Type" : selectedJobTypes.joined(separator: ", "))
                            }
                        }
                        
                        // Experience Level
                        filterSection(title: "Experience Level") {
                            Menu {
                                ForEach(experienceLevels, id: \.self) { level in
                                    Button {
                                        if selectedExperience.contains(level) {
                                            selectedExperience.remove(level)
                                        } else {
                                            selectedExperience.insert(level)
                                        }
                                    } label: {
                                        HStack {
                                            Text(level)
                                            if selectedExperience.contains(level) {
                                                Image(systemName: "checkmark")
                                            }
                                        }
                                    }
                                }
                            } label: {
                                dropdownLabel(text: selectedExperience.isEmpty ? "Select Experience" : selectedExperience.joined(separator: ", "))
                            }
                        }
                        
                        // Location
                        filterSection(title: "Location") {
                            VStack(spacing: 16) {
                                Menu {
                                    ForEach(["Any", "Remote", "Hybrid", "On-site"], id: \.self) { type in
                                        Button {
                                            selectedLocation = type
                                        } label: {
                                            HStack {
                                                Text(type)
                                                if selectedLocation == type {
                                                    Image(systemName: "checkmark")
                                                }
                                            }
                                        }
                                    }
                                } label: {
                                    dropdownLabel(text: selectedLocation.isEmpty ? "Any" : selectedLocation)
                                }
                                
                                HStack {
                                    Image(systemName: "map")
                                        .foregroundColor(Theme.textSecondary)
                                    ZStack(alignment: .leading) {
                                        if locationSearchText.isEmpty {
                                            Text("Enter city, state or country")
                                                .font(.system(size: 14))
                                                .foregroundColor(Color.gray)
                                        }
                                        TextField("", text: $locationSearchText)
                                            .font(.system(size: 14))
                                            .foregroundColor(.black)
                                            .onChange(of: locationSearchText) { newValue in
                                                locationService.searchQuery = newValue
                                            }
                                    }
                                }
                                .padding(.horizontal, 16)
                                .padding(.vertical, 12)
                                .background(Color.white)
                                .cornerRadius(12)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(Color.gray.opacity(0.2), lineWidth: 1)
                                )
                                .zIndex(1) // Ensure suggestions appear on top

                                // Location Suggestions
                                if !locationService.completions.isEmpty {
                                    VStack(alignment: .leading, spacing: 0) {
                                        ForEach(locationService.completions, id: \.self) { completion in
                                            Button {
                                                locationSearchText = completion.title + ", " + completion.subtitle
                                                locationService.searchQuery = "" // Clear suggestions
                                                selectedLocation = "Any" // Ensure we search broadly
                                            } label: {
                                                VStack(alignment: .leading, spacing: 4) {
                                                    Text(completion.title)
                                                        .font(.system(size: 14, weight: .semibold))
                                                        .foregroundColor(Theme.textMain)
                                                    if !completion.subtitle.isEmpty {
                                                        Text(completion.subtitle)
                                                            .font(.system(size: 12))
                                                            .foregroundColor(Theme.textSecondary)
                                                    }
                                                }
                                                .padding(.horizontal, 16)
                                                .padding(.vertical, 12)
                                                .frame(maxWidth: .infinity, alignment: .leading)
                                                .background(Color.white)
                                            }
                                            Divider()
                                        }
                                    }
                                    .background(Color.white)
                                    .cornerRadius(12)
                                    .shadow(color: Color.black.opacity(0.1), radius: 10, x: 0, y: 5)
                                    .padding(.top, -10) // Overlap slightly
                                }
                            }
                        }
                        
                        Spacer().frame(height: 120)
                    }
                    .padding(24)
                }
            }
            
            // Fixed Footer
            VStack {
                Spacer()
                Button {
                    dismiss()
                } label: {
                    HStack {
                        Text("Show \(filteredCount) Jobs")
                        Image(systemName: "arrow.right")
                    }
                    .font(.system(size: 17, weight: .bold))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 56)
                    .background(Theme.primary)
                    .cornerRadius(12)
                    .shadow(color: Theme.primary.opacity(0.3), radius: 10, x: 0, y: 5)
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 30)
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
                    .foregroundColor(Theme.textMain)
                    .frame(width: 44, height: 44)
            }
            
            Spacer()
            
            Text("Filters")
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(Theme.textMain)
            
            Spacer()
            
            Button {
                resetFilters()
            } label: {
                Text("Reset")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(Theme.textMuted)
                    .frame(width: 60, height: 44)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
    }
    
    func filterSection<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(title)
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(Theme.textMain)
            content()
        }
    }
    
    func chipButton(title: String, isSelected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 6) {
                if isSelected {
                    Image(systemName: "checkmark")
                        .font(.system(size: 12, weight: .bold))
                }
                Text(title)
                    .font(.system(size: 14, weight: isSelected ? .bold : .semibold))
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(isSelected ? Theme.primary.opacity(0.1) : Color.white)
            .foregroundColor(isSelected ? Theme.primary : Theme.textSecondary)
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isSelected ? Theme.primary : Color.gray.opacity(0.2), lineWidth: isSelected ? 2 : 1)
            )
            .shadow(color: Color.black.opacity(isSelected ? 0 : 0.02), radius: 4, x: 0, y: 2)
        }
    }
    
    func dropdownLabel(text: String) -> some View {
        HStack {
            Text(text)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(Theme.textMain)
            
            Spacer()
            
            Image(systemName: "chevron.down")
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(Theme.textMuted)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Color.white)
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.gray.opacity(0.2), lineWidth: 1)
        )
    }
    
    
    func resetFilters() {
        selectedJobTypes = []
        selectedExperience = []
        selectedLocation = "Any"
        selectedSortOption = "Most Relevant"
        locationSearchText = ""
    }
}
