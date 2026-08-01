// 每日灵感模块：本地预设数据 + 按日期确定性轮换
// 用途：首页「每日高情商学习」与「读书名言」两个方块，每天自动换一条。

export interface DailyItem {
  text: string;
  source?: string; // 名言的作者 / 书名等出处
}

// —— 每日高情商学习：沟通与情绪管理的小技巧 ——
export const EQ_TIPS: DailyItem[] = [
  { text: "先处理情绪，再处理事情。情绪上头时，给自己 6 秒缓冲再开口。" },
  { text: "倾听不是等待轮到自己说话，而是真正听懂对方到底在说什么。" },
  { text: "用「我」开头表达感受，比用「你」开头指责，更容易被对方接受。" },
  { text: "批评时先肯定、再建议，「三明治」式反馈让人更愿意改进。" },
  { text: "把「但是」换成「而且」，对话里的对抗感会明显降下来。" },
  { text: "提问比说教更有力量，开放式问题能引导对方自己找到答案。" },
  { text: "情绪是会传染的，你先冷静，对面的情绪也会慢慢平复。" },
  { text: "大方说「我理解错了」，不丢人，反而让人觉得你靠谱。" },
  { text: "沉默也是一种回应，不必每句话都急着接。" },
  { text: "表达感谢要具体，「谢谢你帮我改稿」好过一句笼统的「谢谢」。" },
  { text: "面对冲突，先复述对方的观点并确认理解，再回应，误会少一半。" },
  { text: "把「我没办法」换成「我可以试试这样」，主动权就回到了自己手里。" },
  { text: "赞美要公开，批评要私下，这是最基本的体面与尊重。" },
  { text: "开口前问自己：这句话三天后还重要吗？不重要就少说。" },
];

// —— 读书名言：经典书籍中的警句 ——
export const BOOK_QUOTES: DailyItem[] = [
  { text: "满地都是六便士，他却抬头看见了月亮。", source: "毛姆《月亮与六便士》" },
  { text: "所有大人都曾是小孩，可惜只有少数人记得。", source: "圣埃克苏佩里《小王子》" },
  { text: "生活就像一盒巧克力，你永远不知道下一颗是什么味道。", source: "《阿甘正传》" },
  { text: "一个人只拥有此生此世是不够的，他还应该拥有诗意的世界。", source: "王小波《万寿寺》" },
  {
    text: "世界上只有一种真正的英雄主义，就是认清生活真相后依然热爱它。",
    source: "罗曼·罗兰《米开朗琪罗传》",
  },
  {
    text: "你以为我贫穷、相貌平平就没有灵魂吗？我的灵魂和你一样丰富。",
    source: "夏洛蒂·勃朗特《简·爱》",
  },
  {
    text: "我们一路奋战，不是为了改变世界，而是为了不让世界改变我们。",
    source: "《熔炉》",
  },
  { text: "每个人都是月亮，总有一个阴暗面，从不示人。", source: "马克·吐温" },
  { text: "如果你因错过太阳而流泪，那么你也将错过群星。", source: "泰戈尔《飞鸟集》" },
  {
    text: "幸福的家庭都是相似的，不幸的家庭各有各的不幸。",
    source: "列夫·托尔斯泰《安娜·卡列尼娜》",
  },
  { text: "其实地上本没有路，走的人多了，也便成了路。", source: "鲁迅《故乡》" },
  { text: "愿你在被打击时，记起你的珍贵，抵抗恶意。", source: "《熔炉》" },
  { text: "生命中曾经有过的所有灿烂，终究都需要用寂寞来偿还。", source: "马尔克斯《百年孤独》" },
  { text: "我们终将相遇，在没有黑暗的地方。", source: "乔治·奥威尔《1984》" },
];

// 自某个基准日起经过的天数（本地日期，按天取整）→ 用于按日轮换
function dayIndexSince(baseUTC: number, date: Date): number {
  const todayUTC = Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  return Math.floor((todayUTC - baseUTC) / 86_400_000);
}

const BASE = Date.UTC(2025, 0, 1); // 2025-01-01 作为轮换起点

export interface PickedDaily {
  item: DailyItem;
  index: number;
  total: number;
}

// 按日期确定性地选出当天的一条；同一天始终返回同一条
export function itemForDate(items: DailyItem[], date: Date = new Date()): PickedDaily {
  const len = items.length;
  const idx = ((dayIndexSince(BASE, date) % len) + len) % len;
  return { item: items[idx], index: idx, total: len };
}

// 中国习惯日期：M月D日
export function formatCNDate(d: Date): string {
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}
