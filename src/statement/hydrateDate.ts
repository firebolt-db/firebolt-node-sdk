import { zeroPad } from "../common/util";

// will match such formats
// 2006-01-02

// 9999-12-31 23:59:59.999999

// 9999-12-31 23:59:59

// 2006-1-2 1:24:5.000+00
// 2006-1-2 1:24:5.000-07
// 2006-1-2 15:04:05.000-07
// 2006-01-02 15:04:05.000000-07
// 2006-01-02 15:04:05.000000-07:00
// 2006-01-02 15:04:05.000000-07:00:00
// 2006-01-02 15:04:05-07
// 2006-01-02 15:04:05-07:00
// 2006-01-02 15:04:05-07:00:00

// 2105-12-31 23:59:59

// 2033-02-13 2:15:10+7:00

const DATE_FORMAT =
  /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[\s+|T](\d{1,2}):(\d{1,2}):(\d{1,2})(?:\.(\d{0,6}))?(?:([+-])(\d{1,2}))?(?::(\d{2}))?(?::(\d{2}))?)?$/;

export const hydrateDate = (value: string) => {
  const match = DATE_FORMAT.exec(value);

  if (!match) {
    return null;
  }

  // date
  const year = zeroPad(match[1], 4);
  const month = zeroPad(match[2], 2);
  const day = zeroPad(match[3], 2);

  // time
  const hour = zeroPad(match[4] || "00", 2);
  const minute = zeroPad(match[5] || "00", 2);
  const second = zeroPad(match[6] || "00", 2);
  const msec = zeroPad(match[7] || "000", 6);

  // tz
  const sign = match[8] || "-";
  const tzHour = zeroPad(match[9] || "00", 2);
  const tzMin = zeroPad(match[10] || "00", 2);

  // ignore tzsec
  const tzSec = zeroPad(match[11] || "00", 2);

  const date = `${year}-${month}-${day}T${hour}:${minute}:${second}.${msec}${sign}${tzHour}:${tzMin}`;

  return new Date(date);
};
