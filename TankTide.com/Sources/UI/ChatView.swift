import SwiftUI
import Supabase

struct ChatView: View {
    let conversationId: String
    let participantName: String
    let participantAvatar: String
    @Environment(\.dismiss) var dismiss
    @StateObject private var chatService = ChatService.shared
    @State private var messageText = ""
    
    var body: some View {
        ZStack {
            Theme.stoneBg
                .ignoresSafeArea()
                .onTapGesture {
                    UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                }
            
            VStack(spacing: 0) {
                // Header
                headerView
                
                // Messages List
                ScrollViewReader { proxy in
                    ScrollView(showsIndicators: false) {
                        VStack(spacing: 24) {
                            // Date Divider
                            dateDivider(text: "Today")
                                .padding(.top, 8)
                            
                            ForEach(chatService.messages) { message in
                                messageRow(message)
                                    .id(message.id)
                            }
                        }
                        .padding(.horizontal, 20)
                        .padding(.bottom, 20)
                        .contentShape(Rectangle())
                        .onTapGesture {
                            UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                        }
                    }
                    .scrollDismissesKeyboard(.interactively)
                    .onChange(of: chatService.messages) { _ in
                        if let lastId = chatService.messages.last?.id {
                            withAnimation {
                                proxy.scrollTo(lastId, anchor: .bottom)
                            }
                        }
                    }
                }
                
                // Input Bar
                inputBar
            }
        }
        .navigationBarHidden(true)
        .onAppear {
            Task {
                await chatService.fetchMessages(for: conversationId)
            }
        }
    }
    
    var headerView: some View {
        HStack(spacing: 12) {
            Button {
                dismiss()
            } label: {
                Image(systemName: "chevron.left")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(Theme.textMain)
                    .frame(width: 44, height: 44)
                    .background(Color.white)
                    .clipShape(Circle())
                    .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
            }
            
            ZStack(alignment: .bottomTrailing) {
                UserAvatar(avatarString: participantAvatar, size: 40, borderWidth: 1)
                
                Circle()
                    .fill(Theme.primary)
                    .frame(width: 12, height: 12)
                    .overlay(Circle().stroke(Theme.stoneBg, lineWidth: 2))
                    .offset(x: 2, y: 2)
            }
            
            VStack(alignment: .leading, spacing: 2) {
                Text(participantName)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(Theme.textMain)
                Text("Online")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(Theme.primary)
                    .kerning(0.5)
            }
            
            Spacer()
            
            HStack(spacing: 8) {
                Menu {
                    Button(role: .destructive) {
                        Task {
                            do {
                                try await chatService.deleteConversation(id: conversationId)
                                await MainActor.run {
                                    dismiss()
                                }
                            } catch {
                                print("❌ Failed to delete conversation: \(error)")
                            }
                        }
                    } label: {
                        Label("Delete Conversation", systemImage: "trash")
                    }
                } label: {
                    Image(systemName: "ellipsis")
                        .font(.system(size: 18))
                        .foregroundColor(Theme.primary)
                        .frame(width: 40, height: 40)
                        .background(Color.white.opacity(0.1))
                        .clipShape(Circle())
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .background(Theme.stoneBg.opacity(0.95))
        .overlay(Divider(), alignment: .bottom)
    }
    
    func dateDivider(text: String) -> some View {
        HStack {
            Rectangle()
                .fill(Color.gray.opacity(0.1))
                .frame(height: 1)
            
            Text(text.uppercased())
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(Theme.textMuted)
                .kerning(1.5)
                .padding(.horizontal, 12)
            
            Rectangle()
                .fill(Color.gray.opacity(0.1))
                .frame(height: 1)
        }
    }
    
    func messageRow(_ message: Message) -> some View {
        HStack(alignment: .bottom, spacing: 12) {
            if !message.isFromMe {
                UserAvatar(avatarString: participantAvatar, size: 32, borderWidth: 0)
                    .padding(.bottom, 20)
            } else {
                Spacer()
            }
            
            VStack(alignment: message.isFromMe ? .trailing : .leading, spacing: 4) {
                Text(message.content)
                    .font(.system(size: 15))
                    .foregroundColor(message.isFromMe ? .white : Theme.textMain)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                    .background(message.isFromMe ? Theme.primary : Theme.stoneBubble)
                    .cornerRadius(16, corners: message.isFromMe ? [.topLeft, .topRight, .bottomLeft] : [.topLeft, .topRight, .bottomRight])
                    .shadow(color: Color.black.opacity(0.02), radius: 2, x: 0, y: 1)
                
                HStack(spacing: 4) {
                    Text(message.createdAt ?? "Just now")
                        .font(.system(size: 10))
                        .foregroundColor(Theme.textMuted)
                    
                    if message.isFromMe {
                        Image(systemName: "checkmark.seal.fill")
                            .font(.system(size: 10))
                            .foregroundColor(Theme.primary)
                    }
                }
                .padding(.horizontal, 4)
            }
            .frame(maxWidth: UIScreen.main.bounds.width * 0.75, alignment: message.isFromMe ? .trailing : .leading)
            
            if !message.isFromMe {
                Spacer()
            }
        }
    }
    
    var inputBar: some View {
        VStack(spacing: 0) {
            Divider()
            
            HStack(spacing: 12) {
                Button { } label: {
                    Image(systemName: "plus")
                        .font(.system(size: 20, weight: .bold))
                        .foregroundColor(Theme.primary)
                        .frame(width: 44, height: 44)
                        .background(Color.white)
                        .clipShape(Circle())
                        .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
                }
                
                HStack {
                    TextField("Message...", text: $messageText)
                        .font(.system(size: 15))
                        .foregroundColor(Theme.textMain)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                }
                .background(Theme.stoneBubble.opacity(0.5))
                .cornerRadius(24)
                .overlay(RoundedRectangle(cornerRadius: 24).stroke(Color.gray.opacity(0.1), lineWidth: 1))
                
                Button {
                    if !messageText.isEmpty {
                        Task {
                            try? await chatService.sendMessage(to: conversationId, content: messageText)
                            await MainActor.run {
                                messageText = ""
                            }
                        }
                    }
                } label: {
                    Image(systemName: "paperplane.fill")
                        .font(.system(size: 18))
                        .foregroundColor(.white)
                        .frame(width: 44, height: 44)
                        .background(Theme.primary)
                        .clipShape(Circle())
                        .shadow(color: Theme.primary.opacity(0.2), radius: 6, x: 0, y: 3)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .padding(.bottom, 24)
            .background(Theme.stoneBg)
        }
    }
}
