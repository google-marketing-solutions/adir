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

