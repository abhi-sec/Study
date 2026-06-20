export const REVISION_INTERVALS = [1, 3, 7, 15, 30, 60, 120];

const getDatePartsInTimeZone = (date, timeZone) => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  return { year, month, day };
};

export const toLocalMidnightUtc = (date, timeZone) => {
  const { year, month, day } = getDatePartsInTimeZone(date, timeZone);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
};

export const addLocalDays = (date, timeZone, days) => {
  const { year, month, day } = getDatePartsInTimeZone(date, timeZone);
  return new Date(Date.UTC(year, month - 1, day + days, 0, 0, 0, 0));
};

export const previousLocalDayMidnight = (now, timeZone) => addLocalDays(now, timeZone, -1);

export const localDayKey = (date, timeZone) => {
  const { year, month, day } = getDatePartsInTimeZone(date, timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};
