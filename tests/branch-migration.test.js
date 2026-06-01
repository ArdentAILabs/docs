import { describe, it, expect, beforeAll, afterAll } from "vitest";
import pg from "pg";

const { Client } = pg;
const TABLE = "ardent_ci_test";

let client;

beforeAll(async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
}, 30000);

afterAll(async () => {
  await client?.query(`DROP TABLE IF EXISTS ${TABLE}`).catch(() => {});
  await client?.end();
}, 30000);

describe("migration on Ardent branch", () => {
  it("runs a full migration lifecycle", async () => {
    const res = await client.query("SELECT 1 AS ok");
    expect(res.rows[0].ok).toBe(1);

    await client.query(`DROP TABLE IF EXISTS ${TABLE}`);
    await client.query(`
      CREATE TABLE ${TABLE} (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);

    const createRes = await client.query(
      `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position
    `,
      [TABLE]
    );

    const columns = createRes.rows.map((r) => r.column_name);
    expect(columns).toEqual(["id", "email", "created_at"]);

    await client.query(
      `INSERT INTO ${TABLE} (email) VALUES ($1)`,
      ["ci-test@example.com"]
    );

    const res = await client.query(
      `SELECT email FROM ${TABLE} WHERE email = $1`,
      ["ci-test@example.com"]
    );
    expect(res.rows.length).toBe(1);
    expect(res.rows[0].email).toBe("ci-test@example.com");

    await client.query(`ALTER TABLE ${TABLE} ADD COLUMN name TEXT`);

    const alterRes = await client.query(
      `
      SELECT column_name FROM information_schema.columns
      WHERE table_name = $1 AND column_name = $2
    `,
      [TABLE, "name"]
    );
    expect(alterRes.rows.length).toBe(1);

    await client.query(`DROP TABLE ${TABLE}`);

    const dropRes = await client.query(
      `
      SELECT table_name FROM information_schema.tables
      WHERE table_name = $1
    `,
      [TABLE]
    );
    expect(dropRes.rows.length).toBe(0);
  }, 60000);
});
