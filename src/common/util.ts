import { ArgumentError } from "./errors";
import { version } from "../../package.json";
import os from "os";
import fs from "fs";
import { ConnectorVersion } from "../types";

export const assignProtocol = (url: string) => {
  return url.startsWith("http") ? url : `https://${url}`;
};

export const isDataQuery = (query: string): boolean => {
  if (!query) {
    return false;
  }

  query = query.trim().toUpperCase();
  const isShow = query.startsWith("SHOW");
  const isDescribe = query.startsWith("DESCRIBE");
  const isExplain = query.startsWith("EXPLAIN");
  const isInsert = query.startsWith("INSERT");
  const isSelect = !isInsert && query.startsWith("SELECT");
  const isWith = !isInsert && query.startsWith("WITH");

  return isSelect || isWith || isExplain || isShow || isDescribe;
};

export const withNullableTypes = (types: string[]) => {
  return types.reduce((acc: string[], type) => {
    acc.push(type);
    acc.push(`nullable(${type})`);
    return acc;
  }, []);
};

export const checkArgumentExists = (expression: any, code: number) => {
  if (!expression) {
    throw new ArgumentError({ code });
  }
};

export const checkArgumentValid = (expression: any, code: number) => {
  if (!expression) {
    throw new ArgumentError({ code });
  }
};

export const systemInfoString = () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const plist = require("plist");
  let os_version = os.release();
  // TODO: other platforms?
  if (os.platform() == "darwin") {
    os_version = plist.parse(
      fs.readFileSync(
        "/System/Library/CoreServices/SystemVersion.plist",
        "utf8"
      )
    ).ProductVersion;
  }
  return (
    "NodeSDK/" +
    version +
    " (Node " +
    process.version +
    "; " +
    os.platform() +
    " " +
    os_version +
    " )"
  );
};

export const generateUserAgent = (
  clients: ConnectorVersion[] | undefined,
  drivers: ConnectorVersion[] | undefined
) => {
  const toConnectorString = function (connector: ConnectorVersion) {
    return connector.name + "/" + connector.version;
  };

  const clientString = clients
    ? clients.map(toConnectorString).join(" ") + " "
    : "";
  const driverString = drivers
    ? " " + drivers.map(toConnectorString).join(" ")
    : "";
  return clientString + systemInfoString() + driverString;
};
