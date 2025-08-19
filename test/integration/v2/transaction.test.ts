import { Firebolt } from "../../../src";

const connectionParams = {
  auth: {
    client_id: process.env.FIREBOLT_CLIENT_ID as string,
    client_secret: process.env.FIREBOLT_CLIENT_SECRET as string
  },
  account: process.env.FIREBOLT_ACCOUNT as string,
  database: process.env.FIREBOLT_DATABASE as string,
  engineName: process.env.FIREBOLT_ENGINE_NAME as string
};

jest.setTimeout(500000);

describe("v2 transaction integration tests", () => {
  beforeAll(async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });

    // Setup test table
    const connection = await firebolt.connect(connectionParams);
    await connection.execute("DROP TABLE IF EXISTS transaction_test");
    await connection.execute(`
      CREATE FACT TABLE IF NOT EXISTS transaction_test (
        id              LONG,
        name            TEXT
      )
    `);
  });

  afterAll(async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });
    // Cleanup test table
    const connection = await firebolt.connect(connectionParams);
    try {
      await connection.execute("DROP TABLE IF EXISTS transaction_test CASCADE");
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  const checkRecordCountByIdInAnotherTransaction = async (
    id: number,
    expected: number
  ): Promise<void> => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });
    const connection = await firebolt.connect(connectionParams);
    const statement = await connection.execute(
      `SELECT COUNT(*) FROM transaction_test WHERE id = ${id}`
    );
    const { data } = await statement.fetchResult();
    const count = parseInt(data[0][0]);
    expect(count).toBe(expected);
  };

  it("should commit transaction", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });
    const connection = await firebolt.connect(connectionParams);

    await connection.execute("BEGIN TRANSACTION");
    await connection.execute("INSERT INTO transaction_test VALUES (1, 'test')");

    await checkRecordCountByIdInAnotherTransaction(1, 0);

    await connection.execute("COMMIT");

    await checkRecordCountByIdInAnotherTransaction(1, 1);
  });

  it("should rollback transaction", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });
    const connection = await firebolt.connect(connectionParams);

    await connection.execute("BEGIN TRANSACTION");
    await connection.execute("INSERT INTO transaction_test VALUES (2, 'test')");

    await checkRecordCountByIdInAnotherTransaction(2, 0);

    await connection.execute("ROLLBACK");

    await checkRecordCountByIdInAnotherTransaction(2, 0);
  });

  it("should commit transaction using transaction control methods", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });
    const connection = await firebolt.connect(connectionParams);

    // In v2, auto commit is handled through explicit transaction control
    await connection.begin();

    await connection.execute("INSERT INTO transaction_test VALUES (3, 'test')");

    await checkRecordCountByIdInAnotherTransaction(3, 0);

    await connection.commit();

    await checkRecordCountByIdInAnotherTransaction(3, 1);
  });

  it("should rollback transaction using transaction control methods", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });
    const connection = await firebolt.connect(connectionParams);

    await connection.begin();

    // Start transaction
    await connection.execute("INSERT INTO transaction_test VALUES (4, 'test')");

    await checkRecordCountByIdInAnotherTransaction(4, 0);

    // Rollback
    await connection.rollback();

    await checkRecordCountByIdInAnotherTransaction(4, 0);
  });

  it("should handle sequential transactions", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });
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
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });
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

  it("should not commit transaction when connection closes", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });
    let connection = await firebolt.connect(connectionParams);

    await connection.execute("BEGIN TRANSACTION");
    await connection.execute("INSERT INTO transaction_test VALUES (8, 'test')");
    await checkRecordCountByIdInAnotherTransaction(8, 0);

    // Simulate connection close by creating a new connection
    connection = await firebolt.connect(connectionParams);

    await checkRecordCountByIdInAnotherTransaction(8, 0);
  });

  it("should throw exception when starting transaction during transaction", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });
    const connection = await firebolt.connect(connectionParams);

    await connection.execute("BEGIN TRANSACTION");

    await expect(connection.execute("BEGIN TRANSACTION")).rejects.toThrow(
      /cannot BEGIN transaction: a transaction is already in progress/i
    );
  });

  it("should throw exception when committing with no transaction", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });
    const connection = await firebolt.connect(connectionParams);

    await expect(connection.execute("COMMIT")).rejects.toThrow(
      /cannot COMMIT transaction: no transaction is in progress/i
    );
  });

  it("should throw exception when rollback with no transaction", async () => {
    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });
    const connection = await firebolt.connect(connectionParams);

    await expect(connection.execute("ROLLBACK")).rejects.toThrow(
      /Cannot ROLLBACK transaction: no transaction is in progress/i
    );
  });

  it("should commit table creation and data insertion", async () => {
    const tableName = "transaction_commit_test";

    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });
    const connection = await firebolt.connect(connectionParams);
    await connection.execute(`DROP TABLE IF EXISTS ${tableName} CASCADE`);

    await connection.begin();

    const createTableSQL = `CREATE FACT TABLE ${tableName} (id LONG, name TEXT)`;
    const insertSQL = `INSERT INTO ${tableName} (id, name) VALUES (0, 'some_text')`;
    const checkTableSQL = `SELECT COUNT(*) FROM information_schema.tables WHERE table_name = '${tableName}'`;
    const selectSQL = `SELECT * FROM ${tableName}`;

    await connection.execute(createTableSQL);
    await connection.execute(insertSQL);

    // Check table doesn't exist in another connection
    const checkConnection = await firebolt.connect(connectionParams);
    const checkStatement = await checkConnection.execute(checkTableSQL);
    const { data: checkData } = await checkStatement.fetchResult();
    const count = parseInt(checkData[0][0]);
    expect(count).toBe(0);

    await connection.commit();

    const statement = await connection.execute(selectSQL);
    const { data } = await statement.fetchResult();

    expect(data.length).toBe(1);
    const row = data[0];
    const id = parseInt(row[0]);
    const name = row[1] as string;

    expect(id).toBe(0);
    expect(name).toBe("some_text");

    // Cleanup
    await connection.execute(`DROP TABLE IF EXISTS ${tableName} CASCADE`);
  });

  it("should rollback table creation and data insertion", async () => {
    const tableName = "transaction_rollback_test";

    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });
    const connection = await firebolt.connect(connectionParams);
    await connection.execute(`DROP TABLE IF EXISTS ${tableName} CASCADE`);

    await connection.begin();

    const createTableSQL = `CREATE FACT TABLE ${tableName} (id LONG, name TEXT)`;
    const insertSQL = `INSERT INTO ${tableName} (id, name) VALUES (0, 'some_text')`;
    const checkTableSQL = `SELECT COUNT(*) FROM information_schema.tables WHERE table_name = '${tableName}'`;

    await connection.execute(createTableSQL);
    await connection.execute(insertSQL);

    // Check table doesn't exist in another connection
    const checkConnection = await firebolt.connect(connectionParams);
    const checkStatement = await checkConnection.execute(checkTableSQL);
    const { data: checkData } = await checkStatement.fetchResult();
    const count = parseInt(checkData[0][0]);
    expect(count).toBe(0);

    await connection.rollback();

    const statement = await connection.execute(checkTableSQL);
    const { data } = await statement.fetchResult();
    const finalCount = parseInt(data[0][0]);
    expect(finalCount).toBe(0);
  });

  it("should handle parallel transactions", async () => {
    const tableName = "parallel_transactions_test";
    const dropTableSQL = `DROP TABLE IF EXISTS ${tableName} CASCADE`;
    const createTableSQL = `CREATE FACT TABLE IF NOT EXISTS ${tableName} (id LONG, name TEXT)`;
    const insertSQL = `INSERT INTO ${tableName} (id, name) VALUES (?, ?)`;
    const selectSQL = `SELECT * FROM ${tableName} ORDER BY id`;

    const firstName = "first";
    const secondName = "second";

    const firebolt = Firebolt({
      apiEndpoint: process.env.FIREBOLT_API_ENDPOINT as string
    });
    const tx1 = await firebolt.connect(connectionParams);
    const tx2 = await firebolt.connect(connectionParams);

    await tx1.execute(dropTableSQL);
    await tx1.execute(createTableSQL);

    await tx1.begin();
    await tx2.begin();

    await tx1.execute(insertSQL, { parameters: [1, firstName] });
    await tx2.execute(insertSQL, { parameters: [2, secondName] });

    // Validate each transaction can see its own data
    await validateSingleResult(tx1, selectSQL, 1, firstName);
    await validateSingleResult(tx2, selectSQL, 2, secondName);

    await tx1.commit();
    await tx2.commit();

    // Check final state
    const connection = await firebolt.connect(connectionParams);
    const statement = await connection.execute(selectSQL);
    const { data } = await statement.fetchResult();

    expect(data.length).toBe(2);

    const row1 = data[0];
    expect(parseInt(row1[0])).toBe(1);
    expect(row1[1]).toBe(firstName);

    const row2 = data[1];
    expect(parseInt(row2[0])).toBe(2);
    expect(row2[1]).toBe(secondName);

    // Cleanup
    await connection.execute(dropTableSQL);
  });

  const validateSingleResult = async (
    connection: any,
    selectSQL: string,
    expectedId: number,
    expectedName: string
  ): Promise<void> => {
    const statement = await connection.execute(selectSQL);
    const { data } = await statement.fetchResult();

    expect(data.length).toBe(1);
    const row = data[0];
    const id = parseInt(row[0]);
    const name = row[1] as string;
    expect(id).toBe(expectedId);
    expect(name).toBe(expectedName);
  };
});
