import { LoggerInterface } from ".";

export class Logger implements LoggerInterface {
  log(value: string) {
    console.log(value);
  }
}
