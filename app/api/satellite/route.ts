import {NextRequest, NextResponse} from "next/server";

export const dynamic = "force-dynamic";

type TokenResponse = {access_token: string; expires_in?: number};
type CatalogFeature = {properties?: {datetime?: string; "eo:cloud_cover"?: number}};
type CatalogResponse = {features?: CatalogFeature[]};

let cachedToken: {value: string; expiresAt: number} | null = null;

function validNumber(value: number, min: number, max: number) {
  return Number.isFinite(value) && value >= min && value <= max;
}

function offsetDate(value: string, offsetDays: number) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function currentUtcDate() {
  return new Date().toISOString().slice(0, 10);
}

async function accessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const clientId = process.env.COPERNICUS_CLIENT_ID;
  const clientSecret = process.env.COPERNICUS_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("missing_credentials");

  const body = new URLSearchParams({grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret});
  const response = await fetch("https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token", {
    method: "POST",
    headers: {"Content-Type": "application/x-www-form-urlencoded"},
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error("invalid_credentials");
  const token = await response.json() as TokenResponse;
  cachedToken = {value: token.access_token, expiresAt: Date.now() + (token.expires_in ?? 600) * 1_000};
  return token.access_token;
}

function timeRange(targetDate: string, mode: "before" | "after") {
  if (mode === "before") return {from: offsetDate(targetDate, -45), to: offsetDate(targetDate, -1)};
  const maximum = offsetDate(targetDate, 30);
  const today = currentUtcDate();
  return {from: targetDate, to: maximum < today ? maximum : today};
}

async function catalogue(latitude: number, longitude: number, from: string, to: string, token: string) {
  const response = await fetch("https://sh.dataspace.copernicus.eu/catalog/v1/search", {
    method: "POST",
    headers: {Authorization: `Bearer ${token}`, "Content-Type": "application/json"},
    body: JSON.stringify({
      bbox: [longitude - 0.52, latitude - 0.36, longitude + 0.52, latitude + 0.36],
      datetime: `${from}T00:00:00Z/${to}T23:59:59Z`,
      collections: ["sentinel-2-l2a"],
      limit: 100,
    }),
    next: {revalidate: 3600},
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`catalogue_${response.status}`);
  const result = await response.json() as CatalogResponse;
  return (result.features ?? [])
    .filter((feature) => feature.properties?.datetime)
    .sort((a, b) => (a.properties?.["eo:cloud_cover"] ?? 100) - (b.properties?.["eo:cloud_cover"] ?? 100));
}

const EVALSCRIPT = `//VERSION=3
function setup() {
  return {
    input: [{bands: ["B04", "B03", "B02", "SCL", "dataMask"]}],
    output: {bands: 4, sampleType: "AUTO"},
    mosaicking: "ORBIT"
  };
}
function clear(sample) {
  return sample.dataMask === 1 && ![0, 1, 3, 7, 8, 9, 10, 11].includes(sample.SCL);
}
function visual(value) {
  return Math.min(1, Math.sqrt(Math.max(0, value) * 3.2));
}
function evaluatePixel(samples) {
  for (let index = 0; index < samples.length; index++) {
    const sample = samples[index];
    if (clear(sample)) return [visual(sample.B04), visual(sample.B03), visual(sample.B02), 1];
  }
  return [0, 0, 0, 0];
}`;

async function processImage(latitude: number, longitude: number, from: string, to: string, token: string) {
  const response = await fetch("https://sh.dataspace.copernicus.eu/api/v1/process", {
    method: "POST",
    headers: {Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "image/png"},
    body: JSON.stringify({
      input: {
        bounds: {
          bbox: [longitude - 0.52, latitude - 0.36, longitude + 0.52, latitude + 0.36],
          properties: {crs: "http://www.opengis.net/def/crs/OGC/1.3/CRS84"},
        },
        data: [{
          type: "sentinel-2-l2a",
          dataFilter: {
            timeRange: {from: `${from}T00:00:00Z`, to: `${to}T23:59:59Z`},
            mosaickingOrder: "leastCC",
            maxCloudCoverage: 90,
          },
        }],
      },
      output: {width: 760, height: 420, responses: [{identifier: "default", format: {type: "image/png"}}]},
      evalscript: EVALSCRIPT,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`process_${response.status}_${await response.text()}`);
  return response.arrayBuffer();
}

export async function GET(request: NextRequest) {
  const latitude = Number(request.nextUrl.searchParams.get("lat"));
  const longitude = Number(request.nextUrl.searchParams.get("lon"));
  const targetDate = request.nextUrl.searchParams.get("date");
  const mode = request.nextUrl.searchParams.get("mode");
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  const resolve = request.nextUrl.searchParams.get("resolve") === "1";
  const validDate = (value: string | null) => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
  if (!validNumber(latitude, 41, 52) || !validNumber(longitude, -6, 10)) {
    return NextResponse.json({error: "invalid_parameters"}, {status: 400});
  }

  try {
    const token = await accessToken();
    if (resolve) {
      if (!validDate(targetDate) || (mode !== "before" && mode !== "after")) {
        return NextResponse.json({error: "invalid_parameters"}, {status: 400});
      }
      const range = timeRange(targetDate as string, mode);
      if (range.from > range.to) return NextResponse.json({error: "no_acquisition_yet"}, {status: 404});
      const scenes = await catalogue(latitude, longitude, range.from, range.to, token);
      if (!scenes.length) return NextResponse.json({error: "no_acquisition"}, {status: 404});
      const best = scenes[0].properties;
      return NextResponse.json({
        date: best?.datetime?.slice(0, 10) ?? range.to,
        from: range.from,
        to: range.to,
        platform: "sentinel2",
        source: "Copernicus Sentinel-2 L2A",
        cloudCoverage: Math.round((best?.["eo:cloud_cover"] ?? 0) * 10) / 10,
        composite: scenes.length > 1,
      }, {headers: {"Cache-Control": "private, max-age=0, must-revalidate"}});
    }

    if (!validDate(from) || !validDate(to)) return NextResponse.json({error: "invalid_parameters"}, {status: 400});
    const image = await processImage(latitude, longitude, from as string, to as string, token);
    return new NextResponse(image, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, max-age=3600, stale-while-revalidate=86400",
        "X-Imagery-Source": "Copernicus Sentinel-2 L2A",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    const missing = message === "missing_credentials";
    const invalid = message === "invalid_credentials";
    return NextResponse.json({error: missing ? "missing_credentials" : invalid ? "invalid_credentials" : "imagery_unavailable"}, {
      status: missing ? 503 : invalid ? 401 : 502,
    });
  }
}
