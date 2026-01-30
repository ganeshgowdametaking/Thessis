import { supabase } from '../lib/supabase';

export interface BlockedUser {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

class BlockingService {
  // Block a user
  async blockUser(userId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      console.log('Attempting to block user:', userId, 'by:', user.id);

      // For now, use localStorage since database table doesn't exist
      // TODO: Switch to database when table is created
      this.blockUserLocally(user.id, userId);
      console.log('User blocked successfully in localStorage');
    } catch (error) {
      console.error('Error in blockUser:', error);
      throw error;
    }
  }

  // Unblock a user
  async unblockUser(userId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      console.log('Attempting to unblock user:', userId, 'by:', user.id);

      // For now, use localStorage since database table doesn't exist
      // TODO: Switch to database when table is created
      this.unblockUserLocally(user.id, userId);
      console.log('User unblocked successfully in localStorage');
    } catch (error) {
      console.error('Error in unblockUser:', error);
      throw error;
    }
  }

  // Check if a user is blocked
  async isUserBlocked(userId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      console.log('Checking if user is blocked:', userId, 'by:', user.id);

      // For now, use localStorage since database table doesn't exist
      // TODO: Switch to database when table is created
      const isBlocked = this.isUserBlockedLocally(user.id, userId);
      console.log('User blocked status:', isBlocked);
      return isBlocked;
    } catch (error) {
      console.error('Error in isUserBlocked:', error);
      return false;
    }
  }

  // Get all blocked users
  async getBlockedUsers(): Promise<BlockedUser[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('blocked_users')
      .select('*')
      .eq('blocker_id', user.id);

    if (error) {
      console.error('Error getting blocked users:', error);
      return [];
    }

    return data || [];
  }

  // Check if current user is blocked by another user
  async isBlockedBy(userId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      console.log('Checking if current user is blocked by:', userId);

      // For now, use localStorage since database table doesn't exist
      // TODO: Switch to database when table is created
      const isBlocked = this.isUserBlockedLocally(userId, user.id);
      console.log('Current user blocked by', userId, ':', isBlocked);
      return isBlocked;
    } catch (error) {
      console.error('Error in isBlockedBy:', error);
      return false;
    }
  }

  // Check if there's any blocking relationship between two users (either direction)
  async hasBlockingRelationship(userId: string): Promise<boolean> {
    try {
      const [isBlocked, isBlockedBy] = await Promise.all([
        this.isUserBlocked(userId),
        this.isBlockedBy(userId)
      ]);
      
      const hasRelationship = isBlocked || isBlockedBy;
      console.log('Blocking relationship with', userId, ':', hasRelationship);
      return hasRelationship;
    } catch (error) {
      console.error('Error checking blocking relationship:', error);
      return false;
    }
  }

  // Filter out blocked users from a list
  async filterBlockedUsers(users: any[]): Promise<any[]> {
    if (!users || users.length === 0) return users;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return users;

      console.log('Filtering blocked users from list of', users.length, 'users');

      const filteredUsers = [];
      for (const userItem of users) {
        const userId = userItem.id || userItem.user_id || userItem.userId;
        if (!userId) {
          filteredUsers.push(userItem);
          continue;
        }

        const hasBlocking = await this.hasBlockingRelationship(userId);
        if (!hasBlocking) {
          filteredUsers.push(userItem);
        } else {
          console.log('Filtered out blocked user:', userId);
        }
      }

      console.log('Filtered list:', filteredUsers.length, 'users remaining');
      return filteredUsers;
    } catch (error) {
      console.error('Error filtering blocked users:', error);
      return users; // Return original list on error
    }
  }

  // LocalStorage fallback methods (for when database table doesn't exist)
  private blockUserLocally(blockerId: string, blockedId: string): void {
    const key = `blocked_users_${blockerId}`;
    const blocked = JSON.parse(localStorage.getItem(key) || '[]');
    if (!blocked.includes(blockedId)) {
      blocked.push(blockedId);
      localStorage.setItem(key, JSON.stringify(blocked));
    }
  }

  private unblockUserLocally(blockerId: string, blockedId: string): void {
    const key = `blocked_users_${blockerId}`;
    const blocked = JSON.parse(localStorage.getItem(key) || '[]');
    const filtered = blocked.filter((id: string) => id !== blockedId);
    localStorage.setItem(key, JSON.stringify(filtered));
  }

  private isUserBlockedLocally(blockerId: string, blockedId: string): boolean {
    const key = `blocked_users_${blockerId}`;
    const blocked = JSON.parse(localStorage.getItem(key) || '[]');
    return blocked.includes(blockedId);
  }
}

export const blockingService = new BlockingService();