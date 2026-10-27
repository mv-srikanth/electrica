/*
  Electrica Digital: number helpers, the SVG drawing kit and the page engine.
  Each topic lives in its own block below and calls ND.register({...}).
  A topic gives: init() -> state, controls(state) -> HTML, compute(state) -> model
  ({ steps: [{ t, d }], plate, err }), draw(ctx) -> SVG string, random(state).
*/
window.ND = (function () {
  'use strict';

  /* ---------- numbers ---------- */
  const DIG = '0123456789ABCDEF';
  const SUBS = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉' };
  const SUPS = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', k: 'ᵏ', n: 'ⁿ', m: 'ᵐ' };
  const sub = (n) => String(n).split('').map((c) => SUBS[c] || c).join('');
  const sup = (n) => String(n).split('').map((c) => SUPS[c] || c).join('');
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pad2 = (n) => String(n).padStart(2, '0');
  const minus = (s) => String(s).replace(/-/g, '−');
  const Bg = (r) => BigInt(r);
  const allowed = (r) => (r <= 10 ? '0–' + (r - 1) : '0–9 and A–' + DIG[r - 1]);
  const baseName = (r) => ({ 2: 'binary', 8: 'octal', 10: 'decimal', 16: 'hexadecimal' }[r] || 'base ' + r);

  /* Read a number typed in base r. Returns { ip, fp } digit arrays, or { err }. */
  function parse(raw, r, o) {
    o = o || {};
    let s = String(raw == null ? '' : raw).trim().toUpperCase().replace(/[\s_]/g, '');
    if (!s) return { err: 'Type a number to start.' };
    let neg = false;
    if (s[0] === '-' || s[0] === '−') {
      if (!o.signed) return { err: 'Type the number without a minus sign here.' };
      neg = true; s = s.slice(1);
    } else if (s[0] === '+') s = s.slice(1);
    const parts = s.split('.');
    if (parts.length > 2) return { err: 'Use at most one radix point.' };
    if (parts.length === 2 && o.whole) return { err: 'Whole numbers only here: remove the radix point.' };
    const ip = parts[0], fp = parts[1] || '';
    if (!ip && !fp) return { err: 'Type at least one digit.' };
    for (const ch of ip + fp) {
      const d = DIG.indexOf(ch);
      if (d < 0 || d >= r) return { err: '“' + ch + '” is not a ' + baseName(r) + ' digit. Base ' + r + ' uses ' + allowed(r) + '.' };
    }
    if (o.maxInt && ip.length > o.maxInt) return { err: 'Keep it to ' + o.maxInt + ' digits before the point for this view.' };
    if (o.maxFrac != null && fp.length > o.maxFrac) return { err: 'Keep it to ' + o.maxFrac + ' digits after the point for this view.' };
    return { neg: neg, ip: (ip || '0').split('').map((c) => DIG.indexOf(c)), fp: fp.split('').map((c) => DIG.indexOf(c)), point: parts.length === 2 };
  }
  function stripLead(ds) { let i = 0; while (i < ds.length - 1 && ds[i] === 0) i++; return ds.slice(i); }
  function stripTrail(ds) { let j = ds.length; while (j > 0 && ds[j - 1] === 0) j--; return ds.slice(0, j); }
  function ival(ds, r) { let v = 0n; const B = Bg(r); for (const d of ds) v = v * B + BigInt(d); return v; }
  function fval(ds, r) { return { num: ival(ds, r), den: Bg(r) ** BigInt(ds.length) }; }
  function toDigits(v, r) { const B = Bg(r); if (v === 0n) return [0]; const o = []; while (v > 0n) { o.unshift(Number(v % B)); v /= B; } return o; }
  function fracDigits(num, den, r, max) {
    const B = Bg(r), o = []; let k = 0;
    while (num !== 0n && k < max) { num *= B; o.push(Number(num / den)); num %= den; k++; }
    return { ds: o, exact: num === 0n };
  }
  const dstr = (ds) => ds.map((d) => DIG[d]).join('');
  function nstr(ip, fp, more) { return dstr(ip) + (fp && fp.length ? '.' + dstr(fp) : '') + (more ? '…' : ''); }
  /* Decimal text for num/den (both >= 0), at most `max` fraction digits. */
  function dec(num, den, max) {
    max = max == null ? 6 : max;
    const I = num / den; let rem = num % den;
    if (rem === 0n) return I.toString();
    let f = '', k = 0;
    while (rem !== 0n && k < max) { rem *= 10n; f += (rem / den).toString(); rem %= den; k++; }
    return I.toString() + '.' + f + (rem !== 0n ? '…' : '');
  }
  const bitsOf = (v, n) => { const o = []; for (let i = n - 1; i >= 0; i--) o.push((v >> i) & 1); return o; };
  const isPow2 = (r) => r > 1 && (r & (r - 1)) === 0;
  const log2 = (r) => Math.round(Math.log2(r));
  const fmtN = (ip, fp, r, more) => '(' + nstr(ip, fp, more) + ')' + sub(r);

  /* ---------- SVG kit ---------- */
  const f1 = (n) => Math.round(n * 10) / 10;
  const ARROWS = ['f', 'c', 'm', 'r', 'g'].map((k) => '<marker id="ah-' + k + '" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" markerUnits="strokeWidth" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="ah-' + k + '"/></marker>').join('');
  const DEFS = '<defs>' + ARROWS + '<pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="none"/><line x1="0" y1="0" x2="0" y2="7" style="stroke:var(--line2);stroke-width:2"/></pattern></defs>';
  const S = {
    svg(W, H, label, body) {
      H = Math.ceil(H);
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="' + esc(label) + '">' + DEFS + body + '</svg>';
    },
    t(x, y, s, cls, o) {
      o = o || {};
      return '<text x="' + f1(x) + '" y="' + f1(y) + '"' + (cls ? ' class="' + cls + '"' : '') + ' style="font-size:' + f1(o.fs || 13) + 'px"' +
        (o.a ? ' text-anchor="' + o.a + '"' : '') + (o.mid ? ' dominant-baseline="central"' : '') + (o.x ? ' ' + o.x : '') + '>' + esc(s) + '</text>';
    },
    l(x1, y1, x2, y2, cls, x) { return '<line x1="' + f1(x1) + '" y1="' + f1(y1) + '" x2="' + f1(x2) + '" y2="' + f1(y2) + '" class="' + cls + '"' + (x ? ' ' + x : '') + '/>'; },
    p(d, cls, x) { return '<path d="' + d + '" class="' + cls + '"' + (x ? ' ' + x : '') + '/>'; },
    r(x, y, w, h, cls, rx, x2) { return '<rect x="' + f1(x) + '" y="' + f1(y) + '" width="' + f1(Math.max(0, w)) + '" height="' + f1(Math.max(0, h)) + '" rx="' + f1(rx || 0) + '" class="' + cls + '"' + (x2 ? ' ' + x2 : '') + '/>'; },
    c(cx, cy, r, cls) { return '<circle cx="' + f1(cx) + '" cy="' + f1(cy) + '" r="' + f1(r) + '" class="' + cls + '"/>'; },
    /* A digit cell: a rounded square with the digit centred. */
    cell(x, y, s, ch, cls, o) {
      o = o || {};
      const h = o.h || s, fs = o.fs || Math.round(Math.min(s, h) * 0.5);
      return '<g class="cell ' + (cls || '') + '"' + (o.act ? ' data-act="' + o.act + '" data-v="' + esc(o.v) + '" tabindex="0" role="button" aria-label="' + esc(o.label || ch) + '"' : '') + (o.x ? ' ' + o.x : '') + '>' +
        '<rect x="' + f1(x) + '" y="' + f1(y) + '" width="' + f1(s) + '" height="' + f1(h) + '" rx="' + f1(Math.min(s, h) * 0.14) + '"/>' +
        '<text x="' + f1(x + s / 2) + '" y="' + f1(y + h / 2 + 0.5) + '" style="font-size:' + fs + 'px">' + esc(ch) + '</text></g>';
    },
    /* A digit that is 0 or 1 gets the bit style; others the plain digit style. */
    bit(x, y, s, d, extra, o) { return S.cell(x, y, s, DIG[d], (d === 1 ? 'one' : d === 0 ? 'zero' : '') + (extra ? ' ' + extra : ''), o); },
    chip(cx, cy, r, ch, cls) { return '<g class="chip ' + (cls || '') + '"><circle cx="' + f1(cx) + '" cy="' + f1(cy) + '" r="' + f1(r) + '"/><text x="' + f1(cx) + '" y="' + f1(cy + 0.5) + '" style="font-size:' + f1(r * 1.15) + 'px">' + esc(ch) + '</text></g>'; },
    lbl(x, y, s, fs, a) { return S.t(x, y, String(s).toUpperCase(), 't-lbl', { fs: fs || 11, a: a }); },
    g(cls, delay, inner, x) { return '<g' + (cls ? ' class="' + cls + '"' : '') + (delay ? ' style="--d:' + Math.round(delay) + 'ms"' : '') + (x ? ' ' + x : '') + '>' + inner + '</g>'; },
    arrow(d, cls, mk) { return '<path d="' + d + '" class="arr ' + (cls || '') + '" marker-end="url(#ah-' + (mk || 'f') + ')"/>'; },
    slot(x, y, w, h, cap, fs) {
      return S.r(x, y, w, h, 'slot', 8) + S.t(x + w / 2, y + h / 2, cap, 't-mut t-body', { a: 'middle', mid: true, fs: fs || 13 });
    },
  };
  /* Font size that fits text into a width. */
  const fit = (str, w, fs, k) => Math.min(fs, w / (Math.max(1, String(str).length) * (k || 0.62)));
  const lblFs = (W) => clamp(W / 64, 10.5, 13);
  /* Entrance animation only when the step has just changed. */
  const nw = (c, cond) => (c.anim && (cond === undefined || cond) ? 'new' : '');
  /* Wrap a list of tokens into lines no wider than maxChars. */
  function wrap(tokens, maxChars) {
    const lines = []; let cur = '';
    tokens.forEach((t) => { if (cur && (cur + t).length > maxChars) { lines.push(cur.trimEnd()); cur = t.trimStart(); } else cur += t; });
    if (cur) lines.push(cur.trimEnd());
    return lines;
  }

  /* Positional expansion: digits, weights, products, sum. Shared by two topics.
     P: { r, ip, fp, ext: [products text], total, result, four } ; level 0..4. */
  function placeModel(r, ip, fp) {
    const digs = [];
    ip.forEach((d, i) => digs.push({ d: d, k: ip.length - 1 - i }));
    fp.forEach((d, i) => digs.push({ d: d, k: -(i + 1) }));
    const R = Bg(r);
    const weights = digs.map((g) => (g.k >= 0 ? { big: r + sup(g.k), small: (R ** BigInt(g.k)).toString() } : { big: r + sup('-' + -g.k), small: '1/' + (R ** BigInt(-g.k)).toString() }));
    const prods = digs.map((g) => {
      if (g.k >= 0) return (BigInt(g.d) * R ** BigInt(g.k)).toString();
      return dec(BigInt(g.d), R ** BigInt(-g.k), 10);
    });
    const I = ival(ip, r), F = fval(fp, r);
    const total = dec(I * F.den + F.num, F.den, 10);
    return { r: r, ip: ip, fp: fp, digs: digs, weights: weights, prods: prods, I: I, F: F, total: total };
  }
  function drawPlace(c, P, level, y0) {
    const W = c.W, n = P.digs.length, hasPt = P.fp.length > 0, fl = lblFs(W);
    const ptW = hasPt ? 16 : 0;
    const s = Math.floor(clamp((W - 54 - ptW) / (n * 1.18), 22, Math.min(76, (c.H - (P.four ? 230 : 150)) / (P.four ? 6.6 : 4.4))));
    const gap = Math.round(s * 0.18), rowW = n * s + (n - 1) * gap + ptW;
    const x0 = Math.max(16, Math.round((W - rowW - 22) / 2));
    const xs = P.digs.map((g, i) => x0 + i * (s + gap) + (hasPt && i >= P.ip.length ? ptW : 0));
    let o = '', y = (y0 || 0) + 26;
    o += S.lbl(x0, y, 'Position', fl); y += 8;
    const fsI = clamp(s * 0.3, 11, 17);
    P.digs.forEach((g, i) => { o += S.t(xs[i] + s / 2, y + fsI, minus(g.k), 't-mut', { a: 'middle', fs: fsI }); });
    y += fsI + 9;
    P.digs.forEach((g, i) => { o += P.r === 2 ? S.bit(xs[i], y, s, g.d) : S.cell(xs[i], y, s, DIG[g.d], ''); });
    if (hasPt) o += S.c(x0 + P.ip.length * (s + gap) - gap / 2 + ptW / 2, y + s * 0.84, Math.max(2.6, s * 0.07), 'ptd');
    o += S.t(xs[n - 1] + s + 6, y + s * 0.95, sub(P.r), 't-mut', { fs: clamp(s * 0.36, 12, 20) });
    y += s + 18;
    const fsW = clamp(s * 0.34, 11, 21);
    if (level >= 1) {
      let g = S.lbl(x0, y, 'Weight', fl); y += 10;
      P.digs.forEach((d, i) => {
        const w = P.weights[i];
        g += S.t(xs[i] + s / 2, y + fsW, w.big, 't-acc', { a: 'middle', fs: fit(w.big, s + gap, fsW) });
        g += S.t(xs[i] + s / 2, y + fsW * 2.15, w.small, 't-mut', { a: 'middle', fs: fit(w.small, s + gap - 2, fsW * 0.8) });
      });
      o += S.g(nw(c, level === 1), 0, g); y += fsW * 2.15 + 22;
    }
    if (level >= 2) {
      let g = S.lbl(x0, y, 'Digit × weight', fl); y += 10;
      P.digs.forEach((d, i) => {
        const v = P.prods[i];
        g += S.g(nw(c, level === 2), i * 70, S.t(xs[i] + s / 2, y + fsW, v, d.d ? '' : 't-mut', { a: 'middle', fs: fit(v, s + gap - 2, fsW) }));
      });
      o += g; y += fsW + 24;
    }
    if (level >= 3) {
      let g = S.lbl(x0, y, 'Add the products', fl); y += 8;
      const nz = P.digs.map((d, i) => i).filter((i) => P.digs[i].d);
      const fsE = clamp(s * 0.34, 12, 20), cw = fsE * 0.6, maxC = Math.max(16, Math.floor((W - 2 * x0 + 0) / cw));
      const toks = (nz.length ? nz.map((i, j) => (j ? ' + ' : '') + P.prods[i]) : ['0']).concat([' = ' + P.total]);
      const lines = wrap(toks, Math.max(maxC, 18));
      lines.forEach((ln, i) => { g += S.t(x0, y + fsE * 1.25 * (i + 1), ln, i === lines.length - 1 ? 't-b' : '', { fs: fsE }); });
      y += fsE * 1.25 * lines.length + 14;
      /* contribution bar, to scale */
      const bw = Math.max(rowW, Math.min(W - 2 * x0, 560)), bh = clamp(s * 0.55, 18, 34);
      const tot = Number(P.I) + Number(P.F.num) / Number(P.F.den);
      let bx = x0; const cols = ['r', 'y', 'b'];
      if (tot > 0) {
        nz.forEach((i, j) => {
          const v = Number(P.prods[i].replace('…', '')), w = Math.max(2, (v / tot) * bw);
          g += S.r(bx, y, w, bh, 'bar ' + cols[j % 3], 0);
          if (w > fsE * 0.6 * P.prods[i].length + 8) g += S.t(bx + w / 2, y + bh / 2, P.prods[i], '', { a: 'middle', mid: true, fs: clamp(bh * 0.5, 10, 15) });
          bx += w;
        });
      } else g += S.r(bx, y, bw, bh, 'bar m', 0);
      g += S.t(x0, y + bh + 15, '0', 't-mut', { fs: 11 }) + S.t(x0 + bw, y + bh + 15, P.total, 't-mut', { a: 'end', fs: 11 });
      y += bh + 26;
      const res = fmtN(P.ip, P.fp, P.r) + ' = (' + P.total + ')' + sub(10), rfs = fit(res, W - 2 * x0, clamp(s * 0.62, 20, 40), 0.6);
      g += S.t(x0, y + rfs * 0.85, res, 't-disp', { fs: rfs });
      y += rfs + 22;
      o += S.g(nw(c, level === 3), 0, g, level === 3 ? 'data-focus="1"' : '');
    }
    if (level >= 4 && P.four) {
      let g = S.lbl(x0, y, 'The same value in four systems', fl); y += 10;
      const rh = clamp(s * 0.62, 26, 40), fs = clamp(rh * 0.5, 12, 19);
      P.four.forEach((row, i) => {
        const yy = y + i * (rh + 6), on = row.r === P.r;
        if (on) g += S.r(x0 - 6, yy - 2, Math.min(W - 2 * x0 + 12, 640), rh + 4, 'halo', 6);
        g += S.t(x0, yy + rh / 2, row.name, 't-lbl', { mid: true, fs: fl });
        const txt = row.text + sub(row.r);
        g += S.t(x0 + 92, yy + rh / 2, txt, on ? 't-b' : '', { mid: true, fs: fit(txt, W - x0 - 100, fs) });
      });
      y += P.four.length * (rh + 6) + 6;
      o += S.g(nw(c), 0, g, 'data-focus="1"');
    }
    return { o: o, y: y };
  }

  /* ---------- control widgets ---------- */
  const C = {
    seg(key, label, opts, cur) {
      return '<div class="fld"><span class="fl">' + esc(label) + '</span><div class="sg" role="group" aria-label="' + esc(label) + '">' +
        opts.map((op) => '<button type="button" data-k="' + key + '" data-v="' + esc(op[0]) + '" aria-pressed="' + (String(op[0]) === String(cur)) + '">' + esc(op[1]) + '</button>').join('') + '</div></div>';
    },
    input(key, label, val, w, mode) {
      return '<label class="fld" for="in-' + key + '"><span class="fl">' + esc(label) + '</span><input type="text" id="in-' + key + '" data-k="' + key + '" value="' + esc(val) + '" style="width:' + (w || 12) + 'ch" autocomplete="off" autocapitalize="characters" spellcheck="false"' + (mode ? ' inputmode="' + mode + '"' : '') + '></label>';
    },
    select(key, label, opts, cur) {
      return '<label class="fld" for="in-' + key + '"><span class="fl">' + esc(label) + '</span><select id="in-' + key + '" data-k="' + key + '">' +
        opts.map((op) => '<option value="' + esc(op[0]) + '"' + (String(op[0]) === String(cur) ? ' selected' : '') + '>' + esc(op[1]) + '</option>').join('') + '</select></label>';
    },
    range(key, label, min, max, step, val) {
      return '<label class="fld" for="in-' + key + '"><span class="fl">' + esc(label) + '</span><input type="range" id="in-' + key + '" data-k="' + key + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + val + '"></label>';
    },
  };

  /* ---------- the page ---------- */
  const topics = [];
  function register(t) { topics.push(t); }

  function start() {
    const $ = (s) => document.querySelector(s);
    const app = $('#app'), topicsEl = $('#topics'), stepsEl = $('#steps'), ctrlsEl = $('#ctrls'), errEl = $('#ctrlErr');
    const stage = $('#stage'), vz = $('#vz'), walkText = $('#walkText');
    const prevB = $('#prev'), nextB = $('#next'), playB = $('#play'), firstB = $('#first'), lastB = $('#last'), rndB = $('#rnd');
    const plateEl = $('#plate'), detailEl = $('#detail'), principleEl = $('#principle'), slipsEl = $('#slips'), stepCount = $('#stepCount');
    const kickEl = $('#tKick'), progEl = $('#progBar');
    const cFig = $('#cFig'), cTitle = $('#cTitle'), cRead = $('#cRead');   /* the figure card's corners */
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let ti = -1, k = 0, playing = false, playT = null, raf = 0, drawnK = -1, drawnT = -1, lastW = 0, lastH = 0;

    topics.forEach((t) => { t.st = t.init(); });
    const topicCount = $('#topH span');
    if (topicCount) topicCount.textContent = topics.length + (topics.length === 1 ? ' topic' : ' topics');
    const T = () => topics[ti];
    const steps = () => (T().m && T().m.steps) || [];
    const phone = () => window.innerWidth < 760;

    topicsEl.innerHTML = topics.map((t, i) => '<button type="button" class="mbtn" data-i="' + i + '" aria-current="false"><span class="ico"><svg viewBox="0 0 44 44" aria-hidden="true">' + t.icon + '</svg></span><span class="mtxt"><b>' + esc(t.short) + '</b><span>' + pad2(i + 1) + ' · ' + esc(t.kind) + '</span></span></button>').join('');
    topicsEl.addEventListener('click', (e) => { const b = e.target.closest('.mbtn'); if (b) setTopic(+b.dataset.i); });

    function setTopic(i, first) {
      if (i === ti) return;
      stop();
      ti = i; k = 0;
      const t = T();
      topicsEl.querySelectorAll('.mbtn').forEach((b) => b.setAttribute('aria-current', String(+b.dataset.i === i)));
      $('#tName').textContent = t.name;
      $('#tSub').textContent = t.sub;
      if (kickEl) kickEl.textContent = 'Topic ' + pad2(i + 1) + ' of ' + pad2(topics.length) + ' · ' + t.kind;
      if (cFig) cFig.textContent = 'Fig ' + (i + 1);
      if (cTitle) cTitle.textContent = t.short;
      principleEl.innerHTML = '<h2 class="eyebrow">The idea</h2><p>' + esc(t.principle) + '</p><div class="formulas">' + t.formulas.map((f) => '<div class="formula">' + esc(f) + '</div>').join('') + '</div>';
      slipsEl.innerHTML = '<h2 class="eyebrow">Common slips</h2><ul class="slips">' + t.slips.map((s) => '<li>' + esc(s) + '</li>').join('') + '</ul>';
      renderControls(); recompute(); renderAll();
      stage.scrollTop = 0;
      try { history.replaceState(null, '', '#' + t.id); } catch (e) { /* the address is only a convenience */ }
      if (!first && phone()) {
        const b = topicsEl.querySelector('[aria-current="true"]');
        if (b) topicsEl.scrollTo({ left: b.offsetLeft - 8, behavior: reduce ? 'auto' : 'smooth' });
      }
    }
    function recompute() {
      const t = T();
      try { t.m = t.compute(t.st); } catch (err) { console.error(err); t.m = { err: 'This input could not be worked: ' + err.message }; }
      if (t.m && t.m.steps && k > t.m.steps.length - 1) k = t.m.steps.length - 1;
      if (k < 0) k = 0;
    }
    function renderControls() { ctrlsEl.innerHTML = T().controls(T().st); markErr(); }
    function markErr() {
      const m = T().m, bad = !!(m && m.err);
      errEl.textContent = bad ? m.err : ''; errEl.hidden = !bad;
      ctrlsEl.querySelectorAll('input[type="text"]').forEach((el) => el.setAttribute('aria-invalid', String(bad && (!m.errKey || m.errKey === el.dataset.k))));
    }
    function renderAll() { renderSteps(); renderWalk(); renderPlate(); renderDetail(); markErr(); draw(); }
    function renderSteps() {
      const st = steps();
      stepCount.textContent = st.length ? st.length + (st.length === 1 ? ' step' : ' steps') : '';
      stepsEl.innerHTML = st.map((s, i) => '<li' + (i < k ? ' class="done"' : '') + '><button type="button" data-i="' + i + '" aria-pressed="' + (i === k) + '"><span class="num">' + pad2(i + 1) + '</span><span>' + esc(s.t) + '</span></button></li>').join('');
    }
    function markSteps() {
      stepsEl.querySelectorAll('button').forEach((b) => { const i = +b.dataset.i; b.setAttribute('aria-pressed', String(i === k)); b.parentNode.classList.toggle('done', i < k); });
    }
    stepsEl.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { stop(); go(+b.dataset.i); } });
    function renderWalk() {
      const m = T().m, st = steps(), cust = m && m.counter;
      if (progEl) progEl.style.width = !st.length ? '0%' : cust ? '100%' : ((k + 1) / st.length * 100).toFixed(2) + '%';
      if (cRead) cRead.textContent = !st.length ? 'Waiting for a valid input' : cust ? cust.label : 'Step ' + pad2(k + 1) + ' / ' + pad2(st.length);
      if (!st.length) {
        walkText.innerHTML = '<b>No steps</b>Fix the input above';
        prevB.disabled = nextB.disabled = playB.disabled = true; lastB.hidden = firstB.hidden = false;
        return;
      }
      playB.disabled = false; firstB.hidden = lastB.hidden = !!cust;
      const s = st[k];
      walkText.innerHTML = cust ? '<b>' + esc(cust.label) + '</b>' + esc(cust.text) : '<b>Step ' + pad2(k + 1) + ' of ' + pad2(st.length) + '</b>' + esc(s.t);
      prevB.textContent = cust ? cust.prev : 'Previous';
      nextB.textContent = cust ? cust.next : 'Next';
      prevB.disabled = !cust && k === 0;
      nextB.disabled = !cust && k === st.length - 1;
      setPlay();
    }
    function setPlay() {
      playB.setAttribute('aria-pressed', String(playing));
      const live = isLive();
      playB.textContent = playing ? 'Pause' : live ? (T().m.liveLabel || 'Run') : 'Play';
    }
    function renderPlate() {
      const t = T(), m = t.m;
      const rows = m && !m.err ? (typeof m.plate === 'function' ? m.plate(k) : m.plate) || [] : [['Status', 'Waiting for a valid input']];
      plateEl.innerHTML = '<h2>' + esc(t.short) + '</h2><dl>' + rows.map((r) => '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd>').join('') + '</dl><p class="ex">' + esc((m && m.plateNote) || 'Values for the example on the board') + '</p>';
    }
    function renderDetail() {
      const t = T(), m = t.m, st = steps();
      if (!m || m.err || !st.length) {
        detailEl.innerHTML = '<h2 class="eyebrow">Step</h2><h3>Check the input</h3><p>' + esc(m && m.err ? m.err : '') + '</p>';
        return;
      }
      const s = st[k];
      detailEl.innerHTML = '<h2 class="eyebrow">' + (m.counter ? 'Counting' : 'Step ' + pad2(k + 1) + ' of ' + pad2(st.length)) + '<span>' + esc(t.short) + '</span></h2><h3>' + esc(s.t) + '</h3><p>' + esc(s.d).replace(/⊕/g, '<span class="mono">⊕</span>') + '</p>' +
        (s.look ? '<dl><div><dt>Look for</dt><dd>' + esc(s.look) + '</dd></div></dl>' : '') + (m.extra ? m.extra(k) : '');
    }
    function size() {
      const W = Math.max(288, Math.floor(stage.clientWidth));
      const H = phone() ? Math.round(clamp(window.innerHeight * 0.66, 400, 640)) : Math.max(320, stage.clientHeight - 2);
      return { W: W, H: H };
    }
    function draw(noAnim) {
      const t = T(), m = t.m, sz = size();
      lastW = sz.W; lastH = sz.H;
      if (!m || m.err) { vz.innerHTML = '<p class="vz-msg">' + esc(m ? m.err : '') + '</p>'; drawnK = -1; return; }
      const anim = !noAnim && !reduce && (k !== drawnK || ti !== drawnT);
      let svg;
      try { svg = t.draw({ W: sz.W, H: sz.H, m: m, k: k, st: t.st, anim: anim }); }
      catch (err) { console.error(err); vz.innerHTML = '<p class="vz-msg">This step could not be drawn: ' + esc(err.message) + '</p>'; return; }
      vz.innerHTML = svg;
      drawnK = k; drawnT = ti;
      if (anim && !phone()) {
        const f = vz.querySelector('[data-focus]');
        if (f) {
          const r = f.getBoundingClientRect(), s = stage.getBoundingClientRect();
          if (r.bottom > s.bottom - 8) stage.scrollTop += Math.min(r.bottom - s.bottom + 24, r.top - s.top - 12);
          else if (r.top < s.top) stage.scrollTop -= s.top - r.top + 16;
        }
      }
    }
    function go(i) {
      const n = steps().length;
      if (!n) return;
      k = clamp(i, 0, n - 1);
      markSteps(); renderWalk(); renderPlate(); renderDetail(); draw();
    }
    function bump(dir) {
      const t = T();
      if (t.m && t.m.counter) { t.bump(t.st, dir); recompute(); renderWalk(); renderPlate(); renderDetail(); draw(true); return; }
      go(k + dir);
    }
    prevB.addEventListener('click', () => { stop(); bump(-1); });
    nextB.addEventListener('click', () => { stop(); bump(1); });
    firstB.addEventListener('click', () => { stop(); go(0); });
    lastB.addEventListener('click', () => { stop(); go(steps().length - 1); });
    rndB.addEventListener('click', () => { stop(); const t = T(); t.random(t.st); renderControls(); recompute(); k = t.m && t.m.keepStep ? k : 0; renderAll(); stage.scrollTop = 0; });

    function isLive() { const m = T().m; return !!(m && !m.err && m.live && m.live(k)); }
    function stop() {
      playing = false; clearInterval(playT); cancelAnimationFrame(raf); playT = null;
      if (ti >= 0) setPlay();
    }
    function play() {
      if (playing) { stop(); return; }
      if (!steps().length) return;
      playing = true; setPlay();
      if (isLive()) {
        let last = performance.now();
        const tick = (now) => {
          if (!playing) return;
          const dt = Math.min(0.1, (now - last) / 1000); last = now;
          const t = T(), r = t.frame(t.st, t.m, dt, k);
          if (r === 'draw') { recompute(); renderWalk(); renderPlate(); renderDetail(); draw(true); }
          else if (r === 'patch') { t.patch(vz, t.st, t.m, k); renderPlate(); }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } else {
        if (k >= steps().length - 1) go(0);
        playT = setInterval(() => { if (k >= steps().length - 1) { stop(); return; } go(k + 1); }, reduce ? 2800 : 2100);
      }
    }
    playB.addEventListener('click', play);

    /* controls */
    ctrlsEl.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-k]');
      if (!b) return;
      const t = T(); stop();
      set(t, b.dataset.k, b.dataset.v);
      renderControls(); recompute(); if (!(t.m && t.m.keepStep)) k = 0; renderAll(); stage.scrollTop = 0;
    });
    let inT = null;
    ctrlsEl.addEventListener('input', (e) => {
      const el = e.target.closest('input[data-k]');
      if (!el) return;
      const t = T();
      set(t, el.dataset.k, el.value);
      if (el.type === 'range') { recompute(); renderDetail(); draw(true); return; }
      clearTimeout(inT);
      inT = setTimeout(() => { stop(); recompute(); k = 0; renderAll(); }, 180);
    });
    ctrlsEl.addEventListener('change', (e) => {
      const el = e.target.closest('select[data-k]');
      if (!el) return;
      const t = T(); stop();
      set(t, el.dataset.k, el.value);
      renderControls(); recompute(); k = 0; renderAll(); stage.scrollTop = 0;
    });
    ctrlsEl.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('input[type="text"]')) { e.preventDefault(); e.target.blur(); } });
    function set(t, key, v) { if (t.set && t.set(t.st, key, v)) return; t.st[key] = /^-?\d+$/.test(v) ? Number(v) : v; }

    /* clicks on the drawing (bits, wheel sectors) */
    function act(target) {
      const a = target.closest('[data-act]');
      if (!a) return;
      const t = T();
      if (t.act && t.act(t.st, t.m, a.dataset.act, a.dataset.v)) { stop(); renderControls(); recompute(); renderAll(); }
    }
    vz.addEventListener('click', (e) => act(e.target));
    vz.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { if (e.target.closest('[data-act]')) { e.preventDefault(); act(e.target); } } });

    document.addEventListener('keydown', (e) => {
      if (e.target.closest('input, select, textarea, [data-act]') || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); stop(); bump(1); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); stop(); bump(-1); }
      else if (e.key === 'Home') { stop(); go(0); }
      else if (e.key === 'End') { stop(); go(steps().length - 1); }
    });

    /* focus view and full screen, as on the Machines page */
    const focusBtn = $('#focusBtn'), fsBtn = $('#fsBtn'), board = $('#board');
    function setFocus(on) {
      app.classList.toggle('focus', on);
      focusBtn.setAttribute('aria-pressed', String(on));
      focusBtn.textContent = on ? 'Show panels' : 'Focus view';
      try { localStorage.setItem('electrica-digital-focus', on ? '1' : '0'); } catch (e) { /* optional */ }
    }
    focusBtn.addEventListener('click', () => setFocus(!app.classList.contains('focus')));
    try { if (localStorage.getItem('electrica-digital-focus') === '1' && !phone()) setFocus(true); } catch (e) { /* ignore */ }
    if (document.fullscreenEnabled && board.requestFullscreen) {
      fsBtn.hidden = false;
      fsBtn.addEventListener('click', () => {
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        else board.requestFullscreen().catch(() => {});
      });
      document.addEventListener('fullscreenchange', () => { fsBtn.textContent = document.fullscreenElement ? 'Exit full screen' : 'Full screen'; });
    }

    /* redraw when the board changes size */
    let rq = 0;
    new ResizeObserver(() => {
      if (rq) return;
      rq = requestAnimationFrame(() => {
        rq = 0;
        if (ti < 0) return;
        const sz = size();
        if (sz.W !== lastW || (!phone() && Math.abs(sz.H - lastH) > 4)) draw(true);
      });
    }).observe(stage);

    const fromHash = topics.findIndex((t) => '#' + t.id === location.hash);
    setTopic(fromHash >= 0 ? fromHash : 0, true);
  }

  return {
    register: register, start: start, _topics: topics, DIG: DIG, sub: sub, sup: sup, esc: esc, clamp: clamp, pad2: pad2, minus: minus, baseName: baseName,
    parse: parse, stripLead: stripLead, stripTrail: stripTrail, ival: ival, fval: fval, toDigits: toDigits, fracDigits: fracDigits,
    dstr: dstr, nstr: nstr, dec: dec, bitsOf: bitsOf, isPow2: isPow2, log2: log2, fmtN: fmtN,
    S: S, C: C, fit: fit, lblFs: lblFs, nw: nw, wrap: wrap, placeModel: placeModel, drawPlace: drawPlace,
  };
})();
