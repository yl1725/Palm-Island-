// ============================================================
// 《棕榈岛》规则引擎（纯函数，无 DOM 依赖）
// 规则依据：官方规则书（2018 Portal Dragon）
// ============================================================
(function (global) {
  "use strict";

  const ROUND_TRACKER_ID = 17;

  // ---- 基础工具 ----
  function clone(s) {
    const c = JSON.parse(JSON.stringify(s));
    // 历史快照只浅拷贝引用，避免指数级深拷贝
    c.history = (s.history || []).slice();
    return c;
  }

  // 用于入栈的轻量快照（不含历史）
  function snapshot(s) {
    const c = clone(s);
    c.history = [];
    return c;
  }

  function shuffled(arr, rng) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor((rng ? rng() : Math.random()) * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function sumResources(produce) {
    return (produce.fish || 0) + (produce.wood || 0) + (produce.stone || 0);
  }

  function costEmpty(cost) {
    if (!cost) return true;
    if (cost.any) return cost.any <= 0;
    return !(cost.fish || cost.wood || cost.stone);
  }

  function costToString(cost) {
    if (!cost || costEmpty(cost)) return "免费";
    const parts = [];
    if (cost.any) parts.push(`任意资源×${cost.any}`);
    if (cost.fish) parts.push(`鱼×${cost.fish}`);
    if (cost.wood) parts.push(`木头×${cost.wood}`);
    if (cost.stone) parts.push(`石头×${cost.stone}`);
    return parts.join("、");
  }

  // ---- 卡牌状态访问 ----
  function cardById(cards, id) {
    return cards.find((c) => c.id === id);
  }

  function stateOf(card, stateIdx) {
    return card.states[stateIdx];
  }

  // 旋转 180°：正面 0↔1，背面 2↔3
  function rotatedState(stateIdx) {
    return stateIdx < 2 ? (stateIdx === 0 ? 1 : 0) : (stateIdx === 2 ? 3 : 2);
  }

  // 翻面：0↔2，1↔3
  function flippedState(stateIdx) {
    return stateIdx < 2 ? stateIdx + 2 : stateIdx - 2;
  }

  // ---- 新游戏 ----
  // feats: 本局携带的天赋卡（可选），放置在轮次卡之前
  function newGame(cards, rng, feats = []) {
    const deck = shuffled(cards, rng).map((cd) => ({ id: cd.id, state: 0, stored: false }));
    (feats || []).forEach((f, i) => {
      deck.push({ id: 100 + i, featId: f.id, state: 0, stored: false, used: false, isFeat: true });
    });
    deck.push({ id: ROUND_TRACKER_ID, state: 0, stored: false }); // 轮次卡显示 1
    return {
      deck,
      round: 1,
      over: false,
      history: [],
      bonus: { fish: 0, wood: 0, stone: 0 }, // 天赋等来源的附加资源
      scoreBonus: 0 // 已启用的得分类天赋加成
    };
  }

  // ---- 查询 ----
  function topN(state, n) {
    return state.deck.slice(0, n);
  }

  function storedCards(state) {
    return state.deck.filter((e) => e.stored);
  }

  function storedResources(state, cards) {
    return storedCards(state).map((e) => ({
      deckIndex: state.deck.indexOf(e),
      card: cardById(cards, e.id),
      stateIdx: e.state,
      produce: e.isFeat ? {} : stateOf(cardById(cards, e.id), e.state).produce
    }));
  }

  // 当前总分（所有卡当前状态的星星，含横置卡与得分类天赋加成）
  function score(state, cards) {
    return (
      state.deck.reduce((sum, e) => {
        const cd = cardById(cards, e.id);
        if (!cd || !cd.states.length) return sum;
        return sum + (stateOf(cd, e.state).stars || 0);
      }, 0) + (state.scoreBonus || 0)
    );
  }

  // ---- 行动可用性 ----
  function entryAt(state, pos) {
    return state.deck[pos];
  }

  function actionCost(cards, entry, action) {
    if (!entry || entry.isFeat) return null;
    const st = stateOf(cardById(cards, entry.id), entry.state);
    if (action === "store") return st.storeCost;
    if (action === "rotate") return st.rotateCost;
    if (action === "flip") return st.flipCost;
    return null;
  }

  function canPay(state, cards, cost, payDeckIndices) {
    if (cost === null) return false;
    if (cost === "free" || costEmpty(cost)) return true;
    const avail = { fish: 0, wood: 0, stone: 0, any: 0 };
    for (const idx of payDeckIndices) {
      const e = state.deck[idx];
      if (!e || !e.stored) return false;
      const p = stateOf(cardById(cards, e.id), e.state).produce || {};
      avail.fish += p.fish || 0;
      avail.wood += p.wood || 0;
      avail.stone += p.stone || 0;
      avail.any += sumResources(p);
    }
    const bonus = state.bonus || {};
    avail.fish += bonus.fish || 0;
    avail.wood += bonus.wood || 0;
    avail.stone += bonus.stone || 0;
    avail.any += sumResources(bonus);
    if (cost.any) return avail.any >= cost.any;
    return (cost.fish || 0) <= avail.fish &&
           (cost.wood || 0) <= avail.wood &&
           (cost.stone || 0) <= avail.stone;
  }

  function canTake(state, cards, pos, action) {
    if (state.over) return false;
    const e = state.deck[pos];
    if (!e || e.id === ROUND_TRACKER_ID || e.isFeat) return false;
    if (e.stored) return false;
    return actionCost(cards, e, action) !== null;
  }

  function storedCount(state) {
    return storedCards(state).length;
  }

  // 储存行动是否需要先重置一张（已达 4 张上限）
  function storeNeedsReset(state) {
    return storedCount(state) >= 4;
  }

  // ---- 执行行动 ----
  function take(state, cards, pos, action, pay = [], reset = null) {
    if (state.over) throw new Error("游戏已结束");
    const next = clone(state);
    const e = next.deck[pos];
    if (!e || e.id === ROUND_TRACKER_ID || e.isFeat) throw new Error("无法对该卡执行行动");
    if (e.stored) throw new Error("横置卡不能执行行动");
    const cost = actionCost(cards, e, action);
    if (cost === null) throw new Error("该卡当前状态没有此行动");

    next.history.push(snapshot(state));
    if (next.history.length > 80) next.history.shift();

    // 支付
    if (cost !== "free" && !costEmpty(cost)) {
      if (!canPay(next, cards, cost, pay)) throw new Error("资源不足以支付");
      consumeBonus(next, cost);
      for (const idx of pay) next.deck[idx].stored = false;
    }

    if (action === "store") {
      if (storeNeedsReset(next) && reset === null) throw new Error("需要先重置一张资源卡");
      if (reset !== null) {
        const re = next.deck[reset];
        if (!re || !re.stored) throw new Error("重置目标无效");
        re.stored = false; // 原位恢复，不移动
      }
      e.stored = true;
      next.deck.splice(pos, 1);
      next.deck.push(e);
    } else if (action === "rotate") {
      e.state = rotatedState(e.state);
      next.deck.splice(pos, 1);
      next.deck.push(e);
    } else if (action === "flip") {
      e.state = flippedState(e.state);
      next.deck.splice(pos, 1);
      next.deck.push(e);
    } else {
      throw new Error("未知行动");
    }

    afterTurn(next);
    return next;
  }

  // 支付时优先消耗附加资源（各类型只扣所需数量）
  function consumeBonus(state, cost) {
    const b = state.bonus || { fish: 0, wood: 0, stone: 0 };
    if (cost.any) {
      let need = cost.any;
      for (const t of ["fish", "wood", "stone"]) {
        const take = Math.min(need, b[t] || 0);
        b[t] -= take;
        need -= take;
        if (need <= 0) break;
      }
    } else {
      for (const t of ["fish", "wood", "stone"]) {
        const need = cost[t] || 0;
        b[t] -= Math.min(need, b[t] || 0);
      }
    }
  }

  // ---- 天赋卡（Feat） ----
  function featById(feats, id) {
    return (feats || []).find((f) => f.id === id);
  }

  function canActivateFeat(state, feats, pos) {
    if (state.over) return false;
    const e = state.deck[pos];
    return !!(e && e.isFeat && !e.used && featById(feats, e.featId));
  }

  // freeUpgrade 天赋可选的目标牌位（前两张中非天赋、非轮次卡、未横置的牌）
  function freeUpgradeTargets(state, feats, pos) {
    const out = [];
    for (let p = 0; p < 2; p++) {
      if (p === pos) continue;
      const e = state.deck[p];
      if (!e || e.isFeat || e.id === ROUND_TRACKER_ID || e.stored) continue;
      out.push(p);
    }
    return out;
  }

  // payload: freeUpgrade 天赋传 { targetPos, action }
  function activateFeat(state, cards, feats, pos, payload = {}) {
    const e = state.deck[pos];
    if (!e || !e.isFeat || e.used) throw new Error("该天赋不可用");
    const feat = featById(feats, e.featId);
    if (!feat) throw new Error("未知天赋");

    const next = clone(state);
    next.history.push(snapshot(state));
    if (next.history.length > 80) next.history.shift();
    const entry = next.deck[pos];
    const ability = feat.ability;

    if (ability.type === "score") {
      next.scoreBonus = (next.scoreBonus || 0) + ability.points;
    } else if (ability.type === "resources") {
      next.bonus.fish += ability.fish || 0;
      next.bonus.wood += ability.wood || 0;
      next.bonus.stone += ability.stone || 0;
    } else if (ability.type === "freeUpgrade") {
      const targetPos = payload.targetPos;
      const action = payload.action;
      if (![0, 1].includes(targetPos) || targetPos === pos) throw new Error("请选择要升级的牌");
      const te = next.deck[targetPos];
      if (!te || te.isFeat || te.id === ROUND_TRACKER_ID || te.stored) throw new Error("目标卡不可升级");
      if (!ability.actions.includes(action)) throw new Error("该天赋不能执行此升级");
      entry.used = true;
      next.deck.splice(pos, 1);
      next.deck.push(entry);
      const tIdx = targetPos > pos ? targetPos - 1 : targetPos;
      const te2 = next.deck[tIdx];
      te2.state = action === "rotate" ? rotatedState(te2.state) : flippedState(te2.state);
      next.deck.splice(tIdx, 1);
      next.deck.push(te2);
      afterTurn(next);
      return next;
    } else {
      throw new Error("未知天赋能力");
    }

    entry.used = true;
    next.deck.splice(pos, 1);
    next.deck.push(entry);
    afterTurn(next);
    return next;
  }

  // 一张卡经历的升级次数（近似：state 0=0，1/2=1，3=2）
  function upgradeLevel(entry) {
    if (!entry || entry.isFeat || entry.id === ROUND_TRACKER_ID) return 0;
    return [0, 1, 1, 2][entry.state] || 0;
  }

  // 一张卡的最高级状态（星星最多的状态）
  function maxStateOf(card) {
    let best = 0;
    let bestStars = -1;
    card.states.forEach((st, i) => {
      if (st.stars > bestStars) {
        bestStars = st.stars;
        best = i;
      }
    });
    return best;
  }

  // 结算时检查天赋解锁条件
  function checkFeatsEarned(state, cards, feats) {
    const finalScore = score(state, cards);
    const earned = [];
    for (const f of feats) {
      const c = f.criterion;
      let met = false;
      if (c.type === "score") {
        met = finalScore >= c.min;
      } else if (c.type === "fullyUpgraded") {
        const targets = cards.filter((cd) => cd.type === c.cardType);
        met =
          targets.length > 0 &&
          targets.every((cd) => {
            const entry = state.deck.find((e) => e.id === cd.id);
            return !!entry && entry.state === maxStateOf(cd);
          });
      } else if (c.type === "upgrades") {
        met = state.deck.reduce((s, e) => s + upgradeLevel(e), 0) >= c.min;
      }
      if (met) earned.push(f.id);
    }
    return earned;
  }

  // 弃第 1 张牌（状态与朝向不变，移到牌堆底）
  function discard(state) {
    const next = clone(state);
    next.history.push(snapshot(state));
    if (next.history.length > 80) next.history.shift();
    const e = next.deck.shift();
    next.deck.push(e);
    afterTurn(next);
    return next;
  }

  // 回合结束后的连锁处理：资源过期 → 轮次结算
  function afterTurn(state) {
    let expired = false;
    const expire = () => {
      let any = false;
      // 横置资源卡到牌堆顶 → 立即作废（原位转回，放到牌堆底）
      while (state.deck[0] && state.deck[0].stored) {
        const e = state.deck.shift();
        e.stored = false;
        state.deck.push(e);
        any = true;
      }
      if (any) expired = true;
    };

    expire();
    // 2. 轮次卡到牌堆顶 → 轮次结束
    if (state.deck[0] && state.deck[0].id === ROUND_TRACKER_ID) {
      if (state.round >= 8) {
        state.over = true;
      } else {
        state.round += 1;
        const rt = state.deck.shift();
        rt.state = state.round - 1; // 显示当前轮次数字
        state.deck.push(rt);
      }
    }
    // 轮次卡移动后可能把横置卡暴露到牌堆顶，再检查一次
    expire();
    state.lastExpired = expired;
  }

  // 撤销：返回上一步状态
  function undo(state) {
    if (!state.history.length) return null;
    const prev = state.history[state.history.length - 1];
    prev.history = state.history.slice(0, -1);
    return prev;
  }

  const Engine = {
    ROUND_TRACKER_ID,
    newGame,
    topN,
    storedCards,
    storedResources,
    score,
    actionCost,
    canTake,
    canPay,
    storeNeedsReset,
    storedCount,
    take,
    discard,
    undo,
    afterTurn,
    rotatedState,
    flippedState,
    stateOf,
    cardById,
    costToString,
    costEmpty,
    sumResources,
    featById,
    canActivateFeat,
    freeUpgradeTargets,
    activateFeat,
    upgradeLevel,
    maxStateOf,
    checkFeatsEarned
  };

  if (typeof module !== "undefined" && module.exports) module.exports = Engine;
  else global.PalmEngine = Engine;
})(typeof window !== "undefined" ? window : globalThis);
