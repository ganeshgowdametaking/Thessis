import { supabase } from '../lib/supabase';

export interface TrustMetrics {
    medianResponseTime: string | null; // e.g., '24h', '3d', '1w'
    verifiedWorkEmail: boolean;
    workEmail: string | null;
}

export const trustService = {
    /**
     * Start the verification process for a work email.
     * Generates and stores a verification code server-side.
     */
    async startWorkEmailVerification(userId: string, email: string): Promise<{ success: boolean; error?: string }> {
        try {
            // 1. Call DB function to generate code
            const { error } = await supabase
                .rpc('generate_verification_code', {
                    p_user_id: userId,
                    p_email: email
                } as any);

            if (error) throw error;

            return { success: true };
        } catch (err: any) {
            console.error('Error starting verification:', err);
            return { success: false, error: err.message };
        }
    },

    /**
     * Verify the code entered by the user.
     */
    async verifyWorkEmail(userId: string, email: string, code: string): Promise<{ success: boolean; error?: string }> {
        try {
            const { data: verified, error } = await supabase
                .rpc('verify_work_email', {
                    p_user_id: userId,
                    p_email: email,
                    p_code: code
                } as any);

            if (error) throw error;

            if (!verified) {
                return { success: false, error: 'Invalid or expired verification code.' };
            }

            return { success: true };
        } catch (err: any) {
            console.error('Error verifying email:', err);
            return { success: false, error: err.message };
        }
    },

    /**
     * Get response metrics for a referrer.
     */
    async getReferrerMetrics(referrerId: string): Promise<TrustMetrics> {
        try {
            // Fetch Response Time Metric
            const { data: responseTime } = await supabase
                .rpc('get_referrer_response_metric', {
                    referrer_id: referrerId
                } as any);

            // Fetch Profile Verification Status
            const { data: profile } = await supabase
                .from('public_profiles' as any)
                .select('work_email_verified')
                .eq('id', referrerId)
                .single();

            return {
                medianResponseTime: responseTime as string | null,
                verifiedWorkEmail: (profile as any)?.work_email_verified || false,
                workEmail: (profile as any)?.work_email || null
            };

        } catch (err) {
            console.error('Error fetching trust metrics:', err);
            return {
                medianResponseTime: null,
                verifiedWorkEmail: false,
                workEmail: null
            };
        }
    }
};
