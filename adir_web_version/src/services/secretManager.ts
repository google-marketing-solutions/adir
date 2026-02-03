import { useAuthStore } from "@/stores/auth";

interface SecretVersionAccessResponse {
  name: string;
  payload: {
    data: string;
  };
}

/**
 * Service for interacting with Google Cloud Secret Manager.
 * Allows accessing secrets stored in GCP.
 */
class SecretManagerService {
  private cache: Map<string, string> = new Map();

  /**
   * Fetches the secret payload from Secret Manager.
   * Caches successful responses in memory for the session.
   * @param resourceId The full resource name of the secret version (e.g., "projects/my-project/secrets/my-secret/versions/1" or "latest").
   * @return The decoded secret string.
   */
  async getSecret(resourceId: string): Promise<string> {
    if (!resourceId) {
      throw new Error("Secret Resource ID is required.");
    }

    if (this.cache.has(resourceId)) {
      return this.cache.get(resourceId)!;
    }

    const authStore = useAuthStore();
    const authToken = authStore.accessToken;

    if (!authToken) {
      throw new Error(
        "User is not authenticated. Cannot access Secret Manager.",
      );
    }

    const url = `https://secretmanager.googleapis.com/v1/${resourceId}:access`;

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Failed to fetch secret from ${resourceId}: ${response.status} ${response.statusText}`;

        if (response.status === 403) {
          errorMessage = `Permission denied for ${resourceId}. Please ensure the user has the 'Secret Manager Secret Accessor' role on the secret or project.`;
        } else if (response.status === 404) {
          errorMessage = `Secret not found: ${resourceId}. Please check if the secret exists and the name is correct.`;
        }

        throw new Error(`${errorMessage} - ${errorText}`);
      }

      const data = (await response.json()) as SecretVersionAccessResponse;

      if (!data.payload?.data) {
        throw new Error(`Secret payload is empty for ${resourceId}`);
      }

      // Secret data is base64 encoded
      const secret = atob(data.payload.data);
      this.cache.set(resourceId, secret);
      return secret;
    } catch (error) {
      console.error("Secret Manager Error:", error);
      throw error;
    }
  }

  /**
   * Clears the in-memory cache of secrets.
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export const secretManagerService = new SecretManagerService();
