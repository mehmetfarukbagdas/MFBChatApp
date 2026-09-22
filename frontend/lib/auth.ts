const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

let accessToken: string | null = null;
let refreshInFlight: Promise<boolean> | null = null;
let logoutInProgress = false;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function clearAccessToken(): void {
  accessToken = null;
}

export async function refreshAccessToken(): Promise<boolean> {
  if (logoutInProgress) return false;
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      if (logoutInProgress) return false;
      const response = await fetch(`${API_URL}/api/Auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "X-Refresh-Request": "1" },
        cache: "no-store",
      });

      if (!response.ok) {
        accessToken = null;
        return false;
      }

      const data = await response.json();
      if (!data?.token) {
        accessToken = null;
        return false;
      }

      accessToken = data.token;
      if (data.userId) localStorage.setItem("userId", data.userId);
      if (data.username) localStorage.setItem("username", data.username);
      return true;
    } catch {
      accessToken = null;
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export async function logoutSession(): Promise<void> {
  logoutInProgress = true;
  accessToken = null;

  try {
    await fetch(`${API_URL}/api/Auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: { "X-Refresh-Request": "1" },
      cache: "no-store",
    });
  } catch {
  } finally {
    accessToken = null;
    refreshInFlight = null;
  }
}
