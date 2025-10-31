let isRefreshing = false;
let pendingRequests: Array<() => void> = [];

function getTokenFromCookie(): string | undefined {
    return document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1];
}

function setTokenCookie(token: string) {
    // Access token stored in JS cookie (not HttpOnly) for Authorization header
    document.cookie = `token=${token}; path=/;`;
}

async function refreshAccessToken(): Promise<string | null> {
    if (isRefreshing) {
        // Wait until the current refresh completes
        await new Promise<void>((resolve) => pendingRequests.push(resolve));
        return getTokenFromCookie() ?? null;
    }
    isRefreshing = true;
    try {
        const res = await fetch('/api/authentification/refresh', {
            method: 'POST',
            credentials: 'include', // send refresh cookie
        });
        if (!res.ok) {
            return null;
        }
        const data = await res.json();
        if (data?.token) {
            setTokenCookie(data.token);
            return data.token as string;
        }
        return null;
    } catch {
        return null;
    } finally {
        isRefreshing = false;
        // Resolve all pending requests
        pendingRequests.forEach((resolve) => resolve());
        pendingRequests = [];
    }
}

export const authFetch = async (url: string, options: RequestInit = {}) => {
    const attempt = async (): Promise<Response> => {
        const token = getTokenFromCookie();
        const isFormData = options.body instanceof FormData;
        const headers: HeadersInit = {
            ...(token && { Authorization: `Bearer ${token}` }),
            ...(!isFormData && { 'Content-Type': 'application/json' }),
            ...(options.headers || {}),
        };
        return fetch(`${url}`, {
            ...options,
            headers,
            credentials: 'include', // include cookies for refresh flow
        });
    };

    let response = await attempt();

    if (response.status === 401) {
        const newToken = await refreshAccessToken();
        if (newToken) {
            // retry once with new token
            response = await attempt();
        }
    }

    return response;
};
