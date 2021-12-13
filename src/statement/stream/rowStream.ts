import { Duplex } from "stream";

export class RowStream extends Duplex {
  constructor() {
    super({ objectMode: true });
  }
  _read() {}
}
