function normalizeFailureMode(rawMode) {
  if (typeof rawMode !== "string") {
    return "none";
  }

  const normalized = rawMode.trim().toLowerCase();
  return ["none", "primary", "secondary", "both"].includes(normalized) ? normalized : "none";
}

function getFailureMode() {
  return normalizeFailureMode(process.env.GEO_ENRICHMENT_FAILURE_MODE);
}

function shouldSimulateFailure(providerName) {
  const failureMode = getFailureMode();

  if (failureMode === "none") {
    return false;
  }

  if (failureMode === "both") {
    return true;
  }

  return failureMode === providerName;
}

function getPrimaryGeoUrl(ip) {
  return `${process.env.GEO_PROVIDER_A_URL || "https://ip-api.com/json/"}${encodeURIComponent(ip)}`;
}

function getSecondaryGeoUrl(ip) {
  return `${process.env.GEO_PROVIDER_B_URL || "https://ipapi.co/"}${encodeURIComponent(ip)}/json/`;
}

function parsePrimaryGeo(payload, ip) {
  if (!payload || payload.status !== "success") {
    throw new Error("Primary geo provider rejected the IP.");
  }

  return {
    ip,
    country: payload.country || null,
    region: payload.regionName || null,
    city: payload.city || null,
    latitude: payload.lat ?? null,
    longitude: payload.lon ?? null,
    source: "primary",
  };
}

function parseSecondaryGeo(payload, ip) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Secondary geo provider returned an invalid payload.");
  }

  const country = payload.country_name || payload.country || null;
  const region = payload.region || payload.region_code || null;
  const city = payload.city || null;
  const latitude = payload.latitude ?? null;
  const longitude = payload.longitude ?? null;

  if (country === null && region === null && city === null && latitude === null && longitude === null) {
    throw new Error("Secondary geo provider returned no usable geo fields.");
  }

  return {
    ip,
    country,
    region,
    city,
    latitude,
    longitude,
    source: "secondary",
  };
}

async function callProvider(url, fetchImpl, providerName) {
  const response = await fetchImpl(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "User-Agent": "FlyRank-Geo-Enricher/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`${providerName} provider failed with status ${response.status}.`);
  }

  return response.json();
}

async function resolveGeoForIp(ip, fetchImpl = globalThis.fetch) {
  if (!ip || typeof ip !== "string" || ip.trim().length === 0) {
    return null;
  }

  const providers = [
    {
      name: "primary",
      url: getPrimaryGeoUrl(ip),
      parser: parsePrimaryGeo,
    },
    {
      name: "secondary",
      url: getSecondaryGeoUrl(ip),
      parser: parseSecondaryGeo,
    },
  ];

  for (const provider of providers) {
    if (shouldSimulateFailure(provider.name)) {
      continue;
    }

    try {
      const payload = await callProvider(provider.url, fetchImpl, provider.name);
      return provider.parser(payload, ip);
    } catch (error) {
      if (provider.name === "secondary") {
        return null;
      }
    }
  }

  return null;
}

module.exports = {
  resolveGeoForIp,
  getFailureMode,
  shouldSimulateFailure,
  parsePrimaryGeo,
  parseSecondaryGeo,
};
