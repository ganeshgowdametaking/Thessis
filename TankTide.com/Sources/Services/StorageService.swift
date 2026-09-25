
import Foundation
import Supabase

class StorageService {
    static let shared = StorageService()
    private let client = AuthManager.shared.client
    
    func uploadAvatar(data: Data) async throws -> String {
        guard let userId = AuthManager.shared.currentUser?.id else { throw URLError(.userAuthenticationRequired) }
        
        let fileName = "\(userId)/avatar.jpg"
        let fileOptions = FileOptions(cacheControl: "3600", upsert: true)
        
        try await client.storage
            .from("avatars")
            .upload(path: fileName, file: data, options: fileOptions)
            
        let publicUrl = try client.storage
            .from("avatars")
            .getPublicURL(path: fileName)
            
        return publicUrl.absoluteString
    }
    
    func uploadResume(data: Data, name _: String) async throws -> String {
        guard let userId = AuthManager.shared.currentUser?.id else { throw URLError(.userAuthenticationRequired) }
        
        let fileName = "\(userId)/\(UUID().uuidString).pdf"
        let fileOptions = FileOptions(cacheControl: "3600", upsert: false)
        
        try await client.storage
            .from("resumes")
            .upload(path: fileName, file: data, options: fileOptions)
            
        // Applications store the private object path. Access is signed only
        // after the viewer is authorized for that application.
        return fileName
    }
}
