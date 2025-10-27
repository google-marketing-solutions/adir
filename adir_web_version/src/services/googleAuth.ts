/* global google */

/**
 * Creates a token client.
 * @param {string} clientId
 * @param {string} scope
 * @param {function} callback
 * @return {object}
 */
export function createTokenClient(clientId, scope, callback) {
  const client = google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope,
    callback,
  });
  return client;
}

/**
 * Verifies the user's domain.
 * @param {string} accessToken
 * @return {Promise<boolean>}
 */
export async function verifyUserDomain(accessToken) {
  const userInfo = await fetch(
    "https://www.googleapis.com/oauth2/v3/userinfo",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  if (!userInfo.ok) {
    console.error("Failed to fetch user info");
    return false;
  }
  const userInfoJson = await userInfo.json();
  return userInfoJson.hd === "google.com";
}
