import { useConfigStore } from "@/stores/config";
import { createGcsApiClient } from "./apiService";

/**
 * @interface GcsUriParts
 * @property {string} bucket - The GCS bucket name.
 * @property {string} object - The GCS object name.
 */
interface GcsUriParts {
  bucket: string;
  object: string;
}

/**
 * Uploads a base64 encoded image to a GCS bucket.
 * @param {string} fileName - The name of the file to create in GCS.
 * @param {string} base64Data - The base64 encoded image data.
 * @return {Promise<string>} The media link of the uploaded file.
 */
export async function uploadBase64Image(fileName: string, base64Data: string) {
  const configStore = useConfigStore();
  const { gcsBucketName } = configStore;

  if (!gcsBucketName) {
    throw new Error("GCS bucket name is not configured.");
  }

  const bucketName = gcsBucketName.startsWith("gs://")
    ? gcsBucketName.substring(5)
    : gcsBucketName;

  const response = await fetch(base64Data);
  const blob = await response.blob();

  const path = `/${bucketName}/o`;
  const params = {
    uploadType: "media",
    name: fileName,
  };

  const gcsApiClient = createGcsApiClient(true);
  const result = await gcsApiClient.request(
    path,
    {
      method: "POST",
      headers: {
        "Content-Type": blob.type,
      },
      body: blob,
    },
    params
  );

  return result.mediaLink;
}

/**
 * Lists images from a GCS bucket based on a path prefix.
 * @param {string} path - The path prefix to filter images by.
 * @return {Promise<object[]>} A list of image objects.
 */
export async function listImages(path: string) {
  const configStore = useConfigStore();
  const { gcsBucketName } = configStore;

  if (!gcsBucketName) {
    throw new Error("GCS bucket name is not configured.");
  }

  const bucketName = gcsBucketName.startsWith("gs://")
    ? gcsBucketName.substring(5)
    : gcsBucketName;

  const fullPath = `/${bucketName}/o`;
  const params = {
    prefix: path,
  };

  const gcsApiClient = createGcsApiClient();
  const result = await gcsApiClient.get(fullPath, params);

  return result.items.map((item: any) => ({
    name: item.name,
    mediaLink: item.mediaLink,
    gcsUri: `gs://${item.bucket}/${item.name}`,
  }));
}

/**
 * Parses a GCS URI into its bucket and object parts.
 * @param {string} gcsUri - The GCS URI to parse.
 * @return {GcsUriParts} An object containing the bucket and object parts.
 * @throws {Error} If the GCS URI format is invalid.
 */
function _parseGcsUri(gcsUri: string): GcsUriParts {
  if (typeof gcsUri !== "string" || !gcsUri.startsWith("gs://")) {
    throw new Error(
      'Invalid GCS URI format. Expected "gs://bucket-name/object-name".'
    );
  }
  const [bucket, ...objectParts] = gcsUri.replace("gs://", "").split("/");
  const object = objectParts.join("/");
  if (!bucket || !object) {
    throw new Error(
      'Invalid GCS URI format. Expected "gs://bucket-name/object-name".'
    );
  }
  return { bucket, object };
}

type DownloadAs = "arrayBuffer" | "blob" | "formData" | "json" | "text";

/**
 * Downloads a file from GCS.
 * @param {string} gcsUri - The GCS URI of the file to download.
 * @param {DownloadAs} as - The format to download the file as.
 * @return {Promise<any>} The downloaded file in the specified format.
 */
export async function downloadFileFromGCS(
  gcsUri: string,
  as: DownloadAs = "blob"
): Promise<any> {
  const { bucket, object } = _parseGcsUri(gcsUri);
  const path = `/${bucket}/o/${encodeURIComponent(object)}`;
  const params = { alt: "media" };

  const gcsApiClient = createGcsApiClient();
  const blob = await gcsApiClient.get(path, params, "blob");

  if (as === "blob") {
    return blob;
  }
  const response = new Response(blob);
  return response[as]();
}

/**
 * Downloads a file from GCS and returns it as a base64 string.
 * @param {string} gcsUri - The GCS URI of the file to download.
 * @return {Promise<string>} The base64 encoded file data.
 */
export async function downloadFileAsBase64(gcsUri: string): Promise<string> {
  const blob = await downloadFileFromGCS(gcsUri, "blob");
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = (reader.result as string).split(",")[1];
      resolve(base64data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Removes multiple images from GCS.
 * @param {string[]} gcsUris - An array of GCS URIs of the images to remove.
 * @return {Promise<void>}
 */
export async function removeImages(gcsUris: string[]): Promise<void> {
  const gcsApiClient = createGcsApiClient();
  const deletePromises = gcsUris.map(async (gcsUri) => {
    const { bucket, object } = _parseGcsUri(gcsUri);
    const path = `/${bucket}/o/${encodeURIComponent(object)}`;
    return gcsApiClient.delete(path);
  });

  await Promise.all(deletePromises);
}
