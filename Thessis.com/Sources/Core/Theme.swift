import SwiftUI

struct Theme {
    // Current Native Design (Dark Mode)
    static let primary = Color(hex: "5F7261") // Sage Green
    static let stoneBg = Color(hex: "F9F9F7") // Light Stone
    static let stoneSurface = Color(hex: "ECEEED")
    static let stoneBubble = Color(hex: "F2F1EC")
    static let textMain = Color(hex: "141514")
    static let textMuted = Color(hex: "6E776F")
    static let textSecondary = Color(hex: "6E776F")
    static let urgent = Color(hex: "C75555")
    static let linkedin = Color(hex: "0077B5")
    
    // Brand Colors
    static let sage = Color(hex: "5F7261")
    static let gold = Color(hex: "D4AF37") // Premium Gold
    static let amber = Color(hex: "F59E0B")
    
    // Legacy / System Colors
    static let sage500 = Color(hex: "5F7261") 
    static let stone950 = Color(hex: "020617")
    static let stone900 = Color(hex: "0F172A")
    static let stone800 = Color(hex: "1E293B")
    static let stone700 = Color(hex: "334155")
    static let stone400 = Color(hex: "94A3B8")
    static let stone300 = Color(hex: "CBD5E1")
    static let stone200 = Color(hex: "E2E8F0")
    static let stone50  = Color(hex: "F8FAFC")
}

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }

        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue:  Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
