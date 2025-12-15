import { useConfigStore } from "@/stores/config";
import { createGoogleAdsApiClient } from "./apiService";

export interface Condition {
  id: number;
  metric: string;
  operator: string;
  value: number;
  logicalOperator: string;
}

/**
 * Fetches Performance Max assets based on specified conditions, date range, and campaign IDs.
 * @param {Condition[]} conditions - The conditions to filter assets by.
 * @param {string} dateRange - The date range for which to fetch assets.
 * @param {string[]} campaignIds - The IDs of the campaigns to fetch assets from.
 * @return {Promise<any>} The fetched assets.
 */
export async function fetchPMaxAssets(
  conditions: Condition[],
  dateRange: string,
  campaignIds: string[],
  includePaused = false
) {
  const assetWhereClauses = [
    "asset.type = 'IMAGE'",
    "asset_group_asset.status = 'ENABLED'",
    "asset.image_asset.full_size.url IS NOT NULL",
    "asset.source = 'ADVERTISER'",
    "campaign.advertising_channel_type = 'PERFORMANCE_MAX'",
  ];

  if (includePaused) {
    assetWhereClauses.push("asset_group.status IN ('ENABLED', 'PAUSED')");
  } else {
    assetWhereClauses.push("asset_group.status = 'ENABLED'");
  }

  if (campaignIds && campaignIds.length > 0) {
    assetWhereClauses.push(`campaign.id IN (${campaignIds.join(",")})`);
  }

  const assetQuery = `
    SELECT
      campaign.id,
      campaign.name,
      customer.currency_code,
      asset_group.name,
      asset.name,
      asset.resource_name,
      asset.source,
      asset_group_asset.resource_name,
      asset.image_asset.full_size.url,
      asset_group_asset.performance_label
    FROM asset_group_asset
    WHERE ${assetWhereClauses.join(" AND ")}
  `;

  const metricsWhereClauses = [
    "asset_group_asset.status = 'ENABLED'",
    `segments.date DURING ${dateRange}`,
    "campaign.advertising_channel_type = 'PERFORMANCE_MAX'",
  ];

  if (includePaused) {
    metricsWhereClauses.push("asset_group.status IN ('ENABLED', 'PAUSED')");
  } else {
    metricsWhereClauses.push("asset_group.status = 'ENABLED'");
  }

  if (campaignIds && campaignIds.length > 0) {
    metricsWhereClauses.push(`campaign.id IN (${campaignIds.join(",")})`);
  }

  const metricsQuery = `
    SELECT
      asset_group_asset.resource_name,
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
    WHERE ${metricsWhereClauses.join(" AND ")}
  `;

  return fetchAssetsWithMetrics(
    conditions,
    assetQuery,
    metricsQuery,
    (metrics: any[]) => {
      const metricsMap = new Map();
      metrics.forEach((m: any) => {
        metricsMap.set(m.assetGroupAsset.resourceName, m.metrics);
      });
      return metricsMap;
    },
    (asset: any, metricsMap: Map<string, any>) => {
      return (
        metricsMap.get(asset.assetGroupAsset.resourceName) || {
          ctr: 0,
          impressions: 0,
          clicks: 0,
          costMicros: 0,
          conversions: 0,
          averageCpc: 0,
          conversionsValue: 0,
          costPerConversion: 0,
          conversionsValuePerCost: 0,
        }
      );
    }
  );
}

function getMetricValue(metrics: any, metricName: string) {
  switch (metricName) {
    case "CTR":
      return metrics.ctr;
    case "Clicks":
      return metrics.clicks;
    case "Impressions":
      return metrics.impressions;
    case "Cost":
      return metrics.costMicros / 1000000;
    case "Conversions":
      return metrics.conversions;
    case "AverageCPC":
      return metrics.averageCpc / 1000000;
    case "ConversionValue":
      return metrics.conversionsValue;
    case "CPA":
      return metrics.costPerConversion / 1000000;
    case "ConvValuePerCost":
      return metrics.conversionsValuePerCost;
    default:
      return 0;
  }
}

function compare(a: number, operator: string, b: number) {
  switch (operator) {
    case "<":
      return a < b;
    case ">":
      return a > b;
    case "=":
      return a === b;
    case "<=":
      return a <= b;
    case ">=":
      return a >= b;
    default:
      return false;
  }
}

/**
 * Fetches Demand Gen assets based on specified conditions, date range, and campaign IDs.
 * @param {Condition[]} conditions - The conditions to filter assets by.
 * @param {string} dateRange - The date range for which to fetch assets.
 * @param {string[]} campaignIds - The IDs of the campaigns to fetch assets from.
 * @param {boolean} includePaused - Whether to include paused ad groups.
 * @return {Promise<any>} The fetched assets.
 */
export async function fetchDemandGenAssets(
  conditions: Condition[],
  dateRange: string,
  campaignIds: string[],
  includePaused = false
) {
  const assetWhereClauses = [
    "asset.type = 'IMAGE'",
    "ad_group_ad.status = 'ENABLED'",
    "asset.image_asset.full_size.url IS NOT NULL",
    "asset.source = 'ADVERTISER'",
    "campaign.advertising_channel_type = 'DEMAND_GEN'",
  ];

  if (includePaused) {
    assetWhereClauses.push("ad_group.status IN ('ENABLED', 'PAUSED')");
  } else {
    assetWhereClauses.push("ad_group.status = 'ENABLED'");
  }

  if (campaignIds && campaignIds.length > 0) {
    assetWhereClauses.push(`campaign.id IN (${campaignIds.join(",")})`);
  }

  const assetQuery = `
    SELECT
      campaign.id,
      campaign.name,
      customer.currency_code,
      ad_group.name,
      asset.name,
      asset.resource_name,
      asset.source,
      ad_group_ad.resource_name,
      ad_group_ad.ad.name,
      asset.image_asset.full_size.url
    FROM ad_group_ad_asset_view
    WHERE ${assetWhereClauses.join(" AND ")}
  `;

  const metricsWhereClauses = [
    "ad_group_ad.status = 'ENABLED'",
    `segments.date DURING ${dateRange}`,
    "campaign.advertising_channel_type = 'DEMAND_GEN'",
  ];

  if (includePaused) {
    metricsWhereClauses.push("ad_group.status IN ('ENABLED', 'PAUSED')");
  } else {
    metricsWhereClauses.push("ad_group.status = 'ENABLED'");
  }

  if (campaignIds && campaignIds.length > 0) {
    metricsWhereClauses.push(`campaign.id IN (${campaignIds.join(",")})`);
  }

  const metricsQuery = `
    SELECT
      ad_group_ad.resource_name,
      asset.resource_name,
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
    WHERE ${metricsWhereClauses.join(" AND ")}
  `;

  return fetchAssetsWithMetrics(
    conditions,
    assetQuery,
    metricsQuery,
    (metrics: any[]) => {
      const metricsMap = new Map();
      metrics.forEach((m: any) => {
        const adGroupAdResourceName = m.adGroupAd?.resourceName;
        const assetResourceName = m.asset?.resourceName;
        if (adGroupAdResourceName && assetResourceName) {
          const key = `${adGroupAdResourceName}~${assetResourceName}`;
          metricsMap.set(key, m.metrics);
        }
      });
      return metricsMap;
    },
    (asset: any, metricsMap: Map<string, any>) => {
      const adGroupAdResourceName = asset.adGroupAd?.resourceName;
      const assetResourceName = asset.asset?.resourceName;
      const key = `${adGroupAdResourceName}~${assetResourceName}`;

      return (
        metricsMap.get(key) || {
          ctr: 0,
          impressions: 0,
          clicks: 0,
          costMicros: 0,
          conversions: 0,
          averageCpc: 0,
          conversionsValue: 0,
          costPerConversion: 0,
          conversionsValuePerCost: 0,
        }
      );
    }
  );
}

async function fetchAssetsWithMetrics(
  conditions: Condition[],
  assetQuery: string,
  metricsQuery: string,
  createMetricsMap: (metrics: any[]) => Map<string, any>,
  getAssetMetrics: (asset: any, metricsMap: Map<string, any>) => any
) {
  const configStore = useConfigStore();
  const { customerID } = configStore;
  const apiClient = createGoogleAdsApiClient();
  const url = `/customers/${customerID}/googleAds:search`;

  try {
    const [assetData, metricsData] = await Promise.all([
      apiClient.post(url, { query: assetQuery }),
      apiClient.post(url, { query: metricsQuery }),
    ]);

    const assets = assetData.results || [];
    const metrics = metricsData.results || [];

    const metricsMap = createMetricsMap(metrics);

    const mergedAssets = assets.map((asset: any) => {
      const assetMetrics = getAssetMetrics(asset, metricsMap);
      return {
        ...asset,
        metrics: assetMetrics,
      };
    });

    const filteredAssets = mergedAssets.filter((asset: any) => {
      return conditions.every((condition) => {
        const metricValue = getMetricValue(asset.metrics, condition.metric);
        const conditionValue = condition.value;
        return compare(metricValue, condition.operator, conditionValue);
      });
    });

    return filteredAssets;
  } catch (error) {
    console.error("Error fetching assets with metrics:", error);
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
 * Fetches all enabled and paused Performance Max campaigns from a Google Ads account.
 * @return {Promise<any>} The fetched campaigns.
 */
export async function fetchPMaxCampaigns() {
  const configStore = useConfigStore();
  const { customerID } = configStore;
  const apiClient = createGoogleAdsApiClient();
  const url = `/customers/${customerID}/googleAds:search`;

  const gaqlQuery = `
    SELECT campaign.id, campaign.name, campaign.advertising_channel_type, campaign.status FROM campaign WHERE campaign.advertising_channel_type = 'PERFORMANCE_MAX' AND campaign.status IN ('ENABLED', 'PAUSED') ORDER BY campaign.name
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
 * Fetches all enabled and paused Demand Gen campaigns from a Google Ads account.
 * @return {Promise<any>} The fetched campaigns.
 */
export async function fetchDemandGenCampaigns() {
  const configStore = useConfigStore();
  const { customerID } = configStore;
  const apiClient = createGoogleAdsApiClient();
  const url = `/customers/${customerID}/googleAds:search`;

  const gaqlQuery = `
    SELECT campaign.id, campaign.name, campaign.advertising_channel_type, campaign.status FROM campaign WHERE campaign.advertising_channel_type = 'DEMAND_GEN' AND campaign.status IN ('ENABLED', 'PAUSED') ORDER BY campaign.name
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
 * @param {boolean} includePaused - Whether to include paused asset groups.
 * @return {Promise<any[]>} The fetched asset groups.
 */
export async function fetchAssetGroupsByCampaignIds(
  campaignIds: string[],
  includePaused = false
) {
  if (!campaignIds || campaignIds.length === 0) {
    return [];
  }

  const configStore = useConfigStore();
  const { customerID } = configStore;
  const apiClient = createGoogleAdsApiClient();
  const url = `/customers/${customerID}/googleAds:search`;

  let whereClause = `campaign.id IN (${campaignIds.join(",")})`;
  if (includePaused) {
    whereClause += " AND asset_group.status IN ('ENABLED', 'PAUSED')";
  } else {
    whereClause += " AND asset_group.status = 'ENABLED'";
  }

  const gaqlQuery = `
    SELECT
      asset_group.name,
      asset_group.resource_name,
      campaign.id,
      campaign.name,
      asset_group.id
    FROM asset_group
    WHERE ${whereClause}
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
 * @param {boolean} includePaused - Whether to include paused ad groups.
 * @return {Promise<any[]>} The fetched ad groups.
 */
export async function fetchAdGroupsByCampaignIds(
  campaignIds: string[],
  includePaused = false
) {
  if (!campaignIds || campaignIds.length === 0) {
    return [];
  }

  const configStore = useConfigStore();
  const { customerID } = configStore;
  const apiClient = createGoogleAdsApiClient();
  const url = `/customers/${customerID}/googleAds:search`;

  let whereClause = `campaign.id IN (${campaignIds.join(",")})`;
  if (includePaused) {
    whereClause += " AND ad_group.status IN ('ENABLED', 'PAUSED')";
  } else {
    whereClause += " AND ad_group.status = 'ENABLED'";
  }

  const gaqlQuery = `
    SELECT
      ad_group.name,
      ad_group.resource_name,
      campaign.id,
      campaign.name,
      ad_group.id,
      campaign.advertising_channel_type
    FROM ad_group
    WHERE ${whereClause}
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
