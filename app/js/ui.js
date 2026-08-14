// ============================================================
// 《棕榈岛》界面渲染与交互（简体中文）
// ============================================================
(function (global) {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const I = global.I18N || I18N;
  const CARDS = global.PALM_CARDS || PALM_CARDS;
  const FEATS = global.PALM_FEATS || PALM_FEATS;
  const Engine = global.PalmEngine;

  // ---------- 扁平化 SVG 图标 ----------
  const ICONS = {
    fish: '<svg class="res-icon" viewBox="0 0 24 24"><path d="M3 12 C7 6.5 13 7 16.5 9.5 C19.5 11.2 21 12 21 12 C21 12 19.5 12.8 16.5 14.5 C13 17 7 17.5 3 12 Z" fill="#4dabf7" stroke="#1864ab" stroke-width="1"/><path d="M21 12 L24.5 9.2 V14.8 Z" fill="#4dabf7" stroke="#1864ab" stroke-width="1"/><circle cx="7" cy="11.6" r="1" fill="#fff"/></svg>',
    wood: '<svg class="res-icon" viewBox="0 0 24 24"><rect x="2.5" y="8.5" width="16" height="7" rx="3.2" fill="#a8763e" stroke="#7a4f22" stroke-width="1"/><ellipse cx="18.5" cy="12" rx="2.6" ry="3.5" fill="#8b5e2b" stroke="#7a4f22" stroke-width="1"/><path d="M7 12 h6 M9 9.5 v5" stroke="#7a4f22" stroke-width="0.9"/></svg>',
    stone: '<svg class="res-icon" viewBox="0 0 24 24"><path d="M4 15.5 L7.5 7 H16 L20.5 15.5 L16.5 21.5 H8.5 Z" fill="#adb5bd" stroke="#7a8288" stroke-width="1"/><path d="M7.5 7 L12.5 9 L20.5 15.5 M16.5 21.5 L13 16 M9 13 L14 15" stroke="#7a8288" stroke-width="1" fill="none"/></svg>',
    star: '<svg class="res-icon" viewBox="0 0 24 24"><path d="M12 2.5 L14.7 8.8 L21.5 9.4 L16.4 13.9 L18 20.6 L12 17 L6 20.6 L7.6 13.9 L2.5 9.4 L9.3 8.8 Z" fill="#ffd43b" stroke="#d99a06" stroke-width="1.1"/></svg>',
    arrowStore: '<svg viewBox="0 0 24 24"><path d="M12 4 A8 8 0 0 1 20 12" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M20 12 L16.2 10 M20 12 L16.2 14" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>',
    arrowRotate: '<svg viewBox="0 0 24 24"><path d="M7 5 H16 A7 7 0 0 1 16 19 H8" stroke="#4b3400" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M8 19 L4 16.5 M8 19 L4 21.5" stroke="#4b3400" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>',
    arrowFlip: '<svg viewBox="0 0 24 24"><path d="M5 9 A7.5 7.5 0 0 1 18.5 7.5 M19 15 A7.5 7.5 0 0 1 5.5 16.5" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M18.5 7.5 L14.6 8.6 M18.5 7.5 L17 11.4 M5.5 16.5 L9.4 15.4 M5.5 16.5 L7 12.6" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg>'
  };

  // ---------- 小工具 ----------
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  let toastTimer = null;
  function toast(msg) {
    const el = $("toast");
    el.textContent = msg;
    el.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add("hidden"), 2400);
  }

  function resText(produce) {
    const parts = [];
    if (produce.fish) parts.push("鱼×" + produce.fish);
    if (produce.wood) parts.push("木头×" + produce.wood);
    if (produce.stone) parts.push("石头×" + produce.stone);
    return parts.join("、") || "—";
  }

  function produceHtml(produce) {
    let html = "";
    if (produce.fish) html += ICONS.fish + '<span class="res-count">×' + produce.fish + "</span>";
    if (produce.wood) html += ICONS.wood + '<span class="res-count">×' + produce.wood + "</span>";
    if (produce.stone) html += ICONS.stone + '<span class="res-count">×' + produce.stone + "</span>";
    return html || '<span class="no-action">无资源</span>';
  }

  function starHtml(n) {
    return n ? `<span class="stars">${"★".repeat(n)}</span>` : "";
  }

  function chip(action, cost) {
    if (cost === null || cost === undefined) return "";
    const key = "arrow" + action.charAt(0).toUpperCase() + action.slice(1);
    return `<span class="act-chip ${action}">${ICONS[key]}${esc(Engine.costToString(cost))}</span>`;
  }

  function typeClass(card) {
    return card.roundTracker ? "round" : card.type;
  }

  // ---------- 单张卡渲染 ----------
  function renderCardHTML(entry, state, opts = {}) {
    const card = Engine.cardById(CARDS, entry.id);
    if (!card) return "";
    if (card.roundTracker) {
      return `<div class="card round-card"><div class="round-num">${state.round}</div></div>`;
    }
    if (entry.isFeat) {
      const feat = Engine.featById(FEATS, entry.featId);
      const status = entry.used ? "used" : "unused";
      const statusText = entry.used ? I.featUsed : I.featUnused;
      return (
        `<div class="card feat-card">` +
        `<div class="card-head"><span class="sun">★</span><span class="card-name">${esc(feat ? feat.name : entry.featId)}</span><span class="feat-status ${status}">${statusText}</span></div>` +
        `<div class="half active"><div class="feat-ability">${esc(feat ? feat.abilityDesc : "")}</div></div>` +
        `<div class="half dim"><span class="half-label">${I.feat}</span><div class="feat-ability">${esc(feat ? feat.desc : "")}</div></div>` +
        `</div>`
      );
    }
    const active = card.states[entry.state];
    const other = card.states[Engine.rotatedState(entry.state)];
    const activeLabel = I.stateName["ABCD"[entry.state]];
    const otherLabel = I.stateName["ABCD"[Engine.rotatedState(entry.state)]];

    const halfActive =
      `<div class="half active"><span class="half-label">${activeLabel}</span>` +
      `<div class="row">${produceHtml(active.produce)}</div>` +
      `<div class="row">${chip("store", active.storeCost)}${chip("rotate", active.rotateCost)}${chip("flip", active.flipCost)}</div>` +
      `<div class="row">${starHtml(active.stars)}</div></div>`;

    const halfOther =
      `<div class="half dim"><span class="half-label">${otherLabel}</span>` +
      `<div class="row">${produceHtml(other.produce)}</div>` +
      `<div class="row">${chip("store", other.storeCost)}${chip("rotate", other.rotateCost)}${chip("flip", other.flipCost)}</div>` +
      `<div class="row">${starHtml(other.stars)}</div></div>`;

    return (
      `<div class="card ${typeClass(card)}">` +
      `<div class="card-head"><span class="sun">${card.id}</span><span class="card-name">${esc(card.name)}</span><span class="state-badge">${activeLabel}</span></div>` +
      halfActive + halfOther +
      `</div>`
    );
  }

  // ---------- 渲染整个界面 ----------
  function render(state, uiState) {
    const top = state.deck.slice(0, 3);
    const slotEls = ["slot0", "slot1", "slot2"];
    top.forEach((entry, i) => {
      const el = $(slotEls[i]);
      el.innerHTML = renderCardHTML(entry, state);
      el.classList.toggle("selected", uiState.selectedPos === i);
    });
    for (let i = top.length; i < 3; i++) $(slotEls[i]).innerHTML = "";

    $("roundInfo").textContent = `轮次 ${state.round}/8`;
    $("scoreInfo").textContent = `★ ${Engine.score(state, CARDS)}`;
    $("storedCount").textContent = `${Engine.storedCards(state).length} / 4`;
    $("undoBtn").disabled = !state.history.length;
    $("peekBtn").disabled = false;

    renderStored(state, uiState);
    renderBonus(state);
    renderActionBar(state, uiState);
  }

  function renderBonus(state) {
    const bonus = state.bonus || {};
    const parts = [];
    if (bonus.fish) parts.push("鱼×" + bonus.fish);
    if (bonus.wood) parts.push("木头×" + bonus.wood);
    if (bonus.stone) parts.push("石头×" + bonus.stone);
    const el = $("bonusArea");
    el.classList.toggle("hidden", !parts.length);
    if (parts.length) el.textContent = `${I.featBonus}：${parts.join("、")}（支付时自动优先使用）`;
  }

  function renderStored(state, uiState) {
    const list = Engine.storedResources(state, CARDS);
    const area = $("storedArea");
    if (!list.length) {
      area.innerHTML = '<div class="stored-empty">还没有储存资源</div>';
      return;
    }
    area.innerHTML = list
      .map((r, i) => {
        const selected = uiState.paySelected.has(r.deckIndex) || uiState.resetSelected === r.deckIndex;
        const disabled = uiState.payMode && !uiState.paySelectable.has(r.deckIndex);
        return (
          `<div class="stored-card ${selected ? "selected" : ""} ${disabled ? "disabled" : ""}" data-idx="${r.deckIndex}" data-pos="${i}">` +
          `<div class="row" style="flex-direction:column;gap:2px">${produceHtml(r.produce)}</div>` +
          `<div class="stored-name">${esc(r.card.name)}</div>` +
          `</div>`
        );
      })
      .join("");
  }

  function renderActionBar(state, uiState) {
    const pos = uiState.selectedPos;
    const e = state.deck[pos];
    const def = { disabled: true, label: "—", cls: "" };

    const mk = (action, extra = "") => {
      if (!e || e.id === Engine.ROUND_TRACKER_ID || e.stored) return def;
      const cost = Engine.actionCost(CARDS, e, action);
      if (cost === null) return { ...def, label: I.actions[action], cls: action };
      const payAll = Engine.storedCards(state).map((c) => state.deck.indexOf(c));
      const payable = cost === "free" || Engine.canPay(state, CARDS, cost, payAll);
      return {
        disabled: !payable,
        label: I.actions[action],
        cls: action,
        cost: Engine.costToString(cost),
        payable
      };
    };

    const store = mk("store");
    const rotate = mk("rotate");
    const flip = mk("flip");
    const discardOk = e && !state.over && !e.stored;

    setAct("actStore", store);
    setAct("actRotate", rotate);
    setAct("actFlip", flip);

    const dBtn = $("actDiscard");
    dBtn.disabled = !discardOk || pos !== 0;
    dBtn.innerHTML = `${I.actions.discard}<span class="cost">仅第 1 张</span>`;

    const featBtn = $("actFeat");
    if (Engine.canActivateFeat(state, FEATS, pos)) {
      const feat = Engine.featById(FEATS, state.deck[pos].featId);
      featBtn.classList.remove("hidden");
      featBtn.disabled = false;
      featBtn.innerHTML = `${I.featActivate}<span class="cost">${esc(feat ? feat.abilityDesc.slice(0, 8) : "")}</span>`;
    } else {
      featBtn.classList.add("hidden");
      featBtn.disabled = true;
    }

    $("peekHint").classList.toggle("hidden", false);
  }

  function setAct(id, info) {
    const b = $(id);
    b.disabled = info.disabled;
    b.innerHTML = `${info.label}${info.cost ? `<span class="cost">${esc(info.cost)}</span>` : ""}`;
    b.dataset.action = info.cls;
  }

  // ---------- 弹窗 ----------
  function openSheet(html) {
    const root = $("modalRoot");
    root.innerHTML = `<div class="overlay"><div class="sheet">${html}</div></div>`;
    root.querySelector(".overlay").addEventListener("click", (ev) => {
      if (ev.target === ev.currentTarget) closeSheet();
    });
  }

  function closeSheet() {
    $("modalRoot").innerHTML = "";
  }

  function confirmModal(title, desc, onOk, okLabel = I.confirm) {
    openSheet(
      `<h3>${esc(title)}</h3><div class="desc">${esc(desc)}</div>` +
      `<div class="btn-row"><button class="btn secondary" id="mCancel">${I.cancel}</button>` +
      `<button class="btn primary" id="mOk">${okLabel}</button></div>`
    );
    $("mCancel").onclick = closeSheet;
    $("mOk").onclick = () => { closeSheet(); onOk(); };
  }

  function payModal(state, uiState, opts) {
    // opts: { pos, action, cost, onDone }
    const needReset = opts.action === "store" && Engine.storeNeedsReset(state);
    uiState.payMode = true;
    uiState.paySelected = new Set();
    uiState.paySelectable = new Set(Engine.storedResources(state, CARDS).map((r) => r.deckIndex));
    uiState.resetSelected = null;

    const storedList = () => Engine.storedResources(state, CARDS);
    const bonus = state.bonus || {};
    const bonusParts = [];
    if (bonus.fish) bonusParts.push("鱼×" + bonus.fish);
    if (bonus.wood) bonusParts.push("木头×" + bonus.wood);
    if (bonus.stone) bonusParts.push("石头×" + bonus.stone);

    const renderPay = () => {
      const list = storedList();
      const payList = [...uiState.paySelected];
      const okPay = opts.cost === "free" || Engine.canPay(state, CARDS, opts.cost, payList);
      const okReset = !needReset || uiState.resetSelected !== null;
      $("mOk").disabled = !(okPay && okReset);

      $("payStored").innerHTML = list.length
        ? list
            .map((r) => {
              const selected = uiState.paySelected.has(r.deckIndex) || uiState.resetSelected === r.deckIndex;
              const disabled = uiState.paySelectable.has(r.deckIndex) ? "" : " disabled";
              return (
                `<div class="pay-item ${selected ? "selected" : ""}${disabled}" data-idx="${r.deckIndex}">` +
                `<div style="font-weight:700">${esc(r.card.name)}</div>` +
                `<div style="font-size:11px;color:#495057">${esc(resText(r.produce))}</div>` +
                `</div>`
              );
            })
            .join("")
        : '<div class="desc">没有可用的储存资源</div>';

      const sel = list.filter((r) => uiState.paySelected.has(r.deckIndex));
      $("payStatus").textContent = sel.length
        ? "已选：" + sel.map((r) => resText(r.produce)).join("、")
        : "尚未选择";
      if (needReset) {
        const resetSel = list.find((r) => r.deckIndex === uiState.resetSelected);
        $("resetStatus").innerHTML = resetSel ? "将重置：" + resetSel.card.name : "请选择要重置的储存卡";
      }
    };

    openSheet(
      `<h3>${I.pay} · ${I.actions[opts.action]}</h3>` +
      `<div class="desc">${I.payHint}</div>` +
      `<div class="cost-line">费用：<b>${esc(Engine.costToString(opts.cost))}</b></div>` +
      (bonusParts.length ? `<div class="desc" style="color:#5f3dc4">${I.featBonus}：${bonusParts.join("、")}（自动优先使用）</div>` : "") +
      (needReset ? `<div class="desc" style="color:#e03131">${I.resourceLimit}</div><div id="resetStatus" style="font-size:13px;margin-bottom:6px"></div>` : "") +
      `<div id="payStored" class="pay-row"></div>` +
      `<div id="payStatus" style="font-size:13px;color:#1971c2;min-height:18px"></div>` +
      `<div class="btn-row"><button class="btn secondary" id="mCancel">${I.cancel}</button>` +
      `<button class="btn primary" id="mOk" disabled>${I.confirm}</button></div>`
    );

    $("payStored").addEventListener("click", (ev) => {
      const item = ev.target.closest(".pay-item");
      if (!item) return;
      const idx = Number(item.dataset.idx);
      if (needReset) {
        uiState.resetSelected = idx;
        uiState.paySelected.delete(idx);
      } else if (uiState.paySelected.has(idx)) {
        uiState.paySelected.delete(idx);
      } else {
        uiState.paySelected.add(idx);
      }
      renderPay();
    });

    $("mCancel").onclick = () => { uiState.payMode = false; closeSheet(); };
    $("mOk").onclick = () => {
      const pay = [...uiState.paySelected];
      const reset = needReset ? uiState.resetSelected : null;
      uiState.payMode = false;
      closeSheet();
      opts.onDone(pay, reset);
    };
    renderPay();
  }

  // ---------- 天赋 ----------
  function featActivateModal(state, uiState, pos, onDone) {
    const e = state.deck[pos];
    const feat = Engine.featById(FEATS, e && e.featId);
    if (!feat) return;
    const ability = feat.ability;

    if (ability.type === "freeUpgrade") {
      const targets = Engine.freeUpgradeTargets(state, FEATS, pos);
      if (!targets.length) {
        toast(I.featTargetInvalid);
        return;
      }
      const rows = targets
        .map((t) => {
          const te = state.deck[t];
          const card = Engine.cardById(CARDS, te.id);
          const st = card.states[te.state];
          const actions = ability.actions.filter((a) => (a === "rotate" ? st.rotateCost : st.flipCost) !== null);
          return (
            `<div style="margin-bottom:10px">` +
            `<div style="font-weight:700;margin-bottom:6px">第 ${t + 1} 张：${esc(card.name)}</div>` +
            `<div class="btn-row">${actions
              .map(
                (a) =>
                  `<button class="btn primary" data-target="${t}" data-action="${a}">${I.actions[a]}</button>`
              )
              .join("")}</div>` +
            `</div>`
          );
        })
        .join("");
      openSheet(
        `<h3>${I.featFreeUpgrade} · ${esc(feat.name)}</h3>` +
          `<div class="desc">${I.featFreeUpgradeHint}</div>` +
          rows +
          `<div class="btn-row"><button class="btn secondary" id="mCancel">${I.cancel}</button></div>`
      );
      document.querySelectorAll("[data-target]").forEach((b) => {
        b.onclick = () => {
          const payload = { targetPos: Number(b.dataset.target), action: b.dataset.action };
          closeSheet();
          onDone(payload);
        };
      });
      $("mCancel").onclick = closeSheet;
    } else {
      const msg = I.featConfirmUse.replace("{name}", feat.name).replace("{ability}", feat.abilityDesc);
      confirmModal(`${I.featActivate} · ${feat.name}`, msg, () => onDone({}), I.confirm);
    }
  }

  // mode: "pick"（新游戏选卡）| "manage"（图鉴管理）
  function featPanelModal(uiState, actions, mode) {
    const earned = uiState.earnedFeats || [];
    const diff = uiState.featDifficulty || "easy";

    const setDiff = (d) => {
      uiState.featDifficulty = d;
      if (d === "medium") uiState.includedFeats = (uiState.includedFeats || []).slice(0, 1);
      if (d === "hard") uiState.includedFeats = [];
      featPanelModal(uiState, actions, mode);
    };

    const toggle = (id) => {
      let sel = uiState.includedFeats || [];
      if (sel.includes(id)) {
        sel = sel.filter((x) => x !== id);
      } else {
        if (uiState.featDifficulty === "medium") sel = [id];
        else sel.push(id);
      }
      uiState.includedFeats = sel;
      featPanelModal(uiState, actions, mode);
    };

    const items = FEATS.map((f) => {
      const unlocked = earned.includes(f.id);
      const carry = (uiState.includedFeats || []).includes(f.id);
      const tag = unlocked
        ? carry
          ? `<span class="feat-tag carry">${I.featCarry}</span>`
          : `<span class="feat-tag unlocked">${I.featEarned}</span>`
        : `<span class="feat-tag locked">${I.featLocked}</span>`;
      return (
        `<div class="feat-item ${unlocked ? "" : "locked"}">` +
        `<div class="feat-name"><span>${esc(f.name)}</span>${tag}</div>` +
        `<div class="feat-desc">${I.featCriteria}：${esc(f.desc)}</div>` +
        `<div class="feat-ability-line">${I.featAbility}：${esc(f.abilityDesc)}</div>` +
        (unlocked
          ? `<div class="check-row ${carry ? "checked" : ""}" data-toggle="${f.id}"><input type="checkbox" ${carry ? "checked" : ""}>${I.featCarry}</div>`
          : "") +
        `</div>`
      );
    }).join("");

    const okLabel = mode === "pick" ? I.start : I.close;
    openSheet(
      `<h3>${I.featPanel}</h3>` +
      `<div class="desc">${mode === "pick" ? I.featSelectHint : I.featCriteria}</div>` +
      `<div class="diff-row">` +
      `<button class="diff-btn ${diff === "easy" ? "on" : ""}" data-diff="easy">${I.diffEasy}</button>` +
      `<button class="diff-btn ${diff === "medium" ? "on" : ""}" data-diff="medium">${I.diffMedium}</button>` +
      `<button class="diff-btn ${diff === "hard" ? "on" : ""}" data-diff="hard">${I.diffHard}</button>` +
      `</div>` +
      (earned.length ? items : `<div class="desc">${I.featNone}</div>`) +
      `<div class="btn-row">` +
      (mode === "pick" ? `<button class="btn secondary" id="mCancel">${I.cancel}</button>` : "") +
      `<button class="btn primary" id="mOk">${okLabel}</button>` +
      `</div>`
    );

    document.querySelectorAll("[data-diff]").forEach((b) => (b.onclick = () => setDiff(b.dataset.diff)));
    document.querySelectorAll("[data-toggle]").forEach((row) => (row.onclick = () => toggle(row.dataset.toggle)));
    const cancel = $("mCancel");
    if (cancel) cancel.onclick = closeSheet;
    $("mOk").onclick = () => {
      closeSheet();
      if (mode === "pick") actions.startGame();
      else actions.save();
    };
  }

  function peekModal(state) {
    const top = state.deck.slice(0, 2);
    const html =
      `<h3>${I.peekBack}</h3><div class="desc">${I.peekHint}</div>` +
      top
        .map((entry) => {
          const card = Engine.cardById(CARDS, entry.id);
          if (!card || card.roundTracker) return "";
          if (entry.isFeat) {
            const feat = Engine.featById(FEATS, entry.featId);
            return `<div style="border:1px solid #d0bfff;border-radius:10px;padding:8px;margin-bottom:8px">
              <div style="font-size:12px;font-weight:700;margin-bottom:4px">${esc(feat ? feat.name : entry.featId)} · ${I.feat}</div>
              <div style="font-size:12px;color:#5f3dc4">${esc(feat ? feat.abilityDesc : "")}</div></div>`;
          }
          const backTop = card.states[2];
          const backBottom = card.states[3];
          const block = (label, st) =>
            `<div style="border:1px solid #dce7e1;border-radius:10px;padding:8px;margin-bottom:8px">` +
            `<div style="font-size:12px;font-weight:700;margin-bottom:4px">${esc(card.name)} · ${label}</div>` +
            `<div class="row">${produceHtml(st.produce)}</div>` +
            `<div class="row">${chip("store", st.storeCost)}${chip("rotate", st.rotateCost)}${chip("flip", st.flipCost)}</div>` +
            `<div class="row">${starHtml(st.stars)}</div></div>`;
          return block(I.stateName.C, backTop) + block(I.stateName.D, backBottom);
        })
        .join("") +
      `<div class="btn-row"><button class="btn secondary" id="mClose">${I.close}</button></div>`;
    openSheet(html);
    $("mClose").onclick = closeSheet;
  }

  function helpModal() {
    openSheet(
      `<h3>${I.helpTitle}</h3><ul class="help-list">${I.helpText.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` +
      `<div class="btn-row"><button class="btn secondary" id="mClose">${I.close}</button></div>`
    );
    $("mClose").onclick = closeSheet;
  }

  function menuModal(state, uiState, actions) {
    openSheet(
      `<h3>${I.title}</h3>` +
      `<div class="btn-row" style="flex-direction:column;gap:8px">` +
      `<button class="btn secondary" id="mTutorial">${I.tutorial}</button>` +
      `<button class="btn secondary" id="mHelp">${I.helpTitle}</button>` +
      `<button class="btn secondary" id="mFeat">${I.featPanel}</button>` +
      `<button class="btn secondary" id="mMemory">${I.memoryMode}：${uiState.memoryMode ? I.memoryOn : I.memoryOff}</button>` +
      (uiState.memoryMode ? `<button class="btn secondary" id="mDeck">查看牌序</button>` : "") +
      `<button class="btn secondary" id="mNew">${I.newGame}</button>` +
      `<button class="btn ghost" id="mClose">${I.close}</button>` +
      `</div>`
    );
    $("mTutorial").onclick = () => { closeSheet(); actions.tutorial(); };
    $("mHelp").onclick = () => { closeSheet(); helpModal(); };
    $("mFeat").onclick = () => { closeSheet(); featPanelModal(uiState, actions, "manage"); };
    $("mMemory").onclick = () => {
      uiState.memoryMode = !uiState.memoryMode;
      actions.save();
      closeSheet();
      menuModal(state, uiState, actions);
    };
    const deckBtn = $("mDeck");
    if (deckBtn) {
      deckBtn.onclick = () => {
        closeSheet();
        deckModal(state);
      };
    }
    $("mNew").onclick = () => { closeSheet(); actions.newGame(); };
    $("mClose").onclick = closeSheet;
  }

  function deckModal(state) {
    const rows = state.deck
      .map((entry) => {
        const card = Engine.cardById(CARDS, entry.id);
        if (entry.isFeat) {
          const feat = Engine.featById(FEATS, entry.featId);
          return `<div style="display:flex;gap:8px;padding:5px 0;border-bottom:1px solid #eef3f0;font-size:13px">
            <span class="sun">★</span><span style="flex:1">${esc(feat ? feat.name : entry.featId)}</span>
            <span style="color:#7a8a82">${entry.used ? I.featUsed : I.featUnused}</span></div>`;
        }
        const st = card.roundTracker ? "轮次卡" : I.stateName["ABCD"[entry.state]];
        return `<div style="display:flex;gap:8px;padding:5px 0;border-bottom:1px solid #eef3f0;font-size:13px">
          <span class="sun">${card ? card.id : "?"}</span><span style="flex:1">${esc(card ? card.name : "")}</span>
          <span style="color:#7a8a82">${entry.stored ? "横置·" : ""}${st}</span></div>`;
      })
      .join("");
    openSheet(`<h3>当前牌序</h3><div class="desc">从上到下（记忆模式）</div>${rows}<div class="btn-row"><button class="btn secondary" id="mClose">${I.close}</button></div>`);
    $("mClose").onclick = closeSheet;
  }

  function endModal(state, actions, newlyEarned = []) {
    const s = Engine.score(state, CARDS);
    const tier = I.tiers.find((t) => s >= t.min) || I.tiers[I.tiers.length - 1];
    const earnedHtml = newlyEarned.length
      ? `<div style="background:#f3f0ff;border-radius:10px;padding:8px 10px;margin:8px 0;font-size:13px;color:#5f3dc4">` +
        `🎉 ${I.featNewUnlock}：${newlyEarned
          .map((id) => {
            const f = Engine.featById(FEATS, id);
            return esc(f ? f.name : id);
          })
          .join("、")}` +
        `</div>`
      : "";
    openSheet(
      `<h3>${I.gameOver}</h3>` +
      `<div class="end-score">${s}</div>` +
      `<div class="end-tier">${esc(tier.name)}</div>` +
      `<div class="desc" style="text-align:center">${I.finalScore}：${s} 分</div>` +
      earnedHtml +
      `<div class="btn-row"><button class="btn primary" id="mAgain">${I.playAgain}</button>` +
      `<button class="btn ghost" id="mClose">${I.close}</button></div>`
    );
    $("mAgain").onclick = () => { closeSheet(); actions.newGame(); };
    $("mClose").onclick = closeSheet;
  }

  function tutorialModal(onDone) {
    let step = 0;
    const steps = I.tutorialSteps;
    const render = () => {
      const st = steps[step];
      openSheet(
        `<h3>${I.tutorial}</h3><div class="tut-step">${esc(st.t)}</div>` +
        `<div class="desc" style="margin-top:8px">${esc(st.d)}</div>` +
        `<div class="tut-dot">${steps.map((_, i) => `<span class="${i === step ? "on" : ""}"></span>`).join("")}</div>` +
        `<div class="btn-row">` +
        (step > 0 ? `<button class="btn secondary" id="tPrev">上一步</button>` : "") +
        (step < steps.length - 1
          ? `<button class="btn primary" id="tNext">${I.tutorialNext}</button>`
          : `<button class="btn primary" id="tStart">${I.tutorialStart}</button>`) +
        `</div>`
      );
      const prev = $("tPrev");
      if (prev) prev.onclick = () => { step--; render(); };
      const next = $("tNext");
      if (next) next.onclick = () => { step++; render(); };
      const start = $("tStart");
      if (start) start.onclick = () => { closeSheet(); onDone(); };
    };
    render();
  }

  global.PalmUI = {
    render,
    toast,
    payModal,
    peekModal,
    helpModal,
    menuModal,
    endModal,
    tutorialModal,
    confirmModal,
    featActivateModal,
    featPanelModal,
    closeSheet,
    resText
  };
})(typeof window !== "undefined" ? window : globalThis);
