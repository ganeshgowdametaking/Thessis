import { supabase } from '../lib/supabase';

export interface HireVerificationRequest {
    id: string;
    application_id: string;
    applicant_id: string;
    referrer_id: string;
    applicant_response: 'yes' | 'no' | 'snooze' | null;
    referrer_response: 'yes' | 'no' | 'idk' | null;
    status: 'pending' | 'verified' | 'disputed' | 'rejected' | 'snoozed';
    created_at: string;
    job_details?: {
        title: string;
        company: string;
        cover_image_url?: string;
    };
    other_party_name?: string;
}

export interface UserBadge {
    id: string;
    user_id: string;
    badge_type: 'scout' | 'headhunter' | 'top_scout' | 'hired' | 'verified_employee';
    metadata: any;
    created_at: string;
}

export const hireVerificationService = {
    /**
     * Fetch pending verification requests for the current user.
     * Returns formatted objects with job details.
     */
    async getPendingVerifications(userId: string): Promise<HireVerificationRequest[]> {
        try {
            // 1. Get raw verifications
            const { data: verifications, error } = await supabase
                .from('hire_verifications')
                .select('*')
                .or(`applicant_id.eq.${userId},referrer_id.eq.${userId}`)
                .eq('status', 'pending');

            if (error) throw error;
            if (!verifications || verifications.length === 0) return [];

            // 2. Enhance with Job and Profile details
            const enhancedVerifications = await Promise.all((verifications as any[]).map(async (v) => {
                // Need to know if user is applicant or referrer to check if they specifically have already responded
                const isApplicant = v.applicant_id === userId;
                const myResponse = isApplicant ? v.applicant_response : v.referrer_response;

                // Filter out if THIS user has already answered (even if overall status is pending waiting for other)
                if (myResponse) return null;

                // Fetch Application -> Job
                const { data: appData } = await supabase
                    .from((isApplicant ? 'applicant_applications' : 'applications') as any)
                    .select(isApplicant ? 'job_id, job' : 'job_id, job:jobs(title, company)')
                    .eq('id', v.application_id)
                    .single();

                // Fetch Other Party Name
                const otherId = isApplicant ? v.referrer_id : v.applicant_id;
                const { data: profileData } = await supabase
                    .from('public_profiles' as any)
                    .select('full_name')
                    .eq('id', otherId)
                    .single();

                return {
                    ...v,
                    job_details: appData?.job,
                    other_party_name: profileData?.full_name || 'User'
                };
            }));

            return enhancedVerifications.filter(Boolean) as HireVerificationRequest[];

        } catch (error) {
            console.error('Error fetching verifications:', error);
            return [];
        }
    },

    /**
     * Submit a response to a verification request.
     */
    async submitResponse(verificationId: string, response: 'yes' | 'no' | 'snooze' | 'idk', isApplicant: boolean) {
        const updateStart = isApplicant ? { applicant_response: response } : { referrer_response: response };

        const { error } = await supabase
            .from('hire_verifications')
            .update(updateStart)
            .eq('id', verificationId);

        if (error) throw error;
    },

    /**
     * Get badges for a user.
     */
    async getUserBadges(userId: string): Promise<UserBadge[]> {
        const { data, error } = await supabase
            .from('user_badges')
            .select('*')
            .eq('user_id', userId);

        if (error) {
            console.error('Error fetching badges:', error);
            return [];
        }
        return data || [];
    }
};
