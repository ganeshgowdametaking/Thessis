import React, { useState } from 'react';
import { Award, Check, Loader2 } from 'lucide-react';
import { hireVerificationService, HireVerificationRequest } from '../services/hireVerificationService';
import { useAuthContext } from '../contexts/AuthContext';

interface VerificationCardProps {
    request: HireVerificationRequest;
    onResponse: () => void; // Callback to refresh list after response
}

export const VerificationCard: React.FC<VerificationCardProps> = ({ request, onResponse }) => {
    const { user } = useAuthContext();
    const [loading, setLoading] = useState(false);

    if (!user) return null;

    const isApplicant = request.applicant_id === user.id;
    const isReferrer = request.referrer_id === user.id;

    if (!isApplicant && !isReferrer) return null;

    const handleResponse = async (response: 'yes' | 'no' | 'snooze' | 'idk') => {
        setLoading(true);
        try {
            await hireVerificationService.submitResponse(request.id, response, isApplicant);
            onResponse();
        } catch (error) {
            console.error('Failed to submit response:', error);
        } finally {
            setLoading(false);
        }
    };

    const jobTitle = request.job_details?.title;
    const company = request.job_details?.company;
    const otherParty = request.other_party_name || 'your candidate';

    const question = isApplicant
        ? (jobTitle && company ? `Did you get the ${jobTitle} job at ${company}?` : 'Did you get the job you applied for?')
        : `Did ${otherParty} get hired${company ? ` at ${company}` : ''}?`;
    const explainer = isApplicant
        ? "It's been a while since you applied. Let us know so we can update your profile and add your points."
        : "It's been 90 days. Confirm whether the hire went through to earn your Talent Scout badge.";

    return (
        <div className="flex gap-3.5 rounded-2xl border border-amber-200 bg-white p-4 md:px-5 md:py-[18px] shadow-[inset_4px_0_0_#F59E0B]">
            <span className="size-[42px] shrink-0 rounded-full bg-amber-tint text-amber-ink flex items-center justify-center">
                <Award className="h-5 w-5" />
            </span>
            <div className="flex-1 min-w-0 flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-ink">Hire check</span>
                <h3 className="font-display text-[15px] md:text-base font-extrabold text-ink">{question}</h3>
                <p className="text-[13px] leading-relaxed text-slate-500">{explainer}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                    <button
                        type="button"
                        onClick={() => handleResponse('yes')}
                        disabled={loading}
                        className="h-9 px-3.5 rounded-[10px] bg-primary text-white text-[12.5px] font-bold hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center gap-1.5"
                    >
                        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                        {isApplicant ? 'Yes, I did' : 'Yes, confirmed'}
                    </button>
                    <button
                        type="button"
                        onClick={() => handleResponse('no')}
                        disabled={loading}
                        className="h-9 px-3.5 rounded-[10px] border border-slate-200 bg-white text-[12.5px] font-bold text-ink hover:bg-parchment-sunken transition-colors disabled:opacity-50"
                    >
                        No
                    </button>
                    {isApplicant && (
                        <button
                            type="button"
                            onClick={() => handleResponse('snooze')}
                            disabled={loading}
                            className="h-9 px-2 text-[12.5px] font-bold text-slate-500 hover:text-ink transition-colors disabled:opacity-50"
                        >
                            Ask me later
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
