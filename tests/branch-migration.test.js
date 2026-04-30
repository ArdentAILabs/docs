import { describe, it, expect, beforeAll, afterAll } from "vitest";
import pg from "pg";

const { Client } = pg;
const TABLE = "ardent_ci_test";

let client;

beforeAll(async () => {
  client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
}, 30000);

afterAll(async () => {
  await client?.query(`DROP TABLE IF EXISTS ${TABLE}`).catch(() => {});
  await client?.end();
}, 30000);

describe("migration on Ardent branch", () => {
  it("connects to the branch database", async () => {
    const res = await client.query("SELECT 1 AS ok");
    expect(res.rows[0].ok).toBe(1);
  }, 15000);

  it("runs a CREATE TABLE migration", async () => {
    await client.query(`DROP TABLE IF EXISTS ${TABLE}`);
    await client.query(`
      CREATE TABLE ${TABLE} (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);

    const res = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = '${TABLE}'
      ORDER BY ordinal_position
    `);

    const columns = res.rows.map((r) => r.column_name);
    expect(columns).toEqual(["id", "email", "created_at"]);
  }, 15000);

  it("inserts and reads data", async () => {
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
  }, 15000);

  it("runs an ALTER TABLE migration", async () => {
    await client.query(`ALTER TABLE ${TABLE} ADD COLUMN name TEXT`);

    const res = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = '${TABLE}' AND column_name = 'name'
    `);
    expect(res.rows.length).toBe(1);
  }, 15000);

  it("cleans up with DROP TABLE", async () => {
    await client.query(`DROP TABLE ${TABLE}`);

    const res = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_name = '${TABLE}'
    `);
    expect(res.rows.length).toBe(0);
  }, 15000);
});
