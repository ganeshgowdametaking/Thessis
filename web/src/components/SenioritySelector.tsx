import React, { useState, useEffect, useRef } from 'react';

export type SeniorityBucket = 'Entry' | 'Mid-Level' | 'Senior' | 'Lead / Staff' | 'Director / Exec';

interface SenioritySelectorProps {
    onSave: (seniority: SeniorityBucket, title: string) => void;
    isLoading?: boolean;
}

const SenioritySelector: React.FC<SenioritySelectorProps> = ({ onSave, isLoading = false }) => {
    const [selectedSeniority, setSelectedSeniority] = useState<SeniorityBucket | null>(null);
    const [jobTitle, setJobTitle] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const commonRoles = [
        // --- Software, Testing & QA ---
        'Software Engineer', 'Software Developer', 'Frontend Developer', 'Backend Developer', 'Full Stack Engineer',
        'Software Test Engineer', 'QA Engineer', 'Quality Assurance Engineer', 'Automation Engineer',
        'SDET (Software Development Engineer in Test)', 'Manual Tester', 'Performance Engineer',
        'Security Engineer', 'Penetration Tester', 'DevOps Engineer', 'Release Engineer',
        'Site Reliability Engineer', 'Cloud Engineer', 'Mobile Developer', 'iOS Developer', 'Android Developer',
        'Database Administrator', 'Data Engineer', 'Data Scientist', 'Data Analyst',
        'Machine Learning Engineer', 'AI Research Scientist', 'NLP Engineer', 'Computer Vision Engineer',
        'Systems Architect', 'Solutions Architect', 'Infrastructure Engineer', 'Network Engineer',
        'Embedded Systems Engineer', 'Firmware Engineer', 'Hardware Engineer', 'IC Designer',

        // --- Product, Design & Research ---
        'Product Manager', 'Technical Product Manager', 'Product Owner', 'Product Designer',
        'UX Designer', 'UI Designer', 'UX Researcher', 'Service Designer', 'Brand Designer',
        'Visual Designer', 'Motion Designer', 'Interaction Designer', 'Graphic Designer',
        'Content Designer', 'Information Architect', 'Creative Director', 'Art Director',
        'Product Lead', 'Head of Product', 'VP of Product',

        // --- Marketing, Content & Communications ---
        'Marketing Manager', 'Digital Marketing Specialist', 'Content Strategist', 'Social Media Manager',
        'SEO Specialist', 'SEM Manager', 'Email Marketer', 'Growth Lead', 'Brand Manager',
        'Public Relations Manager', 'Communications Specialist', 'Copywriter', 'Content Creator',
        'Video Editor', 'Photographer', 'Creative Producer', 'Media Planner', 'Marketing Analyst',
        'Event Planner', 'Community Manager', 'Partnerships Manager',

        // --- Sales & Customer Success ---
        'Sales Executive', 'Account Manager', 'Business Development Manager', 'Sales Operations',
        'Inside Sales Representative', 'Account Executive', 'Sales Engineer', 'Solutions Consultant',
        'Customer Success Manager', 'Support Engineer', 'Customer Support Specialist',
        'Implementation Manager', 'Onboarding Specialist', 'Technical Account Manager',

        // --- Business, Operations & HR ---
        'Operations Manager', 'Project Manager', 'Program Manager', 'Business Analyst',
        'Strategy Consultant', 'Management Consultant', 'Supply Chain Manager', 'Logistics Coordinator',
        'Procurement Officer', 'Office Manager', 'Executive Assistant', 'Chief Executive Officer (CEO)',
        'Chief Operating Officer (COO)', 'Chief Financial Officer (CFO)', 'Chief Technology Officer (CTO)',
        'Chief Product Officer (CPO)', 'HR Manager', 'Talent Acquisition Specialist', 'Recruiter',
        'People Operations', 'HR Business Partner', 'Office Administrator', 'Facilities Manager',

        // --- Finance, Legal & Banking ---
        'Accountant', 'Financial Analyst', 'Auditor', 'Controller', 'Tax Specialist',
        'Investment Banker', 'Portfolio Manager', 'Wealth Manager', 'Actuary', 'Trader',
        'Corporate Lawyer', 'Legal Counsel', 'Compliance Officer', 'Paralegal', 'Contract Manager',
        'Risk Analyst', 'Internal Auditor', 'Finance Manager', 'VP of Finance',

        // --- Healthcare & Life Sciences ---
        'Medical Doctor', 'Surgeon', 'Nurse', 'Physician Assistant', 'Dentist', 'Pharmacist',
        'Psychologist', 'Therapist', 'Research Scientist', 'Lab Technician', 'Biostatistician',
        'Bioinformatician', 'Clinical Trial Manager', 'Medical Assistant', 'Healthcare Admin',
        'Veterinarian', 'Optometrist', 'Physical Therapist', 'Radiologist',

        // --- Education & Public Sector ---
        'Professor', 'Teacher', 'Lecturer', 'Education Consultant', 'Instructional Designer',
        'School Administrator', 'Principal', 'Government Official', 'Policy Analyst',
        'Urban Planner', 'Diplomat', 'Non-Profit Director', 'Grant Writer', 'Social Worker',
        'Librarian', 'Firefighter', 'Police Officer', 'Detective', 'Military Officer',

        // --- Architecture, Construction & Real Estate ---
        'Architect', 'Civil Engineer', 'Structural Engineer', 'Mechanical Engineer',
        'Electrical Engineer', 'Energy Auditor', 'Construction Manager', 'Site Engineer',
        'Quantity Surveyor', 'Real Estate Agent', 'Property Manager', 'Appraiser',
        'Interior Designer', 'Landscape Architect', 'Urban Designer',

        // --- Arts, Media & Entertainment ---
        'Actor', 'Musician', 'Dancer', 'Film Director', 'Screenwriter', 'Film Editor',
        'Sound Engineer', 'Journalist', 'News Anchor', 'Radio Personality', 'Animator',
        'Casting Director', 'Talent Agent', 'Music Producer', 'Chef', 'Sommelier',

        // --- More Specialized, Industrial & Global Roles ---
        'Aeronautical Engineer', 'Agricultural Inspector', 'Air Traffic Controller', 'Animal Breeder',
        'Appliance Repairer', 'Aquaculturist', 'Arborist', 'Archaeologist', 'Art Restorer',
        'Astrophysicist', 'Audiologist', 'Bailiff', 'Baker', 'Biochemical Engineer',
        'Biological Technician', 'Boiler Operator', 'Bookkeeper', 'Brickmason', 'Broadcast Technician',
        'Cartographer', 'Ceramic Engineer', 'Chemical Engineer', 'Chemist', 'City Planner',
        'Clergy Member', 'Commercial Diver', 'Composer', 'Conductor', 'Conservationist',
        'Coroner', 'Court Reporter', 'Credit Analyst', 'Criminal Investigator', 'Curator',
        'Cytotechnologist', 'Database Architect', 'Dietitian', 'Dredge Operator', 'Economist',
        'Editor', 'Electrical Power-Line Installer', 'Electronic Drafter', 'Elevator Installer',
        'Emergency Medical Technician', 'Engine Repairer', 'Environmental Engineer', 'Exercise Surgeon',
        'Explosives Expert', 'Fashion Model', 'Film Laboratory Technician', 'Financial Examiner',
        'Fine Artist', 'Fire Inspector', 'Fish and Game Warden', 'Floral Designer', 'Food Science Technician',
        'Forensic Pathologist', 'Forestry Technician', 'Funeral Director', 'Geographer', 'Geospatial Analyst',
        'Glassblower', 'Glazier', 'Hazardous Materials Removal Worker', 'Health Educator', 'Historian',
        'Home Health Aide', 'Hydrologist', 'Industrial Production Manager', 'Insurance Underwriter',
        'Interior Architect', 'Interpreter', 'Judicial Clerk', 'Landscape Architect', 'Legal Secretary',
        'Legislator', 'Locksmith', 'Locomotive Engineer', 'Logger', 'Magnetic Resonance Imaging Technologist',
        'Marine Engineer', 'Materials Scientist', 'Mathematical Technician', 'Meat Cutter', 'Mechanical Drafter',
        'Medical Records Technician', 'Mental Health Counselor', 'Meteorologist', 'Microbiologist',
        'Millwright', 'Mine Safety Engineer', 'Mining Geologist', 'Molecular Biologist', 'Museum Technician',
        'Music Director', 'Naval Architect', 'Nuclear Engineer', 'Nuclear Medicine Technologist',
        'Nurse Anesthetist', 'Nurse Midwife', 'Nutritionist', 'Occupational Health Specialist',
        'Operations Research Analyst', 'Ophthalmic Medical Technician', 'Optician', 'Oral Surgeon',
        'Orthodontist', 'Orthotist', 'Painter', 'Park Ranger', 'Patternmaker', 'Pediatrician',
        'Pest Control Worker', 'Petroleum Geologist', 'Pharmacist', 'Phlebotomist', 'Physicist',
        'Pilot', 'Pipefitter', 'Plumber', 'Podiatrist', 'Police Dispatcher', 'Power Plant Operator',
        'Preschool Teacher', 'Private Tutor', 'Producer', 'Proofreader', 'Psychiatrist',
        'Public Health Official', 'Radiation Therapist', 'Radio Mechanic', 'Recreational Therapist',
        'Refuse Collector', 'Rehabilitation Counselor', 'Religious Leader', 'Reporter', 'Respiratory Therapist',
        'Roofing Contractor', 'Safety Engineer', 'Sales Representative', 'Sanitary Engineer', 'Scenic Designer',
        'School Counselor', 'Science Writer', 'Sculptor', 'Secretary', 'Security Analyst',
        'Seismologist', 'Sheet Metal Worker', 'Ship Captain', 'Social Worker', 'Sociologist',
        'Software Quality Assurance Engineer', 'Soil Conservationist', 'Speech-Language Pathologist',
        'Statistician', 'Stonemason', 'Structural Drafter', 'Surveying Technician', 'Tailor',
        'Tax Preparer', 'Technical Illustrator', 'Technical Writer', 'Telecommunications Specialist',
        'Toxicologist', 'Traffic Technician', 'Transcriptionist', 'Translator', 'Transportation Planner',
        'Travel Agent', 'Tutor', 'Typist', 'Umpire', 'Upholsterer', 'Urban Planner', 'Urologist',
        'Veterinary Technician', 'Vocational Coach', 'Warehouse Manager', 'Water Treatment Plant Operator',
        'Web Developer', 'Welder', 'Wholesale Buyer', 'Wildlife Biologist', 'Woodworker', 'Writer',
        'X-Ray Technician', 'Zoologist', 'Nanny', 'Personal Assistant', 'Butler', 'Chauffeur',
        'Bodyguard', 'Detective', 'Security Guard', 'Loss Prevention Specialist', 'Concierge'
    ];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setJobTitle(value);
        if (value.length > 0) {
            const filtered = commonRoles.filter(role =>
                role.toLowerCase().includes(value.toLowerCase())
            ).slice(0, 10); // Limit to 10 suggestions
            setSuggestions(filtered);
            setShowSuggestions(true); // Always show if there's input
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    };

    const handleSuggestionClick = (role: string) => {
        setJobTitle(role);
        setSuggestions([]);
        setShowSuggestions(false);
    };

    const buckets: SeniorityBucket[] = ['Entry', 'Mid-Level', 'Senior', 'Lead / Staff', 'Director / Exec'];

    const getPlaceholder = (seniority: SeniorityBucket | null) => {
        switch (seniority) {
            case 'Entry': return 'e.g., Junior Data Analyst';
            case 'Mid-Level': return 'e.g., Software Engineer';
            case 'Senior': return 'e.g., Senior Systems Architect';
            case 'Lead / Staff': return 'e.g., Principal Engineer';
            case 'Director / Exec': return 'e.g., Head of Product';
            default: return 'Enter your exact job title';
        }
    };

    const handleSave = () => {
        if (selectedSeniority && jobTitle.trim()) {
            onSave(selectedSeniority, jobTitle.trim());
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Professional Identity</h3>
                <p className="text-sm text-slate-500 mb-6">Select your seniority bucket and tell us your exact role.</p>

                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Seniority Level</label>
                <div className="flex flex-wrap gap-3">
                    {buckets.map((bucket) => (
                        <button
                            key={bucket}
                            onClick={() => setSelectedSeniority(bucket)}
                            className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all min-h-[44px] border-2 ${selectedSeniority === bucket
                                ? 'bg-slate-900 text-white border-slate-900 shadow-md transform scale-105'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                                }`}
                        >
                            {bucket}
                        </button>
                    ))}
                </div>
            </div>

            <div className="transition-all duration-300 relative" ref={containerRef}>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Exact Role</label>
                <input
                    type="text"
                    value={jobTitle}
                    onChange={handleInputChange}
                    onFocus={() => jobTitle.length > 0 && suggestions.length > 0 && setShowSuggestions(true)}
                    placeholder={getPlaceholder(selectedSeniority)}
                    className="block w-full rounded-xl border border-slate-300 bg-slate-50/50 px-4 py-3.5 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-sage focus:border-sage transition-all text-base shadow-sm"
                />

                {showSuggestions && jobTitle.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="max-h-[300px] overflow-y-auto">
                            {suggestions.length > 0 ? (
                                suggestions.map((role, index) => (
                                    <button
                                        key={role}
                                        onClick={() => handleSuggestionClick(role)}
                                        className={`w-full text-left px-4 py-3 text-sm font-medium hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 ${index === 0 ? 'bg-slate-50/30' : ''
                                            }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-slate-400 text-[18px]">search</span>
                                            <span className="text-slate-900">{role}</span>
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="px-4 py-6 text-center">
                                    <span className="material-symbols-outlined text-slate-300 text-[32px] mb-2">search_off</span>
                                    <p className="text-sm text-slate-500 font-medium">No exact matches for "{jobTitle}"</p>
                                    <p className="text-xs text-slate-400 mt-1">You can still use this title and proceed.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="pt-2">
                <button
                    onClick={handleSave}
                    disabled={isLoading || !selectedSeniority || !jobTitle.trim()}
                    className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 group disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                        <>
                            Complete Registration
                            <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default SenioritySelector;
