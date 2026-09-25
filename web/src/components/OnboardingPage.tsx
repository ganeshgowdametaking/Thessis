import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Check, Pencil } from 'lucide-react';
import debounce from 'lodash.debounce';
import { useAuthContext } from '../contexts/AuthContext';
import { jobTitles } from '../data/jobTitles';
import type { Experience, Education, Skill } from '../types/profileSections';
import { normalizeSectionItems, isBlankExperience, validateExperienceDates } from '../utils/profileSectionNormalization';

const formatLocationSuggestion = (suggestion: any): string => {
  const address = suggestion.address || {};
  const city = address.city || address.town || address.village || address.county || address.state_district || '';
  const state = address.state || '';
  const country = address.country || '';
  const compact = [city, state, country].filter(Boolean).join(', ');
  return compact || suggestion.display_name || suggestion.place_name || '';
};

const STEPS = ['Experience', 'Education', 'Skills'] as const;

const createId = () => `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;

const emptyExperience = (): Experience => ({
  id: createId(),
  title: '',
  company: '',
  location: '',
  startDate: '',
  endDate: '',
  current: false,
  description: '',
  logo: '',
});

const emptyEducation = (): Education => ({
  id: createId(),
  degree: '',
  school: '',
  startDate: '',
  endDate: '',
  description: '',
  gpa: '',
});

const emptySkill = (): Skill => ({
  id: createId(),
  name: '',
  level: 50,
  category: '',
});

const inputClass = 'w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-primary';
const labelClass = 'block text-[12.5px] font-semibold text-slate-600 mb-1.5';
const entryCardClass = 'border border-slate-200 rounded-xl p-4 mb-4 relative';

const STEP_COPY = [
  { title: 'Tell us about your experience', subtitle: "Add the roles you've held — the more specific, the better." },
  { title: 'Where did you study?', subtitle: 'Add your degrees and the schools you attended.' },
  { title: 'What are you great at?', subtitle: 'List the skills that best describe you.' },
] as const;

const ExperienceStep: React.FC<{
  experiences: Experience[];
  setExperiences: React.Dispatch<React.SetStateAction<Experience[]>>;
}> = ({ experiences, setExperiences }) => {
  const [activeTitleId, setActiveTitleId] = useState<Experience['id'] | null>(null);
  const [filteredJobTitles, setFilteredJobTitles] = useState<string[]>([]);
  const [activeLocationId, setActiveLocationId] = useState<Experience['id'] | null>(null);
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);

  const update = (id: Experience['id'], patch: Partial<Experience>) =>
    setExperiences((prev) => prev.map((exp) => (exp.id === id ? { ...exp, ...patch } : exp)));
  const remove = (id: Experience['id']) => setExperiences((prev) => prev.filter((exp) => exp.id !== id));

  const fetchLocationSuggestions = useCallback(
    debounce(async (query: string) => {
      if (!query) {
        setLocationSuggestions([]);
        return;
      }
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=8`
        );
        const data = await response.json();
        const normalized = Array.isArray(data)
          ? data.map((item: any) => ({ ...item, label: formatLocationSuggestion(item) })).filter((item: any) => Boolean(item.label))
          : [];
        setLocationSuggestions(normalized);
      } catch {
        setLocationSuggestions([]);
      }
    }, 300),
    []
  );

  const handleTitleInput = (id: Experience['id'], value: string) => {
    update(id, { title: value });
    setActiveTitleId(id);
    setActiveLocationId(null);
    if (value.trim()) {
      setFilteredJobTitles(jobTitles.filter((t: string) => t.toLowerCase().includes(value.toLowerCase())).slice(0, 10));
    } else {
      setFilteredJobTitles([]);
    }
  };

  const handleTitleSelect = (id: Experience['id'], title: string) => {
    update(id, { title });
    setActiveTitleId(null);
    setFilteredJobTitles([]);
  };

  const handleLocationInput = (id: Experience['id'], value: string) => {
    update(id, { location: value });
    setActiveLocationId(id);
    setActiveTitleId(null);
    if (value) {
      fetchLocationSuggestions(value);
    } else {
      setLocationSuggestions([]);
    }
  };

  const handleLocationSelect = (id: Experience['id'], suggestion: any) => {
    update(id, { location: suggestion.label || formatLocationSuggestion(suggestion) });
    setActiveLocationId(null);
    setLocationSuggestions([]);
  };

  return (
    <div>
      {experiences.length === 0 && (
        <p className="text-sm text-slate-400 mb-4">No experience added yet.</p>
      )}
      {experiences.map((exp) => (
        <div key={exp.id} className={entryCardClass}>
          <button
            type="button"
            onClick={() => remove(exp.id)}
            className="absolute top-2 right-2 text-red-500 hover:text-red-700"
            aria-label="Remove experience"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <label className={labelClass}>Title</label>
              <input
                className={inputClass}
                value={exp.title}
                onChange={(e) => handleTitleInput(exp.id, e.target.value)}
                autoComplete="off"
              />
              {activeTitleId === exp.id && filteredJobTitles.length > 0 && (
                <ul className="absolute z-10 bg-white border border-slate-200 rounded-xl mt-1 w-full max-h-40 overflow-y-auto shadow-lg">
                  {filteredJobTitles.map((title, idx) => (
                    <li
                      key={idx}
                      className="px-3 py-1.5 text-xs cursor-pointer hover:bg-ink-wash"
                      onMouseDown={() => handleTitleSelect(exp.id, title)}
                    >
                      {title}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <label className={labelClass}>Company</label>
              <input className={inputClass} value={exp.company} onChange={(e) => update(exp.id, { company: e.target.value })} />
            </div>
            <div className="md:col-span-2 relative">
              <label className={labelClass}>Location</label>
              <input
                className={inputClass}
                value={exp.location}
                onChange={(e) => handleLocationInput(exp.id, e.target.value)}
                placeholder="Type a city, state, or country..."
                autoComplete="off"
              />
              {activeLocationId === exp.id && locationSuggestions.length > 0 && (
                <ul className="absolute z-10 bg-white border border-slate-200 rounded-xl mt-1 w-full max-h-40 overflow-y-auto shadow-lg">
                  {locationSuggestions.map((suggestion) => (
                    <li
                      key={suggestion.place_id}
                      className="px-3 py-1.5 text-xs cursor-pointer hover:bg-ink-wash"
                      onMouseDown={() => handleLocationSelect(exp.id, suggestion)}
                    >
                      {suggestion.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <label className={labelClass}>Start Date *</label>
              <input type="date" className={inputClass} value={exp.startDate} onChange={(e) => update(exp.id, { startDate: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>End Date {!exp.current && '*'}</label>
              <input
                type="date"
                className={inputClass}
                value={exp.endDate}
                min={exp.startDate || undefined}
                disabled={exp.current}
                onChange={(e) => update(exp.id, { endDate: e.target.value })}
              />
            </div>
            <div className="flex items-center md:col-span-2">
              <input
                type="checkbox"
                id={`current-${exp.id}`}
                checked={exp.current}
                onChange={(e) => update(exp.id, { current: e.target.checked, endDate: e.target.checked ? '' : exp.endDate })}
                className="mr-2 accent-primary"
              />
              <label htmlFor={`current-${exp.id}`} className="text-[12.5px] font-medium text-slate-600">I currently work here</label>
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Description</label>
              <textarea
                className={`${inputClass} resize-none`}
                rows={3}
                value={exp.description}
                onChange={(e) => update(exp.id, { description: e.target.value })}
              />
            </div>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setExperiences((prev) => [...prev, emptyExperience()])}
        className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-hover transition-colors"
      >
        <Plus className="h-4 w-4" /> Add experience
      </button>
    </div>
  );
};

const EducationStep: React.FC<{
  education: Education[];
  setEducation: React.Dispatch<React.SetStateAction<Education[]>>;
}> = ({ education, setEducation }) => {
  const update = (id: Education['id'], patch: Partial<Education>) =>
    setEducation((prev) => prev.map((edu) => (edu.id === id ? { ...edu, ...patch } : edu)));
  const remove = (id: Education['id']) => setEducation((prev) => prev.filter((edu) => edu.id !== id));

  return (
    <div>
      {education.length === 0 && (
        <p className="text-sm text-slate-400 mb-4">No education added yet.</p>
      )}
      {education.map((edu) => (
        <div key={edu.id} className={entryCardClass}>
          <button
            type="button"
            onClick={() => remove(edu.id)}
            className="absolute top-2 right-2 text-red-500 hover:text-red-700"
            aria-label="Remove education"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Degree</label>
              <input className={inputClass} value={edu.degree} onChange={(e) => update(edu.id, { degree: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>School</label>
              <input className={inputClass} value={edu.school} onChange={(e) => update(edu.id, { school: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Start Date</label>
              <input type="date" className={inputClass} value={edu.startDate} onChange={(e) => update(edu.id, { startDate: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>End Date</label>
              <input type="date" className={inputClass} value={edu.endDate} onChange={(e) => update(edu.id, { endDate: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>GPA</label>
              <input className={inputClass} value={edu.gpa} onChange={(e) => update(edu.id, { gpa: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Description</label>
              <textarea
                className={`${inputClass} resize-none`}
                rows={3}
                value={edu.description}
                onChange={(e) => update(edu.id, { description: e.target.value })}
              />
            </div>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setEducation((prev) => [...prev, emptyEducation()])}
        className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-hover transition-colors"
      >
        <Plus className="h-4 w-4" /> Add education
      </button>
    </div>
  );
};

const SkillsStep: React.FC<{
  skills: Skill[];
  setSkills: React.Dispatch<React.SetStateAction<Skill[]>>;
}> = ({ skills, setSkills }) => {
  const update = (id: Skill['id'], patch: Partial<Skill>) =>
    setSkills((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const remove = (id: Skill['id']) => setSkills((prev) => prev.filter((s) => s.id !== id));

  return (
    <div>
      {skills.length === 0 && (
        <p className="text-sm text-slate-400 mb-4">No skills added yet.</p>
      )}
      {skills.map((skill) => (
        <div key={skill.id} className="border border-slate-200 rounded-xl p-3 mb-3 flex items-center gap-3">
          <input
            className={`${inputClass} flex-1`}
            placeholder="e.g. React, SQL, Project Management"
            value={skill.name}
            onChange={(e) => update(skill.id, { name: e.target.value })}
          />
          <button
            type="button"
            onClick={() => remove(skill.id)}
            className="text-red-500 hover:text-red-700 shrink-0"
            aria-label="Remove skill"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setSkills((prev) => [...prev, emptySkill()])}
        className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-hover transition-colors"
      >
        <Plus className="h-4 w-4" /> Add skill
      </button>
    </div>
  );
};

const OnboardingPage: React.FC = () => {
  const { profile, updateProfile } = useAuthContext();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [experiences, setExperiences] = useState<Experience[]>(
    () => normalizeSectionItems<Experience>(profile?.experiences)
  );
  const [education, setEducation] = useState<Education[]>(
    () => normalizeSectionItems<Education>(profile?.education)
  );
  const [skills, setSkills] = useState<Skill[]>(
    () => normalizeSectionItems<Skill>(profile?.skills)
  );

  const isLastStep = step === STEPS.length - 1;

  const save = async (destination: string) => {
    setSaving(true);
    setError(null);
    try {
      const cleanedExperiences = experiences.filter((exp) => !isBlankExperience(exp));
      await updateProfile({ experiences: cleanedExperiences, education, skills });
      navigate(destination);
    } catch (err: any) {
      setError(err?.message || 'Something went wrong saving your profile. Please try again.');
      setSaving(false);
    }
  };

  const handleNext = () => {
    if (step === 0) {
      const dateError = validateExperienceDates(experiences);
      if (dateError) {
        setError(dateError);
        return;
      }
    }
    setError(null);
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const handleSaveFinish = () => {
    const dateError = validateExperienceDates(experiences);
    if (dateError) {
      setError(dateError);
      return;
    }
    save('/jobs');
  };

  return (
    <div className="onboarding-page min-h-screen flex flex-col lg:flex-row">
      {/* Left: brand panel with live step checklist */}
      <aside className="hidden lg:flex lg:w-[43%] shrink-0 bg-ink text-white flex-col justify-between p-16">
        <img src="/brand/thessis-logo-white.svg" alt="Thessis" className="h-8 w-auto self-start" />

        <div className="flex flex-col gap-5 max-w-md">
          <span className="text-[13px] font-bold uppercase tracking-wider text-indigo-200">Getting started</span>
          <h2 className="font-display font-extrabold text-[34px] leading-tight">A few details, then you're in.</h2>
          <p className="text-[15px] leading-relaxed text-slate-300">
            The more complete your profile, the better we can match you to roles and referrers.
          </p>
        </div>

        <ol className="flex flex-col gap-3.5">
          {STEPS.map((label, i) => {
            const done = i < step;
            const current = i === step;
            return (
              <li key={label} className="flex items-center gap-3">
                <span
                  className={`h-[26px] w-[26px] shrink-0 rounded-full flex items-center justify-center font-display font-bold text-[11.5px] ${done
                    ? 'bg-success text-white'
                    : current
                      ? 'bg-primary text-white'
                      : 'border-[1.5px] border-slate-600 text-slate-400'
                    }`}
                >
                  {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
                </span>
                <span className={`text-sm font-semibold ${done || current ? 'text-white' : 'text-slate-400'}`}>{label}</span>
              </li>
            );
          })}
        </ol>

        <p className="flex items-center gap-2.5 text-[13px] text-slate-400">
          <Pencil className="h-4 w-4" />
          You can edit all of this later from your profile.
        </p>
      </aside>

      {/* Right: form card */}
      <div className="flex-1 bg-parchment flex items-center justify-center px-4 py-10">
      <div className="onboarding-card w-full max-w-xl bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-10">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[12.5px] font-bold text-slate-500">Step {step + 1} of {STEPS.length}</span>
          <button
            type="button"
            onClick={() => save('/jobs')}
            disabled={saving}
            className="text-[12.5px] font-bold text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-50"
          >
            Skip &amp; finish later
          </button>
        </div>

        <div className="flex gap-1.5 mb-7">
          {STEPS.map((label, i) => (
            <div key={label} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-primary' : 'bg-slate-200'}`} />
          ))}
        </div>

        <div className="mb-6">
          <h1 className="font-display font-extrabold text-2xl text-ink">{STEP_COPY[step].title}</h1>
          <p className="text-[13px] text-slate-500 mt-1">{STEP_COPY[step].subtitle}</p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-danger-tint border border-red-100 px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        {step === 0 && <ExperienceStep experiences={experiences} setExperiences={setExperiences} />}
        {step === 1 && <EducationStep education={education} setEducation={setEducation} />}
        {step === 2 && <SkillsStep skills={skills} setSkills={setSkills} />}

        <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || saving}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
          >
            Back
          </button>
          {isLastStep ? (
            <button
              type="button"
              onClick={handleSaveFinish}
              disabled={saving}
              className="px-7 py-3 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-hover disabled:opacity-50 transition-all"
            >
              {saving ? 'Saving...' : 'Save & Finish'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              disabled={saving}
              className="px-7 py-3 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-hover disabled:opacity-50 transition-all"
            >
              Continue
            </button>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
