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

// ===== 角色变体专属题（key = `${scene}:${variantId}`）=====
// 每进入一个角色变体，会优先从「变体题 + 场景题」中混合随机抽题，让练习更贴合角色。
const VARIANT_TOPICS: Record<string, Topic[]> = {
  "speech:keynote": [
    {
      title: "融资路演开场",
      scenario: "你是一家 AI 初创的创始人，要在投资人面前用 60 秒讲清为什么现在必须投你。",
      prompt: "用一句话钩住注意力，再讲市场痛点与你的差异化优势。",
      focus: "价值前置、数据感、自信",
    },
  ],
  "speech:ted": [
    {
      title: "用故事讲清一个概念",
      scenario: "你要向普通听众解释「为什么睡眠比加班更重要」。",
      prompt: "从一个真实小故事切入，再用一个类比让人秒懂。",
      focus: "钩子、叙事、类比",
    },
  ],
  "speech:toast": [
    {
      title: "婚礼祝酒词",
      scenario: "你是新郎的多年好友，要在席间致一段 1 分钟祝酒词。",
      prompt: "真诚、具体（提一件你们之间的小事）、有温度地祝福。",
      focus: "真诚、具体、节奏",
    },
  ],
  "communication:friend": [
    {
      title: "向朋友倾诉压力",
      scenario: "你最近被工作压得喘不过气，想跟好朋友聊聊。",
      prompt: "说出你的真实感受，也试着听听朋友的建议。",
      focus: "真实、脆弱、倾听",
    },
  ],
  "communication:manager": [
    {
      title: "向上汇报争取资源",
      scenario: "你想向老板申请再加一名人手，但预算紧张。",
      prompt: "结论先行，用数据讲清缺口与回报，给老板一个好答应的方案。",
      focus: "结论先行、数据、可选方案",
    },
  ],
  "communication:conflict": [
    {
      title: "和家人的分歧",
      scenario: "你和父母在「是否换城市工作」上意见相左。",
      prompt: "表达你的立场，同时尊重对方，寻找可共识的部分。",
      focus: "倾听、求同、非攻击",
    },
  ],
  "interview:hr": [
    {
      title: "行为面试：团队冲突",
      scenario: "HR 问：讲一次你解决团队冲突的经历。",
      prompt: "用 STAR 结构讲清背景、你的行动、结果与成长。",
      focus: "STAR、复盘、成长",
    },
  ],
  "interview:tech": [
    {
      title: "技术面试：系统设计",
      scenario: "面试官让你设计一个短链服务的高并发方案。",
      prompt: "边想边说：先澄清需求，再讲核心组件与权衡。",
      focus: "拆解、权衡、表达清晰",
    },
  ],
  "interview:stress": [
    {
      title: "压力面试：质疑经历",
      scenario: "面试官反复质疑你上一段经历的真实性。",
      prompt: "稳住情绪，给出结构化、可被验证的回答，不急着辩解。",
      focus: "稳住、结构化、可信",
    },
  ],
  "debate:aff": [
    {
      title: "立论：AI 应进校园",
      scenario: "辩题「人工智能应当全面进入中小学课堂」，你持正方开篇。",
      prompt: "给出 2-3 个核心论点并简述论证逻辑。",
      focus: "论点明确、论据、结构",
    },
  ],
  "debate:neg": [
    {
      title: "反驳：短视频害处",
      scenario: "辩题「短视频对青少年弊大于利」，你持反方反驳对方立论。",
      prompt: "指出对方证据不足或逻辑漏洞，并提出反击。",
      focus: "精准拆解、不跑题",
    },
  ],
  "debate:judge": [
    {
      title: "评委出题：立论+反驳",
      scenario: "你抽到辩题「远程办公利大于弊」，评委要求你先立论再模拟反驳。",
      prompt: "给出立论，然后站在反方模拟一次有力反驳。",
      focus: "双边视角、逻辑、表达",
    },
  ],
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

// 按「场景 + 角色变体」混合随机抽题：变体专属题优先混入，再与场景基础题合并
export function randomTopicForVariant(
  scene: Scene,
  variantId?: string | null,
): Topic {
  const key = `${scene}:${variantId ?? ""}`;
  const vTopics = VARIANT_TOPICS[key] || [];
  const sTopics = PRESET_TOPICS[scene] || [];
  const all = [...vTopics, ...sTopics];
  if (all.length === 0) return FALLBACK_TOPIC;
  return all[Math.floor(Math.random() * all.length)];
}
