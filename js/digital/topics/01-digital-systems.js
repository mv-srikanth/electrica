/* ===================== 01 · Digital systems ===================== */
(function () {
  const { S, C, clamp, sup, nw, lblFs } = ND;
  const VREF = 5, N = 8;
  const sig = (t, p) => VREF * (0.5 + p.a * Math.sin(2 * Math.PI * (t + p.ph)) + p.b * Math.sin(6 * Math.PI * (t + p.ph) + 0.7));
  const fmtV = (v) => String(Math.round(v * 10000) / 10000) + ' V';
  const noise = (i) => { const x = Math.sin(i * 12.9898 + 4.1) * 43758.5453; return (x - Math.floor(x)) * 2 - 1; };

  ND.register({
    id: 'digital', short: 'Digital systems', kind: 'Analog vs digital',
    name: 'Digital systems', sub: 'From an analog signal to a stream of bits',
    icon: '<path d="M4 17c4-11 8-11 12 0s8 11 12 0 6-8 12-6"/><path d="M4 38h6v-7h7v7h7v-7h7v7h9"/>',
    principle: 'A digital system works with signals that take only a few distinct values, almost always two: 0 and 1. Each 0 or 1 is a bit, and groups of bits stand for numbers, letters and measurements. A circuit only has to tell HIGH from LOW, so moderate noise cannot change the information, and data can be stored, copied and processed without loss. Energy meters, numerical relays, PLCs and computers are all digital systems.',
    formulas: ['n bits → 2ⁿ combinations', 'Step size Δ = V_ref / 2ⁿ', 'Level = ⌊ v / Δ ⌋', '4 bits = nibble · 8 bits = byte'],
    slips: [
      'More bits give finer steps, but every sample then takes more bits to store and send.',
      'Quantizing loses information: every voltage inside one step gets the same code.',
      'A bit is one binary digit, 0 or 1. A byte is 8 bits.',
    ],
    init: () => ({ n: 3, ph: 0.08, a: 0.36, b: 0.07 }),
    controls: (st) => C.seg('n', 'Bits per sample', [[2, '2 bits'], [3, '3 bits'], [4, '4 bits']], st.n),
    random(st) { st.ph = Math.random(); st.a = 0.24 + Math.random() * 0.16; st.b = (Math.random() - 0.5) * 0.16; },
    compute(st) {
      const n = st.n, L = 1 << n, D = VREF / L, smp = [];
      for (let i = 0; i < N; i++) {
        const t = (i + 0.5) / N, v = sig(t, st), code = clamp(Math.floor(v / D), 0, L - 1);
        smp.push({ t: t, v: v, code: code, bits: code.toString(2).padStart(n, '0') });
      }
      const s1 = smp[0];
      return {
        n: n, L: L, D: D, smp: smp, p: st,
        steps: [
          { t: 'An analog signal', d: 'A sensor gives a voltage that can take any value from 0 to 5 V and changes smoothly with time. This is an analog signal: continuous in time and in value. A digital system cannot store it as it is.' },
          { t: 'Sample it in time', d: 'Read the voltage at regular instants. Here 8 samples are taken across the window. Whatever the signal does between samples is not recorded.', look: 'Sample s1 reads ' + s1.v.toFixed(2) + ' V.' },
          { t: 'Quantize the value', d: 'With ' + n + ' bits there are 2' + sup(n) + ' = ' + L + ' levels, ' + fmtV(D) + ' apart. Each sample drops to the level just below it. Sample s1, at ' + s1.v.toFixed(2) + ' V, becomes level ' + s1.code + ' (' + fmtV(s1.code * D) + ').', look: 'Each level line is labelled with its code on the left.' },
          { t: 'Encode each level in binary', d: 'Each level number is written as an ' + n + '-bit binary code: level ' + s1.code + ' is ' + s1.bits + '. Eight samples of ' + n + ' bits each make ' + 8 * n + ' bits.', look: 'Copper squares are 1s; outlined squares are 0s.' },
          { t: 'Send the bits one after another', d: 'On a wire each bit is a voltage: 0 is LOW (0 V) and 1 is HIGH (5 V). The bits of samples s1 to s3 are sent in turn, most significant bit first.' },
          { t: 'Noise does not change the bits', d: 'Noise picked up on the way distorts the waveform. The receiver only decides HIGH or LOW: above 2.0 V reads as 1, below 0.8 V reads as 0. Every bit comes back exactly as it was sent. This is why digital systems are so reliable.', look: 'The shaded band between 0.8 V and 2.0 V is the undefined region. The received signal never enters it.' },
        ],
        plate: [['Reference', '0 to 5 V'], ['Bits per sample', String(n)], ['Levels', '2' + sup(n) + ' = ' + L], ['Step size Δ', fmtV(D)], ['Samples', '8'], ['Logic', '0 = 0 V · 1 = 5 V']],
      };
    },
    draw(c) {
      const W = c.W, H = c.H, m = c.m, k = c.k, n = m.n, L = m.L, D = m.D, fl = lblFs(W);
      const x0 = W < 460 ? 46 : 62, x1 = W - 18, pw = x1 - x0;
      const xt = (t) => x0 + t * pw;
      const top = 34, ph = clamp(H * 0.34, L * 14 + 20, 330), yv = (v) => top + ph - (v / VREF) * ph;
      let o = S.lbl(x0, top - 14, k >= 2 ? 'Voltage and quantization levels' : 'Voltage v(t)', fl);
      if (k >= 2) {
        const fsC = clamp(Math.min((ph / L) * 0.66, 13), 9, 13);
        for (let q = 0; q <= L; q++) {
          const y = yv(q * D);
          o += S.l(x0, y, x1, y, q === 0 ? 'ax' : 'lvl');
          if (q < L) o += S.t(x0 - 6, y, q.toString(2).padStart(n, '0'), 't-acc', { a: 'end', mid: true, fs: fsC });
        }
        o += S.t(x1, yv(VREF) - 6, '5 V', 't-mut', { a: 'end', fs: 11 });
      } else {
        for (let v = 0; v <= 5; v++) { const y = yv(v); o += S.l(x0, y, x1, y, v ? 'lvl' : 'ax') + S.t(x0 - 6, y, v + ' V', 't-mut', { a: 'end', mid: true, fs: 11.5 }); }
      }
      o += S.l(x0, top - 4, x0, top + ph, 'ax');
      let d = '';
      for (let i = 0; i <= 200; i++) { const t = i / 200; d += (i ? 'L' : 'M') + xt(t).toFixed(1) + ' ' + yv(sig(t, m.p)).toFixed(1); }
      o += S.p(d, 'sig' + (k >= 2 ? ' faint' : ''));
      if (k >= 1) {
        m.smp.forEach((s, i) => { o += S.g(nw(c, k === 1), i * 80, S.l(xt(s.t), yv(0), xt(s.t), yv(s.v), 'stem') + S.c(xt(s.t), yv(s.v), 4.6, 'dot')); });
        m.smp.forEach((s, i) => { o += S.t(xt(s.t), top + ph + 16, 's' + (i + 1), i < 3 && k >= 4 ? 't-acc t-b' : 't-mut', { a: 'middle', fs: 11.5 }); });
      }
      if (k >= 2) {
        m.smp.forEach((s, i) => {
          const y = yv(s.code * D);
          o += S.g(nw(c, k === 2), i * 80, S.l(xt(i / N) + 3, y, xt((i + 1) / N) - 3, y, 'hold') + S.c(xt(s.t), y, 5.2, 'qdot'));
        });
      }
      o += S.t(x1, top + ph + 31, 'time →', 't-mut', { a: 'end', fs: 11 });
      let y = top + ph + 40;
      const cs = clamp(Math.min((pw / N) * 0.62, n === 4 ? 28 : 32), 14, 32), codesH = n * (cs + 3) + 22;
      if (k >= 3) {
        let g = S.lbl(x0, y, 'Codes, most significant bit on top', fl);
        m.smp.forEach((s, i) => {
          s.bits.split('').forEach((b, j) => { g += S.g(nw(c, k === 3), i * 70 + j * 40, S.bit(xt(s.t) - cs / 2, y + 8 + j * (cs + 3), cs, +b)); });
        });
        o += S.g('', 0, g, k === 3 ? 'data-focus="1"' : '');
      } else o += S.slot(x0, y - 10, pw, codesH, 'Step 4 writes each level as a ' + n + '-bit code', clamp(fl + 1, 11, 14));
      y += codesH + 18;

      /* the bit stream and the noise test: side by side on wide boards */
      const two = W >= 700, colW = two ? (pw - 44) / 2 : pw;
      const xs = x0, xr = two ? x0 + colW + 44 : x0;
      const bitsStr = m.smp.slice(0, 3).map((s) => s.bits).join(''), nb = bitsStr.length;
      const bw = Math.min(colW / nb, 52);
      const streamH = 104, rxH = 146;
      const yS = y, yR = two ? y : y + streamH + 14;
      if (k >= 4) {
        let g = S.lbl(xs, yS, 'Serial bit stream, s1 to s3', fl);
        const yh = yS + 34, yl = yS + 70;
        let dd = '';
        bitsStr.split('').forEach((b, i) => {
          const xa = xs + i * bw, yy = b === '1' ? yh : yl;
          dd += (i ? 'L' : 'M') + xa.toFixed(1) + ' ' + yy + 'L' + (xa + bw).toFixed(1) + ' ' + yy;
          g += S.t(xa + bw / 2, yS + 22, b, b === '1' ? 't-acc t-b' : 't-mut', { a: 'middle', fs: clamp(bw * 0.5, 10, 15) });
        });
        g += S.p(dd, 'wave');
        g += S.t(xs - 6, yh, '5 V', 't-mut', { a: 'end', mid: true, fs: 11 }) + S.t(xs - 6, yl, '0 V', 't-mut', { a: 'end', mid: true, fs: 11 });
        for (let s = 0; s < 3; s++) {
          const xa = xs + s * n * bw, xb = xa + n * bw;
          g += S.l(xa + 3, yl + 11, xb - 3, yl + 11, 'thin') + S.t((xa + xb) / 2, yl + 26, 's' + (s + 1), 't-acc', { a: 'middle', fs: 11.5 });
          if (s) g += S.l(xa, yh - 6, xa, yl + 4, 'lvl');
        }
        o += S.g(nw(c, k === 4), 0, g, k === 4 ? 'data-focus="1"' : '');
      } else o += S.slot(xs, yS - 10, colW, streamH - 8, 'Step 5 sends the bits on a wire', clamp(fl + 1, 11, 14));
      if (k >= 5) {
        let g = S.lbl(xr, yR, 'Received with noise', fl);
        const ya = yR + 14, hh = 84, vmin = -0.9, vmax = 5.9, yV = (v) => ya + ((vmax - v) / (vmax - vmin)) * hh;
        g += S.r(xr, yV(2.0), nb * bw, yV(0.8) - yV(2.0), 'band', 0);
        g += S.l(xr, yV(2.0), xr + nb * bw, yV(2.0), 'thr') + S.l(xr, yV(0.8), xr + nb * bw, yV(0.8), 'thr');
        g += S.t(xr - 6, yV(2.0), '2.0', 't-bad', { a: 'end', mid: true, fs: 10.5 }) + S.t(xr - 6, yV(0.8), '0.8', 't-bad', { a: 'end', mid: true, fs: 10.5 });
        let dd = '';
        bitsStr.split('').forEach((b, i) => {
          for (let j = 0; j <= 8; j++) {
            const xa = xr + (i + j / 8) * bw, v = (b === '1' ? 5 : 0) + noise(i * 9 + j) * 0.62;
            dd += (i || j ? 'L' : 'M') + xa.toFixed(1) + ' ' + yV(v).toFixed(1);
          }
        });
        g += S.p(dd, 'wave rx');
        bitsStr.split('').forEach((b, i) => { g += S.t(xr + (i + 0.5) * bw, ya + hh + 16, b, 't-good t-b', { a: 'middle', fs: clamp(bw * 0.5, 10, 15) }); });
        g += S.t(xr, ya + hh + 36, '✓ all ' + nb + ' bits read back correctly', 't-good t-body', { fs: 13 });
        o += S.g(nw(c, k === 5), 0, g, k === 5 ? 'data-focus="1"' : '');
      } else o += S.slot(xr, yR - 10, colW, rxH - 8, 'Step 6 adds noise and reads it back', clamp(fl + 1, 11, 14));
      y = (two ? y + rxH : yR + rxH) + 4;
      return S.svg(W, y, 'An analog signal sampled, quantized to ' + L + ' levels and encoded as bits', o);
    },
  });
})();
