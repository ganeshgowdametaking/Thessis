import SwiftUI

struct UserAvatar: View {
    let avatarString: String?
    let size: CGFloat
    
    var body: some View {
        if let avatar = avatarString, !avatar.isEmpty, avatar.starts(with: "http") {
            // Load from URL
            AsyncImage(url: URL(string: avatar)) { phase in
                switch phase {
                case .empty:
                    ProgressView()
                        .frame(width: size, height: size)
                case .success(let image):
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .frame(width: size, height: size)
                        .clipShape(Circle())
                case .failure:
                    placeholder
                @unknown default:
                    placeholder
                }
            }
        } else {
            // Use SF Symbol (or custom asset logic if you have local assets)
            placeholder
        }
    }
    
    var placeholder: some View {
        Image(systemName: "person.crop.circle.fill")
            .resizable()
            .aspectRatio(contentMode: .fit)
            .frame(width: size, height: size)
            .foregroundColor(Theme.stoneSurface)
            .clipShape(Circle())
            .overlay(Circle().stroke(Color.white, lineWidth: 2))
    }
}
