import React from 'react';
import countries from 'world-countries';

interface CountryPickerProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
}

const CountryPicker: React.FC<CountryPickerProps> = ({ value, onChange, required, className = 'border rounded px-3 py-2' }) => {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      name="country_code"
      className={className}
      required={required}
    >
      <option value="">Select country</option>
      {countries.map((c: any) => (
        <option key={c.cca3} value={c.cca3}>
          {c.name.common}
        </option>
      ))}
    </select>
  );
};

export default CountryPicker; 