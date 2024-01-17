import { setupServer } from "msw/node";
import { rest } from "msw";
import { Firebolt } from "../../../src";
import { ConnectionOptions } from "../../../src/types";
import { AccountNotFoundError } from "../../../src/common/errors";

const apiEndpoint = "api.fake.firebolt.io";

const engineUrlResponse = {
  meta: [
    {
      name: "url",
      type: "Text"
    },
    {
      name: "database_name",
      type: "Text"
    },
    {
      name: "status",
      type: "Text"
    }
  ],
  data: [["https://some_engine.com", "dummy", "Running"]],
  rows: 1
};

const selectOneResponse = {
  meta: [
    {
      name: "one",
      type: "Int32"
    }
  ],
  data: [
    {
      one: 1
    }
  ],
  rows: 1
};

const selectAttachedToResponse = {
  meta: [
    {
      name: "attached_to",
      type: "Text"
    }
  ],
  data: [["dummy2"]],
  rows: 1
};

describe("Connection V2", () => {
  const server = setupServer();

  server.use(
    rest.post(`https://id.fake.firebolt.io/oauth/token`, (req, res, ctx) => {
      return res(
        ctx.json({
          access_token: "fake_access_token"
        })
      );
    })
  );

  beforeAll(() => {
    server.listen();
  });
  afterAll(() => {
    server.close();
  });

  it("shows a helpful error message on account not found", async () => {
    const firebolt = Firebolt({
      apiEndpoint
    });

    server.use(
      rest.get(
        `https://api.fake.firebolt.io/web/v3/account/invalid_account/resolve`,
        (req, res, ctx) => {
          return res(ctx.status(404));
        }
      ),
      rest.get(
        `https://api.fake.firebolt.io/web/v3/account/invalid_account/engineUrl`,
        (req, res, ctx) => {
          return res(ctx.status(404));
        }
      )
    );

    const connectionParams: ConnectionOptions = {
      auth: {
        client_id: "dummy",
        client_secret: "dummy"
      },
      database: "dummy",
      engineName: "dummy",
      account: "invalid_account"
    };

    await expect(async () => {
      await firebolt.testConnection(connectionParams);
    }).rejects.toThrow(AccountNotFoundError);
  });
});
