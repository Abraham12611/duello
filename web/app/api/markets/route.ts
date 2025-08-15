import { getSql, type DbMarketRow } from "@/lib/db";
export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      address,
      token,
      startIso,
      tag,
      teamAName,
      teamALogo,
      teamBName,
      teamBLogo,
    } = body ?? {};

    if (!address || !token || !startIso || !tag || !teamAName || !teamBName) {
      return new Response("Missing fields", { status: 400 });
    }

    const sql = getSql();
    await sql(
      `INSERT INTO markets (address, token, start_iso, tag, team_a_name, team_a_logo, team_b_name, team_b_logo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (address) DO UPDATE SET
         token = EXCLUDED.token,
         start_iso = EXCLUDED.start_iso,
         tag = EXCLUDED.tag,
         team_a_name = EXCLUDED.team_a_name,
         team_a_logo = EXCLUDED.team_a_logo,
         team_b_name = EXCLUDED.team_b_name,
         team_b_logo = EXCLUDED.team_b_logo`,
      [address, token, startIso, tag, teamAName, teamALogo ?? null, teamBName, teamBLogo ?? null]
    );

    return Response.json({ ok: true });
  } catch (e) {
    console.error("POST /api/markets error", e);
    const msg = process.env.NODE_ENV === "development" ? String(e) : "Bad Request";
    return new Response(msg, { status: 400 });
  }
}

export async function GET() {
  try {
    const sql = getSql();
    const rows = (await sql<DbMarketRow[]>`SELECT * FROM markets ORDER BY start_iso ASC`) as unknown as DbMarketRow[];
    const markets = rows.map((r) => ({
      address: r.address as `0x${string}`,
      token: r.token as `0x${string}`,
      startIso: r.start_iso,
      tag: r.tag,
      teamA: { name: r.team_a_name, logoDataUrl: r.team_a_logo || undefined },
      teamB: { name: r.team_b_name, logoDataUrl: r.team_b_logo || undefined },
    }));
    return Response.json({ markets });
  } catch (e) {
    console.error("GET /api/markets error", e);
    const msg = process.env.NODE_ENV === "development" ? String(e) : "Server Error";
    return new Response(msg, { status: 500 });
  }
}
