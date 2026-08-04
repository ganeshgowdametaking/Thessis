export interface MessageGroup {
  id: string;
  senderId: string;
  isOwn: boolean;
  messages: any[];
  showNewDividerBefore: boolean;
}

const GROUP_GAP_MS = 5 * 60 * 1000;

export function buildMessageGroups(
  messages: any[],
  currentUserId: string,
  firstUnreadMessageId: string | null
): MessageGroup[] {
  const groups: MessageGroup[] = [];

  for (const message of messages) {
    const isDividerHere = !!firstUnreadMessageId && message.id === firstUnreadMessageId;
    const last = groups[groups.length - 1];
    const lastMsg = last?.messages[last.messages.length - 1];
    const sameSender = !!last && last.senderId === message.sender_id;
    const withinGap = !!lastMsg &&
      (new Date(message.created_at).getTime() - new Date(lastMsg.created_at).getTime()) < GROUP_GAP_MS;

    if (last && sameSender && withinGap && !isDividerHere) {
      last.messages.push(message);
    } else {
      groups.push({
        id: message.id,
        senderId: message.sender_id,
        isOwn: message.sender_id === currentUserId,
        messages: [message],
        showNewDividerBefore: isDividerHere,
      });
    }
  }

  return groups;
}
