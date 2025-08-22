import { getSql, type DbMarketRow } from "@/lib/db";
export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      address,
      token,
      startIso,
      endIso,
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
    // Ensure table exists on first use (timestamps stored as TIMESTAMPTZ going forward)
    await sql`CREATE TABLE IF NOT EXISTS markets (
      address TEXT PRIMARY KEY,
      token TEXT NOT NULL,
      start_iso TIMESTAMPTZ NOT NULL,
      end_iso TIMESTAMPTZ,
      tag TEXT NOT NULL,
      team_a_name TEXT NOT NULL,
      team_a_logo TEXT,
      team_b_name TEXT NOT NULL,
      team_b_logo TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      locked BOOLEAN,
      winner SMALLINT,
      deleted_at TIMESTAMPTZ
    )`;
    // Add new columns if migrating from older schema
    await sql`ALTER TABLE markets ADD COLUMN IF NOT EXISTS end_iso TIMESTAMPTZ`;
    await sql`ALTER TABLE markets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`;

    await sql(
      `INSERT INTO markets (address, token, start_iso, end_iso, tag, team_a_name, team_a_logo, team_b_name, team_b_logo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (address) DO UPDATE SET
         token = EXCLUDED.token,
         start_iso = EXCLUDED.start_iso,
         end_iso = EXCLUDED.end_iso,
         tag = EXCLUDED.tag,
         team_a_name = EXCLUDED.team_a_name,
         team_a_logo = EXCLUDED.team_a_logo,
         team_b_name = EXCLUDED.team_b_name,
         team_b_logo = EXCLUDED.team_b_logo`,
      [address, token, startIso, endIso ?? null, tag, teamAName, teamALogo ?? null, teamBName, teamBLogo ?? null]
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
    // Ensure table exists before querying (fresh database)
    await sql`CREATE TABLE IF NOT EXISTS markets (
      address TEXT PRIMARY KEY,
      token TEXT NOT NULL,
      start_iso TIMESTAMPTZ NOT NULL,
      end_iso TIMESTAMPTZ,
      tag TEXT NOT NULL,
      team_a_name TEXT NOT NULL,
      team_a_logo TEXT,
      team_b_name TEXT NOT NULL,
      team_b_logo TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      locked BOOLEAN,
      winner SMALLINT,
      deleted_at TIMESTAMPTZ
    )`;
    await sql`ALTER TABLE markets ADD COLUMN IF NOT EXISTS end_iso TIMESTAMPTZ`;
    await sql`ALTER TABLE markets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`;
    const rows = (await sql`SELECT * FROM markets WHERE deleted_at IS NULL AND (end_iso IS NULL OR (end_iso::timestamptz) > now()) ORDER BY (start_iso::timestamptz) ASC`) as unknown as DbMarketRow[];
    const markets = rows.map((r) => ({
      address: r.address as `0x${string}`,
      token: r.token as `0x${string}`,
      startIso: r.start_iso,
      endIso: (r as any).end_iso ?? null,
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

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const address = url.searchParams.get("address");
    if (!address) return new Response("Missing address", { status: 400 });
    const sql = getSql();
    await sql`ALTER TABLE markets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`;
    await sql`UPDATE markets SET deleted_at = now() WHERE address = ${address}`;
    return Response.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/markets error", e);
    const msg = process.env.NODE_ENV === "development" ? String(e) : "Bad Request";
    return new Response(msg, { status: 400 });
  }
}
