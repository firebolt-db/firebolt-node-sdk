import { LoggerInterface } from ".";

export class Logger implements LoggerInterface {
  info(message: string) {
    console.log(message);
  }
}
