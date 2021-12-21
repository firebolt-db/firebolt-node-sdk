export type ID = { engine_id: string; account_id: string };

export type Engine = {
  id: ID;
  name: string;
  endpoint: string;
  current_status_summary: string;
};
