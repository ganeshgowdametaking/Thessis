import React from 'react';
import countries from 'world-countries';

interface CountryPickerProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

const CountryPicker: React.FC<CountryPickerProps> = ({ value, onChange, required }) => {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      name="country_code"
      className="border rounded px-3 py-2"
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