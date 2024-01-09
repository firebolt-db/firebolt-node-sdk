import { REGIONS, ACCOUNT_INSTANCE_TYPES } from "../common/api";
import { HttpClientInterface } from "../http";

export async function resolveRegionKey(
  name: string,
  apiEndpoint: string,
  httpClient: HttpClientInterface
): Promise<{ provider_id: string; region_id: string }> {
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

type instanceTypeResponse = {
  edges: [
    {
      node: {
        id: {
          provider_id: string;
          region_id: string;
          instance_type_id: string;
        };
        name: string;
        price_per_hour_cents: number;
      };
    }
  ];
};

async function listInstanceTypes(
  accountId: string,
  apiEndpoint: string,
  httpClient: HttpClientInterface
): Promise<instanceTypeResponse> {
  const url = `${apiEndpoint}/${ACCOUNT_INSTANCE_TYPES(accountId)}`;
  const data = await httpClient
    .request<instanceTypeResponse>("GET", url)
    .ready();
  return data;
}

export async function resolveEngineSpec(
  name: string,
  regionId: string,
  accountId: string,
  apiEndpoint: string,
  httpClient: HttpClientInterface
): Promise<object> {
  const data = await listInstanceTypes(accountId, apiEndpoint, httpClient);
  for (const edge of data.edges) {
    if (edge.node.name == name && edge.node.id.region_id == regionId) {
      return edge.node.id;
    }
  }
  throw new Error(`Instance type ${name} not found`);
}

export async function getCheepestInstance(
  regionId: string,
  accountId: string,
  apiEndpoint: string,
  httpClient: HttpClientInterface
) {
  const data = await listInstanceTypes(accountId, apiEndpoint, httpClient);

  const instances = data.edges
    .filter(e => e.node.id.region_id == regionId)
    .sort((a, b) => {
      return a.node.price_per_hour_cents - b.node.price_per_hour_cents;
    });
  if (instances.length == 0) {
    throw new Error(`No instances found for region ${regionId}`);
  }
  return instances[0].node.id;
}
