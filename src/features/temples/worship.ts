import type { ScheduleEntry, TempleSearchInput } from './types';
import { moscowDate, servicesForDate } from './schedules';

export const worshipLabels = { liturgy:'Литургия', evening:'Вечерняя служба', vigil:'Всенощное бдение', confession:'Исповедь', prayer:'Молебен' };
export function hasWorshipFilter(input: TempleSearchInput) {
  return Boolean(input.date || input.timeFrom || input.timeTo || input.worship || input.hasSchedule || input.liturgyTime || input.eveningTime);
}
export function matchingServices(entries: ScheduleEntry[], input: TempleSearchInput = {}, now = new Date()) {
  const date = input.date ?? moscowDate(now);
  const currentTime = new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Moscow',hour:'2-digit',minute:'2-digit',hour12:false}).format(now);
  return servicesForDate(entries,date,now).filter(e => {
    const time = e.startsAt.slice(0,5);
    if (date === moscowDate(now) && time < currentTime) return false;
    if (input.timeFrom && time < input.timeFrom || input.timeTo && time > input.timeTo) return false;
    if (input.worship === 'vigil') return /всенощ|всенощн/i.test(e.title);
    if (input.worship === 'confession') return /исповед/i.test(e.title);
    return !input.worship || e.kind === input.worship;
  });
}
export function offsetMoscowDate(days: number, now = new Date()) {
  const date = new Date(moscowDate(now)+'T12:00:00Z');
  date.setUTCDate(date.getUTCDate()+days);
  return date.toISOString().slice(0,10);
}
export function serviceDateLabel(date: string, now = new Date()) {
  if (date === moscowDate(now)) return 'Сегодня';
  if (date === offsetMoscowDate(1,now)) return 'Завтра';
  return new Intl.DateTimeFormat('ru',{day:'numeric',month:'long',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));
}
export function nextService(entries: ScheduleEntry[], now = new Date()) {
  for(let day=0;day<7;day++){
    const date=offsetMoscowDate(day,now);
    const entry=matchingServices(entries,{date},now)[0];
    if(entry)return {date,entry};
  }
}
