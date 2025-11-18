import { useConfigStore } from "@/stores/config";
import { createGoogleAdsApiClient } from "./apiService";

const metricMap = {
  CTR: "metrics.ctr",
  Clicks: "metrics.clicks",
  Impressions: "metrics.impressions",
  Cost: "metrics.cost_micros",
  Conversions: "metrics.conversions",
  AverageCPC: "metrics.average_cpc",
  ConversionValue: "metrics.conversions_value",
  CPA: "metrics.cost_per_conversion",
  ConvValuePerCost: "metrics.conversions_value_per_cost",
};

/**
 * Fetches Performance Max assets based on specified conditions, date range, and campaign IDs.
 * @param {any[]} conditions - The conditions to filter assets by.
 * @param {string} dateRange - The date range for which to fetch assets.
 * @param {string[]} campaignIds - The IDs of the campaigns to fetch assets from.
 * @return {Promise<any>} The fetched assets.
 */
export async function fetchPMaxAssets(
  conditions: any[],
  dateRange: string,
  campaignIds: string[]
) {
  const configStore = useConfigStore();
  const { customerID } = configStore;
  const apiClient = createGoogleAdsApiClient();
  const url = `/customers/${customerID}/googleAds:search`;

  const whereClauses = conditions.map((condition) => {
    const gaqlField = metricMap[condition.metric as keyof typeof metricMap];
    if (
      condition.metric === "Cost" ||
      condition.metric === "CPA" ||
      condition.metric === "AverageCPC"
    ) {
      return `${gaqlField} ${condition.operator} ${condition.value * 1000000}`;
    }
    return `${gaqlField} ${condition.operator} ${condition.value}`;
  });

  whereClauses.push("asset.type = 'IMAGE'");
  whereClauses.push("asset_group_asset.status = 'ENABLED'");
  whereClauses.push("asset.image_asset.full_size.url IS NOT NULL");
  whereClauses.push("asset.source = 'ADVERTISER'");
  whereClauses.push(`segments.date DURING ${dateRange}`);

  if (campaignIds && campaignIds.length > 0) {
    whereClauses.push(`campaign.id IN (${campaignIds.join(",")})`);
  }
  whereClauses.push("campaign.advertising_channel_type = 'PERFORMANCE_MAX'");

  const gaqlQuery = `
    SELECT
      campaign.name,
      customer.currency_code,
      asset_group.name,
      asset.name,
      asset.resource_name,
      asset.source,
      asset_group_asset.resource_name,
      asset.image_asset.full_size.url,
      asset_group_asset.performance_label,
      metrics.ctr,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.average_cpc,
      metrics.conversions_value,
      metrics.cost_per_conversion,
      metrics.conversions_value_per_cost
    FROM asset_group_asset
    WHERE ${whereClauses.join(" AND ")}
  `;

  const body = { query: gaqlQuery };
  console.log("GAQL Query:", gaqlQuery);

  try {
    const data = await apiClient.post(url, body);
    console.log("Google Ads API Response:", data);
    return data.results || [];
  } catch (error) {
    console.error("Error fetching PMax assets:", error);
    throw error;
  }
}

/**
 * Fetches Demand Gen assets based on specified conditions, date range, and campaign IDs.
 * @param {any[]} conditions - The conditions to filter assets by.
 * @param {string} dateRange - The date range for which to fetch assets.
 * @param {string[]} campaignIds - The IDs of the campaigns to fetch assets from.
 * @return {Promise<any>} The fetched assets.
 */
export async function fetchDemandGenAssets(
  conditions: any[],
  dateRange: string,
  campaignIds: string[]
) {
  const configStore = useConfigStore();
  const { customerID } = configStore;
  const apiClient = createGoogleAdsApiClient();
  const url = `/customers/${customerID}/googleAds:search`;

  const whereClauses = conditions.map((condition) => {
    const gaqlField = metricMap[condition.metric as keyof typeof metricMap];
    if (
      condition.metric === "Cost" ||
      condition.metric === "CPA" ||
      condition.metric === "AverageCPC"
    ) {
      return `${gaqlField} ${condition.operator} ${condition.value * 1000000}`;
    }
    return `${gaqlField} ${condition.operator} ${condition.value}`;
  });

  whereClauses.push("asset.type = 'IMAGE'");
  whereClauses.push("ad_group_ad.status = 'ENABLED'");
  whereClauses.push("asset.image_asset.full_size.url IS NOT NULL");
  whereClauses.push("asset.source = 'ADVERTISER'");
  whereClauses.push(`segments.date DURING ${dateRange}`);

  if (campaignIds && campaignIds.length > 0) {
    whereClauses.push(`campaign.id IN (${campaignIds.join(",")})`);
  }
  whereClauses.push("campaign.advertising_channel_type = 'DEMAND_GEN'");

  const gaqlQuery = `
    SELECT
      campaign.name,
      customer.currency_code,
      ad_group.name,
      asset.name,
      asset.resource_name,
      asset.source,
      ad_group_ad.resource_name,
      ad_group_ad.ad.name,
      asset.image_asset.full_size.url,
      metrics.ctr,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.average_cpc,
      metrics.conversions_value,
      metrics.cost_per_conversion,
      metrics.conversions_value_per_cost
    FROM ad_group_ad_asset_view
    WHERE ${whereClauses.join(" AND ")}
  `;

  const body = { query: gaqlQuery };

  try {
    const data = await apiClient.post(url, body);
    console.log("Google Ads API Response (Demand Gen):", data);
    return data.results || [];
  } catch (error) {
    console.error("Error fetching Demand Gen assets:", error);
    throw error;
  }
}
/**
 * Removes asset group assets from a Google Ads account.
 * @param {string[]} assetGroupAssetResourceNames - The resource names of the asset group assets to remove.
 * @return {Promise<any>} The API response.
 */
export async function removeAssetGroupAssets(
  assetGroupAssetResourceNames: string[]
) {
  const configStore = useConfigStore();
  const { customerID } = configStore;
  const apiClient = createGoogleAdsApiClient();
  const url = `/customers/${customerID}/googleAds:mutate`;

  const mutateOperations = assetGroupAssetResourceNames
    .filter((resourceName) => resourceName)
    .map((resourceName) => ({
      assetGroupAssetOperation: {
        remove: resourceName,
      },
    }));

  console.log("--- Preparing to Remove Assets ---");
  console.log(
    "Number of assets to remove:",
    assetGroupAssetResourceNames.length
  );
  console.log(
    "Resource Names received:",
    JSON.stringify(assetGroupAssetResourceNames, null, 2)
  );
  console.log(
    "Constructed Mutate Operations:",
    JSON.stringify(mutateOperations, null, 2)
  );

  const body = {
    mutateOperations,
  };

  try {
    const data = await apiClient.post(url, body);
    console.log("Google Ads API Response:", data);
    return data;
  } catch (error) {
    console.error("Error removing PMax assets:", error);
    throw error;
  }
}

/**
 * Fetches all enabled Performance Max campaigns from a Google Ads account.
 * @return {Promise<any>} The fetched campaigns.
 */
export async function fetchPMaxCampaigns() {
  const configStore = useConfigStore();
  const { customerID } = configStore;
  const apiClient = createGoogleAdsApiClient();
  const url = `/customers/${customerID}/googleAds:search`;

  const gaqlQuery = `
    SELECT campaign.id, campaign.name, campaign.advertising_channel_type FROM campaign WHERE campaign.advertising_channel_type = 'PERFORMANCE_MAX' AND campaign.status = 'ENABLED' ORDER BY campaign.name
  `;

  const body = { query: gaqlQuery };

  try {
    const data = await apiClient.post(url, body);
    console.log("Google Ads API Response:", data);
    return data.results || [];
  } catch (error) {
    console.error("Error fetching PMax campaigns:", error);
    throw error;
  }
}

/**
 * Fetches all enabled Demand Gen campaigns from a Google Ads account.
 * @return {Promise<any>} The fetched campaigns.
 */
export async function fetchDemandGenCampaigns() {
  const configStore = useConfigStore();
  const { customerID } = configStore;
  const apiClient = createGoogleAdsApiClient();
  const url = `/customers/${customerID}/googleAds:search`;

  const gaqlQuery = `
    SELECT campaign.id, campaign.name, campaign.advertising_channel_type FROM campaign WHERE campaign.advertising_channel_type = 'DEMAND_GEN' AND campaign.status = 'ENABLED' ORDER BY campaign.name
  `;

  const body = { query: gaqlQuery };

  try {
    const data = await apiClient.post(url, body);
    console.log("Google Ads API Response:", data);
    return data.results || [];
  } catch (error) {
    console.error("Error fetching Demand Gen campaigns:", error);
    throw error;
  }
}

/**
 * Fetches asset groups for a given list of campaign IDs.
 * @param {string[]} campaignIds - The IDs of the campaigns to fetch asset groups from.
 * @return {Promise<any[]>} The fetched asset groups.
 */
export async function fetchAssetGroupsByCampaignIds(campaignIds: string[]) {
  if (!campaignIds || campaignIds.length === 0) {
    return [];
  }

  const configStore = useConfigStore();
  const { customerID } = configStore;
  const apiClient = createGoogleAdsApiClient();
  const url = `/customers/${customerID}/googleAds:search`;

  const gaqlQuery = `
    SELECT
      asset_group.name,
      asset_group.resource_name,
      campaign.id,
      campaign.name,
      asset_group.id
    FROM asset_group
    WHERE campaign.id IN (${campaignIds.join(",")})
  `;

  const body = { query: gaqlQuery };

  try {
    const data = await apiClient.post(url, body);
    console.log("Google Ads API Response:", data);
    return data.results;
  } catch (error) {
    console.error("Error fetching asset groups:", error);
    throw error;
  }
}
/**
 * Fetches ad groups for a given list of campaign IDs.
 * @param {string[]} campaignIds - The IDs of the campaigns to fetch ad groups from.
 * @return {Promise<any[]>} The fetched ad groups.
 */
export async function fetchAdGroupsByCampaignIds(campaignIds: string[]) {
  if (!campaignIds || campaignIds.length === 0) {
    return [];
  }

  const configStore = useConfigStore();
  const { customerID } = configStore;
  const apiClient = createGoogleAdsApiClient();
  const url = `/customers/${customerID}/googleAds:search`;

  const gaqlQuery = `
    SELECT
      ad_group.name,
      ad_group.resource_name,
      campaign.id,
      campaign.name,
      ad_group.id,
      campaign.advertising_channel_type
    FROM ad_group
    WHERE campaign.id IN (${campaignIds.join(",")})
  `;

  const body = { query: gaqlQuery };

  try {
    const data = await apiClient.post(url, body);
    console.log("Google Ads API Response:", data);
    return data.results;
  } catch (error) {
    console.error("Error fetching ad groups:", error);
    throw error;
  }
}

/**
 * Fetches search signal keywords for a specific asset group.
 * @param {string} assetGroupId - The ID of the asset group.
 * @return {Promise<any>} The fetched search signal keywords.
 */
export async function getSearchSignalKeywordsForAdGroup(assetGroupId: string) {
  const configStore = useConfigStore();
  const { customerID } = configStore;
  const apiClient = createGoogleAdsApiClient();
  const url = `/customers/${customerID}/googleAds:search`;

  const gaqlQuery = `
    SELECT
      asset_group_signal.search_theme.text
    FROM asset_group_signal
    WHERE asset_group.id = ${assetGroupId}
    AND asset_group_signal.approval_status = 'APPROVED'
    LIMIT 1000
  `;

  const body = { query: gaqlQuery };

  try {
    const data = await apiClient.post(url, body);
    console.log("Google Ads API Response:", data);
    return data.results;
  } catch (error) {
    console.error("Error fetching search signals:", error);
    throw error;
  }
}

/**
 * Uploads image assets to the Google Ads API.
 * @param {any[]} images - The images to upload.
 * @return {Promise<any>} The API response.
 */
export async function uploadImageAssets(images: any[]) {
  const configStore = useConfigStore();
  const { customerID } = configStore;
  const apiClient = createGoogleAdsApiClient();
  const url = `/customers/${customerID}/googleAds:mutate`;

  const operations = images.map((image) => ({
    assetOperation: {
      create: {
        type: "IMAGE",
        name: image.name,
        imageAsset: {
          data: image.content,
        },
      },
    },
  }));

  const body = {
    mutateOperations: operations,
  };

  try {
    const data = await apiClient.post(url, body);
    console.log("Google Ads API Response:", data);
    return data;
  } catch (error) {
    console.error("Error uploading images to Google Ads:", error);
    throw error;
  }
}
