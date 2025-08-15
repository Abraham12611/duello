import { neon } from "@neondatabase/serverless";

// Simple accessor so we can reuse across API routes
export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return neon(url);
}

export type DbMarketRow = {
  address: string;
  token: string;
  start_iso: string;
  tag: string;
  team_a_name: string;
  team_a_logo: string | null;
  team_b_name: string;
  team_b_logo: string | null;
  created_at: string | null;
  locked: boolean | null;
  winner: number | null;
};
