// 存档层：localStorage 读写 + JSON 归档导入导出。与规则、页面解耦。
import type { LoftState } from "../domain/types";
import { SEED } from "./seed";

const STORAGE_KEY = "loft-training-state-v1";

export function loadState(): LoftState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LoftState;
      if (parsed && parsed.version === 1 && Array.isArray(parsed.pigeons)) {
        return normalize(parsed);
      }
    }
  } catch {
    // 存档损坏时回退到演示数据
  }
  return structuredClone(SEED);
}

export function saveState(state: LoftState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetState(): LoftState {
  const fresh = structuredClone(SEED);
  saveState(fresh);
  return fresh;
}

/** 导出整棚存档（规则、页面不感知文件格式） */
export function exportState(state: LoftState): void {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `训放存档-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** 导入 JSON 存档；格式不符抛出错误，由页面提示 */
export function importState(text: string): LoftState {
  const parsed = JSON.parse(text) as LoftState;
  if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.pigeons) || !Array.isArray(parsed.batches)) {
    throw new Error("存档格式不正确：缺少 pigeons / batches 或版本不匹配");
  }
  const normalized = normalize(parsed);
  saveState(normalized);
  return normalized;
}

function normalize(s: LoftState): LoftState {
  return {
    version: 1,
    pigeons: s.pigeons ?? [],
    batches: s.batches ?? [],
    arrivals: s.arrivals ?? [],
  };
}
