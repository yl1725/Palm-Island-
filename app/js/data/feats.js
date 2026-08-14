// ============================================================
// 《棕榈岛》天赋卡（Feat）数据（初稿，待核对）
// ------------------------------------------------------------
// 官方机制（依据官方规则书）：
//   - 单局游戏结束时检查天赋条件，达成则永久解锁；
//   - 解锁后可在之后的单人局中携带使用；
//   - 使用天赋时把天赋卡放入牌堆（位于轮次卡之前），
//     轮到它时启用能力，标记已用并放回牌堆底；
//   - 难度：简单=可用任意数量，中等=1 张，困难=0 张。
// ⚠️ 具体天赋名称与效果数值为初稿（verified=false），
//    以官方天赋卡面为准；数据只需修改本文件。
// ============================================================

const FEATS = [
  {
    id: "truth",
    name: "真理雕像",
    nameEn: "Statue of Truth",
    desc: "结算时得分达到 30 分即可解锁。",
    abilityDesc: "本局结算时额外 +3 分。",
    criterion: { type: "score", min: 30 },
    ability: { type: "score", points: 3 },
    verified: false
  },
  {
    id: "paradise",
    name: "天堂岛",
    nameEn: "Paradise Island",
    desc: "结算时得分达到 40 分即可解锁。",
    abilityDesc: "本局结算时额外 +6 分。",
    criterion: { type: "score", min: 40 },
    ability: { type: "score", points: 6 },
    verified: false
  },
  {
    id: "willpower",
    name: "意志力",
    nameEn: "Willpower",
    desc: "两张住宅都升到最高级即可解锁。",
    abilityDesc: "使用后，免费对前两张牌中的一张执行一次旋转或翻面。",
    criterion: { type: "fullyUpgraded", cardType: "housing" },
    ability: { type: "freeUpgrade", actions: ["rotate", "flip"] },
    verified: false
  },
  {
    id: "lumber",
    name: "伐木传奇",
    nameEn: "Lumber Legend",
    desc: "三张伐木工小屋都升到最高级即可解锁。",
    abilityDesc: "使用后，获得 2 个木头（加入附加资源）。",
    criterion: { type: "fullyUpgraded", cardType: "wood" },
    ability: { type: "resources", wood: 2 },
    verified: false
  },
  {
    id: "fishing",
    name: "渔业大师",
    nameEn: "Fishing Master",
    desc: "三张独木舟屋都升到最高级即可解锁。",
    abilityDesc: "使用后，获得 2 条鱼（加入附加资源）。",
    criterion: { type: "fullyUpgraded", cardType: "fish" },
    ability: { type: "resources", fish: 2 },
    verified: false
  },
  {
    id: "mason",
    name: "石匠大师",
    nameEn: "Master Mason",
    desc: "三张采石场都升到最高级即可解锁。",
    abilityDesc: "使用后，获得 2 个石头（加入附加资源）。",
    criterion: { type: "fullyUpgraded", cardType: "stone" },
    ability: { type: "resources", stone: 2 },
    verified: false
  }
];

if (typeof module !== "undefined") module.exports = { FEATS };
if (typeof window !== "undefined") window.PALM_FEATS = FEATS;
