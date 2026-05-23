export type ListQuery = {
  kind: 'thought' | 'task' | 'all';
  urgent?: boolean;
  done?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  description: string;
};

const MONTH_MAP: Array<{ re: RegExp; m: number }> = [
  { re: /^январ/, m: 0 },
  { re: /^феврал/, m: 1 },
  { re: /^март/, m: 2 },
  { re: /^апрел/, m: 3 },
  { re: /^ма[йя]/, m: 4 },
  { re: /^июн/, m: 5 },
  { re: /^июл/, m: 6 },
  { re: /^август/, m: 7 },
  { re: /^сентябр/, m: 8 },
  { re: /^октябр/, m: 9 },
  { re: /^ноябр/, m: 10 },
  { re: /^декабр/, m: 11 },
];

const MONTHS_RE =
  /\b(\d{1,2})\s+(январ\S*|феврал\S*|март\S*|апрел\S*|ма[йя]\S*|июн\S*|июл\S*|август\S*|сентябр\S*|октябр\S*|ноябр\S*|декабр\S*)\b/;

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function parseListQuery(text: string): ListQuery {
  const t = text.toLowerCase();
  const q: ListQuery = { kind: 'all', description: '' };
  const desc: string[] = [];

  if (/задач/.test(t)) {
    q.kind = 'task';
    desc.push('задачи');
  } else if (/мысл/.test(t)) {
    q.kind = 'thought';
    desc.push('мысли');
  } else if (/всё|все\s+запис|все\b/.test(t)) {
    q.kind = 'all';
    desc.push('все записи');
  } else {
    desc.push('все записи');
  }

  if (/срочн/.test(t)) {
    q.urgent = true;
    desc.push('срочные');
  }
  if (/выполнен|сделанн|закрыт/.test(t)) {
    q.done = true;
    desc.push('выполненные');
  } else if (/невыполнен|активн|открыт|в работе|оставши/.test(t)) {
    q.done = false;
    desc.push('активные');
  }

  const now = startOfDay(new Date());

  if (/\bсегодня\b/.test(t)) {
    q.dateFrom = now;
    q.dateTo = new Date(now.getTime() + 86400000);
    desc.push('за сегодня');
  } else if (/\bвчера\b/.test(t)) {
    const y = new Date(now.getTime() - 86400000);
    q.dateFrom = y;
    q.dateTo = now;
    desc.push('за вчера');
  } else if (/\bпозавчера\b/.test(t)) {
    const p = new Date(now.getTime() - 2 * 86400000);
    q.dateFrom = p;
    q.dateTo = new Date(p.getTime() + 86400000);
    desc.push('за позавчера');
  } else if (/на этой неделе/.test(t)) {
    const dow = now.getDay() || 7;
    const monday = new Date(now.getTime() - (dow - 1) * 86400000);
    q.dateFrom = monday;
    q.dateTo = new Date(monday.getTime() + 7 * 86400000);
    desc.push('за эту неделю');
  } else if (/на прошлой неделе/.test(t)) {
    const dow = now.getDay() || 7;
    const monday = new Date(now.getTime() - (dow - 1) * 86400000);
    const prevMonday = new Date(monday.getTime() - 7 * 86400000);
    q.dateFrom = prevMonday;
    q.dateTo = monday;
    desc.push('за прошлую неделю');
  } else {
    const m = t.match(MONTHS_RE);
    if (m) {
      const day = parseInt(m[1], 10);
      const monthName = m[2];
      const found = MONTH_MAP.find((x) => x.re.test(monthName));
      if (found && day >= 1 && day <= 31) {
        const d = new Date(now.getFullYear(), found.m, day);
        q.dateFrom = d;
        q.dateTo = new Date(d.getTime() + 86400000);
        desc.push(`за ${day} ${monthName}`);
      }
    }
  }

  q.description = desc.join(' · ');
  return q;
}
