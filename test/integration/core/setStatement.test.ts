import { Firebolt, FireboltCore } from "../../../src/index";

const connectionParams = {
  auth: FireboltCore(),
  database: process.env.FIREBOLT_DATABASE as string,
  engineEndpoint: process.env.FIREBOLT_CORE_ENDPOINT as string
};

jest.setTimeout(20000);

describe("SET statements", () => {
  it("executes SET statement", async () => {
    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);

    // SET timezone and verify it affects subsequent queries
    await connection.execute("SET timezone = 'Europe/Berlin'");
    
    // Verify the timezone setting is applied by checking timestamp conversion
    const statement = await connection.execute(
      "SELECT '2025-12-15 16:00:00+00'::timestamptz::TEXT"
    );
    const { data } = await statement.fetchResult();

    // Europe/Berlin is UTC+1, so 16:00:00 UTC becomes 17:00:00+01
    expect(data[0][0]).toContain("17:00:00+01");
  });

  it("SET statement affects subsequent queries", async () => {
    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);

    // Set timezone to Europe/Bucharest
    await connection.execute("SET timezone = 'Europe/Bucharest'");
    
    // Verify the timezone setting affects the query result
    const statement = await connection.execute(
      "SELECT '2025-12-15 16:00:00+00'::timestamptz::TEXT"
    );
    const { data } = await statement.fetchResult();

    // Europe/Bucharest is UTC+2, so 16:00:00 UTC becomes 18:00:00+02
    expect(data[0][0]).toContain("18:00:00+02");
  });

  it("handles multiple SET statements", async () => {
    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);

    // Set multiple settings
    await connection.execute("SET timezone = 'Europe/Berlin'");
    await connection.execute("SET max_result_rows=5");
    
    // Verify the timezone setting is still applied after multiple SET statements
    const statement = await connection.execute(
      "SELECT '2025-12-15 16:00:00+00'::timestamptz::TEXT FROM generate_series(1, 10)"
    );
    const { data } = await statement.fetchResult();

    // Europe/Berlin is UTC+1, so 16:00:00 UTC becomes 17:00:00+01
    expect(data[0][0]).toContain("17:00:00+01");
    // Ensure that there are only five result rows
    expect(data.length).toBe(5);
  });
});

