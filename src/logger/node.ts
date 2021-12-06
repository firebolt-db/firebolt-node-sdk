import { LoggerInterface } from ".";

export class Logger implements LoggerInterface {
  log(message: string) {
    console.error({ message });
  }
}
