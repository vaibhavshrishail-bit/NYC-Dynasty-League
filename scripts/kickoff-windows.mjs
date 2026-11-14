// Classifies an NFL kickoff (UTC timestamp) into the window managers actually talk about, in Eastern Time.
// Pure function, no data access, so it can be tested with any schedule: standard Sundays, international mornings, Thanksgiving, Saturdays.
const NAME = { 'THU-night': 'Thursday Night', 'FRI-night': 'Friday Night', 'SAT-early': 'Saturday early', 'SAT-afternoon': 'Saturday afternoon', 'SAT-night': 'Saturday Night', 'SUN-early': 'Sunday morning', 'SUN-one': 'Sunday 1:00', 'SUN-late': 'Sunday late afternoon', 'SUN-night': 'Sunday Night', 'MON-night': 'Monday Night' };
const SHORT = { 'THU-night': 'THU NIGHT', 'SUN-early': 'SUN EARLY', 'SUN-one': 'SUN 1:00', 'SUN-late': 'SUN LATE', 'SUN-night': 'SUN NIGHT', 'MON-night': 'MON NIGHT' };
export function kickoffWindow(iso) {
  const d = new Date(iso); if (isNaN(d)) return null;
  const f = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: '2-digit', hour12: true, month: 'short', day: 'numeric' }).formatToParts(d), g = (t) => f.find((x) => x.type === t)?.value;
  const wd = g('weekday').toUpperCase(), h24 = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hourCycle: 'h23' }).format(d));
  const b = wd === 'SUN' ? (h24 < 12 ? 'early' : h24 < 15 ? 'one' : h24 < 19 ? 'late' : 'night') : (h24 < 15 ? 'early' : h24 < 19 ? 'afternoon' : 'night'), key = `${wd}-${b}`;
  return { key, label: NAME[key] || `${wd[0]}${wd.slice(1).toLowerCase()} ${b}`, short: SHORT[key] || `${wd} ${b.toUpperCase()}`, time: `${g('hour')}:${g('minute')} ${g('dayPeriod')}`, md: `${g('month')} ${g('day')}`, weekday: wd, hour: h24 };
}
