/* ===================== 07 · Binary codes ===================== */
(function () {
  const { S, C, clamp, sub, sup, nw, lblFs, fit, DIG, parse, stripLead, ival, toDigits, dstr } = ND;
  const nib = (d) => d.toString(2).padStart(4, '0');
  const grayOf = (v) => v ^ (v >> 1);
  const OFF = { 3: [2.6, -2.2, 1.4], 4: [3.2, -2.4, 1.6, -3.4] };

  function codesM(st) {
    const x3 = st.mode === 'xs3';
    const p = parse(st.dec, 10, { maxInt: 6, maxFrac: 2 });
    if (p.err) return { err: p.err, errKey: 'dec' };
    const ip = stripLead(p.ip), fp = p.fp, digits = ip.concat(fp);
    if (digits.length > 7) return { err: 'Keep it to 7 digits in all for this view.', errKey: 'dec' };
    const codes = digits.map((d) => nib(x3 ? d + 3 : d));
    const num = dstr(ip) + (fp.length ? '.' + dstr(fp) : '');
    const binI = toDigits(ival(ip, 10), 2);
    const c9 = digits.map((d) => 9 - d), c9s = dstr(c9.slice(0, ip.length)) + (fp.length ? '.' + dstr(c9.slice(ip.length)) : '');
    const steps = x3 ? [
      { t: 'Split into decimal digits', d: num + ' has ' + digits.length + ' digit' + (digits.length > 1 ? 's' : '') + ': ' + digits.join(', ') + '. Excess-3, like BCD, codes each digit on its own.' },
      { t: 'Add 3 to each digit', d: digits.map((d) => d + ' + 3 = ' + (d + 3)).join(', ') + '. The 3 is the "excess" in the name.' },
      { t: 'Write each result in 4 bits', d: 'The Excess-3 code of ' + num + ' is ' + codes.join(' ') + '. The code never uses 0000 or 1111, and its bits have no fixed weights.' },
      { t: 'It complements itself', d: 'The 9’s complement of ' + num + ' is ' + c9s + '. Its Excess-3 code is the code above with every bit inverted, so a circuit gets the 9’s complement with plain inverters. That is why Excess-3 was used in decimal arithmetic units.', look: 'Each digit in the lower row is the upper row with every bit flipped.' },
    ] : [
      { t: 'Split into decimal digits', d: num + ' has ' + digits.length + ' digit' + (digits.length > 1 ? 's' : '') + ': ' + digits.join(', ') + '. BCD codes each one on its own.' },
      { t: 'Code each digit in 4 bits, 8-4-2-1', d: digits.map((d) => d + ' → ' + nib(d)).join(', ') + '. Each nibble is read with weights 8, 4, 2, 1. Joined: ' + codes.join(' ') + '.' },
      { t: 'BCD is not binary', d: 'In BCD ' + num + ' takes ' + 4 * digits.length + ' bits. ' + (fp.length ? 'Its integer part ' + dstr(ip) : num) + ' in straight binary is ' + dstr(binI) + ', only ' + binI.length + ' bits. BCD costs more bits but turns into decimal digits at once, which is why meters and displays use it.' },
      { t: 'Six codes are never used', d: 'Four bits give 16 patterns but there are only 10 digits, so 1010, 1011, 1100, 1101, 1110 and 1111 are invalid in BCD. When a BCD addition lands on one of them, or carries, 0110 (6) is added to correct it.', look: 'The hatched rows in the table are the unused codes.' },
    ];
    return {
      mode: st.mode, x3: x3, ip: ip, fp: fp, digits: digits, codes: codes, num: num, binI: binI, c9: c9, c9s: c9s, steps: steps,
      plate: [['Code', x3 ? 'Excess-3' : 'BCD 8421'], ['Number', num], ['Digits', String(digits.length)], ['Bits used', String(4 * digits.length)], ['Code', codes.join(' ')], ['Binary', dstr(binI) + '₂']],
    };
  }
  function grayM(st) {
    const n = st.gn, N = 1 << n, last = n + 1;
    const steps = [];
    for (let b = 1; b <= n; b++) {
      steps.push(b === 1
        ? { t: 'Start with 1 bit: 0, 1', d: 'The 1-bit Gray code is just 0 then 1. Each longer code is built from the one before by reflecting it.' }
        : { t: 'Reflect to get ' + b + ' bits', d: 'Copy the ' + (b - 1) + '-bit list, then write it again in reverse underneath, as if in a mirror. Put 0 in front of the top half and 1 in front of the bottom half. That gives all ' + (1 << b) + ' codes, and neighbours still differ in a single bit.', look: 'The dashed line is the mirror. Copper bits are the new leading 1s.' });
    }
    const maxB = n;
    steps.push({ t: 'One bit changes at a time', d: 'Between consecutive Gray codes exactly one bit changes, even on the wrap from ' + grayOf(N - 1).toString(2).padStart(n, '0') + ' back to ' + '0'.repeat(n) + '. In plain binary up to ' + maxB + ' bits change at once, for example ' + '0' + '1'.repeat(n - 1) + ' → 1' + '0'.repeat(n - 1) + '.', look: 'Blue outlines mark the bits that changed from the row above.' });
    steps.push({ t: 'Why it matters: shaft encoders', d: 'An absolute encoder reads a shaft angle from tracks on a disc, one sensor per track. Real sensors are never perfectly in line, so near an edge they can read different sectors. On a binary disc that mixes the bits of two codes and can give a reading far from the truth. On a Gray disc only one bit changes at each edge, so the worst error is one step. Press Run to turn the shaft.' });
    return {
      mode: 'gray', n: n, N: N, steps: steps, liveStep: last,
      live: (k) => k === last, liveLabel: 'Run',
      plate: (k) => k === last ? [['Tracks', n + ' (MSB inside)'], ['Positions', String(N)], ['Sector', (360 / N).toFixed(1) + '°'], ['Sensors', st.mis === 'mis' ? 'misaligned ±3°' : 'in line'], ['False readings', 'binary ' + (st.errB || 0) + ' · Gray ' + (st.errG || 0)]]
        : [['Code', 'Gray (reflected)'], ['Bits', String(n)], ['Codes', String(N)], ['Changes per step', '1 bit'], ['Weighted', 'no']],
    };
  }
  /* Encoder geometry: what each disc reads at shaft angle th (degrees). */
  function readings(n, th, mis) {
    const N = 1 << n, D = 360 / N, off = OFF[n] || OFF[4];
    const posAt = (a) => Math.floor((((a % 360) + 360) % 360) / D) % N;
    const truth = posAt(th);
    const rd = (gray) => {
      let bits = '';
      for (let b = 0; b < n; b++) { const p = posAt(th + (mis ? off[b] : 0)); const code = gray ? grayOf(p) : p; bits += (code >> (n - 1 - b)) & 1; }
      let v = parseInt(bits, 2);
      if (gray) { let x = v, o = x; while ((x >>= 1)) o ^= x; v = o; }
      const ok = v === truth || v === (truth + 1) % N || v === (truth + N - 1) % N;
      return { bits: bits, v: v, ok: ok };
    };
    return { truth: truth, b: rd(false), g: rd(true) };
  }
  function drawEncoder(c) {
    const W = c.W, H = c.H, st = c.st, n = c.m.n, N = 1 << n, fl = lblFs(W);
    const two = W >= 640;
    const R = Math.floor(two ? clamp(Math.min((W - 90) / 4, (H - 150) / 2), 100, 210) : clamp((W - 60) / 2, 100, 170));
    const r0 = R * 0.3, tw = (R - r0) / n;
    const cxs = two ? [W / 4 + 6, (3 * W) / 4 - 6] : [W / 2, W / 2];
    const cys = two ? [R + 78, R + 78] : [R + 78, 3 * R + 190];
    const D = (2 * Math.PI) / N, off = OFF[n] || OFF[4];
    const rd = readings(n, st.ang || 0, st.mis === 'mis');
    let o = '';
    ['Binary disc', 'Gray disc'].forEach((title, di) => {
      const cx = cxs[di], cy = cys[di], gray = di === 1;
      o += S.lbl(cx, cy - R - 26, title, fl, 'middle');
      let g = '<g class="disc" data-disc="' + di + '" transform="rotate(' + (-(st.ang || 0)).toFixed(2) + ' ' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ')">';
      for (let p = 0; p < N; p++) {
        const code = gray ? grayOf(p) : p, a = -Math.PI / 2 + p * D;
        for (let b = 0; b < n; b++) {
          const bit = (code >> (n - 1 - b)) & 1, ri = r0 + b * tw, ro = ri + tw - 1;
          const P = (r, aa) => (cx + r * Math.cos(aa)).toFixed(1) + ' ' + (cy + r * Math.sin(aa)).toFixed(1);
          g += '<path class="' + (bit ? 'trk1' : 'trk0') + '" d="M' + P(ro, a) + ' A' + ro + ' ' + ro + ' 0 0 1 ' + P(ro, a + D) + ' L' + P(ri, a + D) + ' A' + ri + ' ' + ri + ' 0 0 0 ' + P(ri, a) + ' Z"/>';
        }
      }
      g += S.c(cx, cy, R, 'rim') + S.c(cx, cy, r0 - 2, 'hub') + '</g>';
      o += g;
      o += S.c(cx, cy, 5, 'ptd');
      o += S.l(cx, cy - r0 + 6, cx, cy - R - 12, 'head');
      for (let b = 0; b < n; b++) {
        const a = -Math.PI / 2 + ((st.mis === 'mis' ? off[b] : 0) * Math.PI) / 180, rr = r0 + (b + 0.5) * tw;
        o += S.c(cx + rr * Math.cos(a), cy + rr * Math.sin(a), clamp(tw * 0.22, 3.5, 7), 'sens');
      }
      const r = gray ? rd.g : rd.b;
      const yR = cy + R + 26;
      o += S.t(cx, yR, 'reads ' + r.bits + ' → ' + r.v, 't-b', { a: 'middle', fs: clamp(R * 0.12, 13, 18), x: 'data-ro="t' + di + '"' });
      o += S.t(cx, yR + 22, r.ok ? '✓ within one step' : '✗ false reading', r.ok ? 't-good t-b' : 't-bad t-b', { a: 'middle', fs: 13, x: 'data-ro="s' + di + '"' });
      o += S.t(cx, yR + 42, 'false readings so far: ' + (gray ? st.errG || 0 : st.errB || 0), 't-mut', { a: 'middle', fs: 12, x: 'data-ro="c' + di + '"' });
    });
    const posT = 'Shaft position ' + rd.truth + ' of ' + N + (st.mis === 'mis' ? ' · sensors misaligned' : ' · sensors in line');
    o += S.t(W / 2, 22, posT, 't-mut', { a: 'middle', fs: fit(posT, W - 20, 12.5, 0.62), x: 'data-ro="pos"' });
    const h = two ? cys[0] + R + 84 : cys[1] + R + 84;
    return S.svg(W, h, 'Binary and Gray encoder discs', o);
  }
  function drawGrayBuild(c) {
    const W = c.W, H = c.H, m = c.m, k = c.k, b = k + 1, n = m.n, fl = lblFs(W);
    const rows = 1 << b, prev = b - 1;
    const rh = Math.floor(clamp((H - 90) / Math.max(rows, 8), 18, 42)), s = rh - 5;
    const list = (bits) => { let L = ['0', '1']; for (let i = 2; i <= bits; i++) L = L.map((x) => '0' + x).concat(L.slice().reverse().map((x) => '1' + x)); return L; };
    const cur = list(b), old = b > 1 && W >= 420 ? list(prev) : null;
    const colNew = b * (s + 4), colOld = old ? prev * (s + 4) : 0;
    const gapX = W < 480 ? 26 : Math.max(40, Math.min(110, W * 0.12));
    const totalW = (old ? colOld + gapX : 0) + 34 + colNew;
    const x0 = Math.max(W < 480 ? 10 : 18, Math.floor((W - totalW - (W < 480 ? 56 : 120)) / 2));
    let o = '', y = 30;
    const xNew = x0 + (old ? colOld + gapX : 0) + 34;
    if (old) {
      o += S.lbl(x0, y, prev + '-bit list', fl);
      old.forEach((code, r) => { code.split('').forEach((ch, i) => { o += S.bit(x0 + i * (s + 4), y + 10 + r * rh, s, +ch); }); });
      o += S.arrow('M' + (x0 + colOld + 8) + ' ' + (y + 10 + (old.length * rh) / 2) + ' L' + (xNew - 38) + ' ' + (y + 10 + (old.length * rh) / 2), 'm', 'm');
    }
    o += S.lbl(xNew - 34, y, b + '-bit Gray code', fl);
    cur.forEach((code, r) => {
      const yy = y + 10 + r * rh, isNew = b > 1 && r >= rows / 2;
      let g = S.t(xNew - 10, yy + s / 2, String(r), 't-mut', { a: 'end', mid: true, fs: clamp(s * 0.42, 10, 15) });
      code.split('').forEach((ch, i) => { g += S.bit(xNew + i * (s + 4), yy, s, +ch, i === 0 && b > 1 ? (ch === '1' ? '' : 'dim') : ''); });
      o += S.g(nw(c, isNew), isNew ? (r - rows / 2) * 60 : 0, g);
    });
    if (b > 1) {
      const ym = y + 10 + (rows / 2) * rh - 2.5;
      o += S.l(xNew - 30, ym, xNew + colNew + 14, ym, 'lvl', 'style="stroke-width:2;stroke:var(--flux)"');
      const room = W - (xNew + colNew + 18) - 8;
      o += S.t(xNew + colNew + 18, ym, 'mirror', 't-flux t-body', { mid: true, fs: fit('mirror', room, 12) });
      o += S.t(xNew + colNew + 18, y + 10 + (rows / 4) * rh, 'prefix 0', 't-mut', { mid: true, fs: fit('prefix 0', room, 12) });
      const t1 = room > 120 ? 'prefix 1, reversed' : 'prefix 1';
      o += S.t(xNew + colNew + 18, y + 10 + (3 * rows / 4) * rh, t1, 't-acc', { mid: true, fs: fit(t1, room, 12) });
    }
    return S.svg(W, y + 10 + rows * rh + 20, b + '-bit reflected Gray code', o);
  }
  function drawChanges(c) {
    const W = c.W, H = c.H, n = c.m.n, N = 1 << n, fl = lblFs(W);
    const wide = W >= 480, gD = wide ? 40 : 32, gN = wide ? 44 : 34, gE = wide ? 40 : 22;
    const rh = Math.floor(clamp((H - 90) / N, 17, 36));
    const s = Math.max(12, Math.min(rh - 4, Math.floor((W - 16 - gD - gN - gE - 16) / (2 * n)) - 3));
    const cw = n * (s + 3), x0 = Math.max(8, Math.floor((W - (gD + cw + 8 + gN + cw + 8 + gE)) / 2));
    const xB = x0 + gD, xBn = xB + cw + 8, xG = xBn + gN, xGn = xG + cw + 8;
    let o = '', y = 26;
    o += S.lbl(x0, y, 'Dec', fl) + S.lbl(xB, y, 'Binary', fl) + S.lbl(xBn, y, 'Δ', fl) + S.lbl(xG, y, 'Gray', fl) + S.lbl(xGn, y, 'Δ', fl);
    const y0 = y + 10;
    for (let v = 0; v < N; v++) {
      const yy = y0 + v * rh, pv = (v + N - 1) % N;
      const bv = v.toString(2).padStart(n, '0'), bp = pv.toString(2).padStart(n, '0');
      const gv = grayOf(v).toString(2).padStart(n, '0'), gp = grayOf(pv).toString(2).padStart(n, '0');
      let dB = 0, dG = 0;
      o += S.t(xB - 12, yy + s / 2, String(v), 't-mut', { a: 'end', mid: true, fs: clamp(s * 0.46, 10, 15) });
      for (let i = 0; i < n; i++) {
        const chB = bv[i] !== bp[i] && v > 0, chG = gv[i] !== gp[i] && v > 0;
        if (chB) dB++; if (chG) dG++;
        o += S.bit(xB + i * (s + 3), yy, s, +bv[i], chB ? 'hot' : '');
        o += S.bit(xG + i * (s + 3), yy, s, +gv[i], chG ? 'hot' : '');
      }
      if (v > 0) {
        o += S.t(xBn + 10, yy + s / 2, String(dB), dB > 1 ? 't-bad t-b' : 't-mut', { a: 'middle', mid: true, fs: clamp(s * 0.5, 10, 15) });
        o += S.t(xGn + 10, yy + s / 2, String(dG), 't-good t-b', { a: 'middle', mid: true, fs: clamp(s * 0.5, 10, 15) });
      }
    }
    return S.svg(W, y0 + N * rh + 18, 'Bits that change from one code to the next, binary against Gray', S.g(nw(c), 0, o));
  }
  function drawBcd(c) {
    const W = c.W, H = c.H, m = c.m, k = c.k, fl = lblFs(W), x3 = m.x3;
    const nd = m.digits.length, wide = W >= 700;
    const tableW = wide ? 250 : 0;
    const mainW = W - tableW - (wide ? 40 : 32);
    const sW = x3 ? (mainW - 94) / 5.2 : (mainW - 50) / 4.2;
    const rh = Math.floor(clamp(Math.min((H - (x3 ? 150 : 210)) / (x3 ? nd * 1.9 : nd), 72, sW / 0.84), 26, 68));
    const s = Math.floor(rh * 0.84), sb = Math.floor(clamp(s * 0.8, 16, 52));
    const x0 = 18;
    let o = '', y = 26;
    o += S.lbl(x0, y, k === 0 ? 'Decimal digits' : x3 ? 'Digit → digit + 3 → code' : 'Digit → 4-bit code', fl);
    const yW = y + 18;
    const xArr = x0 + s + 14, xMid = x3 ? xArr + 30 : xArr, xNib = (x3 ? xMid + s + 34 : xArr + 34);
    if (k >= 1) ['8', '4', '2', '1'].forEach((w, i) => { if (!x3) o += S.t(xNib + i * (sb + 4) + sb / 2, yW, w, 't-acc t-b', { a: 'middle', fs: 12 }); });
    const yD = yW + 10;
    m.digits.forEach((d, r) => {
      const yy = yD + r * rh, isF = r >= m.ip.length;
      let g = S.cell(x0, yy, s, String(d), isF ? 'gY' : 'gB');
      if (isF && r === m.ip.length) g += S.t(x0 - 8, yy + s / 2, '.', 't-b', { a: 'end', mid: true, fs: 22 });
      if (k >= 1) {
        if (x3) {
          g += S.t(xArr, yy + s / 2, '+3', 't-acc', { mid: true, fs: clamp(s * 0.36, 12, 17) });
          g += S.cell(xMid + 6, yy, s, String(d + 3), '', { fs: Math.round(s * 0.42) });
          if (k >= 2) g += S.arrow('M' + (xMid + s + 10) + ' ' + (yy + s / 2) + ' L' + (xNib - 8) + ' ' + (yy + s / 2), 'm', 'm');
        } else g += S.arrow('M' + (xArr - 4) + ' ' + (yy + s / 2) + ' L' + (xNib - 8) + ' ' + (yy + s / 2), 'm', 'm');
        if (!x3 || k >= 2) m.codes[r].split('').forEach((ch, i) => { g += S.bit(xNib + i * (sb + 4), yy + (s - sb) / 2, sb, +ch); });
      }
      o += S.g(nw(c, k === 1 || (x3 && k === 2)), r * 140, g);
    });
    y = yD + nd * rh + 14;
    if (k >= 2 && !x3) {
      let g = S.lbl(x0, y, 'Compared with straight binary', fl);
      const bcdS = m.codes.join(' '), binS = ND.dstr(m.binI);
      const fs = clamp(s * 0.4, 13, 20);
      g += S.t(x0, y + fs + 10, 'BCD     ' + bcdS, '', { fs: fit('BCD     ' + bcdS, mainW, fs) });
      g += S.t(x0, y + 2 * fs + 22, 'Binary  ' + binS, 't-acc', { fs: fit('Binary  ' + bcdS, mainW, fs) });
      g += S.t(x0, y + 3 * fs + 34, 4 * nd + ' bits against ' + m.binI.length + ' bits', 't-mut t-body', { fs: 13 });
      o += S.g(nw(c, k === 2), 0, g, k === 2 ? 'data-focus="1"' : '');
      y += 3 * fs + 50;
    }
    if (k >= 3 && x3) {
      let g = S.lbl(x0, y, W < 520 ? '9’s complement ' + m.c9s + ', bits inverted' : '9’s complement ' + m.c9s + ' in Excess-3 = inverted bits', fl);
      const yy0 = y + 12;
      m.c9.forEach((d, r) => {
        const yy = yy0 + r * (sb + 8);
        g += S.cell(x0, yy, sb, String(d), 'gR', { fs: Math.round(sb * 0.5) });
        g += S.t(x0 + sb + 10, yy + sb / 2, '→', 't-mut', { mid: true, fs: 14 });
        nib(d + 3).split('').forEach((ch, i) => { g += S.bit(x0 + sb + 30 + i * (sb + 4), yy, sb, +ch, 'hot'); });
        const orig = m.codes[r];
        const xt = x0 + sb + 30 + 4 * (sb + 4) + 8, room = W - xt - 10;
        if (room > 48) g += S.t(xt, yy + sb / 2, 'NOT ' + orig, 't-flux', { mid: true, fs: fit('NOT ' + orig, room, clamp(sb * 0.45, 11, 15)) });
      });
      o += S.g(nw(c), 0, g, 'data-focus="1"');
      y = yy0 + m.c9.length * (sb + 8) + 14;
    }
    /* code table */
    const tx = wide ? W - tableW - 18 : 18, rows = !x3 && k >= 3 ? 16 : 10;
    let ty = wide ? 26 : y + 10;
    const trh = clamp(wide ? (H - 70) / (rows + 1) : 24, 18, 26), tfs = clamp(trh * 0.55, 11, 14);
    const cx = [tx + 26, tx + 120, tx + 210];
    let g = S.lbl(tx, ty, 'Code table', fl);
    ty += 12;
    g += S.t(cx[0], ty + trh / 2, 'Dec', 't-lbl', { a: 'middle', mid: true, fs: 10.5 }) + S.t(cx[1], ty + trh / 2, 'BCD 8421', 't-lbl', { a: 'middle', mid: true, fs: 10.5 }) + S.t(cx[2], ty + trh / 2, 'Excess-3', 't-lbl', { a: 'middle', mid: true, fs: 10.5 });
    const used = new Set(m.digits);
    for (let v = 0; v < rows; v++) {
      const yy = ty + (v + 1) * trh, on = v < 10 && used.has(v) && k >= 1;
      if (v >= 10) g += S.r(tx, yy, 236, trh, 'hatch', 0);
      if (on) g += S.r(tx, yy, 236, trh, 'halo', 3);
      g += S.t(cx[0], yy + trh / 2, v < 10 ? String(v) : '—', v < 10 ? (on ? 't-b' : '') : 't-mut', { a: 'middle', mid: true, fs: tfs });
      g += S.t(cx[1], yy + trh / 2, nib(v), v < 10 ? (on && !x3 ? 't-b' : '') : 't-bad', { a: 'middle', mid: true, fs: tfs });
      g += S.t(cx[2], yy + trh / 2, v < 10 ? nib(v + 3) : '', on && x3 ? 't-b' : 't-mut', { a: 'middle', mid: true, fs: tfs });
      g += S.l(tx, yy + trh, tx + 236, yy + trh, 'hl');
    }
    o += S.g(nw(c, !x3 && k === 3), 0, g, !x3 && k === 3 ? 'data-focus="1"' : '');
    const hTable = ty + (rows + 1) * trh + 16;
    return S.svg(W, Math.max(y + 10, hTable), (x3 ? 'Excess-3' : 'BCD') + ' code of ' + m.num, o);
  }

  ND.register({
    id: 'codes', short: 'Binary codes', kind: 'BCD, Excess-3, Gray',
    name: 'Binary codes: BCD, Excess-3 and Gray', sub: 'Bit patterns chosen for a job',
    icon: '<rect x="5" y="8" width="34" height="28" rx="2"/><path d="M5 17h34M5 26h34M16 8v28"/>',
    principle: 'A code gives each symbol a fixed bit pattern chosen for a purpose. BCD (8421) codes every decimal digit separately in 4 bits, which suits meters and displays. Excess-3 adds 3 to each digit before coding, so the 9’s complement of a digit is found by inverting its bits. Gray code orders the patterns so that neighbours differ in exactly one bit, which prevents false readings on shaft-position encoders.',
    formulas: ['BCD weights 8 4 2 1, codes 0000 to 1001', 'Excess-3 = BCD + 0011', 'Excess-3 of (9 − d) = NOT Excess-3 of d', 'Gray: consecutive codes differ in one bit'],
    slips: [
      'BCD is not binary: (15)₁₀ is 0001 0101 in BCD but 1111 in binary.',
      'The six patterns 1010 to 1111 are not valid BCD digits.',
      'Excess-3 and Gray are unweighted: adding bit weights does not give the value.',
    ],
    init: () => ({ mode: 'bcd', dec: '259', gn: 4, mis: 'mis', ang: 6, errB: 0, errG: 0 }),
    controls(st) {
      let h = C.seg('mode', 'Code', [['bcd', 'BCD 8421'], ['xs3', 'Excess-3'], ['gray', 'Gray']], st.mode);
      if (st.mode === 'gray') h += C.seg('gn', 'Bits', [[3, '3'], [4, '4']], st.gn) + C.seg('mis', 'Encoder sensors', [['al', 'In line'], ['mis', 'Misaligned']], st.mis);
      else h += C.input('dec', 'Decimal number', st.dec, 10, 'decimal');
      return h;
    },
    set(st, key, v) { if (key === 'mis' || key === 'gn') { st[key] = key === 'gn' ? Number(v) : v; st.errB = 0; st.errG = 0; return true; } return false; },
    random(st) {
      if (st.mode === 'gray') { st.ang = Math.random() * 360; st.errB = st.errG = 0; return; }
      const nd = 2 + Math.floor(Math.random() * 3);
      let s = String(1 + Math.floor(Math.random() * 9));
      for (let i = 1; i < nd; i++) s += Math.floor(Math.random() * 10);
      if (Math.random() < 0.3) s += '.' + Math.floor(Math.random() * 10);
      st.dec = s;
    },
    compute: (st) => (st.mode === 'gray' ? grayM(st) : codesM(st)),
    frame(st, m, dt, k) {
      if (m.mode !== 'gray') return false;
      const before = readings(m.n, st.ang || 0, st.mis === 'mis');
      st.ang = ((st.ang || 0) + dt * (360 / m.N) * 0.8) % 360;
      const after = readings(m.n, st.ang, st.mis === 'mis');
      if (before.b.ok && !after.b.ok) st.errB = (st.errB || 0) + 1;
      if (before.g.ok && !after.g.ok) st.errG = (st.errG || 0) + 1;
      return 'patch';
    },
    patch(vz, st, m) {
      const rd = readings(m.n, st.ang, st.mis === 'mis');
      vz.querySelectorAll('[data-disc]').forEach((g) => {
        const t = g.getAttribute('transform').replace(/rotate\([^ ]+/, 'rotate(' + (-st.ang).toFixed(2));
        g.setAttribute('transform', t);
      });
      [rd.b, rd.g].forEach((r, i) => {
        const t = vz.querySelector('[data-ro="t' + i + '"]'), s = vz.querySelector('[data-ro="s' + i + '"]'), c = vz.querySelector('[data-ro="c' + i + '"]');
        if (t) t.textContent = 'reads ' + r.bits + ' → ' + r.v;
        if (s) { s.textContent = r.ok ? '✓ within one step' : '✗ false reading'; s.setAttribute('class', r.ok ? 't-good t-b' : 't-bad t-b'); }
        if (c) c.textContent = 'false readings so far: ' + (i ? st.errG : st.errB);
      });
      const p = vz.querySelector('[data-ro="pos"]');
      if (p) p.textContent = 'Shaft position ' + rd.truth + ' of ' + m.N + (st.mis === 'mis' ? ' · sensors misaligned' : ' · sensors in line');
    },
    draw(c) {
      const m = c.m;
      if (m.mode !== 'gray') return drawBcd(c);
      if (c.k < m.n) return drawGrayBuild(c);
      if (c.k === m.n) return drawChanges(c);
      return drawEncoder(c);
    },
  });
})();
