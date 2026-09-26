// 领域数据模型：训放批次 + 足环归巢登记

export type Gender = "" | "雄" | "雌";

/** 健康状态：空串表示未填；只有“正常”可进排行，其余或未填一律待核 */
export type HealthStatus = "" | "正常" | "受伤" | "生病" | "疲惫";

export const HEALTH_OPTIONS: HealthStatus[] = ["正常", "受伤", "生病", "疲惫"];

/** 鸽棚档案中的一羽赛鸽 */
export interface Pigeon {
  /** 足环号，棚内唯一 */
  ring: string;
  /** 血统 */
  bloodline: string;
  gender: Gender;
  /** 配对足环号（配对记录） */
  pairRing: string;
  createdAt: number;
}

/** 一个训放批次 */
export interface TrainingBatch {
  id: string;
  /** 放飞日期 YYYY-MM-DD */
  releaseDate: string;
  /** 放飞时刻 HH:mm */
  releaseTime: string;
  /** 放飞地点 */
  location: string;
  /** 放飞距离（公里）；null 表示未登记，该批成绩只进待核 */
  distanceKm: number | null;
  /** 天气；为空时该批成绩只进待核 */
  weather: string;
  /** 本批放飞足环名单（未归巢名单 = 名单中尚无归巢记录者） */
  ringNos: string[];
  createdAt: number;
}

/** 一条归巢报时（按足环登记） */
export interface ArrivalRecord {
  id: string;
  batchId: string;
  /** 足环号 */
  ring: string;
  /** 归巢日期 YYYY-MM-DD（跨夜时与放飞日期一起决定真实先后） */
  returnDate: string;
  /** 归巢时刻 HH:mm */
  returnTime: string;
  health: HealthStatus;
  /** 录入时间，用于完全同时报时时的稳定排序 */
  createdAt: number;
}

export interface LoftState {
  pigeons: Pigeon[];
  batches: TrainingBatch[];
  arrivals: ArrivalRecord[];
}

export type ArrivalDraft = Pick<
  ArrivalRecord,
  "batchId" | "ring" | "returnDate" | "returnTime" | "health"
>;
