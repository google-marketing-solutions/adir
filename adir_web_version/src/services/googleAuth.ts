/* global google */

/**
 * Creates a token client.
 * @param {string} clientId
 * @param {string} scope
 * @param {function} callback
 * @return {object}
 */
export function createTokenClient(
  clientId: string,
  scope: string,
  callback: (response: any) => void,
) {
  const client = google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope,
    callback,
  });
  return client;
}

/**
 * Navigates the main browser window to Google's OAuth 2.0 Authorization page (Redirect Flow).
 * This avoids popup windows entirely, making the authentication immune to COOP and SSO blocks.
 */
export function redirectToGoogleSignIn(clientId: string, scope: string) {
  if (!clientId) {
    console.warn(
      "[Auth Redirect] Redirection failed: Google Client ID is missing or empty.",
    );
    alert(
      "Vault Setup Required: Please configure your Google OAuth Client ID first.",
    );
    return;
  }

  const redirectUri = window.location.origin + "/";
  console.log("[Auth Redirect] Preparing Google OAuth redirect payload:", {
    clientId,
    redirectUri,
    scope,
    responseType: "token",
    prompt: "consent",
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    prompt: "consent",
    response_type: "token",
    scope: scope,
    access_type: "online",
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  console.log(
    "[Auth Redirect] Navigating main window to Google Authorization endpoint...",
  );
  window.location.href = authUrl;
}

/**
 * Checks if the current URL contains an access token fragment returned from Google's OAuth redirect.
 * If present, parses it and cleans the browser address bar.
 * @return { { accessToken: string, expiresIn: number } | null }
 */
export function parseRedirectCallback(): {
  accessToken: string;
  expiresIn: number;
} | null {
  const hash = window.location.hash;
  if (!hash) {
    return null;
  }

  const params = new URLSearchParams(hash.substring(1)); // Strip leading '#'
  const accessToken = params.get("access_token");
  const expiresIn = params.get("expires_in");

  if (!accessToken) {
    return null;
  }

  console.log(
    "[Auth Callback] Google OAuth token successfully parsed from URL hash:",
    {
      tokenPrefix: accessToken.slice(0, 12) + "...",
      expiresIn: expiresIn ? `${expiresIn} seconds` : "unknown",
    },
  );

  // Clean address bar: Stripping access token from URL history
  history.replaceState(
    null,
    "",
    window.location.pathname + window.location.search,
  );

  return {
    accessToken,
    expiresIn: expiresIn ? parseInt(expiresIn, 10) : 3600,
  };
}
