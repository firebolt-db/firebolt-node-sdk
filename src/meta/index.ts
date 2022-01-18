import { getFireboltType } from "../statement/dataTypes";

export class Meta {
  name: string;
  type: string;

  constructor(column: { name: string; type: string }) {
    const { type, name } = column;
    this.type = getFireboltType(type);
    this.name = name;
  }
}
