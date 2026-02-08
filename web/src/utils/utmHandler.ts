/**
 * UTM Handler Utility
 * Captures, persists, and retrieves marketing UTM parameters
 */

const STORAGE_KEY = 'platform_attribution_data';

export interface UTMData {
    utm_source: string | null;
    utm_medium: string | null;
    utm_campaign: string | null;
    utm_content: string | null;
    utm_term: string | null;
    captured_at: string;
    landing_url: string;
}

/**
 * Parse UTM parameters from URL search string
 */
export function parseUTMParams(search: string): Partial<UTMData> | null {
    const params = new URLSearchParams(search);

    const utm_source = params.get('utm_source');
    const utm_medium = params.get('utm_medium');
    const utm_campaign = params.get('utm_campaign');
    const utm_content = params.get('utm_content');
    const utm_term = params.get('utm_term');

    // Also check for common aliases
    const ref = params.get('ref') || params.get('source');

    // Check if any UTM params exist
    const hasUTMParams = utm_source || utm_medium || utm_campaign || utm_content || utm_term || ref;

    if (!hasUTMParams) {
        return null;
    }

    return {
        utm_source: utm_source || ref || null,
        utm_medium: utm_medium || null,
        utm_campaign: utm_campaign || null,
        utm_content: utm_content || null,
        utm_term: utm_term || null,
    };
}

/**
 * Capture UTM parameters from current URL and store in localStorage
 * Only overwrites if new URL contains UTM params (prevents direct visits from overwriting)
 */
export function captureUTMParams(): void {
    try {
        const parsedUTM = parseUTMParams(window.location.search);

        // Only store if there are actual UTM params in the URL
        if (!parsedUTM) {
            return;
        }

        const utmData: UTMData = {
            ...parsedUTM,
            utm_source: parsedUTM.utm_source || null,
            utm_medium: parsedUTM.utm_medium || null,
            utm_campaign: parsedUTM.utm_campaign || null,
            utm_content: parsedUTM.utm_content || null,
            utm_term: parsedUTM.utm_term || null,
            captured_at: new Date().toISOString(),
            landing_url: window.location.href,
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(utmData));
        console.log('[UTM] Captured attribution data:', utmData);
    } catch (error) {
        console.warn('[UTM] Failed to capture UTM params:', error);
    }
}

/**
 * Retrieve stored UTM data from localStorage
 */
export function getStoredUTMData(): UTMData | null {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            return null;
        }
        return JSON.parse(stored) as UTMData;
    } catch (error) {
        console.warn('[UTM] Failed to retrieve UTM data:', error);
        return null;
    }
}

/**
 * Get UTM data formatted for Supabase user metadata
 */
export function getUTMForSignup(): Record<string, string | null> {
    const utmData = getStoredUTMData();

    if (!utmData) {
        return {};
    }

    return {
        utm_source: utmData.utm_source,
        utm_medium: utmData.utm_medium,
        utm_campaign: utmData.utm_campaign,
        utm_content: utmData.utm_content,
        utm_term: utmData.utm_term,
    };
}

/**
 * Clear stored UTM data (call after successful signup)
 */
export function clearUTMData(): void {
    try {
        localStorage.removeItem(STORAGE_KEY);
        console.log('[UTM] Cleared attribution data');
    } catch (error) {
        console.warn('[UTM] Failed to clear UTM data:', error);
    }
}

/**
 * Check if UTM data is stored
 */
export function hasStoredUTMData(): boolean {
    return localStorage.getItem(STORAGE_KEY) !== null;
}
