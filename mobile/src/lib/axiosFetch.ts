import axios from 'axios';

// Create an axios instance with default config
const axiosInstance = axios.create({
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * A custom fetch implementation that uses axios under the hood.
 * This bypasses the native React Native `fetch` which can be flaky on some simulators.
 */
export const axiosFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = input.toString();
    const method = init?.method || 'GET';
    const headers = init?.headers ? Object.fromEntries(new Headers(init.headers).entries()) : {};
    const body = init?.body;

    console.log(`[AXIOS] ${method} ${url}`);

    try {
        const response = await axiosInstance({
            url,
            method,
            headers,
            data: body,
            validateStatus: () => true, // Don't throw on 4xx/5xx, let Supabase handle it
        });

        // Convert axios response to a Fetch API Response-like object
        const fetchResponse = new Response(JSON.stringify(response.data), {
            status: response.status,
            statusText: response.statusText,
            headers: new Headers(response.headers as any),
        });

        console.log(`[AXIOS] Success: ${response.status}`);
        return fetchResponse;

    } catch (error: any) {
        console.error(`[AXIOS] Error:`, error.message);
        throw new TypeError(`Network request failed: ${error.message}`);
    }
};
