/* ===================== 05 · Signed and unsigned numbers ===================== */
(function () {
  const { S, C, clamp, nw, lblFs, fit, minus } = ND;
  const REPS = ['Unsigned', 'Sign-magnitude', '1’s complement', '2’s complement'];
  const fmt = (v) => (v === 0 && 1 / v < 0 ? '−0' : v > 0 ? '+' + v : minus(String(v)));
  function vals(P, n) {
    const msb = (P >> (n - 1)) & 1, H = 1 << (n - 1), F = 1 << n;
    return [P, msb ? -(P - H) : P, msb ? -(F - 1 - P) : P, msb ? P - F : P];
  }
  const ranges = (n) => { const H = 1 << (n - 1); return [[0, (1 << n) - 1], [-(H - 1), H - 1], [-(H - 1), H - 1], [-H, H - 1]]; };
  function arc(cx, cy, r0, r1, a0, a1) {
    const p = (r, a) => (cx + r * Math.cos(a)).toFixed(1) + ' ' + (cy + r * Math.sin(a)).toFixed(1);
    return 'M' + p(r1, a0) + ' A' + r1 + ' ' + r1 + ' 0 0 1 ' + p(r1, a1) + ' L' + p(r0, a1) + ' A' + r0 + ' ' + r0 + ' 0 0 0 ' + p(r0, a0) + ' Z';
  }

  function compute(st) {
    const n = st.n, raw = String(st.pat).trim().replace(/\s/g, '');
    if (!/^[01]+$/.test(raw)) return { err: 'Type the word as 0s and 1s, for example 1011.', errKey: 'pat' };
    if (raw.length > n) return { err: 'That is ' + raw.length + ' bits; this view uses ' + n + '. Choose 8 bits or shorten the word.', errKey: 'pat' };
    const bits = raw.padStart(n, '0').split('').map(Number), P = parseInt(bits.join(''), 2);
    const v = vals(P, n), H = 1 << (n - 1), F = 1 << n, msb = bits[0], b = bits.join('');
    const mag = bits.slice(1).join(''), flip = bits.map((x) => 1 - x).join('');
    const terms = (first) => { const t = []; bits.forEach((x, i) => { if (!x) return; t.push(i === 0 ? first : String(1 << (n - 1 - i))); }); return t.length ? t.join(' + ').replace('+ −', '− ') : '0'; };
    const expl = [
      terms(String(H)) + ' = ' + v[0],
      (msb ? '−(' : '+(') + (bits.slice(1).some((x) => x) ? bits.slice(1).map((x, i) => (x ? 1 << (n - 2 - i) : 0)).filter((x) => x).join(' + ') : '0') + ') = ' + fmt(v[1]),
      msb ? 'flip ' + b + ' → ' + flip + ' = ' + (F - 1 - P) + ', so ' + fmt(v[2]) : terms(String(H)) + ' = ' + fmt(v[2]),
      terms('−' + H) + ' = ' + fmt(v[3]),
    ];
    const rg = ranges(n), wheel = n === 4;
    const steps = [
      { t: 'Unsigned: every bit is magnitude', d: 'All ' + n + ' bits count towards the size, with weights ' + Array.from({ length: n }, (_, i) => 1 << (n - 1 - i)).join(', ') + '. ' + b + ' = ' + v[0] + '. The range is 0 to ' + (F - 1) + '.' },
      { t: 'Sign-magnitude: the MSB is the sign', d: 'The leftmost bit is the sign, 0 for + and 1 for −, and the other ' + (n - 1) + ' bits are the size. ' + b + ' is ' + fmt(v[1]) + '. The range is −' + (H - 1) + ' to +' + (H - 1) + ', and there are two zeros: ' + '0'.repeat(n) + ' and 1' + '0'.repeat(n - 1) + '.', look: 'The red outline marks the sign bit.' },
      { t: '1’s complement: flip to negate', d: 'Positive numbers look the same as unsigned. A negative number is its magnitude with every bit flipped. ' + (msb ? b + ' starts with 1, so flip it: ' + flip + ' = ' + (F - 1 - P) + ', and the value is ' + fmt(v[2]) + '.' : b + ' starts with 0, so it is simply ' + fmt(v[2]) + '.') + ' There are still two zeros: ' + '0'.repeat(n) + ' and ' + '1'.repeat(n) + '.' },
      { t: '2’s complement: the MSB weighs −' + H, d: 'A negative number is the 2’s complement of its magnitude. Read directly, the MSB weighs −' + H + ' and the others weigh as usual: ' + expl[3] + '. The range is −' + H + ' to +' + (H - 1) + ' with a single zero, which is why processors use it.' },
      { t: 'Where the count wraps round', d: (wheel ? 'Adding 1 moves one place clockwise round the wheel. ' : 'Adding 1 moves one place up the list. ') + 'Unsigned numbers wrap from ' + '1'.repeat(n) + ' (' + (F - 1) + ') to ' + '0'.repeat(n) + ' (0) with a carry out. In 2’s complement the dangerous edge is from 0' + '1'.repeat(n - 1) + ' (+' + (H - 1) + ') to 1' + '0'.repeat(n - 1) + ' (−' + H + '): a result that crosses it has overflowed.' },
    ];
    return {
      n: n, bits: bits, P: P, v: v, expl: expl, rg: rg, wheel: wheel, steps: steps,
      plate: (k) => {
        const rep = Math.min(k, 3) === 3 || k === 4 ? 3 : k;
        return [['Word', b], ['Bits', String(n)], ['Reading', REPS[rep]], ['Value', fmt(v[rep])], ['Range', minus(rg[rep][0]) + ' to ' + (rep ? '+' : '') + rg[rep][1]], ['Zeros', rep === 1 || rep === 2 ? 'two (+0 and −0)' : 'one']];
      },
    };
  }

  ND.register({
    id: 'signed', short: 'Signed numbers', kind: 'Unsigned, SM, 1’s, 2’s',
    name: 'Signed and unsigned binary numbers', sub: 'One word, four ways to read it',
    icon: '<circle cx="22" cy="22" r="16"/><circle cx="22" cy="22" r="7"/><path d="M22 6v6M22 32v6M6 22h6M32 22h6"/>',
    principle: 'An unsigned n-bit number uses every bit for size: 0 to 2ⁿ − 1. A signed number gives up the most significant bit to show the sign, 0 for positive and 1 for negative. Sign-magnitude keeps the size in the remaining bits. 1’s and 2’s complement store a negative number as the complement of its size. Only 2’s complement has a single zero and needs no correction when adding, which is why almost every processor uses it.',
    formulas: ['Unsigned: 0 to 2ⁿ − 1', 'Sign-magnitude, 1’s: −(2ⁿ⁻¹ − 1) to +(2ⁿ⁻¹ − 1)', '2’s: −2ⁿ⁻¹ to +(2ⁿ⁻¹ − 1)', '2’s value = −bₙ₋₁·2ⁿ⁻¹ + Σ bᵢ·2ⁱ'],
    slips: [
      'The same bits mean different numbers. Always say which representation you are using.',
      '1000 is −8 in 4-bit 2’s complement, −7 in 1’s complement and −0 in sign-magnitude.',
      'The sign bit is part of the word: keep the leading 0 of a positive number.',
    ],
    init: () => ({ n: 4, pat: '1011' }),
    set(st, key, v) {
      if (key === 'n') {
        const n = Number(v), raw = String(st.pat).replace(/\s/g, '');
        if (/^[01]+$/.test(raw)) {
          const w = raw.padStart(st.n, '0');
          st.pat = n > st.n ? w[0].repeat(n - st.n) + w : w.slice(w.length - n);
        }
        st.n = n; return true;
      }
      return false;
    },
    controls: (st) => C.seg('n', 'Word length', [[4, '4 bits'], [8, '8 bits']], st.n) + C.input('pat', 'Bits', st.pat, 11, 'numeric'),
    random(st) { let s = ''; for (let i = 0; i < st.n; i++) s += Math.random() < 0.5 ? '0' : '1'; if (Math.random() < 0.7) s = '1' + s.slice(1); st.pat = s; },
    act(st, m, a, v) {
      if (m.err) return false;
      if (a === 'bit') { const b = m.bits.slice(); b[st.n - 1 - +v] ^= 1; st.pat = b.join(''); return true; }
      if (a === 'pat') { st.pat = v; return true; }
      return false;
    },
    compute: compute,
    draw(c) {
      const W = c.W, H = c.H, m = c.m, k = c.k, n = m.n, fl = lblFs(W), rep = k >= 3 ? 3 : k;
      const wide = W >= 760 && m.wheel;
      const R = m.wheel ? Math.floor(clamp(wide ? Math.min((W - 60) * 0.4, (H - 60) / 2) : Math.min((W - 60) / 2, 190), 120, 230)) : 0;
      const colW = wide ? W - 2 * R - 90 : W - 36, x0 = 18;
      const s = Math.floor(clamp(colW / (n * 1.2), 24, Math.min(64, H / 8.5))), gap = Math.round(s * 0.2);
      let o = '', y = 24;
      o += S.lbl(x0, y, n + '-bit word · tap a bit to flip it', fl);
      y += 26;
      m.bits.forEach((b, i) => {
        o += S.bit(x0 + i * (s + gap), y, s, b, i === 0 && rep > 0 ? 'sgn' : '', { act: 'bit', v: n - 1 - i, label: 'Bit ' + (n - 1 - i) + ' is ' + b + '. Press to flip.' });
      });
      if (rep > 0) o += S.t(x0 + s / 2, y - 7, 'sign', 't-bad', { a: 'middle', fs: 11 });
      y += s + 6;
      const H2 = 1 << (n - 1);
      const wts = m.bits.map((b, i) => (i === 0 ? [String(H2), '±', '−' + (H2 - 1), '−' + H2][rep] : String(1 << (n - 1 - i))));
      wts.forEach((w, i) => { o += S.g(nw(c), i * 40, S.t(x0 + i * (s + gap) + s / 2, y + 13, w, i === 0 && rep > 0 ? 't-bad t-b' : 't-mut', { a: 'middle', fs: fit(w, s + gap, 13) })); });
      y += 26;
      const line = m.expl[rep];
      const lfs = fit(line, colW, clamp(s * 0.5, 18, 30), 0.5);
      o += S.g(nw(c), 120, S.t(x0, y + lfs, line, 't-disp', { fs: lfs }));
      y += lfs + 32;

      const drawWheel = (cx, cy) => {
        let g = '';
        const N = 1 << n, da = (2 * Math.PI) / N, a0 = -Math.PI / 2 - da / 2;
        for (let p = 0; p < N; p++) {
          const a = a0 + p * da, vv = vals(p, n)[rep], on = p === m.P, zr = vv === 0, neg = vv < 0 || (vv === 0 && 1 / vv < 0);
          const cls = on ? 'on' : zr ? 'zr' : neg ? 'neg' : '';
          g += '<g data-act="pat" data-v="' + p.toString(2).padStart(n, '0') + '" role="button" tabindex="0" aria-label="Pick ' + p.toString(2).padStart(n, '0') + '">';
          g += S.p(arc(cx, cy, R * 0.6, R, a + 0.004, a + da - 0.004), 'sec ' + cls) + S.p(arc(cx, cy, R * 0.34, R * 0.59, a + 0.004, a + da - 0.004), 'sec ' + cls);
          const am = a + da / 2;
          g += S.t(cx + R * 0.8 * Math.cos(am), cy + R * 0.8 * Math.sin(am), p.toString(2).padStart(n, '0'), on ? 't-on' : '', { a: 'middle', mid: true, fs: R * 0.088 });
          g += S.t(cx + R * 0.465 * Math.cos(am), cy + R * 0.465 * Math.sin(am), fmt(vv), on ? 't-on' : neg ? 't-bad' : '', { a: 'middle', mid: true, fs: R * 0.085 });
          g += '</g>';
        }
        g += S.c(cx, cy, R * 0.32, 'hub');
        g += S.t(cx, cy - R * 0.03, fmt(m.v[rep]), 't-disp', { a: 'middle', mid: true, fs: R * 0.2 });
        g += S.t(cx, cy + R * 0.16, ['UNSIGNED', 'SIGN-MAG', '1’S COMP', '2’S COMP'][rep], 't-lbl', { a: 'middle', mid: true, fs: R * 0.055 });
        const am = a0 + m.P * da + da / 2;
        g += S.p('M' + (cx + (R + 4) * Math.cos(am)).toFixed(1) + ' ' + (cy + (R + 4) * Math.sin(am)).toFixed(1) + ' L' + (cx + (R + 18) * Math.cos(am + 0.07)).toFixed(1) + ' ' + (cy + (R + 18) * Math.sin(am + 0.07)).toFixed(1) + ' L' + (cx + (R + 18) * Math.cos(am - 0.07)).toFixed(1) + ' ' + (cy + (R + 18) * Math.sin(am - 0.07)).toFixed(1) + ' Z', 'mark');
        const edge = (p, cls, txt) => {
          const a = a0 + p * da, x1 = cx + (R - 2) * Math.cos(a), y1 = cy + (R - 2) * Math.sin(a), x2 = cx + (R + 22) * Math.cos(a), y2 = cy + (R + 22) * Math.sin(a);
          const tx = cx + (R + 30) * Math.cos(a), ty = cy + (R + 30) * Math.sin(a);
          return '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" style="stroke:' + (cls === 'c' ? 'var(--copper)' : 'var(--phR)') + ';stroke-width:3;stroke-linecap:round"/>' +
            S.t(tx, ty, txt, cls === 'c' ? 't-acc t-b' : 't-bad t-b', { a: Math.cos(a) > 0.2 ? 'start' : Math.cos(a) < -0.2 ? 'end' : 'middle', mid: true, fs: 12 });
        };
        if (k === 0 || k === 4) g += edge(0, 'c', 'carry');
        if (k >= 1) g += edge(H2, 'r', k === 4 ? 'overflow' : 'sign flips');
        return g;
      };
      let yW = 0;
      if (m.wheel && !wide) { const cy = y + R + 18; o += S.g(nw(c), 0, drawWheel(W / 2, cy)); y = cy + R + 34; }
      else if (wide) { const cy = Math.max(R + 40, 30 + R); o += S.g(nw(c), 0, drawWheel(W - R - 46, cy)); yW = cy + R + 40; }

      /* the four readings */
      o += S.lbl(x0, y, 'The same word read four ways', fl);
      y += 10;
      const rh = clamp(s * 0.66, 28, 40), tfs = clamp(rh * 0.42, 12, 16);
      REPS.forEach((nm, i) => {
        const yy = y + i * (rh + 4), on = i === rep;
        if (on) o += S.r(x0 - 6, yy - 1, colW + 12, rh + 2, 'halo', 6);
        o += S.t(x0, yy + rh / 2, nm, on ? 't-b' : '', { mid: true, fs: fit(nm, colW * 0.62, tfs) });
        o += S.t(x0 + colW, yy + rh / 2, fmt(m.v[i]), (on ? 't-b ' : '') + (m.v[i] < 0 || (m.v[i] === 0 && 1 / m.v[i] < 0) ? 't-bad' : ''), { a: 'end', mid: true, fs: tfs * 1.12 });
      });
      y += 4 * (rh + 4) + 20;

      /* ranges, to scale */
      o += S.lbl(x0, y, 'Ranges for ' + n + ' bits, to scale', fl);
      y += 14;
      const lo = -(1 << (n - 1)), hi = (1 << n) - 1, shortL = colW < 430, lw2 = shortL ? 30 : 112;
      const bx0 = x0 + lw2 + (n === 8 ? 34 : 24), bx1 = x0 + colW - (n === 8 ? 30 : 22), sx = (v) => bx0 + ((v - lo) / (hi - lo)) * (bx1 - bx0);
      const bh = 16, rr = 30;
      const short = ['U', 'SM', '1’s', '2’s'];
      o += S.l(sx(0), y - 4, sx(0), y + 4 * rr - 6, 'zline') + S.t(sx(0), y + 4 * rr + 6, '0', 't-mut', { a: 'middle', fs: 11 });
      m.rg.forEach((r2, i) => {
        const yy = y + i * rr, on = i === rep;
        o += S.t(x0, yy + bh / 2, shortL ? short[i] : REPS[i], on ? 't-b' : 't-mut', { mid: true, fs: 11.5 });
        o += S.r(sx(r2[0]), yy, sx(r2[1]) - sx(r2[0]), bh, 'bar' + (on ? '' : ' m'), 3);
        o += S.t(sx(r2[0]) - 4, yy + bh / 2, minus(r2[0]), 't-mut', { a: 'end', mid: true, fs: 10.5 });
        o += S.t(sx(r2[1]) + 4, yy + bh / 2, String(r2[1]), 't-mut', { a: 'start', mid: true, fs: 10.5 });
        o += S.c(sx(m.v[i]), yy + bh / 2, on ? 6 : 4.5, 'mark');
      });
      y += 4 * rr + 22;
      return S.svg(W, Math.max(y, yW), 'The word ' + m.bits.join('') + ' read as unsigned, sign-magnitude, 1’s and 2’s complement', o);
    },
  });
})();
