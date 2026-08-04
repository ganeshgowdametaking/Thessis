import React from 'react';

const fieldClasses =
  'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors duration-150 focus:border-accent focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500';

interface FieldWrapperProps {
  label?: string;
  error?: string;
  help?: string;
  required?: boolean;
  children: React.ReactNode;
}

const FieldWrapper: React.FC<FieldWrapperProps> = ({ label, error, help, required, children }) => (
  <div>
    {label && (
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
    )}
    {children}
    {error ? (
      <p className="mt-1 text-xs font-medium text-red-600">{error}</p>
    ) : (
      help && <p className="mt-1 text-xs text-slate-400">{help}</p>
    )}
  </div>
);

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  help?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, help, required, className = '', ...rest }) => (
  <FieldWrapper label={label} error={error} help={help} required={required}>
    <input
      className={`${fieldClasses} ${error ? 'border-red-300 focus:border-red-500' : ''} ${className}`}
      required={required}
      {...rest}
    />
  </FieldWrapper>
);

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  help?: string;
}

export const Textarea: React.FC<TextareaProps> = ({ label, error, help, required, className = '', ...rest }) => (
  <FieldWrapper label={label} error={error} help={help} required={required}>
    <textarea
      className={`${fieldClasses} min-h-[100px] resize-y ${error ? 'border-red-300 focus:border-red-500' : ''} ${className}`}
      required={required}
      {...rest}
    />
  </FieldWrapper>
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  help?: string;
}

export const Select: React.FC<SelectProps> = ({ label, error, help, required, className = '', children, ...rest }) => (
  <FieldWrapper label={label} error={error} help={help} required={required}>
    <select
      className={`${fieldClasses} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 viewBox=%220 0 20 20%22%3E%3Cpath stroke=%22%2364748b%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22 stroke-width=%221.5%22 d=%22m6 8 4 4 4-4%22/%3E%3C/svg%3E')] bg-[length:20px_20px] bg-[right_0.5rem_center] bg-no-repeat pr-10 ${error ? 'border-red-300 focus:border-red-500' : ''} ${className}`}
      required={required}
      {...rest}
    >
      {children}
    </select>
  </FieldWrapper>
);

export default Input;
