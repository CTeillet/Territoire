let isRefreshing = false;
let pendingRequests: Array<() => void> = [];

const ACCESS_TOKEN_COOKIE = "token";
const USER_COOKIE = "user";
// Le cookie client survit à la fermeture du navigateur ; le jeton qu'il contient
// expire au bout de 15 minutes et est renouvelé via le refresh token (cookie HttpOnly).
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function cookieAttributes(maxAge: number): string {
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";
  return `; Path=/; Max-Age=${maxAge}; SameSite=Strict${secure}`;
}

function getTokenFromCookie(): string | undefined {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${ACCESS_TOKEN_COOKIE}=`))
    ?.split("=")[1];
}

export function setTokenCookie(token: string) {
  document.cookie = `${ACCESS_TOKEN_COOKIE}=${token}${cookieAttributes(COOKIE_MAX_AGE_SECONDS)}`;
}

export function setUserCookie(user: unknown) {
  document.cookie = `${USER_COOKIE}=${encodeURIComponent(JSON.stringify(user))}${cookieAttributes(COOKIE_MAX_AGE_SECONDS)}`;
}

export function clearAuthCookies() {
  document.cookie = `${ACCESS_TOKEN_COOKIE}=${cookieAttributes(0)}`;
  document.cookie = `${USER_COOKIE}=${cookieAttributes(0)}`;
}

/**
 * Session expirée et impossible à renouveler : on nettoie et on renvoie vers la connexion.
 */
function redirectToLogin() {
  clearAuthCookies();
  if (
    typeof window !== "undefined" &&
    !window.location.pathname.startsWith("/login")
  ) {
    window.location.href = "/login";
  }
}

async function refreshAccessToken(): Promise<string | null> {
  if (isRefreshing) {
    // Wait until the current refresh completes
    await new Promise<void>((resolve) => pendingRequests.push(resolve));
    return getTokenFromCookie() ?? null;
  }
  isRefreshing = true;
  try {
    const res = await fetch("/api/authentification/refresh", {
      method: "POST",
      credentials: "include", // send refresh cookie
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

/**
 * Déconnexion côté serveur : révoque les jetons et supprime le cookie de refresh HttpOnly
 * (inaccessible depuis le JavaScript). Les erreurs réseau sont ignorées.
 */
export async function logoutRequest(): Promise<void> {
  try {
    await fetch("/api/authentification/deconnexion", {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // La session locale est nettoyée dans tous les cas
  }
}

export const authFetch = async (url: string, options: RequestInit = {}) => {
  const attempt = async (): Promise<Response> => {
    const token = getTokenFromCookie();
    const isFormData = options.body instanceof FormData;
    const headers: HeadersInit = {
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(!isFormData && { "Content-Type": "application/json" }),
      ...(options.headers || {}),
    };
    return fetch(`${url}`, {
      ...options,
      headers,
      credentials: "include", // include cookies for refresh flow
    });
  };

  let response = await attempt();

  // 401 = jeton absent/expiré/révoqué -> on tente un renouvellement.
  // 403 = droits insuffisants : un nouveau jeton n'y changerait rien.
  const isAuthEndpoint = url.startsWith("/api/authentification/");
  if (response.status === 401 && !isAuthEndpoint) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      // retry once with new token
      response = await attempt();
    } else {
      redirectToLogin();
    }
  }

  return response;
};
