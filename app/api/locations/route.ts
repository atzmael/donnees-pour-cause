import {NextRequest, NextResponse} from "next/server";

export const dynamic = "force-dynamic";

type LocationRequest = {id: string; latitude: number; longitude: number};
type IgnFeature = {
  properties?: {
    type?: string;
    name?: string;
    city?: string;
    oldcity?: string | null;
    district?: string;
    context?: string;
    postcode?: string;
  };
};

function validCoordinate(value: number, min: number, max: number) {
  return Number.isFinite(value) && value >= min && value <= max;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as {locations?: LocationRequest[]} | null;
  const locations = body?.locations?.slice(0, 40) ?? [];
  if (!locations.length) return NextResponse.json({locations: {}});

  const resolved = await Promise.all(locations.map(async (location) => {
    if (!location.id || !validCoordinate(location.latitude, 41, 52) || !validCoordinate(location.longitude, -6, 10)) {
      return [location.id, null] as const;
    }
    try {
      const url = new URL("https://data.geopf.fr/geocodage/reverse");
      url.searchParams.set("lon", String(location.longitude));
      url.searchParams.set("lat", String(location.latitude));
      url.searchParams.set("limit", "1");
      const response = await fetch(url, {next: {revalidate: 86_400}, signal: AbortSignal.timeout(8_000)});
      if (!response.ok) return [location.id, null] as const;
      const result = await response.json() as {features?: IgnFeature[]};
      const features = result.features ?? [];
      const properties = features.find((feature) => feature.properties?.city)?.properties ?? features[0]?.properties;
      if (!properties) return [location.id, null] as const;
      const locality = features.find((feature) => feature.properties?.type === "locality")?.properties?.name ?? null;
      const commune = properties.oldcity || properties.city || null;
      const contextParts = properties.context?.split(",").map((part) => part.trim()) ?? [];
      const department = contextParts[1] ?? null;
      const region = contextParts.at(-1) ?? null;
      const title = [locality, commune, department, region].find(Boolean) ?? null;
      if (!title) return [location.id, null] as const;
      return [location.id, {
        title,
        level: locality ? "locality" : commune ? "commune" : department ? "department" : "region",
        locality,
        commune,
        district: properties.district ?? null,
        department,
        region,
        postcode: properties.postcode ?? null,
      }] as const;
    } catch {
      return [location.id, null] as const;
    }
  }));

  return NextResponse.json({locations: Object.fromEntries(resolved)}, {
    headers: {"Cache-Control": "public, max-age=3600, stale-while-revalidate=86400"},
  });
}
