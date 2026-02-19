import { supabase } from '../lib/supabase';

export interface TidePointTransaction {
    id: string;
    user_id: string;
    amount: number;
    action_type: 'response_48h' | 'response_5d' | 'skill_verified' | 'profile_complete' | 'referral_success';
    entity_id?: string;
    created_at: string;
}

export const tidePointsService = {
    /**
     * Get the current user's Tide Points balance.
     * This is cached on the profile table for performance.
     */
    async getPointsBalance(userId: string): Promise<number> {
        const { data, error } = await supabase
            .from('profiles')
            .select('tide_points_balance')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error fetching points balance:', error);
            return 0;
        }

        return data?.tide_points_balance || 0;
    },

    /**
     * Get the transaction history (ledger) for the user.
     */
    async getLedgerHistory(userId: string): Promise<TidePointTransaction[]> {
        const { data, error } = await supabase
            .from('tide_points_ledger')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching ledger history:', error);
            return [];
        }

        return data as TidePointTransaction[];
    }
};
