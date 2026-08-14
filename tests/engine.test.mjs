import { createRequire } from "node:module";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
const Engine = require("../js/engine.js");
const { PALM_CARDS } = require("../js/data/cards.js");
const { FEATS } = require("../js/data/feats.js");

const CARDS = PALM_CARDS.filter((c) => !c.roundTracker);
let passed = 0;
function ok(name, fn) {
  fn();
  passed++;
  console.log("✓", name);
}

function seeded() {
  let s = 42;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// 自动挑选一个可执行行动（处理资源上限与支付）
function pickAction(st) {
  for (let pos = 0; pos < 2; pos++) {
    const e = st.deck[pos];
    if (!e || e.id === Engine.ROUND_TRACKER_ID || e.stored) continue;
    for (const a of ["store", "rotate", "flip"]) {
      if (!Engine.canTake(st, CARDS, pos, a)) continue;
      const cost = Engine.actionCost(CARDS, e, a);
      const pay = Engine.storedCards(st).map((c) => st.deck.indexOf(c));
      if (cost === "free" || !cost || Engine.canPay(st, CARDS, cost, pay)) {
        let reset = null;
        if (a === "store" && Engine.storeNeedsReset(st)) reset = pay[0];
        return { pos, a, pay: cost === "free" || !cost ? [] : pay, reset };
      }
    }
  }
  return null;
}

// 1. 新游戏
ok("新游戏：17 张牌，轮次卡在底，全部起始朝向", () => {
  const st = Engine.newGame(CARDS, seeded());
  assert.equal(st.deck.length, 17);
  assert.equal(st.deck[16].id, Engine.ROUND_TRACKER_ID);
  assert.ok(st.deck.every((e) => e.state === 0 && !e.stored));
  assert.equal(st.round, 1);
  assert.equal(Engine.score(st, CARDS), 0);
});

// 2. 免费储存
ok("免费储存：卡横置放到牌堆底", () => {
  const st = Engine.newGame(CARDS, seeded());
  const pos = st.deck.findIndex((e) => Engine.actionCost(CARDS, e, "store") === "free");
  const id = st.deck[pos].id;
  const st2 = Engine.take(st, CARDS, pos, "store");
  assert.equal(Engine.storedCards(st2).length, 1);
  assert.equal(st2.deck[16].id, id);
  assert.equal(st2.deck[16].stored, true);
});

// 3. 资源上限
ok("资源上限：4 张后再储存需要先重置一张", () => {
  let st = Engine.newGame(CARDS, seeded());
  while (Engine.storedCount(st) < 4) {
    const pos = st.deck.findIndex((e) => Engine.actionCost(CARDS, e, "store") === "free");
    st = Engine.take(st, CARDS, pos, "store");
  }
  assert.equal(Engine.storedCount(st), 4);
  assert.equal(Engine.storeNeedsReset(st), true);
  const pos = st.deck.findIndex((e) => !e.stored && Engine.actionCost(CARDS, e, "store") === "free");
  assert.throws(() => Engine.take(st, CARDS, pos, "store"), /重置/);
  const resetIdx = Engine.storedCards(st).map((e) => st.deck.indexOf(e))[0];
  const resetId = st.deck[resetIdx].id;
  const st2 = Engine.take(st, CARDS, pos, "store", [], resetIdx);
  assert.equal(Engine.storedCount(st2), 4);
  assert.equal(st2.deck.find((e) => e.id === resetId).stored, false); // 原位恢复
});

// 4. 资源过期
ok("资源过期：横置卡轮到牌堆顶立即作废", () => {
  let st = Engine.newGame(CARDS, seeded());
  // 存一张牌，然后连续弃牌直到它回到牌堆顶
  const pos = st.deck.findIndex((e) => Engine.actionCost(CARDS, e, "store") === "free");
  st = Engine.take(st, CARDS, pos, "store");
  const storedId = st.deck[16].id;
  let guard = 0;
  let expired = false;
  while (guard < 20) {
    st = Engine.discard(st);
    if (st.lastExpired) {
      expired = true;
      break;
    }
    guard++;
  }
  assert.equal(expired, true);
  assert.notEqual(st.deck[0].stored, true);
  assert.equal(st.deck[0].stored, false);
  assert.equal(st.deck[16].id, storedId);
});

// 5. 旋转/翻面状态转换
ok("旋转 180° 与翻面的状态几何正确", () => {
  assert.equal(Engine.rotatedState(0), 1);
  assert.equal(Engine.rotatedState(1), 0);
  assert.equal(Engine.rotatedState(2), 3);
  assert.equal(Engine.rotatedState(3), 2);
  assert.equal(Engine.flippedState(0), 2);
  assert.equal(Engine.flippedState(2), 0);
  assert.equal(Engine.flippedState(1), 3);
  assert.equal(Engine.flippedState(3), 1);
});

// 6. 支付
ok("支付：用横置卡支付费用后恢复原位", () => {
  let st = Engine.newGame(CARDS, seeded());
  // 存满 4 张免费资源卡
  while (Engine.storedCount(st) < 4) {
    const pos = st.deck.findIndex((e) => Engine.actionCost(CARDS, e, "store") === "free");
    st = Engine.take(st, CARDS, pos, "store");
  }
  const pay = Engine.storedCards(st).map((e) => st.deck.indexOf(e));
  // 找一个可被现有资源覆盖的旋转/翻面行动
  let found = null;
  for (let pos = 0; pos < 2 && !found; pos++) {
    for (const a of ["rotate", "flip"]) {
      const cost = Engine.actionCost(CARDS, st.deck[pos], a);
      if (cost && cost !== "free" && Engine.canPay(st, CARDS, cost, pay)) {
        found = { pos, a, cost };
        break;
      }
    }
  }
  assert.ok(found, "应存在可支付行动");
  const movedId = st.deck[found.pos].id;
  const st2 = Engine.take(st, CARDS, found.pos, found.a, pay);
  // 支付后横置卡减少，被支付卡原位恢复
  assert.ok(Engine.storedCount(st2) < 4);
  assert.ok(pay.some((idx) => st2.deck[idx].stored === false));
  // 状态确实升级了
  const backEntry = st2.deck.find((e) => e.id === movedId);
  assert.equal(backEntry.state, found.a === "rotate" ? 1 : 2);
});

// 7. 轮次结算
ok("轮次：轮次卡到顶后进入下一轮", () => {
  let st = Engine.newGame(CARDS, seeded());
  let guard = 0;
  while (st.round === 1 && !st.over && guard < 30) {
    const acted = pickAction(st);
    if (!acted) st = Engine.discard(st);
    else st = Engine.take(st, CARDS, acted.pos, acted.a, acted.pay, acted.reset);
    guard++;
  }
  assert.ok(st.round >= 2 || st.over);
});

// 8. 完整对局模拟
ok("完整对局：8 轮后结束并可计分", () => {
  let st = Engine.newGame(CARDS, seeded());
  let guard = 0;
  while (!st.over && guard < 500) {
    const acted = pickAction(st);
    if (!acted) st = Engine.discard(st);
    else st = Engine.take(st, CARDS, acted.pos, acted.a, acted.pay, acted.reset);
    guard++;
  }
  assert.equal(st.over, true);
  assert.equal(st.round, 8);
  const s = Engine.score(st, CARDS);
  assert.ok(s >= 0);
  console.log("   模拟对局总分:", s);
});

// 9. 撤销
ok("撤销：回到上一步", () => {
  const st = Engine.newGame(CARDS, seeded());
  const pos = st.deck.findIndex((e) => Engine.actionCost(CARDS, e, "store") === "free");
  const st2 = Engine.take(st, CARDS, pos, "store");
  const st3 = Engine.undo(st2);
  assert.ok(st3);
  assert.deepEqual(st3.deck, st.deck);
});

// 10. 天赋：加入牌堆（轮次卡之前）
ok("天赋：携带的天赋卡位于轮次卡之前", () => {
  const st = Engine.newGame(CARDS, seeded(), FEATS.slice(0, 2));
  assert.equal(st.deck.length, 19);
  const featIdx = st.deck.findIndex((e) => e.isFeat);
  const trackerIdx = st.deck.findIndex((e) => e.id === Engine.ROUND_TRACKER_ID);
  assert.ok(featIdx > -1 && featIdx < trackerIdx);
  assert.equal(st.deck[trackerIdx].id, Engine.ROUND_TRACKER_ID);
  assert.ok(st.deck.filter((e) => e.isFeat).every((e) => !e.used));
});

// 11. 天赋：得分类天赋启用后计入总分，且不可重复使用
ok("天赋：得分加成生效且只能用一次", () => {
  const truth = FEATS.find((f) => f.id === "truth");
  const st = Engine.newGame(CARDS, seeded(), [truth]);
  const pos = st.deck.findIndex((e) => e.isFeat);
  assert.equal(Engine.canActivateFeat(st, FEATS, pos), true);
  assert.equal(Engine.score(st, CARDS), 0);
  const st2 = Engine.activateFeat(st, CARDS, FEATS, pos, {});
  assert.equal(st2.scoreBonus, 3);
  assert.equal(Engine.score(st2, CARDS), 3);
  // 已使用，不可再启用
  const usedPos = st2.deck.findIndex((e) => e.isFeat);
  assert.equal(Engine.canActivateFeat(st2, FEATS, usedPos), false);
  // 天赋卡不可执行普通行动
  assert.equal(Engine.canTake(st, CARDS, pos, "store"), false);
  assert.equal(Engine.canTake(st, CARDS, pos, "rotate"), false);
});

// 12. 天赋：附加资源参与支付且自动优先消耗
ok("天赋：附加资源自动优先支付", () => {
  const lumber = FEATS.find((f) => f.id === "lumber");
  const st = Engine.newGame(CARDS, seeded(), [lumber]);
  const pos = st.deck.findIndex((e) => e.isFeat);
  const st2 = Engine.activateFeat(st, CARDS, FEATS, pos, {});
  assert.equal(st2.bonus.wood, 2);
  // 找一张费用为纯木头的卡（如伐木工小屋旋转），确定性放到牌堆顶
  const targetIdx = st2.deck.findIndex((e) => {
    if (e.isFeat || e.id === Engine.ROUND_TRACKER_ID || e.stored) return false;
    const cost = Engine.actionCost(CARDS, e, "rotate");
    return !!cost && cost.wood && !cost.fish && !cost.stone;
  });
  assert.ok(targetIdx > -1, "牌堆中应有纯木头费用的卡");
  const target = st2.deck.splice(targetIdx, 1)[0];
  st2.deck.unshift(target);
  const st3 = Engine.take(st2, CARDS, 0, "rotate", []);
  assert.ok(st3.bonus.wood < 2);
});

// 13. 天赋：免费升级
ok("天赋：免费旋转/翻面目标牌", () => {
  const will = FEATS.find((f) => f.id === "willpower");
  const st = Engine.newGame(CARDS, seeded(), [will]);
  const featPos = st.deck.findIndex((e) => e.isFeat);
  const targets = Engine.freeUpgradeTargets(st, FEATS, featPos);
  assert.ok(targets.length >= 1);
  const t = targets[0];
  const targetId = st.deck[t].id;
  const before = st.deck[t].state;
  const st2 = Engine.activateFeat(st, CARDS, FEATS, featPos, { targetPos: t, action: "rotate" });
  const moved = st2.deck.find((e) => e.id === targetId);
  assert.equal(moved.state, Engine.rotatedState(before));
  assert.ok(st2.deck.filter((e) => e.isFeat).every((e) => e.used));
});

// 14. 天赋：结算解锁判定
ok("天赋：结算判定得分与升满条件", () => {
  // 得分条件：手动构造高分状态（把神庙和住宅设为最高级）
  const st = Engine.newGame(CARDS, seeded());
  const housing = CARDS.filter((c) => c.type === "housing");
  for (const cd of housing) {
    const entry = st.deck.find((e) => e.id === cd.id);
    entry.state = Engine.maxStateOf(cd); // 6 星
  }
  const temple = CARDS.filter((c) => c.type === "temple");
  for (const cd of temple) {
    const entry = st.deck.find((e) => e.id === cd.id);
    entry.state = Engine.maxStateOf(cd); // 10 星
  }
  st.over = true;
  st.scoreBonus = 4; // 模拟启用了得分类天赋
  const earned = Engine.checkFeatsEarned(st, CARDS, FEATS);
  assert.ok(earned.includes("truth")); // 12+20+4 = 36 ≥ 30
  assert.ok(earned.includes("willpower")); // 住宅都升满
});

// 15. 天赋：撤销包含天赋状态
ok("天赋：撤销恢复启用前的状态", () => {
  const truth = FEATS.find((f) => f.id === "truth");
  const st = Engine.newGame(CARDS, seeded(), [truth]);
  const pos = st.deck.findIndex((e) => e.isFeat);
  const st2 = Engine.activateFeat(st, CARDS, FEATS, pos, {});
  const st3 = Engine.undo(st2);
  assert.ok(st3);
  assert.equal(st3.scoreBonus, 0);
  assert.ok(st3.deck.find((e) => e.isFeat) && !st3.deck.find((e) => e.isFeat).used);
});

console.log(`\n全部通过：${passed} 项`);
