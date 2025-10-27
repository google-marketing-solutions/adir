import { useAuthStore } from "@/stores/auth";
import { useConfigStore } from "@/stores/config";

interface ApiClientOptions {
  baseUrl: string;
  headers?: Record<string, string>;
}

class ApiClient {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl;
    this.headers = options.headers || {};
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const authStore = useAuthStore();
    const { accessToken } = authStore;
    if (!accessToken) {
      throw new Error("Missing access token");
    }
    return {
      Authorization: `Bearer ${accessToken}`,
    };
  }

  private handleApiError(response: Response, errorData: any) {
    console.error("API request failed:", errorData);
    throw new Error(`API request failed: ${response.statusText}`);
  }

  async request(
    path: string,
    options: RequestInit,
    params: Record<string, string> = {},
    responseType: "json" | "blob" | "text" = "json"
  ) {
    const authHeaders = await this.getAuthHeaders();
    const url = new URL(`${this.baseUrl}${path}`);
    Object.keys(params).forEach((key) =>
      url.searchParams.append(key, params[key])
    );

    const response = await fetch(url.toString(), {
      ...options,
      headers: {
        ...this.headers,
        ...authHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => response.text());
      this.handleApiError(response, errorData);
    }

    if (responseType === "blob") {
      return response.blob();
    }
    if (responseType === "text") {
      return response.text();
    }
    return response.json();
  }

  get(
    path: string,
    params: Record<string, string> = {},
    responseType: "json" | "blob" | "text" = "json"
  ) {
    return this.request(path, { method: "GET" }, params, responseType);
  }

  post(path: string, body: any, params: Record<string, string> = {}) {
    return this.request(
      path,
      {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      },
      params
    );
  }

  delete(path: string) {
    return this.request(path, { method: "DELETE" });
  }
}

/**
 * Creates and configures an ApiClient for the Google Ads API.
 * @return {ApiClient} An ApiClient instance for Google Ads.
 */
export function createGoogleAdsApiClient() {
  const configStore = useConfigStore();
  const { developerToken, mccID } = configStore;

  if (!developerToken || !mccID) {
    throw new Error("Missing Google Ads API credentials");
  }

  return new ApiClient({
    baseUrl: "https://googleads.googleapis.com/v21",
    headers: {
      "developer-token": `${developerToken}`,
      "login-customer-id": `${mccID}`,
    },
  });
}

/**
 * Creates and configures an ApiClient for Google Cloud Storage.
 * @param {boolean} upload - Determines whether to use the upload endpoint.
 * @return {ApiClient} An ApiClient instance for GCS.
 */
export function createGcsApiClient(upload: boolean = false) {
  const baseUrl = upload
    ? "https://storage.googleapis.com/upload/storage/v1/b"
    : "https://storage.googleapis.com/storage/v1/b";
  return new ApiClient({ baseUrl });
}

/**
 * Creates and configures an ApiClient for the Vertex AI API.
 * @return {ApiClient} An ApiClient instance for Vertex AI.
 */
export function createVertexAiApiClient() {
  const configStore = useConfigStore();
  const { cloudProjectID, cloudRegion } = configStore;

  if (!cloudProjectID || !cloudRegion) {
    throw new Error("Google Cloud Project ID and Region are not configured.");
  }
  const baseUrl = `https://${cloudRegion}-aiplatform.googleapis.com/v1/projects/${cloudProjectID}/locations/${cloudRegion}`;
  return new ApiClient({ baseUrl });
}
