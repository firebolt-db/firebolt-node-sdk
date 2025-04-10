import { ExecuteQueryOptions } from "../types";
import { ServerSideStream } from "./stream/serverSideStream";
import { Response } from "node-fetch";

export class StreamStatement {
  private readonly executeQueryOptions: ExecuteQueryOptions;
  private readonly response: Response;

  constructor({
    response,
    executeQueryOptions
  }: {
    response: Response;
    executeQueryOptions: ExecuteQueryOptions;
  }) {
    this.response = response;
    this.executeQueryOptions = executeQueryOptions;
  }

  async streamResult() {
    return {
      data: new ServerSideStream(this.response, this.executeQueryOptions)
    };
  }
}
