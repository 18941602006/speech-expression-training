import type { Scene, Topic } from "./types";

// 预设中文主题库（v1 基础题库，AI 可在其基础上扩展出题）
export const PRESET_TOPICS: Record<Scene, Topic[]> = {
  speech: [
    {
      title: "产品发布演讲",
      scenario: "你是一家创业公司的创始人，要在发布会上向投资人和用户介绍你的新产品。",
      prompt: "请用约 2 分钟讲解产品的核心价值、目标用户和差异化优势。",
      focus: "开场抓人、结构清晰、情绪感染",
    },
    {
      title: "年度总结汇报",
      scenario: "你是部门负责人，向公司管理层做年度工作总结。",
      prompt: "汇报全年核心成果、关键挑战与明年规划，控制在 3 分钟内。",
      focus: "数据支撑、重点突出、逻辑递进",
    },
    {
      title: "公益倡议宣讲",
      scenario: "你在一个社区活动上，呼吁大家关注一个本地环保问题。",
      prompt: "用有感染力的方式说明问题严重性，并号召大家采取行动。",
      focus: "共情、故事化、行动号召",
    },
  ],
  communication: [
    {
      title: "向朋友表达歉意",
      scenario: "你因为爽约让朋友感到被忽视，现在想真诚地道歉并修复关系。",
      prompt: "表达歉意、说明原因（不找借口）、提出补偿，并重建信任。",
      focus: "真诚、不 defensive、具体",
    },
    {
      title: "拒绝不合理请求",
      scenario: "同事把本该他自己做的活推给你，你不想接但又不伤和气。",
      prompt: "温和而坚定地拒绝，给出理由，并尽量提供替代建议。",
      focus: "边界清晰、语气得体、不愧疚",
    },
    {
      title: "家庭意见分歧",
      scenario: "你和家人在一个重大决定上看法不同，你想表达自己的立场。",
      prompt: "陈述你的看法，同时尊重对方，寻找可共识的部分。",
      focus: "倾听、求同存异、非攻击",
    },
  ],
  interview: [
    {
      title: "自我介绍",
      scenario: "面试官让你用 1 分钟做自我介绍。",
      prompt: "突出与岗位匹配的经历、能力与动机，避免流水账。",
      focus: "匹配岗位、亮点前置、简洁",
    },
    {
      title: "谈一个失败经历",
      scenario: "面试官问：你经历过最大的失败是什么？",
      prompt: "讲清背景、你的行动、结果，以及你从中学到了什么。",
      focus: "诚实、复盘、成长",
    },
    {
      title: "谈薪资期望",
      scenario: "面试官问你期望薪资，你想争取又不显得贪婪。",
      prompt: "给出有依据的范围，强调价值而非数字本身。",
      focus: "有准备、自信、灵活",
    },
  ],
  debate: [
    {
      title: "正方：远程办公利大于弊",
      scenario: "辩论赛，你持正方，开篇立论。",
      prompt: "给出 2-3 个核心论点，并简要说明论证逻辑。",
      focus: "论点明确、论据扎实、结构",
    },
    {
      title: "反驳对方论点",
      scenario: "对方刚陈述完，你需要针对性反驳。",
      prompt: "指出对方逻辑漏洞或证据不足，并提出你的反击。",
      focus: "精准拆解、不跑题、逻辑",
    },
    {
      title: "自由辩论攻防",
      scenario: "自由辩论环节，你需要快速回应并推进己方立场。",
      prompt: "接住对方问题，回击，并抛回一个有利于己方的问题。",
      focus: "反应快、不缠斗、推进",
    },
  ],
  // 自定义方向：无固定题库，由用户在首页自行设定场景内容
  custom: [],
};

const FALLBACK_TOPIC: Topic = {
  title: "即兴练习",
  scenario: "请围绕该场景自由发挥。",
  prompt: "用 1-2 分钟进行一段表达练习。",
  focus: "结构与逻辑、用词、场景贴合",
};

export function randomPresetTopic(scene: Scene): Topic {
  const list = PRESET_TOPICS[scene];
  if (!list || list.length === 0) return FALLBACK_TOPIC;
  return list[Math.floor(Math.random() * list.length)];
}
