import {NextRequest, NextResponse} from "next/server";
import effisCurrentFires from "@/public/data/effis-current-fires.json";
import officialConfirmations from "@/public/data/official-fire-confirmations.json";
import {
  findEffisFire,
  findOfficialFire,
  type EffisFireRecord,
  type OfficialFireRecord,
} from "@/lib/fire-verification";

export const dynamic = "force-dynamic";

type FireToVerify = {id: string; latitude: number; longitude: number; observedAt: string | null};
const officialRecords = officialConfirmations.records as OfficialFireRecord[];
const effisRecords = effisCurrentFires.records as EffisFireRecord[];

function validNumber(value: number, min: number, max: number) {
  return Number.isFinite(value) && value >= min && value <= max;
}

function verifyFire({latitude, longitude, observedAt}: FireToVerify) {
  if (!validNumber(latitude, 41, 52) || !validNumber(longitude, -6, 10)) {
    return {level: null, effisStatus: "unavailable" as const};
  }
  const official = findOfficialFire(officialRecords, latitude, longitude, observedAt);
  if (official) {
    return {
      level: "official" as const,
      label: "Confirmé officiellement",
      sourceName: official.sourceName,
      sourceUrl: official.sourceUrl,
      observedAt: official.observedAt,
      publishedAt: official.publishedAt,
      effisStatus: "not_needed" as const,
    };
  }
  const effis = findEffisFire(effisRecords, latitude, longitude, observedAt);
  if (!effis) return {level: null, effisStatus: "available" as const};
  return {
    level: "mapped" as const,
    label: "Zone brûlée cartographiée",
    sourceName: effisCurrentFires.sourceName,
    sourceUrl: effisCurrentFires.sourceUrl,
    observedAt: effis.firedAt,
    areaHa: effis.areaHa,
    effisStatus: "available" as const,
  };
}

export async function GET(request: NextRequest) {
  const fire: FireToVerify = {
    id: "single",
    latitude: Number(request.nextUrl.searchParams.get("lat")),
    longitude: Number(request.nextUrl.searchParams.get("lon")),
    observedAt: request.nextUrl.searchParams.get("observedAt"),
  };
  if (!validNumber(fire.latitude, 41, 52) || !validNumber(fire.longitude, -6, 10)) {
    return NextResponse.json({error: "invalid_parameters"}, {status: 400});
  }
  return NextResponse.json(verifyFire(fire), {
    headers: {"Cache-Control": "public, max-age=300, stale-while-revalidate=3600"},
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as {fires?: FireToVerify[]} | null;
  const fires = body?.fires?.slice(0, 100) ?? [];
  if (!fires.length) return NextResponse.json({verifications: {}});
  const verifications = Object.fromEntries(fires
    .filter((fire) => typeof fire.id === "string" && fire.id)
    .map((fire) => [fire.id, verifyFire(fire)]));
  return NextResponse.json({verifications}, {
    headers: {"Cache-Control": "public, max-age=300, stale-while-revalidate=3600"},
  });
}
