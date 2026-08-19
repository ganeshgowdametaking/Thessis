export interface MessageGroup {
  id: string;
  senderId: string;
  isOwn: boolean;
  messages: any[];
  showNewDividerBefore: boolean;
  dateDividerLabel: string | null;
}

const GROUP_GAP_MS = 5 * 60 * 1000;

function isSameCalendarDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function formatDateDivider(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  if (isSameCalendarDay(date, now)) return 'Today';

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameCalendarDay(date, yesterday)) return 'Yesterday';

  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString('en-US', sameYear
    ? { month: 'short', day: 'numeric' }
    : { month: 'short', day: 'numeric', year: 'numeric' });
}

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
    const sameDay = !!lastMsg && isSameCalendarDay(new Date(message.created_at), new Date(lastMsg.created_at));

    if (last && sameSender && withinGap && sameDay && !isDividerHere) {
      last.messages.push(message);
    } else {
      groups.push({
        id: message.id,
        senderId: message.sender_id,
        isOwn: message.sender_id === currentUserId,
        messages: [message],
        showNewDividerBefore: isDividerHere,
        dateDividerLabel: sameDay ? null : formatDateDivider(message.created_at),
      });
    }
  }

  return groups;
}
