import { Award, ShieldCheck, Crown, CheckCircle, BadgeCheck } from 'lucide-react';

export type BadgeType = 'scout' | 'headhunter' | 'top_scout' | 'hired' | 'verified_employee';

interface TalentScoutBadgeProps {
    type: BadgeType;
    className?: string;
    showLabel?: boolean;
    metadata?: any;
}

export const TalentScoutBadge: React.FC<TalentScoutBadgeProps> = ({
    type,
    className = '',
    showLabel = true,
    metadata = {}
}) => {
    const getBadgeConfig = (type: BadgeType) => {
        switch (type) {
            case 'scout':
                return {
                    icon: <ShieldCheck className="w-5 h-5" />,
                    label: 'Talent Scout',
                    color: 'text-amber-600',
                    bg: 'bg-amber-100',
                    border: 'border-amber-200',
                    description: 'Verified referrer with at least 1 successful hire.'
                };
            case 'headhunter':
                return {
                    icon: <Award className="w-5 h-5" />,
                    label: 'Headhunter',
                    color: 'text-slate-600', // Silver/Platinum look
                    bg: 'bg-slate-100',
                    border: 'border-slate-300',
                    description: 'Elite referrer with 5+ verified hires.'
                };
            case 'top_scout':
                return {
                    icon: <Crown className="w-5 h-5" />,
                    label: 'Top 1% Talent Scout',
                    color: 'text-purple-600',
                    bg: 'bg-purple-100',
                    border: 'border-purple-200',
                    description: metadata?.company
                        ? `Top 1% Talent Scout at ${metadata.company}`
                        : 'Legendary referrer. Top 1% of all talent scouts.'
                };
            case 'hired':
                return {
                    icon: <CheckCircle className="w-4 h-4" />,
                    label: 'Verified Hire',
                    color: 'text-emerald-600',
                    bg: 'bg-emerald-100',
                    border: 'border-emerald-200',
                    description: metadata?.company && metadata?.role
                        ? `Verified hire: ${metadata.role} at ${metadata.company}`
                        : 'Verified hired candidate.'
                };
            case 'verified_employee':
                return {
                    icon: <BadgeCheck className="w-4 h-4" />,
                    label: metadata?.company ? `Verified ${metadata.company}` : 'Verified Employee',
                    color: 'text-blue-600',
                    bg: 'bg-blue-50',
                    border: 'border-blue-200',
                    description: metadata?.company
                        ? `Identity Verified: Uses a work email from ${metadata.domain || metadata.company}`
                        : 'Identity Verified via work email.'
                };
            default:
                return null;
        }
    };

    const config = getBadgeConfig(type);
    if (!config) return null;

    return (
        <div className={`group relative flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${config.bg} ${config.border} ${className} cursor-help transition-all hover:scale-105`}>
            <div className={`${config.color}`}>
                {config.icon}
            </div>
            {showLabel && (
                <span className={`text-xs font-bold ${config.color} uppercase tracking-wide`}>
                    {config.label}
                </span>
            )}

            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 p-2 bg-slate-800 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 text-center shadow-xl pointer-events-none">
                {config.description}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
            </div>
        </div>
    );
};


