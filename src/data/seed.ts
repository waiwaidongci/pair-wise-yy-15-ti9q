import type { LoftState } from "../domain/types";

// 演示数据（2026 年 9 月）：
// - 第二站 320km 傍晚放飞、次日凌晨归巢，专门覆盖跨夜计时；
// - 含重复报时、健康异常、批次缺距离/天气、归巢时刻早于放飞等待核情形。
export const SEED: LoftState = {
  version: 1,
  pigeons: [
    { ringId: "CHN-24-001839", bloodline: "詹森系", sex: "雄", mateRingId: "CHN-24-002114", note: "棚里一号雄" },
    { ringId: "CHN-24-002114", bloodline: "凡龙系", sex: "雌", mateRingId: "CHN-24-001839", note: "" },
    { ringId: "CHN-24-003201", bloodline: "詹森系", sex: "雌", mateRingId: "", note: "" },
    { ringId: "CHN-24-004557", bloodline: "胡本系", sex: "雄", mateRingId: "", note: "" },
    { ringId: "CHN-23-008771", bloodline: "凡龙系", sex: "雌", mateRingId: "", note: "归巢偶有延迟" },
    { ringId: "CHN-25-006012", bloodline: "胡本系", sex: "雄", mateRingId: "", note: "今春新鸽" },
    { ringId: "CHN-23-009980", bloodline: "李种系", sex: "雌", mateRingId: "", note: "" },
    { ringId: "CHN-24-010326", bloodline: "李种系", sex: "雄", mateRingId: "", note: "耐逆风" },
    { ringId: "CHN-22-000310", bloodline: "詹森系", sex: "雌", mateRingId: "", note: "留种观察" },
    { ringId: "CHN-25-007720", bloodline: "凡龙系", sex: "雄", mateRingId: "", note: "今春新鸽" },
  ],
  batches: [
    {
      id: "b-20260912-fengqiu",
      name: "第一站·封丘",
      releaseDate: "2026-09-12",
      releaseTime: "07:00",
      location: "封丘",
      distanceKm: 80,
      weather: "晴",
      releasedRingIds: [
        "CHN-24-001839",
        "CHN-24-002114",
        "CHN-24-003201",
        "CHN-24-004557",
        "CHN-23-008771",
        "CHN-25-006012",
        "CHN-23-009980",
        "CHN-24-010326",
      ],
    },
    {
      id: "b-20260919-puyang",
      name: "第二站·濮阳",
      releaseDate: "2026-09-19",
      releaseTime: "18:30",
      location: "濮阳",
      distanceKm: 320,
      weather: "多云转逆风",
      releasedRingIds: [
        "CHN-24-001839",
        "CHN-24-002114",
        "CHN-24-003201",
        "CHN-24-004557",
        "CHN-23-008771",
        "CHN-25-006012",
        "CHN-23-009980",
        "CHN-24-010326",
      ],
    },
    {
      id: "b-20260925-lankao",
      name: "第三站·兰考（资料待补）",
      releaseDate: "2026-09-25",
      releaseTime: "07:30",
      location: "兰考",
      distanceKm: null,
      weather: "",
      releasedRingIds: [
        "CHN-24-001839",
        "CHN-24-002114",
        "CHN-24-003201",
        "CHN-23-008771",
        "CHN-23-009980",
        "CHN-22-000310",
        "CHN-25-007720",
      ],
    },
  ],
  arrivals: [
    // 第一站：当日归巢
    { id: "a-101", batchId: "b-20260912-fengqiu", ringId: "CHN-24-001839", arrivalDate: "2026-09-12", arrivalTime: "08:05", health: "normal", note: "", reportedAt: 1 },
    { id: "a-102", batchId: "b-20260912-fengqiu", ringId: "CHN-24-002114", arrivalDate: "2026-09-12", arrivalTime: "08:10", health: "normal", note: "", reportedAt: 2 },
    { id: "a-103", batchId: "b-20260912-fengqiu", ringId: "CHN-24-003201", arrivalDate: "2026-09-12", arrivalTime: "08:12", health: "normal", note: "", reportedAt: 3 },
    { id: "a-104", batchId: "b-20260912-fengqiu", ringId: "CHN-24-004557", arrivalDate: "2026-09-12", arrivalTime: "08:20", health: "normal", note: "", reportedAt: 4 },
    { id: "a-105", batchId: "b-20260912-fengqiu", ringId: "CHN-23-008771", arrivalDate: "2026-09-12", arrivalTime: "08:28", health: "normal", note: "", reportedAt: 5 },
    { id: "a-106", batchId: "b-20260912-fengqiu", ringId: "CHN-25-006012", arrivalDate: "2026-09-12", arrivalTime: "08:40", health: "normal", note: "", reportedAt: 6 },
    { id: "a-107", batchId: "b-20260912-fengqiu", ringId: "CHN-23-009980", arrivalDate: "2026-09-12", arrivalTime: "08:56", health: "normal", note: "", reportedAt: 7 },
    { id: "a-108", batchId: "b-20260912-fengqiu", ringId: "CHN-24-010326", arrivalDate: "2026-09-12", arrivalTime: "09:05", health: "normal", note: "", reportedAt: 8 },
    // 重复报时：同羽同批的第二条，沿用 08:05 的先到记录
    { id: "a-109", batchId: "b-20260912-fengqiu", ringId: "CHN-24-001839", arrivalDate: "2026-09-12", arrivalTime: "08:20", health: "normal", note: "棚友代报", reportedAt: 9 },

    // 第二站：傍晚放飞、次日凌晨归巢（跨夜）
    { id: "a-201", batchId: "b-20260919-puyang", ringId: "CHN-24-001839", arrivalDate: "2026-09-20", arrivalTime: "02:35", health: "normal", note: "", reportedAt: 10 },
    { id: "a-202", batchId: "b-20260919-puyang", ringId: "CHN-24-002114", arrivalDate: "2026-09-20", arrivalTime: "02:48", health: "normal", note: "", reportedAt: 11 },
    { id: "a-203", batchId: "b-20260919-puyang", ringId: "CHN-24-003201", arrivalDate: "2026-09-20", arrivalTime: "03:05", health: "normal", note: "", reportedAt: 12 },
    { id: "a-204", batchId: "b-20260919-puyang", ringId: "CHN-24-004557", arrivalDate: "2026-09-20", arrivalTime: "03:22", health: "normal", note: "", reportedAt: 13 },
    { id: "a-205", batchId: "b-20260919-puyang", ringId: "CHN-23-008771", arrivalDate: "2026-09-20", arrivalTime: "07:40", health: "normal", note: "", reportedAt: 14 },
    // 健康异常：只进待核，不占排行
    { id: "a-206", batchId: "b-20260919-puyang", ringId: "CHN-25-006012", arrivalDate: "2026-09-20", arrivalTime: "04:10", health: "abnormal", note: "左翼擦伤，隔离观察", reportedAt: 15 },

    // 第三站：距离/天气未补，成绩全部待核
    { id: "a-301", batchId: "b-20260925-lankao", ringId: "CHN-24-001839", arrivalDate: "2026-09-25", arrivalTime: "08:31", health: "normal", note: "", reportedAt: 16 },
    { id: "a-302", batchId: "b-20260925-lankao", ringId: "CHN-24-002114", arrivalDate: "2026-09-25", arrivalTime: "08:35", health: "normal", note: "", reportedAt: 17 },
    { id: "a-303", batchId: "b-20260925-lankao", ringId: "CHN-24-003201", arrivalDate: "2026-09-25", arrivalTime: "08:40", health: "normal", note: "", reportedAt: 18 },
    { id: "a-304", batchId: "b-20260925-lankao", ringId: "CHN-23-008771", arrivalDate: "2026-09-25", arrivalTime: "08:58", health: "normal", note: "", reportedAt: 19 },
    { id: "a-305", batchId: "b-20260925-lankao", ringId: "CHN-23-009980", arrivalDate: "2026-09-25", arrivalTime: "09:15", health: "normal", note: "", reportedAt: 20 },
    // 归巢时刻早于放飞（日期登记成当天、时刻 07:10）：进待核，不计归巢也不占排行
    { id: "a-306", batchId: "b-20260925-lankao", ringId: "CHN-25-007720", arrivalDate: "2026-09-25", arrivalTime: "07:10", health: "normal", note: "疑为次日凌晨，待核对", reportedAt: 21 },
  ],
};
