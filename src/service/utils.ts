import { REGIONS } from "../common/api";
import { HttpClientInterface } from "../http";

export async function resolveRegionKey(
  name: string,
  apiEndpoint: string,
  httpClient: HttpClientInterface
): Promise<object> {
  const url = `${apiEndpoint}/${REGIONS}`;
  const data = await httpClient
    .request<{
      edges: [
        {
          node: {
            id: { provider_id: string; region_id: string };
            name: string;
          };
        }
      ];
    }>("GET", url)
    .ready();
  for (const edge of data.edges) {
    if (edge.node.name == name) {
      return edge.node.id;
    }
  }
  throw new Error(`Region ${name} not found`);
}
