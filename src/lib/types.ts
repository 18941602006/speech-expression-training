export type Scene = "speech" | "communication" | "interview" | "debate";

export interface Topic {
  title: string;
  scenario: string;
  prompt: string;
  focus: string;
}

export type ScoreDimensions = {
  structure: number; // 结构与逻辑
  wording: number; // 用词与精准
  filler: number; // 填充词控制
  fit: number; // 场景贴合
  fluency: number; // 流畅与节奏
  verbose: number; // 啰嗦词控制
};

export interface SentenceSegment {
  text: string;
  isWaste: boolean;
  reason?: string;
}

export interface SentenceAnalysis {
  index: number;
  segments: SentenceSegment[];
  comment?: string;
}

export interface ScoreResult {
  overall: number;
  dimensions: ScoreDimensions;
  sentences: SentenceAnalysis[];
  suggestions: string[];
  betterVersion: string;
}

export interface ExerciseRecord {
  id: number;
  scene: Scene;
  topicTitle: string;
  topicPrompt: string;
  userInput: string;
  transcript: string | null;
  overall: number;
  dimensions: ScoreDimensions;
  sentences: SentenceAnalysis[];
  suggestions: string[];
  betterVersion: string;
  createdAt: string;
}

export const SCENE_LABELS: Record<Scene, string> = {
  speech: "公众演讲",
  communication: "日常沟通",
  interview: "面试职场",
  debate: "辩论逻辑",
};

export const DIMENSION_LABELS: Record<keyof ScoreDimensions, string> = {
  structure: "结构与逻辑",
  wording: "用词与精准",
  filler: "填充词控制",
  fit: "场景贴合",
  fluency: "流畅与节奏",
  verbose: "啰嗦词控制",
};

export const DIMENSION_ORDER: (keyof ScoreDimensions)[] = [
  "structure",
  "wording",
  "filler",
  "fit",
  "fluency",
  "verbose",
];

// ===== 教练系统 =====
export interface CoachPlanDay {
  day: string; // 阶段标识，如 "第1阶段"
  scene: string; // 场景（中文标签）
  focus: string; // 本次训练重点
  task: string; // 具体练习任务
  difficulty: "基础" | "标准" | "挑战" | string; // 难度
}

export interface CoachPlan {
  level: string; // 当前水平档位
  summary: string; // 水平概述
  focusDimensions: string[]; // 重点提升维度（中文标签）
  weeklyPlan: CoachPlanDay[];
  dynamicNote: string; // 难度动态调整说明
  tips: string[]; // 通用建议
}

export interface CoachStats {
  total: number; // 练习次数
  overallAvg: number; // 平均总分
  dimensionAvgs: Record<string, number>; // 各维度均值（中文标签 -> 分值）
  sceneDist: Record<string, number>; // 场景分布（中文标签 -> 次数）
  topWaste: { word: string; count: number }[]; // 高频废话/填充词
  trend: string; // 难度动态调整依据（趋势描述）
}

// 已保存的教练方案历史记录
export interface CoachPlanRecord {
  id: number;
  createdAt: string; // ISO 时间
  goal: string; // 需求简要（用户填写的目标，可能为空）
  level: string; // 水平档位
  summary: string; // 概述
  plan: CoachPlan; // 完整方案
}
