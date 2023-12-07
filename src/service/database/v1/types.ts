export type ID = { database_id: string; account_id: string };

export type Database = {
  id: ID;
  name: string;
  description: string;
};