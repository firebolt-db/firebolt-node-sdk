import fetch from "node-fetch";

export class NodeHttpClient {
  async request(
    method: string,
    path: string,
    options: {
      headers: Headers;
      body: string;
    }
  ) {
    const { headers = {}, body } = options;

    const response = await fetch(path, {
      method,
      headers: {
        ...headers,
        "user-agent": "javascript-sdk",
        "Content-Type": "application/json"
      },
      body
    });

    return response;
  }
}
