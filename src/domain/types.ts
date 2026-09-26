// 领域模型：训放工作台的数据结构

/** 健康状态：正常 / 异常（异常成绩只进待核，不占排行） */
export type HealthStatus = "normal" | "abnormal";

/** 赛鸽档案 */
export interface Pigeon {
  /** 足环号，全棚唯一 */
  ringId: string;
  /** 血统，如：詹森系 */
  bloodline: string;
  /** 性别 */
  sex: "" | "雄" | "雌";
  /** 配对足环号 */
  mateRingId: string;
  /** 备注（如留种、伤病记录） */
  note: string;
}

/** 训放批次 */
export interface Batch {
  id: string;
  /** 批次名称，如：第二站·濮阳 */
  name: string;
  /** 放飞日期 YYYY-MM-DD */
  releaseDate: string;
  /** 放飞时刻 HH:mm */
  releaseTime: string;
  /** 放飞地点 */
  location: string;
  /** 放飞距离（公里），为空表示未登记，该批成绩只进待核 */
  distanceKm: number | null;
  /** 天气，为空表示未登记，该批成绩只进待核 */
  weather: string;
  /** 本批实际放飞的足环名单 */
  releasedRingIds: string[];
}

/** 归巢报时记录（同一足环同批次允许重复报时，规则层负责取最早一条） */
export interface Arrival {
  id: string;
  batchId: string;
  /** 足环号 */
  ringId: string;
  /** 归巢日期 YYYY-MM-DD（跨夜时与放飞日期不同，必须单独登记） */
  arrivalDate: string;
  /** 归巢时刻 HH:mm */
  arrivalTime: string;
  health: HealthStatus;
  /** 健康异常说明等 */
  note: string;
  /** 报时录入序号，用于重复报时时的次序兜底 */
  reportedAt: number;
}

/** 存档根结构 */
export interface LoftState {
  version: 1;
  pigeons: Pigeon[];
  batches: Batch[];
  arrivals: Arrival[];
}
