
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
    
    func uploadResume(data: Data, name: String) async throws -> String {
        guard let userId = AuthManager.shared.currentUser?.id else { throw URLError(.userAuthenticationRequired) }
        
        let fileName = "\(userId)/\(name)"
        let fileOptions = FileOptions(cacheControl: "3600", upsert: true)
        
        try await client.storage
            .from("resumes")
            .upload(path: fileName, file: data, options: fileOptions)
            
        // Resumes are private, so we might need a signed URL, but here's public for simplicity if bucket is public
        // Or createSignedUrl logic
         let publicUrl = try client.storage
            .from("resumes")
            .getPublicURL(path: fileName)
            
        return publicUrl.absoluteString
    }
}
