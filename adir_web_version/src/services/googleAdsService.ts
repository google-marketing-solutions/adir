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
      campaign.advertising_channel_type,
      customer.currency_code,
      asset_group.name,
      asset_group.id,
      asset_group.status,
      asset.name,
      asset.resource_name,
      asset.source,
      asset_group_asset.resource_name,
      asset.image_asset.full_size.url
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
      campaign.advertising_channel_type,
      asset_group.status,
      metrics.ctr,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.average_cpc,
      metrics.conversions_value
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
      const raw = metricsMap.get(asset.assetGroupAsset.resourceName);
      return normalizeMetrics(raw);
    }
  );
}

function normalizeMetrics(rawMetrics: any) {
  if (!rawMetrics) {
    return {
      ctr: 0,
      impressions: 0,
      clicks: 0,
      costMicros: 0,
      conversions: 0,
      averageCpc: 0,
      conversionsValue: 0,
      costPerConversion: 0,
      conversionsValuePerCost: 0,
    };
  }

  const ctr = rawMetrics.ctr || 0;
  const impressions = rawMetrics.impressions || 0;
  const clicks = rawMetrics.clicks || 0;
  const costMicros = rawMetrics.costMicros || rawMetrics.cost_micros || 0;
  const conversions = rawMetrics.conversions || 0;
  const averageCpc = rawMetrics.averageCpc || rawMetrics.average_cpc || 0;
  const conversionsValue =
    rawMetrics.conversionsValue || rawMetrics.conversions_value || 0;

  const costPerConversion =
    rawMetrics.costPerConversion !== undefined &&
    rawMetrics.costPerConversion !== null
      ? rawMetrics.costPerConversion
      : conversions > 0
      ? (costMicros / 1000000) / conversions
      : 0;

  const conversionsValuePerCost =
    rawMetrics.conversionsValuePerCost !== undefined &&
    rawMetrics.conversionsValuePerCost !== null
      ? rawMetrics.conversionsValuePerCost
      : costMicros > 0
      ? conversionsValue / (costMicros / 1000000)
      : 0;

  return {
    ctr,
    impressions,
    clicks,
    costMicros,
    conversions,
    averageCpc,
    conversionsValue,
    costPerConversion,
    conversionsValuePerCost,
  };
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
  const standardAssetsPromise = fetchStandardDemandGenAssets(
    conditions,
    dateRange,
    campaignIds,
    includePaused
  ).catch((err) => {
    console.error("Error fetching standard Demand Gen assets:", err);
    return [];
  });

  const carouselAssetsPromise = fetchDemandGenCarouselAssets(
    conditions,
    dateRange,
    campaignIds,
    includePaused
  ).catch((err) => {
    console.error("Error fetching Demand Gen carousel assets:", err);
    return [];
  });

  const [standardAssets, carouselAssets] = await Promise.all([
    standardAssetsPromise,
    carouselAssetsPromise,
  ]);

  return [...standardAssets, ...carouselAssets];
}

async function fetchStandardDemandGenAssets(
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
      campaign.advertising_channel_type,
      customer.currency_code,
      ad_group.name,
      ad_group.id,
      ad_group.status,
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
      campaign.advertising_channel_type,
      ad_group.status,
      metrics.ctr,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.average_cpc,
      metrics.conversions_value
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
      const raw = metricsMap.get(key);
      return normalizeMetrics(raw);
    }
  );
}

async function fetchDemandGenCarouselAssets(
  conditions: Condition[],
  dateRange: string,
  campaignIds: string[],
  includePaused = false
) {
  const configStore = useConfigStore();
  const customerID = configStore.customerID.replace(/[-\s]+/g, "");
  const apiClient = await createGoogleAdsApiClient();
  const searchUrl = `/customers/${customerID}/googleAds:search`;

  const adWhereClauses = [
    "ad_group_ad.status = 'ENABLED'",
    "campaign.advertising_channel_type = 'DEMAND_GEN'",
  ];

  if (includePaused) {
    adWhereClauses.push("ad_group.status IN ('ENABLED', 'PAUSED')");
  } else {
    adWhereClauses.push("ad_group.status = 'ENABLED'");
  }

  if (campaignIds && campaignIds.length > 0) {
    adWhereClauses.push(`campaign.id IN (${campaignIds.join(",")})`);
  }

  const adQuery = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.advertising_channel_type,
      customer.currency_code,
      ad_group.name,
      ad_group.id,
      ad_group.status,
      ad_group_ad.resource_name,
      ad_group_ad.status,
      ad_group_ad.ad.id,
      ad_group_ad.ad.name,
      ad_group_ad.ad.type,
      ad_group_ad.ad.demand_gen_carousel_ad.carousel_cards,
      ad_group_ad.ad.demand_gen_multi_asset_ad.marketing_images,
      ad_group_ad.ad.demand_gen_multi_asset_ad.square_marketing_images,
      ad_group_ad.ad.demand_gen_multi_asset_ad.portrait_marketing_images
    FROM ad_group_ad
    WHERE ${adWhereClauses.join(" AND ")}
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
      campaign.advertising_channel_type,
      ad_group.status,
      ad_group_ad.ad.type,
      metrics.ctr,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.average_cpc,
      metrics.conversions_value
    FROM ad_group_ad
    WHERE ${metricsWhereClauses.join(" AND ")}
  `;

  const [adRes, metricsRes] = await Promise.all([
    apiClient.post(searchUrl, { query: adQuery }),
    apiClient.post(searchUrl, { query: metricsQuery }),
  ]);

  const ads = adRes.results || [];
  const metricsList = metricsRes.results || [];

  console.log("[Demand Gen Carousel Debug] Fetched Ads:", ads);

  const metricsMap = new Map();
  metricsList.forEach((m: any) => {
    const resName = m.adGroupAd?.resourceName || m.ad_group_ad?.resource_name;
    if (resName) {
      metricsMap.set(resName, m.metrics);
    }
  });

  const cardImageResourceNames = new Set<string>();
  const cardItems: any[] = [];

  ads.forEach((adRow: any) => {
    const adGroupAd = adRow.adGroupAd || adRow.ad_group_ad;
    const ad = adGroupAd?.ad;
    if (!ad) return;

    console.log(`[Demand Gen Ad Inspection] Ad ID: ${ad.id}, Name: "${ad.name}", Type: ${ad.type}`, ad);

    const cards =
      ad.demandGenCarouselAd?.carouselCards ||
      ad.demand_gen_carousel_ad?.carousel_cards ||
      ad.carouselCards ||
      ad.carousel_cards ||
      [];

    cards.forEach((card: any) => {
      const cardImage =
        card.cardImage ||
        card.card_image ||
        card.imageAsset ||
        card.asset ||
        (typeof card.cardImageAsset === "string" ? card.cardImageAsset : card.cardImageAsset?.asset);
      if (cardImage && typeof cardImage === "string") {
        cardImageResourceNames.add(cardImage);
        cardItems.push({
          adRow,
          cardImageResourceName: cardImage,
        });
      }
    });
  });

  console.log(`[Demand Gen Carousel Debug] Extracted ${cardItems.length} card image references:`, Array.from(cardImageResourceNames));

  if (cardItems.length === 0 || cardImageResourceNames.size === 0) {
    return [];
  }

  const resourceNamesList = Array.from(cardImageResourceNames)
    .map((rn) => `'${rn}'`)
    .join(",");

  const assetQuery = `
    SELECT
      asset.id,
      asset.name,
      asset.resource_name,
      asset.type,
      asset.source,
      asset.image_asset.full_size.url,
      asset.demand_gen_carousel_card_asset.marketing_image_asset,
      asset.demand_gen_carousel_card_asset.square_marketing_image_asset,
      asset.demand_gen_carousel_card_asset.portrait_marketing_image_asset
    FROM asset
    WHERE asset.resource_name IN (${resourceNamesList})
  `;

  const assetRes = await apiClient.post(searchUrl, { query: assetQuery });
  console.log("[Demand Gen Carousel Debug] Asset Query 1st Hop Response:", assetRes);
  const rawAssets = assetRes.results || [];

  const assetDetailsMap = new Map();
  const subImageResourceNames = new Set<string>();
  const cardToSubImagesMap = new Map<string, string[]>();

  rawAssets.forEach((a: any) => {
    const asset = a.asset;
    if (!asset) return;
    const resName = asset.resourceName || asset.resource_name;
    if (!resName) return;

    const imageUrl = asset.imageAsset?.fullSize?.url || asset.image_asset?.full_size?.url;
    if (imageUrl) {
      assetDetailsMap.set(resName, asset);
    } else {
      const cardAsset = asset.demandGenCarouselCardAsset || asset.demand_gen_carousel_card_asset;
      console.log(`[Demand Gen Carousel Card Asset] Resource: ${resName}, Card Asset Details:`, cardAsset);

      const subImages = [
        cardAsset?.marketingImageAsset || cardAsset?.marketing_image_asset,
        cardAsset?.squareMarketingImageAsset || cardAsset?.square_marketing_image_asset,
        cardAsset?.portraitMarketingImageAsset || cardAsset?.portrait_marketing_image_asset,
      ].filter((img): img is string => typeof img === "string" && img.length > 0);

      if (subImages.length > 0) {
        subImages.forEach((imgRes) => subImageResourceNames.add(imgRes));
        cardToSubImagesMap.set(resName, subImages);
      }
    }
  });

  if (subImageResourceNames.size > 0) {
    console.log(`[Demand Gen Carousel Debug] Fetching 2nd hop image assets for ${subImageResourceNames.size} sub-images:`, Array.from(subImageResourceNames));
    const subResourceNamesList = Array.from(subImageResourceNames)
      .map((rn) => `'${rn}'`)
      .join(",");

    const subAssetQuery = `
      SELECT
        asset.id,
        asset.name,
        asset.resource_name,
        asset.type,
        asset.source,
        asset.image_asset.full_size.url
      FROM asset
      WHERE asset.resource_name IN (${subResourceNamesList})
    `;

    try {
      const subAssetRes = await apiClient.post(searchUrl, { query: subAssetQuery });
      console.log("[Demand Gen Carousel Debug] Asset Query 2nd Hop Response:", subAssetRes);
      const subAssets = subAssetRes.results || [];

      subAssets.forEach((sa: any) => {
        const resName = sa.asset?.resourceName || sa.asset?.resource_name;
        if (resName && sa.asset) {
          assetDetailsMap.set(resName, sa.asset);
        }
      });
    } catch (err) {
      console.error("Error fetching 2nd hop carousel sub-image assets:", err);
    }
  }

  const carouselAssets: any[] = [];

  cardItems.forEach(({ adRow, cardImageResourceName }) => {
    const subImgList = cardToSubImagesMap.get(cardImageResourceName);
    const targetAssetObjs: any[] = [];

    if (subImgList && subImgList.length > 0) {
      subImgList.forEach((subRes) => {
        const resolved = assetDetailsMap.get(subRes);
        if (resolved) targetAssetObjs.push(resolved);
      });
    } else {
      const directObj = assetDetailsMap.get(cardImageResourceName);
      if (directObj) targetAssetObjs.push(directObj);
    }

    const adGroupAd = adRow.adGroupAd || adRow.ad_group_ad;
    const adGroupAdResourceName = adGroupAd?.resourceName || adGroupAd?.resource_name;
    const rawMetrics = metricsMap.get(adGroupAdResourceName);
    const assetMetrics = normalizeMetrics(rawMetrics);

    targetAssetObjs.forEach((assetObj) => {
      const imageUrl =
        assetObj.imageAsset?.fullSize?.url ||
        assetObj.image_asset?.full_size?.url;
      if (!imageUrl) {
        console.warn(`[Demand Gen Carousel Warning] Image URL missing on target asset object:`, assetObj);
        return;
      }

      const combinedRow = {
        campaign: adRow.campaign,
        customer: adRow.customer,
        adGroup: adRow.adGroup || adRow.ad_group,
        adGroupAd: adGroupAd,
        asset: assetObj,
        metrics: assetMetrics,
        type: "demandgen",
        sourceType: "carousel_card",
      };

      const matchesConditions = conditions.every((condition) => {
        const metricValue = getMetricValue(combinedRow.metrics, condition.metric);
        const conditionValue = condition.value;
        return compare(metricValue, condition.operator, conditionValue);
      });

      if (matchesConditions) {
        carouselAssets.push(combinedRow);
      } else {
        console.log(`[Demand Gen Carousel Debug] Asset skipped due to conditions filtering:`, combinedRow);
      }
    });
  });

  console.log(`[Demand Gen Carousel Debug] Final processed ${carouselAssets.length} carousel card asset objects:`, carouselAssets);

  return carouselAssets;
}

async function fetchAssetsWithMetrics(
  conditions: Condition[],
  assetQuery: string,
  metricsQuery: string,
  createMetricsMap: (metrics: any[]) => Map<string, any>,
  getAssetMetrics: (asset: any, metricsMap: Map<string, any>) => any
) {
  const configStore = useConfigStore();
  const customerID = configStore.customerID.replace(/[-\s]+/g, "");
  const apiClient = await createGoogleAdsApiClient();
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
  const customerID = configStore.customerID.replace(/[-\s]+/g, "");
  const apiClient = await createGoogleAdsApiClient();
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
  const customerID = configStore.customerID.replace(/[-\s]+/g, "");
  const apiClient = await createGoogleAdsApiClient();
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
  const customerID = configStore.customerID.replace(/[-\s]+/g, "");
  const apiClient = await createGoogleAdsApiClient();
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
  const customerID = configStore.customerID.replace(/[-\s]+/g, "");
  const apiClient = await createGoogleAdsApiClient();
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
      asset_group.status,
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
  const customerID = configStore.customerID.replace(/[-\s]+/g, "");
  const apiClient = await createGoogleAdsApiClient();
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
      ad_group.status,
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
  const customerID = configStore.customerID.replace(/[-\s]+/g, "");
  const apiClient = await createGoogleAdsApiClient();
  const url = `/customers/${customerID}/googleAds:search`;

  const gaqlQuery = `
    SELECT
      asset_group_signal.search_theme.text,
      asset_group.id,
      asset_group_signal.approval_status
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
 * Safely formats a GCS image name or raw asset name into a valid Google Ads Asset name (max 128 characters).
 * Preserves the 'adir_' prefix and the unique filename/timestamp tail, while keeping the full
 * name untouched if it is already within the 128 character limit.
 *
 * @param {string} gcsName - The GCS object name/path or raw asset name.
 * @return {string} A safe asset name <= 128 characters starting with 'adir_'.
 */
export function formatGoogleAdsAssetName(gcsName: string): string {
  const MAX_LEN = 128;
  const PREFIX = "adir_";

  if (!gcsName) {
    return `${PREFIX}asset_${Date.now()}`;
  }

  const parts = gcsName.split("/").filter(Boolean);
  if (parts.length === 0) {
    return `${PREFIX}asset_${Date.now()}`;
  }

  // Filter parts: skip customer ID (index 0) if multiple path segments exist, and skip status folders
  let filteredParts = parts;
  if (parts.length > 1) {
    filteredParts = parts.filter((part, index) => {
      if (index === 0) return false;
      if (part === "GENERATED" || part === "UPLOADED") return false;
      return true;
    });
  }

  let rawName = filteredParts.length > 0
    ? filteredParts.join("_")
    : parts[parts.length - 1];

  if (!rawName.toLowerCase().startsWith("adir_")) {
    rawName = `${PREFIX}${rawName}`;
  }

  // If already within the 128 character limit, return untouched
  if (rawName.length <= MAX_LEN) {
    return rawName;
  }

  // If over 128 characters, perform smart trimming:
  // 1. Extract the filename (the unique suffix containing timestamp / aspect ratio / hash)
  const rawFilename = parts[parts.length - 1];
  let safeFilename = rawFilename;

  // Ensure filename itself does not consume the whole budget (cap to max 45 chars, keeping the unique end)
  if (safeFilename.length > 45) {
    const extMatch = safeFilename.match(/\.[0-9a-z]+$/i);
    const ext = extMatch ? extMatch[0] : ".png";
    const base = safeFilename.slice(0, safeFilename.length - ext.length);
    safeFilename = `${base.slice(-(45 - ext.length))}${ext}`;
  }

  // 2. Extract intermediate context (campaign / asset group)
  const contextParts = parts.length > 1
    ? parts.slice(1, parts.length - 1).filter(
        (p) => p !== "GENERATED" && p !== "UPLOADED"
      )
    : [];
  const rawContext = contextParts.join("_");

  // 3. Calculate remaining room for context
  // Format: "adir_" + safeContext + "_" + safeFilename
  const maxContextLen = MAX_LEN - PREFIX.length - 1 - safeFilename.length;
  const safeContext = rawContext.slice(0, Math.max(0, maxContextLen));

  let trimmedName = safeContext
    ? `${PREFIX}${safeContext}_${safeFilename}`
    : `${PREFIX}${safeFilename}`;

  // Hard safety clamp at 128 chars
  if (trimmedName.length > MAX_LEN) {
    trimmedName = trimmedName.slice(0, MAX_LEN);
  }

  return trimmedName;
}

/**
 * Uploads image assets to the Google Ads API.
 * @param {any[]} images - The images to upload.
 * @return {Promise<any>} The API response.
 */
export async function uploadImageAssets(images: any[]) {
  const configStore = useConfigStore();
  const customerID = configStore.customerID.replace(/[-\s]+/g, "");
  const apiClient = await createGoogleAdsApiClient();
  const url = `/customers/${customerID}/googleAds:mutate`;

  const operations = images.map((image) => ({
    assetOperation: {
      create: {
        type: "IMAGE",
        name: formatGoogleAdsAssetName(image.name),
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
