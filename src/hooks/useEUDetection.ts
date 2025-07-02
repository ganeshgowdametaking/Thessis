import { useEffect, useState } from 'react';

const EU_COUNTRIES = [
  'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','LI','NO','CH'
];

export function useEUDetection() {
  const [isEUUser, setIsEUUser] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = localStorage.getItem('is_eu_user');
    if (cached !== null) {
      setIsEUUser(cached === 'true');
      setLoading(false);
      return;
    }
    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => {
        const isEU = EU_COUNTRIES.includes(data.country_code);
        setIsEUUser(isEU);
        localStorage.setItem('is_eu_user', isEU ? 'true' : 'false');
      })
      .catch(() => {
        setIsEUUser(false); // fallback: treat as non-EU
      })
      .finally(() => setLoading(false));
  }, []);

  return { isEUUser, loading };
} 