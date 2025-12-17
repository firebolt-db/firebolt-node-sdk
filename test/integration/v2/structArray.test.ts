import { Firebolt } from "../../../src/index";

const connectionParams = {
  auth: {
    client_id: process.env.FIREBOLT_CLIENT_ID as string,
    client_secret: process.env.FIREBOLT_CLIENT_SECRET as string
  },
  account: process.env.FIREBOLT_ACCOUNT as string,
  database: process.env.FIREBOLT_DATABASE as string
};

jest.setTimeout(500000);

describe("struct array integration tests", () => {
  it("should correctly parse ARRAY(STRUCT()) with case-insensitive field mapping", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    const connection = await firebolt.connect(connectionParams);

    const complexQuery = `
      SELECT 
        'value1' AS ef0,
        'value2' AS ef1,
        [{'ARN': 'test1', 'id': 1}, {'ARN': 'test2', 'id': 2}] AS ef2,
        {'MixEd-Case': '1'} AS ef3
    `;

    const statement = await connection.execute(complexQuery, {
      response: { normalizeData: true }
    });
    const { data, meta } = await statement.fetchResult();

    expect(meta.length).toBe(4); // ef0, ef1, ef2 columns
    expect(meta[0].name).toBe("ef0");
    expect(meta[1].name).toBe("ef1");
    expect(meta[2].name).toBe("ef2");
    expect(meta[3].name).toBe("ef3");
    expect(meta[0].type).toBe("text");
    expect(meta[1].type).toBe("text");
    expect(meta[2].type).toBe("array(struct(ARN text, id int))");
    expect(meta[3].type).toBe("struct(`MixEd-Case` text)");

    const row = data[0];

    expect(row.ef0).toBe("value1");
    expect(row.ef1).toBe("value2");
    expect(Array.isArray(row.ef2)).toBe(true);
    expect(row.ef2).toHaveLength(2);

    expect(row.ef2[0]).toEqual({ ARN: "test1", id: 1 });
    expect(row.ef2[1]).toEqual({ ARN: "test2", id: 2 });
    expect(row.ef3).toEqual({ "MixEd-Case": "1" });
  });
});
