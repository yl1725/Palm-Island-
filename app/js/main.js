// ============================================================
// 《棕榈岛》入口：装配引擎、界面、存档
// ============================================================
(function () {
  "use strict";

  const Engine = window.PalmEngine;
  const CARDS = (window.PALM_CARDS || PALM_CARDS).filter((c) => !c.roundTracker);
  const FEATS = window.PALM_FEATS || PALM_FEATS || [];
  const UI = window.PalmUI;

  const SAVE_KEY = "palmIsland.v1";
  const TUT_KEY = "palmIsland.tut.v1";

  let state = null;
  const uiState = {
    selectedPos: 0,
    memoryMode: false,
    earnedFeats: [],
    includedFeats: [],
    featDifficulty: "easy",
    payMode: false,
    paySelected: new Set(),
    paySelectable: new Set(),
    resetSelected: null
  };

  // ---------- 存档 ----------
  function save() {
    try {
      localStorage.setItem(
        SAVE_KEY,
        JSON.stringify({
          state,
          settings: {
            memoryMode: uiState.memoryMode,
            earnedFeats: uiState.earnedFeats,
            includedFeats: uiState.includedFeats,
            featDifficulty: uiState.featDifficulty
          }
        })
      );
    } catch (e) {
      /* 存储不可用时忽略 */
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        const d = data && data.state;
        const valid =
          d &&
          d.deck &&
          d.deck.length >= 17 &&
          d.deck.length <= 30 &&
          d.deck.every(
            (e) =>
              e &&
              typeof e.stored === "boolean" &&
              (e.isFeat
                ? typeof e.featId === "string"
                : Number.isInteger(e.id) &&
                  e.id >= 1 &&
                  e.id <= 17 &&
                  Number.isInteger(e.state) &&
                  e.state >= 0 &&
                  e.state <= 3)
          ) &&
          Number.isInteger(d.round) &&
          d.round >= 1 &&
          d.round <= 8 &&
          typeof d.over === "boolean";
        if (valid) {
          state = data.state;
          state.bonus = state.bonus || { fish: 0, wood: 0, stone: 0 };
          if (typeof state.scoreBonus !== "number") state.scoreBonus = 0;
          const s = data.settings || {};
          uiState.memoryMode = !!s.memoryMode;
          uiState.earnedFeats = Array.isArray(s.earnedFeats) ? s.earnedFeats : [];
          uiState.includedFeats = Array.isArray(s.includedFeats) ? s.includedFeats : [];
          uiState.featDifficulty = s.featDifficulty || "easy";
          return;
        }
      }
    } catch (e) {
      /* 存档损坏则开新局 */
    }
    newGame();
  }

  function newGame() {
    const selected = FEATS.filter((f) => (uiState.includedFeats || []).includes(f.id));
    state = Engine.newGame(CARDS, undefined, selected);
    uiState.selectedPos = 0;
    save();
    render();
  }

  function render() {
    UI.render(state, uiState);
  }

  // ---------- 回合后的统一处理 ----------
  function afterTurn(prevRound) {
    const roundChanged = state.round !== prevRound;
    const expired = !!state.lastExpired;
    render();
    save();
    if (state.over) {
      const earned = Engine.checkFeatsEarned(state, CARDS, FEATS);
      const newly = earned.filter((id) => !(uiState.earnedFeats || []).includes(id));
      if (newly.length) {
        uiState.earnedFeats = [...(uiState.earnedFeats || []), ...newly];
        save();
      }
      UI.endModal(state, { newGame }, newly);
      return;
    }
    if (roundChanged) {
      UI.toast(`第 ${state.round} 轮开始`);
    } else if (expired) {
      UI.toast("储存资源作废，已放回牌堆底");
    }
  }

  // ---------- 行动 ----------
  function doAction(action) {
    const pos = uiState.selectedPos;
    const entry = state.deck[pos];
    if (!entry || entry.id === Engine.ROUND_TRACKER_ID || entry.stored) return;
    const cost = Engine.actionCost(CARDS, entry, action);
    if (cost === null) return;

    const prevRound = state.round;
    const run = (pay, reset) => {
      try {
        state = Engine.take(state, CARDS, pos, action, pay, reset);
        uiState.selectedPos = 0;
        afterTurn(prevRound);
      } catch (e) {
        UI.toast(e.message);
      }
    };

    const free = cost === "free" || !cost;
    if (action === "store" && Engine.storeNeedsReset(state)) {
      // 已满 4 张：弹窗选择要重置的储存卡
      UI.payModal(state, uiState, { pos, action, cost, onDone: run });
    } else if (free) {
      run([], null);
    } else {
      UI.payModal(state, uiState, { pos, action, cost, onDone: run });
    }
  }

  function doDiscard() {
    if (uiState.selectedPos !== 0) {
      UI.toast("只能弃掉第 1 张牌");
      return;
    }
    const prevRound = state.round;
    try {
      state = Engine.discard(state);
      afterTurn(prevRound);
    } catch (e) {
      UI.toast(e.message);
    }
  }

  function doFeat() {
    const pos = uiState.selectedPos;
    if (!Engine.canActivateFeat(state, FEATS, pos)) return;
    const prevRound = state.round;
    UI.featActivateModal(state, uiState, pos, (payload) => {
      try {
        state = Engine.activateFeat(state, CARDS, FEATS, pos, payload);
        uiState.selectedPos = 0;
        afterTurn(prevRound);
      } catch (e) {
        UI.toast(e.message);
      }
    });
  }

  function doUndo() {
    const prev = Engine.undo(state);
    if (!prev) {
      UI.toast("没有可撤销的步骤");
      return;
    }
    state = prev;
    uiState.selectedPos = 0;
    render();
    save();
  }

  // ---------- 引导 / 帮助 ----------
  function tutorial() {
    UI.tutorialModal(() => {
      try {
        localStorage.setItem(TUT_KEY, "1");
      } catch (e) {
        /* 忽略 */
      }
      render();
    });
  }

  // ---------- 事件绑定 ----------
  function wire() {
    const $ = (id) => document.getElementById(id);
    $("slot0").addEventListener("click", () => {
      uiState.selectedPos = 0;
      render();
    });
    $("slot1").addEventListener("click", () => {
      uiState.selectedPos = 1;
      render();
    });
    $("actStore").addEventListener("click", () => doAction("store"));
    $("actRotate").addEventListener("click", () => doAction("rotate"));
    $("actFlip").addEventListener("click", () => doAction("flip"));
    $("actDiscard").addEventListener("click", doDiscard);
    $("peekBtn").addEventListener("click", () => UI.peekModal(state));
    $("actFeat").addEventListener("click", doFeat);
    $("undoBtn").addEventListener("click", doUndo);
    $("menuBtn").addEventListener("click", () =>
      UI.menuModal(state, uiState, {
        tutorial,
        newGame: () =>
          UI.confirmModal((window.I18N || I18N).newGame, (window.I18N || I18N).newGameConfirm, () => {
            if ((uiState.earnedFeats || []).length) {
              UI.featPanelModal(uiState, { startGame: newGame, save }, "pick");
            } else {
              newGame();
            }
          }),
        save
      })
    );
  }

  // ---------- 启动 ----------
  function init() {
    wire();
    load();
    render();
    window.__game = () => state; // 调试用
    let tutDone = false;
    try {
      tutDone = !!localStorage.getItem(TUT_KEY);
    } catch (e) {
      tutDone = true;
    }
    if (!tutDone) tutorial();
    if ("serviceWorker" in navigator) {
      const ok = location.protocol === "https:" || ["localhost", "127.0.0.1"].includes(location.hostname);
      if (ok) navigator.serviceWorker.register("sw.js").catch(() => {});
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
