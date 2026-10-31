export const parseSpreadsheetDate = (value) => {
  if (value instanceof Date) return value;

  if (typeof value === 'number') {
    if (value < 20000 || value > 100000) return null;

    const utcDays = Math.floor(value - 25569);
    const date = new Date(utcDays * 86400 * 1000);
    return new Date(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate()
    );
  }

  const text = String(value ?? '').trim();
  if (!text) return null;

  const indonesianDate = text.match(
    /(\d{1,2})\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+(\d{4}|\d{2})(?!\d)/i
  );
  if (indonesianDate) {
    const monthIndexes = {
      januari: 0,
      februari: 1,
      maret: 2,
      april: 3,
      mei: 4,
      juni: 5,
      juli: 6,
      agustus: 7,
      september: 8,
      oktober: 9,
      november: 10,
      desember: 11,
    };
    const parsedYear = Number.parseInt(indonesianDate[3], 10);

    return new Date(
      parsedYear < 100 ? 2000 + parsedYear : parsedYear,
      monthIndexes[indonesianDate[2].toLowerCase()],
      Number.parseInt(indonesianDate[1], 10)
    );
  }

  const parsedDate = new Date(text);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};
