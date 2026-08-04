import {NextRequest, NextResponse} from "next/server";

export const dynamic = "force-dynamic";

type FirmsRow = {
  latitude: number;
  longitude: number;
  acquiredAt: string;
  satellite: string;
  instrument: string;
  confidence: string;
  frp: number;
  daynight: string;
};

const SOURCES = ["VIIRS_SNPP_NRT", "VIIRS_NOAA20_NRT", "VIIRS_NOAA21_NRT"];
const FRANCE_BBOX = "-5.6,41.2,9.8,51.3";

function parseCsvLine(line: string) {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) {
      values.push(value);
      value = "";
    } else value += character;
  }
  values.push(value);
  return values;
}

function parseFirmsCsv(csv: string): FirmsRow[] {
  const lines = csv.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  const column = (name: string) => headers.indexOf(name);
  return lines.slice(1).map(parseCsvLine).map((values) => {
    const date = values[column("acq_date")];
    const rawTime = values[column("acq_time")].padStart(4, "0");
    return {
      latitude: Number(values[column("latitude")]),
      longitude: Number(values[column("longitude")]),
      acquiredAt: `${date}T${rawTime.slice(0, 2)}:${rawTime.slice(2)}:00Z`,
      satellite: values[column("satellite")],
      instrument: values[column("instrument")],
      confidence: values[column("confidence")],
      frp: Number(values[column("frp")]) || 0,
      daynight: values[column("daynight")],
    };
  }).filter((row) => Number.isFinite(row.latitude) && Number.isFinite(row.longitude));
}

export async function GET(request: NextRequest) {
  const mapKey = process.env.NASA_FIRMS_MAP_KEY;
  if (!mapKey) {
    return NextResponse.json({
      error: "missing_key",
      message: "La clé NASA FIRMS n’est pas configurée.",
    }, {status: 503});
  }

  const requestedDays = Number(request.nextUrl.searchParams.get("days") ?? 2);
  const days = Math.max(1, Math.min(5, Number.isFinite(requestedDays) ? requestedDays : 2));

  try {
    const responses = await Promise.all(SOURCES.map(async (source) => {
      const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${encodeURIComponent(mapKey)}/${source}/${FRANCE_BBOX}/${days}`;
      const response = await fetch(url, {cache: "no-store", signal: AbortSignal.timeout(15_000)});
      if (!response.ok) throw new Error(`FIRMS ${source}: ${response.status}`);
      const body = await response.text();
      if (body.startsWith("Invalid MAP_KEY")) throw new Error("Invalid MAP_KEY");
      return parseFirmsCsv(body);
    }));

    const detections = responses.flat().sort((a, b) => a.acquiredAt.localeCompare(b.acquiredAt));
    return NextResponse.json({
      source: "NASA FIRMS",
      products: SOURCES,
      fetchedAt: new Date().toISOString(),
      days,
      detections,
    }, {
      headers: {"Cache-Control": "private, max-age=0, must-revalidate"},
    });
  } catch (error) {
    const invalidKey = error instanceof Error && error.message.includes("Invalid MAP_KEY");
    return NextResponse.json({
      error: invalidKey ? "invalid_key" : "source_unavailable",
      message: invalidKey ? "La clé NASA FIRMS est invalide." : "NASA FIRMS est momentanément indisponible.",
    }, {status: invalidKey ? 401 : 502});
  }
}
