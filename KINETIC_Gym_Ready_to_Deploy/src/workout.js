import { DAYS, DEFAULT_PROGRAM, EXERCISE_MAP } from './exercises.js';

export const MAX_EXERCISES_PER_DAY = 12;
export const LOCAL_DATE = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export const todayKey = (date = new Date()) => DAYS[(date.getDay() + 6) % 7];
export const clampInt = (value, min, max, fallback) => {
  const num = Number(value);
  return Number.isSafeInteger(num) ? Math.max(min, Math.min(max, num)) : fallback;
};
export function defaultDay(day) {
  return (DEFAULT_PROGRAM[day] ?? []).map(([id,sets,reps]) => ({ id, sets, reps, restSec:60, completedOn:null }));
}
export function normalizeDay(data, day) {
  if (!DAYS.includes(day)) throw new Error('Unsupported day');
  if (!data || !Array.isArray(data.items)) return defaultDay(day);
  const seen = new Set();
  const items = [];
  for (const row of data.items.slice(0, MAX_EXERCISES_PER_DAY)) {
    if (!row || typeof row !== 'object' || typeof row.id !== 'string' || !EXERCISE_MAP.has(row.id) || seen.has(row.id)) continue;
    seen.add(row.id);
    items.push({
      id:row.id,
      sets:clampInt(row.sets,1,10,3),
      reps:clampInt(row.reps,1,180,12),
      restSec:clampInt(row.restSec,0,300,60),
      completedOn:typeof row.completedOn==='string' && /^\d{4}-\d{2}-\d{2}$/.test(row.completedOn) ? row.completedOn : null
    });
  }
  return items;
}
export function addExercise(items, id) {
  if (!EXERCISE_MAP.has(id)) return items;
  if (items.some(row=>row.id===id) || items.length>=MAX_EXERCISES_PER_DAY) return items;
  return [...items,{ id, sets:3, reps:12, restSec:60, completedOn:null }];
}
export function completedToday(items, date = new Date()) { return items.filter(item => item.completedOn===LOCAL_DATE(date)).length; }
export function mondayDate(date = new Date()) {
  const out = new Date(date.getFullYear(),date.getMonth(),date.getDate());
  out.setDate(out.getDate()-((out.getDay()+6)%7));
  return out;
}
export function activityForWeek(plans, date = new Date()) {
  const mon = mondayDate(date);
  return DAYS.map((day, index) => {
    const d = new Date(mon); d.setDate(mon.getDate()+index);
    return completedToday(plans[day] ?? [], d);
  });
}
