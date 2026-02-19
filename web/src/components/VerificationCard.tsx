import React, { useState } from 'react';
import { CheckCircle, XCircle, Clock, Briefcase } from 'lucide-react';
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

    const jobTitle = request.job_details?.title || 'Job';
    const company = request.job_details?.company || 'Company';
    const otherParty = request.other_party_name || 'User';

    return (
        <div className="bg-white border border-teal-200 rounded-xl p-6 shadow-sm mb-4 relative overflow-hidden group">
            {/* Background Gradient */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 to-cyan-500"></div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-6">

                {/* Text Section */}
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 text-teal-700 font-bold text-sm uppercase tracking-wider">
                        <Briefcase className="w-4 h-4" />
                        <span>Verification Request</span>
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 mb-2">
                        {isApplicant
                            ? `Did you verify your employment at ${company}?`
                            : `Did ${otherParty} get hired at ${company}?`
                        }
                    </h3>

                    <p className="text-slate-600">
                        {isApplicant
                            ? `It's been a while since you applied for the ${jobTitle} role. Please confirm if you got the job to update your profile and earn points!`
                            : `It's passed 90 days. Please verify if the hire was successful to earn your Talent Scout badge.`
                        }
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 shrink-0">
                    <button
                        onClick={() => handleResponse('yes')}
                        disabled={loading}
                        className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold transition-colors disabled:opacity-50 shadow-sm"
                    >
                        <CheckCircle className="w-5 h-5" />
                        Yes, {isApplicant ? 'I did!' : 'Confirmed'}
                    </button>

                    <button
                        onClick={() => handleResponse('no')}
                        disabled={loading}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                        <XCircle className="w-5 h-5" />
                        No
                    </button>

                    {isApplicant && (
                        <button
                            onClick={() => handleResponse('snooze')}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2.5 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
                            title="Ask me later"
                        >
                            <Clock className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
