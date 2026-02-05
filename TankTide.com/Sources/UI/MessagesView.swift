import SwiftUI

struct MessagesView: View {
    @StateObject private var chatService = ChatService.shared
    @State private var searchText = ""
    
    var rooms: [ChatRoom] {
        let baseList = chatService.chatRooms.isEmpty ? ChatRoom.samples : chatService.chatRooms
        if searchText.isEmpty {
            return baseList
        } else {
            return baseList.filter {
                $0.participantName.localizedCaseInsensitiveContains(searchText) ||
                $0.lastMessage.localizedCaseInsensitiveContains(searchText)
            }
        }
    }
    
    var body: some View {
        NavigationStack {
            ZStack {
                Theme.stoneBg.ignoresSafeArea()
                
                VStack(spacing: 0) {
                    // Header
                    headerView
                    
                    // Search Bar
                    searchBar
                        .padding(.horizontal, 20)
                        .padding(.bottom, 12)
                    
                    ScrollView(showsIndicators: false) {
                        if chatService.isLoading && chatService.chatRooms.isEmpty {
                            ProgressView()
                                .padding(.top, 40)
                        } else {
                            VStack(spacing: 2) {
                                ForEach(rooms) { chatRoom in
                                    NavigationLink(destination: ChatView(conversationId: chatRoom.id, participantName: chatRoom.participantName, participantAvatar: chatRoom.avatarUrl ?? "person.fill")) {
                                        ChatRoomRow(chatRoom: chatRoom)
                                    }
                                    .buttonStyle(PlainButtonStyle())
                                    
                                    if chatRoom.id != rooms.last?.id {
                                        if !chatRoom.hasUnread {
                                            Divider()
                                                .padding(.leading, 92)
                                                .padding(.trailing, 20)
                                        }
                                    }
                                }
                            }
                            .padding(.top, 8)
                        }
                    }
                }
            }
            .onAppear {
                Task {
                    await chatService.fetchChatRooms()
                }
            }
        }
    }
    
    var headerView: some View {
        HStack {
            Text("Messages")
                .font(.system(size: 28, weight: .black))
                .foregroundColor(Theme.textMain)
            
            Spacer()
            
            Button {
                // New message action
            } label: {
                Image(systemName: "square.and.pencil")
                    .font(.system(size: 20))
                    .foregroundColor(Theme.textMain)
                    .frame(width: 44, height: 44)
                    .background(Color.white)
                    .clipShape(Circle())
                    .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
            }
        }
        .padding(.horizontal, 20)
        .padding(.top, 24)
        .padding(.bottom, 16)
    }
    
    var searchBar: some View {
        HStack {
            Image(systemName: "magnifyingglass")
                .foregroundColor(Theme.textSecondary.opacity(0.6))
            
            TextField("Search conversations", text: $searchText)
                .font(.system(size: 14))
                .foregroundColor(Theme.textMain)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Color.white.opacity(0.8))
        .cornerRadius(14)
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(Color.gray.opacity(0.05), lineWidth: 1)
        )
    }
}
