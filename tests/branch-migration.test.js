import { describe, it, expect, beforeAll, afterAll } from "vitest";
import pg from "pg";

const { Client } = pg;

let client;

beforeAll(async () => {
  client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
});

afterAll(async () => {
  await client?.end();
});

describe("migration on Ardent branch", () => {
  it("connects to the branch database", async () => {
    const res = await client.query("SELECT 1 AS ok");
    expect(res.rows[0].ok).toBe(1);
  });

  it("runs a CREATE TABLE migration", async () => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);

    const res = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);

    const columns = res.rows.map((r) => r.column_name);
    expect(columns).toContain("id");
    expect(columns).toContain("email");
    expect(columns).toContain("created_at");
  });

  it("inserts and reads data", async () => {
    await client.query(
      "INSERT INTO users (email) VALUES ($1) ON CONFLICT DO NOTHING",
      ["ci-test@example.com"]
    );

    const res = await client.query("SELECT email FROM users WHERE email = $1", [
      "ci-test@example.com",
    ]);
    expect(res.rows.length).toBe(1);
    expect(res.rows[0].email).toBe("ci-test@example.com");
  });

  it("runs an ALTER TABLE migration", async () => {
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT
    `);

    const res = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'name'
    `);
    expect(res.rows.length).toBe(1);
  });

  it("cleans up with DROP TABLE", async () => {
    await client.query("DROP TABLE users");

    const res = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_name = 'users'
    `);
    expect(res.rows.length).toBe(0);
  });
});
