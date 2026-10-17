const DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const TYPES = {annual: '一般會員', lifetime: '永久會員'};

function cell(value) {
  const text = String(value);
  const safe = /^(?:\s*[=+\-@]|[\t\r\n])/u.test(text) ? "'" + text : text;
  return '"' + safe.replaceAll('"', '""') + '"';
}

export function memberBirthdayCSV(rows, month) {
  if (!Number.isInteger(month) || month < 1 || month > 12 || !Array.isArray(rows) || !rows.length) {
    throw new Error('invalid_birthday_export');
  }
  const lines = [['會員姓名', '生日月份', '生日日期', '會籍類型']];
  for (const row of rows) {
    if (!row || typeof row.name !== 'string' || !row.name.trim() || row.month !== month ||
        !Number.isInteger(row.day) || row.day < 1 || row.day > DAYS[month - 1] ||
        !Object.hasOwn(TYPES, row.membership_type)) throw new Error('invalid_birthday_export');
    // Whitelist fields; never serialize the original record or birth year.
    lines.push([row.name, month, row.day, TYPES[row.membership_type]]);
  }
  return '\uFEFF' + lines.map(line => line.map(cell).join(',')).join('\r\n') + '\r\n';
}
