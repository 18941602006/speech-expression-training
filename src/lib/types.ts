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

export interface ScoreResult {
  overall: number;
  dimensions: ScoreDimensions;
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
