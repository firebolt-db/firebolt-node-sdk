import { hydrateDate } from "./hydrateDate";

describe("hydrate Date", () => {
  it("hydrate date type", () => {
    const dates = ["2006-01-02", "2006-1-02", "2006-01-2", "2006-1-2"];
    for (const input of dates) {
      const date = hydrateDate(input);

      const year = date?.getUTCFullYear();
      const month = date?.getUTCMonth();
      const day = date?.getUTCDate();

      expect(year).toEqual(2006);
      expect(month).toEqual(0);
      expect(day).toEqual(2);
    }
  });
  it("hydrate pg_date type", () => {
    const dates = ["2023-2-13", "2023-02-13"];
    for (const input of dates) {
      const date = hydrateDate(input);

      const year = date?.getUTCFullYear();
      const month = date?.getUTCMonth();
      const day = date?.getUTCDate();

      expect(year).toEqual(2023);
      expect(month).toEqual(1);
      expect(day).toEqual(13);
    }
  });
  it("hydrate timestamp type", () => {
    const input = "2033-02-13 12:00:10";
    const date = hydrateDate(input);

    const year = date?.getUTCFullYear();
    const month = date?.getUTCMonth();
    const day = date?.getUTCDate();
    const hour = date?.getUTCHours();
    const minute = date?.getUTCMinutes();
    const second = date?.getUTCSeconds();

    expect(year).toEqual(2033);
    expect(month).toEqual(1);
    expect(day).toEqual(13);
    expect(hour).toEqual(12);
    expect(minute).toEqual(0);
    expect(second).toEqual(10);
  });
  it("hydrate timestamptz type", () => {
    const input = "2033-02-13 12:00:10+01:00";
    const date = hydrateDate(input);

    const year = date?.getUTCFullYear();
    const month = date?.getUTCMonth();
    const day = date?.getUTCDate();
    const hour = date?.getUTCHours();
    const minute = date?.getUTCMinutes();
    const second = date?.getUTCSeconds();

    expect(year).toEqual(2033);
    expect(month).toEqual(1);
    expect(day).toEqual(13);
    expect(hour).toEqual(11);
    expect(minute).toEqual(0);
    expect(second).toEqual(10);
  });
  it("hydrate milliseconds", () => {
    const input = "2033-02-13 12:00:10.123+01:00";
    const date = hydrateDate(input);

    const year = date?.getUTCFullYear();
    const month = date?.getUTCMonth();
    const day = date?.getUTCDate();
    const hour = date?.getUTCHours();
    const minute = date?.getUTCMinutes();
    const second = date?.getUTCSeconds();
    const milliseconds = date?.getUTCMilliseconds();

    expect(year).toEqual(2033);
    expect(month).toEqual(1);
    expect(day).toEqual(13);
    expect(hour).toEqual(11);
    expect(minute).toEqual(0);
    expect(second).toEqual(10);
    expect(milliseconds).toEqual(123);
  });
  it("hydrate few milliseconds", () => {
    const input = "2033-02-13 12:00:10.01+01:00";
    const date = hydrateDate(input);

    const year = date?.getUTCFullYear();
    const month = date?.getUTCMonth();
    const day = date?.getUTCDate();
    const hour = date?.getUTCHours();
    const minute = date?.getUTCMinutes();
    const second = date?.getUTCSeconds();
    const milliseconds = date?.getUTCMilliseconds();

    expect(year).toEqual(2033);
    expect(month).toEqual(1);
    expect(day).toEqual(13);
    expect(hour).toEqual(11);
    expect(minute).toEqual(0);
    expect(second).toEqual(10);
    expect(milliseconds).toEqual(10);
  });
  it("hydrate microseconds", () => {
    const input = "2033-02-13 12:00:10.123456+01:00";
    const date = hydrateDate(input);

    const year = date?.getUTCFullYear();
    const month = date?.getUTCMonth();
    const day = date?.getUTCDate();
    const hour = date?.getUTCHours();
    const minute = date?.getUTCMinutes();
    const second = date?.getUTCSeconds();
    const milliseconds = date?.getUTCMilliseconds();

    expect(year).toEqual(2033);
    expect(month).toEqual(1);
    expect(day).toEqual(13);
    expect(hour).toEqual(11);
    expect(minute).toEqual(0);
    expect(second).toEqual(10);
    expect(milliseconds).toEqual(123);
  });
  it("hydrate timestamptz type 2", () => {
    const input = "2033-02-13 12:00:10-01:00";
    const date = hydrateDate(input);

    const year = date?.getUTCFullYear();
    const month = date?.getUTCMonth();
    const day = date?.getUTCDate();
    const hour = date?.getUTCHours();
    const minute = date?.getUTCMinutes();
    const second = date?.getUTCSeconds();

    expect(year).toEqual(2033);
    expect(month).toEqual(1);
    expect(day).toEqual(13);
    expect(hour).toEqual(13);
    expect(minute).toEqual(0);
    expect(second).toEqual(10);
  });
  it("hydrate timestamptz type 3", () => {
    const input = "2033-02-13 12:00:10-02:30";
    const date = hydrateDate(input);

    const year = date?.getUTCFullYear();
    const month = date?.getUTCMonth();
    const day = date?.getUTCDate();
    const hour = date?.getUTCHours();
    const minute = date?.getUTCMinutes();
    const second = date?.getUTCSeconds();

    expect(year).toEqual(2033);
    expect(month).toEqual(1);
    expect(day).toEqual(13);
    expect(hour).toEqual(14);
    expect(minute).toEqual(30);
    expect(second).toEqual(10);
  });
  it("hydrate timestamptz type 4", () => {
    const input = "2033-02-13T12:00:10-02:30";
    const date = hydrateDate(input);

    const year = date?.getUTCFullYear();
    const month = date?.getUTCMonth();
    const day = date?.getUTCDate();
    const hour = date?.getUTCHours();
    const minute = date?.getUTCMinutes();
    const second = date?.getUTCSeconds();

    expect(year).toEqual(2033);
    expect(month).toEqual(1);
    expect(day).toEqual(13);
    expect(hour).toEqual(14);
    expect(minute).toEqual(30);
    expect(second).toEqual(10);
  });
  it("hydrate timestamptz padded time", () => {
    const input = "2033-02-13 2:15:10-1:00";
    const date = hydrateDate(input);

    const year = date?.getUTCFullYear();
    const month = date?.getUTCMonth();
    const day = date?.getUTCDate();
    const hour = date?.getUTCHours();
    const minute = date?.getUTCMinutes();
    const second = date?.getUTCSeconds();

    expect(year).toEqual(2033);
    expect(month).toEqual(1);
    expect(day).toEqual(13);
    expect(hour).toEqual(3);
    expect(minute).toEqual(15);
    expect(second).toEqual(10);
  });
  it("hydrate timestampntz type", () => {
    const input = "2033-02-13T12:00:10";
    const date = hydrateDate(input);

    const year = date?.getUTCFullYear();
    const month = date?.getUTCMonth();
    const day = date?.getUTCDate();
    const hour = date?.getUTCHours();
    const minute = date?.getUTCMinutes();
    const second = date?.getUTCSeconds();

    expect(year).toEqual(2033);
    expect(month).toEqual(1);
    expect(day).toEqual(13);
    expect(hour).toEqual(12);
    expect(minute).toEqual(0);
    expect(second).toEqual(10);
  });
  it("handle old dates", () => {
    const input = "0033-01-01 12:00:00";
    const date = hydrateDate(input);

    const year = date?.getUTCFullYear();
    const month = date?.getUTCMonth();
    const day = date?.getUTCDate();
    const hour = date?.getUTCHours();
    const minute = date?.getUTCMinutes();
    const second = date?.getUTCSeconds();

    expect(year).toEqual(33);
    expect(month).toEqual(0);
    expect(day).toEqual(1);
    expect(hour).toEqual(12);
    expect(minute).toEqual(0);
    expect(second).toEqual(0);
  });
});
