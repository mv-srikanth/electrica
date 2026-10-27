/* ===================== 06 · Complement arithmetic ===================== */
(function () {
  const { S, C, clamp, sub, nw, lblFs, fit, parse, minus, wrap } = ND;
  const bstr = (v, n) => (v >>> 0).toString(2).padStart(n, '0').slice(-n);
  function add(x, y, n) {
    const c = Array(n + 1).fill(0); let s = 0;
    for (let j = 0; j < n; j++) { const t = ((x >> j) & 1) + ((y >> j) & 1) + c[j]; s |= (t & 1) << j; c[j + 1] = t >> 1; }
    return { s: s, c: c };
  }
  const INT = /^\s*[+\-−]?\d+\s*$/;
  const toInt = (s) => parseInt(String(s).trim().replace('−', '-'), 10);

  function signedM(st) {
    const n = st.n, M2 = st.meth === 2, F = 1 << n, H = 1 << (n - 1), cn = M2 ? '2’s' : '1’s';
    if (!INT.test(st.a)) return { err: 'A must be a whole number, such as 13 or −13.', errKey: 'a' };
    if (!INT.test(st.b)) return { err: 'B must be a whole number, such as 6 or −6.', errKey: 'b' };
    const A = toInt(st.a), B = toInt(st.b), sub_ = st.op === '-';
    const lo = M2 ? -H : -(H - 1), hi = H - 1;
    if (A < lo || A > hi) return { err: 'A = ' + minus(A) + ' does not fit: with ' + n + ' bits in ' + cn + ' complement the range is ' + minus(lo) + ' to +' + hi + '.', errKey: 'a' };
    if (B < lo || B > hi) return { err: 'B = ' + minus(B) + ' does not fit: with ' + n + ' bits in ' + cn + ' complement the range is ' + minus(lo) + ' to +' + hi + '.', errKey: 'b' };
    if (sub_ && B === lo && M2) return { err: '−B = +' + H + ' does not fit in ' + n + ' bits. Use more bits or a smaller B.', errKey: 'b' };
    const enc = (x) => (x >= 0 ? x : M2 ? F + x : F - 1 + x);
    const comp = (p) => (M2 ? (F - p) % F : F - 1 - p);
    const Ap = enc(A), Bp = enc(B), Bq = sub_ ? comp(Bp) : Bp;
    const a1 = add(Ap, Bq, n), cout = a1.c[n], cinS = a1.c[n - 1];
    let R = a1.s, a2 = null;
    if (!M2 && cout) { a2 = add(R, 1, n); R = a2.s; }
    const sA = (Ap >> (n - 1)) & 1, sB = (Bq >> (n - 1)) & 1, sR = (R >> (n - 1)) & 1;
    const V = sA === sB && sR !== sA;
    const mag = sR ? (M2 ? F - R : F - 1 - R) : R, val = sR ? -mag : R;
    const expect = sub_ ? A - B : A + B;
    const sgn = (x) => (x > 0 ? '+' + x : minus(x));
    const opS = sub_ ? '−' : '+';
    const prepA = A >= 0 ? ['A = ' + sgn(A), ' → ' + bstr(Ap, n)] : ['A = ' + sgn(A) + ':', ' ' + (-A) + ' = ' + bstr(-A, n), ' → ' + cn + ' comp →', ' ' + bstr(Ap, n)];
    let prepB;
    if (!sub_) prepB = B >= 0 ? ['B = ' + sgn(B), ' → ' + bstr(Bp, n)] : ['B = ' + sgn(B) + ':', ' ' + (-B) + ' = ' + bstr(-B, n), ' → ' + cn + ' comp →', ' ' + bstr(Bp, n)];
    else prepB = ['B = ' + sgn(B) + ' = ' + bstr(Bp, n), ' → ' + cn + ' comp →', ' ' + bstr(Bq, n) + ' (' + sgn(-B) + ')'];
    const steps = [
      { t: 'Write A in ' + n + ' bits', d: A >= 0 ? 'A = ' + sgn(A) + ' is positive, so it is its binary value padded with zeros to ' + n + ' bits: ' + bstr(Ap, n) + '.' : 'A = ' + sgn(A) + ' is negative. Write its size ' + (-A) + ' = ' + bstr(-A, n) + ', then take the ' + cn + ' complement: ' + bstr(Ap, n) + '.' },
      sub_ ? { t: 'Complement B to get −B', d: 'Subtracting B is the same as adding −B. B = ' + sgn(B) + ' is ' + bstr(Bp, n) + '; its ' + cn + ' complement ' + bstr(Bq, n) + ' stands for ' + sgn(-B) + '.' }
        : { t: 'Write B in ' + n + ' bits', d: B >= 0 ? 'B = ' + sgn(B) + ' is ' + bstr(Bp, n) + '.' : 'B = ' + sgn(B) + ' is negative: ' + (-B) + ' = ' + bstr(-B, n) + ', and its ' + cn + ' complement is ' + bstr(Bp, n) + '.' },
      { t: 'Add column by column', d: 'Add from the right, carrying 1 whenever a column adds to 2 or 3. ' + bstr(Ap, n) + ' + ' + bstr(Bq, n) + ' = ' + (cout ? '1 ' : '') + bstr(a1.s, n) + (cout ? ', with a carry out of the sign bit.' : ', with no carry out of the sign bit.'), look: 'Blue chips are the carries, rippling right to left.' },
      M2 ? { t: 'Discard the end carry', d: cout ? 'A carry came out of the sign bit. In 2’s complement it is simply dropped; it is not part of the answer.' : 'No carry came out of the sign bit, so there is nothing to drop.' }
        : { t: 'End-around carry', d: cout ? 'A carry came out of the sign bit. In 1’s complement it is added back into the least significant bit: ' + bstr(a1.s, n) + ' + 1 = ' + bstr(R, n) + '.' : 'No carry came out of the sign bit, so there is nothing to add back.' },
      { t: 'Check for overflow', d: (sA !== sB ? 'The two numbers being added have opposite signs, so the sum cannot overflow.' : V ? 'Both numbers have sign bit ' + sA + ' but the result has sign bit ' + sR + ': overflow. The true answer ' + sgn(expect) + ' is outside ' + minus(lo) + ' to +' + hi + '.' : 'Both numbers have sign bit ' + sA + ' and so does the result: no overflow.') + (M2 ? ' Equivalently, carry into the sign bit ' + cinS + ' ⊕ carry out ' + cout + ' = ' + (cinS ^ cout) + '.' : '') },
      { t: 'Read the result', d: (sR ? 'The sign bit is 1, so the result is negative. Its size is the ' + cn + ' complement of ' + bstr(R, n) + ', which is ' + bstr(mag, n) + ' = ' + mag + '. Result = ' + (mag ? '−' + mag : '−0, the same as 0') + '.' : 'The sign bit is 0, so the result is positive: ' + bstr(R, n) + ' = ' + R + '.') + (V ? ' Because of the overflow this is not ' + sgn(expect) + '.' : ' Check: ' + minus(A) + ' ' + opS + ' ' + (B < 0 ? '(' + minus(B) + ')' : B) + ' = ' + minus(expect) + ' ✓') },
    ];
    return {
      mode: 'signed', n: n, M2: M2, cn: cn, A: Ap, B: Bq, a1: a1, a2: a2, cout: cout, R: R, V: V, sR: sR, mag: mag, val: val, expect: expect,
      prep: [prepA, prepB], labels: ['A', '+ ' + (sub_ ? '(−B)' : 'B')], stages: ['a', 'b', 'add', 'end', 'ovf', 'res'], steps: steps,
      plate: [['Method', cn + ' complement'], ['Word', n + ' bits'], ['Range', minus(lo) + ' to +' + hi], ['Problem', minus(A) + ' ' + opS + ' ' + (B < 0 ? '(' + minus(B) + ')' : B)], ['Answer', (V ? 'overflow' : (val === 0 && sR ? '−0' : sgn(val)))]],
    };
  }
  function unsignedM(st) {
    const M2 = st.meth === 2, cn = M2 ? '2’s' : '1’s';
    const pm = parse(st.M, 2, { whole: true, maxInt: 12 }), pn = parse(st.N, 2, { whole: true, maxInt: 12 });
    if (pm.err) return { err: 'M: ' + pm.err, errKey: 'M' };
    if (pn.err) return { err: 'N: ' + pn.err, errKey: 'N' };
    const n = Math.max(String(st.M).trim().length, String(st.N).trim().length, 2), F = 1 << n;
    const Mv = parseInt(pm.ip.join(''), 2), Nv = parseInt(pn.ip.join(''), 2);
    if (Nv === 0) return { err: 'N is 0, so M − N is just M. Pick a non-zero N.', errKey: 'N' };
    const Nq = M2 ? F - Nv : F - 1 - Nv;
    const a1 = add(Mv, Nq, n), cout = a1.c[n];
    let R, a2 = null, neg = false, mag;
    if (cout) { if (M2) R = a1.s; else { a2 = add(a1.s, 1, n); R = a2.s; } mag = R; }
    else { neg = true; mag = M2 ? F - a1.s : F - 1 - a1.s; R = mag; }
    const expect = Mv - Nv, b = (v) => bstr(v, n);
    const steps = [
      { t: 'Line up M and N', d: 'M = ' + b(Mv) + ' (' + Mv + ') and N = ' + b(Nv) + ' (' + Nv + '), both written with n = ' + n + ' bits. The shorter one gets leading zeros.' },
      { t: 'Take the ' + cn + ' complement of N', d: M2 ? 'Flip every bit of N and add 1: ' + b(Nv) + ' → ' + b(Nq) + '.' : 'Flip every bit of N: ' + b(Nv) + ' → ' + b(Nq) + '.' },
      { t: 'Add M and the complement', d: b(Mv) + ' + ' + b(Nq) + ' = ' + (cout ? '1 ' : '') + b(a1.s) + '. ' + (cout ? 'There is an end carry.' : 'There is no end carry.'), look: 'Blue chips are the carries.' },
      cout
        ? { t: M2 ? 'End carry: discard it' : 'End carry: add it back', d: 'An end carry means M ≥ N, so the result is positive. ' + (M2 ? 'Discard the carry: the result is ' + b(R) + '.' : 'Add the carry to the least significant bit: ' + b(a1.s) + ' + 1 = ' + b(R) + '.') }
        : { t: 'No end carry: complement the sum', d: 'No end carry means N > M' + (!M2 && Mv === Nv ? ' or M = N' : '') + ', so the result is negative. Take the ' + cn + ' complement of the sum and put a minus sign in front: −' + b(mag) + '.' },
      { t: 'Result', d: 'M − N = ' + (neg ? '−' : '') + b(mag) + ' = ' + (neg ? (mag ? '−' : '−') : '') + mag + (neg && mag === 0 ? ' (−0 is 0)' : '') + '. Check: ' + Mv + ' − ' + Nv + ' = ' + minus(expect) + ' ✓' },
    ];
    return {
      mode: 'unsigned', n: n, M2: M2, cn: cn, A: Mv, B: Nq, a1: a1, a2: a2, cout: cout, R: R, neg: neg, mag: mag, expect: expect, Mv: Mv, Nv: Nv,
      prep: [['M = ' + b(Mv) + ' (' + Mv + ')', ' · N = ' + b(Nv) + ' (' + Nv + ')'], ['N = ' + b(Nv), ' → ' + cn + ' comp →', ' ' + b(Nq)]], labels: ['M', '+ N′'], stages: ['a', 'b', 'add', 'end', 'res'], steps: steps,
      plate: [['Method', cn + ' complement'], ['Word', n + ' bits'], ['M', b(Mv) + ' = ' + Mv], ['N', b(Nv) + ' = ' + Nv], ['End carry', cout ? 'yes → positive' : 'no → negative'], ['M − N', (neg ? '−' : '') + b(mag) + ' = ' + minus(expect)]],
    };
  }

  ND.register({
    id: 'arithmetic', short: 'Complement arithmetic', kind: 'Subtract by adding',
    name: 'Complement arithmetic', sub: 'Addition and subtraction with 1’s and 2’s complement',
    icon: '<path d="M22 8v14M15 15h14"/><path d="M8 28h28"/><path d="M14 35h16"/>',
    principle: 'A − B is worked as A + (−B), where −B is the complement of B, so one adder does both jobs. With 2’s complement, add and discard any carry out of the sign bit. With 1’s complement, a carry out of the sign bit is added back to the least significant bit: the end-around carry. If two numbers of the same sign give a result of the other sign, the true answer does not fit in n bits: that is overflow.',
    formulas: ['A − B = A + (2’s complement of B)', '1’s: end-around carry adds C_out to the LSB', 'Overflow V = C_in(sign) ⊕ C_out(sign)', 'Unsigned M − N: end carry → positive; none → negative, complement the sum'],
    slips: [
      'Use the same number of bits for both numbers: pad a positive number with 0s and keep the sign of a negative one.',
      'In 2’s complement the end carry is discarded. It is not the sign.',
      'Overflow can only happen when the two numbers being added have the same sign.',
      'A 1’s complement result of all 1s is −0, which equals 0.',
    ],
    init: () => ({ mode: 'signed', meth: 2, a: '13', op: '-', b: '6', n: 6, M: '1010100', N: '1000100' }),
    controls(st) {
      let h = C.seg('mode', 'Problem', [['signed', 'Signed A ± B'], ['unsigned', 'Unsigned M − N']], st.mode) + C.seg('meth', 'Method', [[2, '2’s complement'], [1, '1’s complement']], st.meth);
      if (st.mode === 'signed') h += '<div class="fld-row">' + C.input('a', 'A', st.a, 6, 'text') + C.seg('op', 'Op', [['+', '+'], ['-', '−']], st.op) + C.input('b', 'B', st.b, 6, 'text') + '</div>' + C.seg('n', 'Bits', [[4, '4'], [5, '5'], [6, '6'], [8, '8']], st.n);
      else h += C.input('M', 'M (binary)', st.M, 13, 'numeric') + C.input('N', 'N (binary)', st.N, 13, 'numeric');
      return h;
    },
    random(st) {
      if (st.mode === 'signed') {
        const H = 1 << (st.n - 1), r = () => Math.floor(Math.random() * (2 * H - 1)) - (H - 1);
        let a = r(), b = r(); if (!a) a = 3; if (!b) b = -2;
        st.a = String(a); st.b = String(b); st.op = Math.random() < 0.5 ? '+' : '-';
      } else {
        const n = 5 + Math.floor(Math.random() * 3), F = 1 << n;
        const a = 1 + Math.floor(Math.random() * (F - 1)), b = 1 + Math.floor(Math.random() * (F - 1));
        st.M = a.toString(2).padStart(n, '0'); st.N = b.toString(2).padStart(n, '0');
      }
    },
    compute: (st) => (st.mode === 'signed' ? signedM(st) : unsignedM(st)),
    draw(c) {
      const W = c.W, H = c.H, m = c.m, k = c.k, n = m.n, fl = lblFs(W), stg = m.stages[k], at = (s) => m.stages.indexOf(s) <= k;
      const wide = W >= 780, gridAvail = wide ? Math.floor(W * 0.6) : W;
      const lw = gridAvail < 520 ? 64 : 96;
      const s = Math.floor(clamp((gridAvail - lw - 28) / ((n + 1) * 1.2), 22, Math.min(60, (wide ? H - 60 : H) / (wide ? 8.4 : 12.5)))), gap = Math.round(s * 0.2), rowH = s + Math.round(s * 0.34);
      const gw = (n + 1) * (s + gap) - gap, x0 = lw + Math.max(8, Math.floor((gridAvail - lw - 16 - gw) / 2));
      const xb = (i) => x0 + (i + 1) * (s + gap);
      const lab = (y, t, cls) => S.t(x0 - 10, y + s / 2, t, 't-lbl ' + (cls || ''), { a: 'end', mid: true, fs: fit(t, x0 - 16, clamp(s * 0.3, 10.5, 14), 0.78) });
      const rowBits = (y, v, cls, isNew, d0) => { let g = ''; for (let i = 0; i < n; i++) { const j = n - 1 - i; g += S.g(nw(c, isNew), isNew ? (d0 || 0) + j * 120 : 0, S.bit(xb(i), y, s, (v >> j) & 1, typeof cls === 'function' ? cls(i) : cls)); } return g; };
      const rule = (y) => S.l(xb(0) - 4, y, xb(n - 1) + s + 4, y, 'rule');
      const nx = wide ? x0 + gw + 44 : 18, nwid = wide ? W - nx - 18 : W - 36;
      const tfs = clamp(s * 0.42, 14, 20);
      let o = '';
      /* notes: how the operands were made, the overflow check, the result */
      function operands(y) {
        const pfs = clamp(s * 0.36, 12, 16), cw = pfs * 0.6, maxC = Math.max(18, Math.floor(nwid / cw));
        let g = S.lbl(nx, y + 4, 'Operands', fl);
        y += 12;
        m.prep.forEach((tok, i) => {
          if (i === 1 && !at('b')) return;
          const lines = wrap(tok, maxC);
          lines.forEach((ln, j) => { g += S.g(nw(c, (i === 0 && stg === 'a') || (i === 1 && stg === 'b')), j * 120, S.t(nx, y + pfs * 1.35 * (j + 1), ln, j === lines.length - 1 ? 't-b' : '', { fs: pfs })); });
          y += pfs * 1.35 * lines.length + 6;
        });
        if (!at('b')) y += pfs * 1.35 + 6;
        return { o: g, y: y + 14 };
      }
      function notes(y) {
        let out = '';
        if (m.mode === 'signed' && at('ovf')) {
          const sA = (m.A >> (n - 1)) & 1, sB = (m.B >> (n - 1)) & 1, sR = m.sR;
          let g = S.lbl(nx, y, 'Overflow check', fl);
          const t1 = 'Sign bits: ' + sA + ' + ' + sB + ' → ' + sR, t2 = m.V ? 'Overflow: the answer does not fit' : sA !== sB ? 'Opposite signs: no overflow possible' : 'Signs agree: no overflow';
          g += S.t(nx, y + tfs + 8, t1, '', { fs: fit(t1, nwid, tfs) });
          g += S.t(nx, y + 2 * tfs + 18, (m.V ? '✗ ' : '✓ ') + t2, m.V ? 't-bad t-b' : 't-good t-b', { fs: fit('✓ ' + t2, nwid, tfs) });
          let hh = 2 * tfs + 30;
          if (m.M2) { const t3 = 'C into sign ' + m.a1.c[n - 1] + ' ⊕ C out ' + m.cout + ' = ' + (m.a1.c[n - 1] ^ m.cout); g += S.t(nx, y + 3 * tfs + 28, t3, 't-mut', { fs: fit(t3, nwid, tfs * 0.85) }); hh += tfs + 10; }
          out += S.g(nw(c, stg === 'ovf'), 0, g, stg === 'ovf' ? 'data-focus="1"' : '');
          y += hh + 18;
        }
        if (at('res')) {
          let g = S.lbl(nx, y, 'Result', fl);
          let t;
          if (m.mode === 'signed') t = m.sR ? bstr(m.R, n) + ' → −' + m.mag + (m.mag === 0 ? ' (−0 = 0)' : '') : bstr(m.R, n) + ' → +' + m.R;
          else t = 'M − N = ' + (m.neg ? '−' : '') + bstr(m.mag, n) + ' = ' + minus(m.expect);
          const rfs = fit(t, nwid, clamp(s * 0.64, 20, 36), 0.6);
          g += S.t(nx, y + rfs + 10, t, 't-disp', { fs: rfs });
          const chk = m.mode === 'signed' ? (m.V ? 'Overflow: the true answer is ' + minus(m.expect) : 'Check: ' + minus(m.expect) + ' ✓') : 'Check: ' + m.Mv + ' − ' + m.Nv + ' = ' + minus(m.expect) + ' ✓';
          g += S.t(nx, y + rfs + 34, chk, m.mode === 'signed' && m.V ? 't-bad' : 't-good', { fs: fit(chk, nwid, 14) });
          out += S.g(nw(c), 0, g, 'data-focus="1"');
          y += rfs + 50;
        }
        return { o: out, y: y };
      }
      let y = 16, yNotes = 16;
      const op = operands(16);
      o += op.o;
      if (wide) { yNotes = op.y; y = 26; } else y = op.y;
      /* the column addition */
      const yC = y, yA = yC + Math.round(s * 0.62), yB = yA + rowH, yS = yB + rowH + 10;
      const cr = clamp(s * 0.21, 7, 12);
      if (at('add')) {
        for (let j = 1; j < n; j++) if (m.a1.c[j]) o += S.g(nw(c, stg === 'add'), j * 120 - 60, S.chip(xb(n - 1 - j) + s / 2, yC + s * 0.22, cr, '1'));
        if (m.cout) o += S.g(nw(c, stg === 'add'), n * 120 - 60, S.chip(x0 + s / 2, yC + s * 0.22, cr, '1'));
        o += S.t(x0 - 10, yC + s * 0.22, 'CARRY', 't-lbl', { a: 'end', mid: true, fs: 10 });
      }
      o += lab(yA, m.labels[0]) + rowBits(yA, m.A, '', stg === 'a');
      if (at('b')) o += lab(yB, m.labels[1]) + rowBits(yB, m.B, '', stg === 'b');
      let yNext = yS + rowH + 6;
      if (at('add')) {
        o += rule(yB + s + 6) + lab(yS, 'Sum') + rowBits(yS, m.a1.s, stg === 'add' ? 'hot' : '', stg === 'add', 60);
        if (m.cout) o += S.g(nw(c, stg === 'add'), n * 120, S.bit(x0, yS, s, 1));
        else if (at('end')) o += S.cell(x0, yS, s, '0', 'ghost');
      }
      if (at('end')) {
        let g = '';
        if (m.cout && m.M2) {
          g += S.l(x0 + 3, yS + 3, x0 + s - 3, yS + s - 3, 'xout') + S.l(x0 + s - 3, yS + 3, x0 + 3, yS + s - 3, 'xout');
          g += S.t(x0 + s / 2, yS + s + 15, 'dropped', 't-bad', { a: 'middle', fs: 11 });
          yNext = yS + s + 30;
        } else if (m.cout && !m.M2) {
          const yP = yS + rowH + 6, yF = yP + rowH + 10, xl = xb(n - 1);
          g += S.arrow('M' + (x0 + s / 2) + ' ' + (yS + s + 2) + ' L' + (x0 + s / 2) + ' ' + (yP + s / 2) + ' L' + (xl - 6) + ' ' + (yP + s / 2), 'dash', 'f');
          g += S.t(x0 + s / 2 + 6, yP + s / 2 - 8, 'end-around carry', 't-flux t-body', { fs: 12 });
          g += lab(yP, '+ 1') + S.bit(xl, yP, s, 1, 'hot');
          g += rule(yP + s + 6) + lab(yF, 'Result') + rowBits(yF, m.R, 'hot', stg === 'end', 200);
          yNext = yF + rowH + 6;
        } else if (m.mode === 'unsigned' && m.neg) {
          const yP = yS + rowH + 6;
          g += lab(yP, m.cn + ' comp') + S.cell(x0, yP, s, '−', 'inv') + rowBits(yP, m.mag, 'hot', stg === 'end', 120);
          g += S.t(x0 + s / 2, yS + s + 14, 'no carry', 't-mut', { a: 'middle', fs: 10.5 });
          yNext = yP + rowH + 6;
        } else {
          g += S.t(x0 + s / 2, yS + s + 15, 'no carry', 't-mut', { a: 'middle', fs: 11 });
          yNext = yS + s + 30;
        }
        o += S.g(nw(c, stg === 'end'), 0, g, stg === 'end' ? 'data-focus="1"' : '');
      }
      const nt = notes(wide ? yNotes + 8 : yNext + 12);
      o += nt.o;
      return S.svg(W, Math.max(yNext + 6, nt.y + 6), 'Binary addition with complements', o);
    },
  });
})();
