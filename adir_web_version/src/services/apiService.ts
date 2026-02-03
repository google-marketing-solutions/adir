import { useAuthStore } from "@/stores/auth";
import { useConfigStore } from "@/stores/config";
import { secretManagerService } from "./secretManager";

/**
 * Default security settings for Vertex AI models.
 */
export const DefaultSecuritySettings = [
  {
    category: "HARM_CATEGORY_HATE_SPEECH",
    threshold: "BLOCK_NONE",
  },
  {
    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
    threshold: "BLOCK_NONE",
  },
  {
    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
    threshold: "BLOCK_NONE",
  },
  {
    category: "HARM_CATEGORY_HARASSMENT",
    threshold: "BLOCK_NONE",
  },
];

interface ApiClientOptions {
  baseUrl: string;
  headers?: Record<string, string>;
}

interface ApiErrorResponse {
  error?: {
    message?: string;
  };
  message?: string;
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

  private handleApiError(response: Response, errorData: unknown) {
    console.error("API request failed:", errorData);

    if (response.status === 401) {
      throw new Error("Your token has expired, please logout and login again.");
    }

    let errorMessage = `API request failed: ${response.statusText}`;

    if (typeof errorData === "string") {
      errorMessage = errorData;
    } else if (typeof errorData === "object" && errorData !== null) {
      const error = errorData as ApiErrorResponse;
      errorMessage = error.error?.message || error.message || errorMessage;
    }

    throw new Error(errorMessage);
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

  post(path: string, body: unknown, params: Record<string, string> = {}) {
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
    return this.request(path, { method: "DELETE" }, {}, "text");
  }
}

/**
 * Creates and configures an ApiClient for the Google Ads API.
 * @return {Promise<ApiClient>} An ApiClient instance for Google Ads.
 */
export async function createGoogleAdsApiClient() {
  const configStore = useConfigStore();
  const { developerToken, mccID, useSecretManager, googleClientId } =
    configStore;

  let finalDeveloperToken = developerToken;

  if (useSecretManager) {
    if (!googleClientId) {
      throw new Error(
        "Google Client ID is missing. Cannot derive Project Number for Secret Manager.",
      );
    }
    const projectNumber = googleClientId.split("-")[0];
    if (!projectNumber) {
      throw new Error(
        "Invalid Google Client ID format. Cannot derive Project Number.",
      );
    }
    const resourceId = `projects/${projectNumber}/secrets/google_ads_developer_token/versions/latest`;
    finalDeveloperToken = await secretManagerService.getSecret(resourceId);
  }

  if (!finalDeveloperToken || !mccID) {
    throw new Error("Missing Google Ads API credentials");
  }

  return new ApiClient({
    baseUrl: "https://googleads.googleapis.com/v21",
    headers: {
      "developer-token": `${finalDeveloperToken}`,
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

interface VertexAiApiClientOptions {
  apiVersion?: string;
  useGlobalEndpoint?: boolean;
}

/**
 * Creates and configures an ApiClient for the Vertex AI API.
 * @param {VertexAiApiClientOptions} options - Configuration options.
 * @return {ApiClient} An ApiClient instance for Vertex AI.
 */
export function createVertexAiApiClient(
  options: VertexAiApiClientOptions = {}
) {
  const configStore = useConfigStore();
  const { cloudProjectID, cloudRegion } = configStore;

  if (!cloudProjectID || !cloudRegion) {
    throw new Error("Google Cloud Project ID and Region are not configured.");
  }

  const { apiVersion = "v1", useGlobalEndpoint = false } = options;

  let baseUrl: string;
  if (useGlobalEndpoint) {
    baseUrl = `https://aiplatform.googleapis.com/${apiVersion}/projects/${cloudProjectID}/locations/${cloudRegion}`;
  } else {
    baseUrl = `https://${cloudRegion}-aiplatform.googleapis.com/${apiVersion}/projects/${cloudProjectID}/locations/${cloudRegion}`;
  }

  return new ApiClient({ baseUrl });
}


