// 时间规则：日期 + 时刻合并为真实时刻，跨夜（凌晨归巢）按真实先后计算用时。
// 修复点：旧逻辑只比 HH:mm，凌晨 02:xx 会被判成早于放飞当日，导致排行、未归巢全乱。

/** 将 <input type="date"> 与 <input type="time"> 的值合并为本地时间戳（毫秒） */
export function combineDateTime(date: string, time: string): number | null {
  if (!date || !time) return null;
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  const tm = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(time.trim());
  if (!dm || !tm) return null;
  const t = new Date(
    Number(dm[1]),
    Number(dm[2]) - 1,
    Number(dm[3]),
    Number(tm[1]),
    Number(tm[2]),
    Number(tm[3] ?? 0)
  );
  return Number.isNaN(t.getTime()) ? null : t.getTime();
}

/** 归巢相对放飞的用时（毫秒）；归巢早于放飞时返回 null（数据待核） */
export function elapsedMs(
  releaseDate: string,
  releaseTime: string,
  arrivalDate: string,
  arrivalTime: string
): number | null {
  const start = combineDateTime(releaseDate, releaseTime);
  const end = combineDateTime(arrivalDate, arrivalTime);
  if (start === null || end === null) return null;
  if (end < start) return null; // 凌晨归巢却被当成放飞当天的旧逻辑就是这里出错
  return end - start;
}

/** 是否跨夜归巢：归巢日期晚于放飞日期 */
export function isOvernight(releaseDate: string, arrivalDate: string): boolean {
  return !!arrivalDate && !!releaseDate && arrivalDate > releaseDate;
}

/** HH:MM:SS 或 用时较长时 N天 HH:MM:SS */
export function formatDuration(ms: number | null): string {
  if (ms === null || ms < 0) return "—";
  const totalSec = Math.round(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const min = Math.floor((totalSec % 3600) / 60);
  const sec = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  const clock = `${pad(h)}:${pad(min)}:${pad(sec)}`;
  return days > 0 ? `${days}天 ${clock}` : clock;
}

/** 分速：米/分，保留一位小数；缺距离或无效用时返回 null */
export function speedMpm(distanceKm: number | null, durationMs: number | null): number | null {
  if (distanceKm === null || durationMs === null || durationMs <= 0) return null;
  return (distanceKm * 1000) / (durationMs / 60000);
}

export function formatSpeed(v: number | null): string {
  return v === null ? "—" : v.toFixed(1);
}

export function todayStr(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
