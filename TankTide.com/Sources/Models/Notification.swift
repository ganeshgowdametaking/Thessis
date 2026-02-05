import Foundation
import SwiftUI

enum NotificationType: String, Codable {
    case match = "rocket_launch"
    case referral = "person"
    case achievement = "military_tech"
    case warning = "warning"
    case system = "system_update"
}

struct AppNotification: Identifiable, Codable {
    let id: String
    let type: NotificationType
    let title: String
    let message: String
    let timestamp: String
    var isRead: Bool
    let category: String
    let avatarUrl: String?
    
    enum CodingKeys: String, CodingKey {
        case id, type, title, message, timestamp, category
        case isRead = "is_read"
        case avatarUrl = "avatar_url"
    }
    
    var icon: String { type.rawValue }
    
    var iconBg: Color {
        switch type {
        case .match: return Color(hex: "eaf3e7")
        case .referral: return Color.blue.opacity(0.1)
        case .achievement: return Color(hex: "FFF7E6")
        case .warning: return Color(hex: "FEF2F2")
        case .system: return Color.gray.opacity(0.1)
        }
    }
    
    var iconColor: Color {
        switch type {
        case .match: return Color(hex: "5f7261")
        case .referral: return .blue
        case .achievement: return .orange
        case .warning: return .red
        case .system: return .gray
        }
    }
}

extension AppNotification {
    static let samples: [AppNotification] = [
        AppNotification(
            id: "1",
            type: .match,
            title: "New Match found!",
            message: "A new potential client matches your expertise in sustainable architecture.",
            timestamp: "2m ago",
            isRead: false,
            category: "All",
            avatarUrl: nil
        ),
        AppNotification(
            id: "2",
            type: .referral,
            title: "Sarah Jenkins accepted your referral",
            message: "Sarah is now a connection.",
            timestamp: "1h ago",
            isRead: false,
            category: "Referrals",
            avatarUrl: "person.crop.circle.fill"
        ),
        AppNotification(
            id: "3",
            type: .achievement,
            title: "You reached 'Super Connector' status",
            message: "Congratulations! You've successfully referred 10 clients this month.",
            timestamp: "1d ago",
            isRead: true,
            category: "All",
            avatarUrl: nil
        ),
        AppNotification(
            id: "4",
            type: .warning,
            title: "Action required: Update your profile",
            message: "Your certification expires in 3 days. Please upload new documents.",
            timestamp: "1d ago",
            isRead: true,
            category: "System",
            avatarUrl: nil
        ),
        AppNotification(
            id: "5",
            type: .system,
            title: "System Maintenance Scheduled",
            message: "Scheduled downtime on Sunday from 2 AM to 4 AM EST.",
            timestamp: "1d ago",
            isRead: true,
            category: "System",
            avatarUrl: nil
        )
    ]
}
