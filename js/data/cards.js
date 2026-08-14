// ============================================================
// 《棕榈岛》卡牌数据（初稿，待核对）
// ------------------------------------------------------------
// ⚠️ 重要说明：
// 官方规则书中没有逐卡数值表，卡面数据以实体卡为准。
// 当前文件为"结构正确、数值待核对"的初稿：
//   - 卡牌种类、数量、升级几何关系（旋转 180°/翻面）正确；
//   - 各状态的具体费用/产出/分数为占位初稿，verified=false。
// 拿到官方数据或实体卡后，只需修改本文件即可，无需动其他代码。
// ============================================================

// 卡牌 4 个朝向（state 索引）：
//   0 = 正面·上（起始，太阳标记在左上）
//   1 = 正面·下（旋转 180°）
//   2 = 背面·上（翻面）
//   3 = 背面·下（翻面后再旋转 180°）
// 几何关系：旋转 180° 在 0↔1、2↔3 之间；翻面在 0↔2、1↔3 之间。
//
// 每状态字段：
//   produce: { fish, wood, stone }      横置后露出的资源
//   storeCost: null | "free" | {…}      储存费用
//   rotateCost: null | "free" | {…}     旋转费用（null=无此行动）
//   flipCost: null | "free" | {…}       翻面费用（null=无此行动）
//   stars: 胜利点数
// 费用对象：{ fish: n, wood: n, stone: n }；{ any: n } 表示任意资源 n 个

const FREE = "free";
const c = (name, nameEn, num, type, states, opts = {}) => ({
  id: num,
  name,
  nameEn,
  type,
  states,
  verified: false, // 待核对
  ...opts
});

const CANOE = (num) =>
  c("独木舟屋", "Canoe House", num, "fish", [
    { produce: { fish: 2 }, storeCost: FREE, rotateCost: { fish: 1 }, flipCost: { fish: 1, wood: 1 }, stars: 0 }, // A
    { produce: { fish: 3 }, storeCost: FREE, rotateCost: null, flipCost: { fish: 1, wood: 1 }, stars: 0 }, // B
    { produce: { fish: 3 }, storeCost: FREE, rotateCost: { fish: 1 }, flipCost: null, stars: 1 }, // C
    { produce: { fish: 2 }, storeCost: FREE, rotateCost: null, flipCost: null, stars: 2 } // D
  ]);

const LOGGER = (num) =>
  c("伐木工小屋", "Logger", num, "wood", [
    { produce: { wood: 1 }, storeCost: FREE, rotateCost: { wood: 1 }, flipCost: { fish: 1, wood: 1 }, stars: 0 }, // A
    { produce: { wood: 2 }, storeCost: FREE, rotateCost: null, flipCost: { wood: 2 }, stars: 0 }, // B
    { produce: {}, storeCost: null, rotateCost: null, flipCost: null, stars: 5 }, // C 升满
    { produce: { wood: 2 }, storeCost: FREE, rotateCost: { wood: 2 }, flipCost: null, stars: 1 } // D
  ]);

const QUARRY = (num) =>
  c("采石场", "Quarry", num, "stone", [
    { produce: { stone: 1 }, storeCost: FREE, rotateCost: { wood: 1 }, flipCost: { fish: 1, wood: 1 }, stars: 0 }, // A
    { produce: { stone: 2 }, storeCost: FREE, rotateCost: null, flipCost: { wood: 2 }, stars: 0 }, // B
    { produce: {}, storeCost: null, rotateCost: null, flipCost: null, stars: 4 }, // C 升满
    { produce: { stone: 2 }, storeCost: FREE, rotateCost: { wood: 2 }, flipCost: null, stars: 1 } // D
  ]);

const MARKET = c("市场", "Market", 10, "market", [
  { produce: { fish: 1, wood: 1 }, storeCost: FREE, rotateCost: { fish: 1 }, flipCost: { wood: 1 }, stars: 0 },
  { produce: { fish: 1, wood: 2 }, storeCost: FREE, rotateCost: null, flipCost: { fish: 1, wood: 1 }, stars: 0 },
  { produce: { fish: 2, wood: 1 }, storeCost: FREE, rotateCost: { fish: 1, wood: 1 }, flipCost: null, stars: 2 },
  { produce: { fish: 1, wood: 2 }, storeCost: FREE, rotateCost: null, flipCost: null, stars: 1 }
]);

const TRADE_HOUSE = c("贸易屋", "Trade House", 11, "trade", [
  { produce: { stone: 1 }, storeCost: FREE, rotateCost: { fish: 1 }, flipCost: { wood: 1 }, stars: 0 },
  { produce: { stone: 1, fish: 1 }, storeCost: FREE, rotateCost: null, flipCost: { fish: 1, wood: 1 }, stars: 0 },
  { produce: { stone: 2, fish: 1 }, storeCost: FREE, rotateCost: { fish: 1, wood: 1 }, flipCost: null, stars: 1 },
  { produce: { stone: 2, fish: 1 }, storeCost: FREE, rotateCost: null, flipCost: null, stars: 2 }
]);

const TOOLMAKER = c("工具匠", "Toolmaker", 12, "tool", [
  { produce: { wood: 1, fish: 1 }, storeCost: FREE, rotateCost: { fish: 1 }, flipCost: { wood: 1 }, stars: 0 },
  { produce: { wood: 2, fish: 1 }, storeCost: FREE, rotateCost: null, flipCost: { fish: 1, wood: 1 }, stars: 0 },
  { produce: { wood: 2, fish: 1 }, storeCost: FREE, rotateCost: { fish: 1, wood: 1 }, flipCost: null, stars: 2 },
  { produce: { wood: 1, fish: 1 }, storeCost: FREE, rotateCost: null, flipCost: null, stars: 2 }
]);

const HOUSING = (num) =>
  c("住宅", "Housing", num, "housing", [
    { produce: {}, storeCost: null, rotateCost: { fish: 1, wood: 1 }, flipCost: null, stars: 0 }, // A
    { produce: {}, storeCost: null, rotateCost: null, flipCost: { fish: 2, wood: 2 }, stars: 2 }, // B
    { produce: {}, storeCost: null, rotateCost: null, flipCost: null, stars: 6 }, // C 升满
    { produce: {}, storeCost: null, rotateCost: { fish: 2, wood: 3 }, flipCost: null, stars: 4 } // D
  ]);

const TEMPLE = (num) =>
  c("神庙", "Temple", num, "temple", [
    { produce: {}, storeCost: null, rotateCost: { fish: 1, wood: 1, stone: 1 }, flipCost: null, stars: 0 }, // A
    { produce: {}, storeCost: null, rotateCost: null, flipCost: { fish: 2, wood: 2, stone: 2 }, stars: 2 }, // B
    { produce: {}, storeCost: null, rotateCost: null, flipCost: null, stars: 10 }, // C 升满
    { produce: {}, storeCost: null, rotateCost: { fish: 4, wood: 3, stone: 4 }, flipCost: null, stars: 5 } // D
  ]);

const ROUND_TRACKER = c("轮次卡", "Round Tracker", 17, "round", [], { roundTracker: true });

// 16 张行动卡 + 1 张轮次卡（红/蓝两副内容相同，首版只做一副）
const PALM_CARDS = [
  CANOE(1), CANOE(2), CANOE(3),
  LOGGER(4), LOGGER(5), LOGGER(6),
  QUARRY(7), QUARRY(8), QUARRY(9),
  MARKET,
  TRADE_HOUSE,
  TOOLMAKER,
  HOUSING(13), HOUSING(14),
  TEMPLE(15), TEMPLE(16),
  ROUND_TRACKER
];

if (typeof module !== "undefined") module.exports = { PALM_CARDS };
if (typeof window !== "undefined") window.PALM_CARDS = PALM_CARDS;
