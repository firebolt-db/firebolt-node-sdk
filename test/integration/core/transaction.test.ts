import { Firebolt, FireboltCore } from "../../../src/index";

const connectionParams = {
  auth: FireboltCore(),
  database: process.env.FIREBOLT_DATABASE as string,
  engineEndpoint: process.env.FIREBOLT_CORE_ENDPOINT as string
};

jest.setTimeout(10000);

describe("transactions", () => {
  beforeAll(async () => {
    const firebolt = Firebolt();

    // Setup test table
    const connection = await firebolt.connect(connectionParams);
    await connection.execute("DROP TABLE IF EXISTS transaction_test");
    await connection.execute(`
      CREATE TABLE transaction_test (
        id    INT,
        name  TEXT
      )
    `);
  });

  afterAll(async () => {
    const firebolt = Firebolt();
    // Cleanup test table
    const connection = await firebolt.connect(connectionParams);
    try {
      await connection.execute("DROP TABLE IF EXISTS transaction_test");
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  const checkRecordCountByIdInAnotherTransaction = async (
    id: number,
    expected: number
  ): Promise<void> => {
    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);
    const statement = await connection.execute(
      `SELECT COUNT(*) FROM transaction_test WHERE id = ${id}`
    );
    const { data } = await statement.fetchResult();
    const count = parseInt(data[0][0]);
    expect(count).toBe(expected);
  };

  it("should commit transaction", async () => {
    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);

    await connection.execute("BEGIN TRANSACTION");
    await connection.execute("INSERT INTO transaction_test VALUES (1, 'test')");

    await checkRecordCountByIdInAnotherTransaction(1, 0);

    await connection.execute("COMMIT");

    await checkRecordCountByIdInAnotherTransaction(1, 1);
  });

  it("should rollback transaction", async () => {
    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);

    await connection.execute("BEGIN TRANSACTION");
    await connection.execute("INSERT INTO transaction_test VALUES (2, 'test')");

    await checkRecordCountByIdInAnotherTransaction(2, 0);

    await connection.execute("ROLLBACK");

    await checkRecordCountByIdInAnotherTransaction(2, 0);
  });

  it("should commit transaction using transaction control methods", async () => {
    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);

    await connection.begin();

    await connection.execute("INSERT INTO transaction_test VALUES (3, 'test')");

    await checkRecordCountByIdInAnotherTransaction(3, 0);

    await connection.commit();

    await checkRecordCountByIdInAnotherTransaction(3, 1);
  });

  it("should rollback transaction using transaction control methods", async () => {
    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);

    await connection.begin();

    await connection.execute("INSERT INTO transaction_test VALUES (4, 'test')");

    await checkRecordCountByIdInAnotherTransaction(4, 0);

    await connection.rollback();

    await checkRecordCountByIdInAnotherTransaction(4, 0);
  });

  it("should handle sequential transactions", async () => {
    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);

    // First transaction
    await connection.begin();
    await connection.execute("INSERT INTO transaction_test VALUES (5, 'test')");
    await checkRecordCountByIdInAnotherTransaction(5, 0);
    await connection.commit();

    await checkRecordCountByIdInAnotherTransaction(5, 1);

    // Second transaction
    await connection.begin();
    await connection.execute("INSERT INTO transaction_test VALUES (6, 'test')");
    await checkRecordCountByIdInAnotherTransaction(6, 0);
    await connection.commit();

    await checkRecordCountByIdInAnotherTransaction(5, 1);
    await checkRecordCountByIdInAnotherTransaction(6, 1);
  });

  it("should work with prepared statements", async () => {
    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);

    await connection.begin();

    await connection.execute(
      "INSERT INTO transaction_test VALUES (?, 'test')",
      {
        parameters: [7]
      }
    );

    await checkRecordCountByIdInAnotherTransaction(7, 0);

    await connection.commit();
    await checkRecordCountByIdInAnotherTransaction(7, 1);
  });

  it("should handle multi-statement transaction", async () => {
    const firebolt = Firebolt();
    const connection = await firebolt.connect(connectionParams);

    await connection.begin();

    // Multiple statements within the same transaction
    await connection.execute("INSERT INTO transaction_test VALUES (8, 'first')");
    await connection.execute("INSERT INTO transaction_test VALUES (9, 'second')");
    await connection.execute("INSERT INTO transaction_test VALUES (10, 'third')");

    // Verify none are visible yet
    await checkRecordCountByIdInAnotherTransaction(8, 0);
    await checkRecordCountByIdInAnotherTransaction(9, 0);
    await checkRecordCountByIdInAnotherTransaction(10, 0);

    await connection.commit();

    // Verify all are visible after commit
    await checkRecordCountByIdInAnotherTransaction(8, 1);
    await checkRecordCountByIdInAnotherTransaction(9, 1);
    await checkRecordCountByIdInAnotherTransaction(10, 1);
  });
});

