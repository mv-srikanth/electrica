/* ===================== Template for a new Digital topic =====================
   1. Copy this file to js/digital/topics/NN-your-topic.js (NN sets nothing; order is the <script> order).
   2. Add  <script src="js/digital/topics/NN-your-topic.js"></script>  to digital.html, before  ND.start().
   3. Reload. The topic appears in the list on the left with its own controls, steps and drawing.

   How a topic works
   - init()           returns the starting state, e.g. { num: '1011' }.
   - controls(st)     returns HTML for the control bar, built with C.seg / C.input / C.select / C.range.
                      Every control carries a key; the page writes the new value to st[key] and calls compute().
   - set(st, key, v)  optional. Return true if you stored the value yourself (e.g. one number per base).
   - random(st)       fills st with a fresh example (the "New example" button).
   - compute(st)      does the arithmetic and returns { steps, plate, ... } or { err, errKey } for bad input.
                      steps: [{ t: 'short title', d: 'one or two sentences', look: 'optional hint' }]
                      plate: [['Label', 'value'], ...] for the Key values card, or a function (k) => rows.
   - draw(c)          returns one SVG string for step c.k. c = { W, H, m, k, st, anim }:
                      W x H is the board in pixels, m is what compute() returned.
                      Draw what is true at step k, and give the newest part class nw(c) so it animates in.
                      Mark the part the student should look at with  data-focus="1"  so the board scrolls to it.

   Drawing kit (all return SVG text): S.cell(x, y, size, '7', 'hot'), S.bit(x, y, size, 1),
   S.chip(cx, cy, r, '1') for a carry, S.t(x, y, 'text', 't-acc', { fs: 14, a: 'middle' }), S.lbl(x, y, 'LABEL'),
   S.l(...) line, S.r(...) rect, S.p(d, 'arr') path, S.arrow(d, 'c', 'c') arrow, S.g(cls, delayMs, inner) group.
   Cell classes: one, zero, hot (blue ring), sgn (red ring), okc (green ring), ghost (dashed), inv, gR, gY, gB, dim.
   Text classes: t-mut, t-lbl, t-acc (orange), t-flux (blue), t-bad (red), t-good (green), t-disp (large), t-b (bold).
   Number helpers: ND.parse(str, base, { maxInt, maxFrac }) -> { ip, fp } digit arrays or { err },
   ND.ival(ip, r) BigInt value, ND.fval(fp, r) -> { num, den }, ND.toDigits(BigInt, r), ND.fmtN(ip, fp, r) '(1011)₂'.
*/
(function () {
  const { S, C, clamp, nw, lblFs, fit, parse, ival, fmtN } = ND;

  function compute(st) {
    const p = parse(st.num, 2, { maxInt: 16, maxFrac: 0 });
    if (p.err) return { err: p.err, errKey: 'num' };
    const ones = p.ip.filter((d) => d === 1).length;
    const value = ival(p.ip, 2).toString();
    return {
      bits: p.ip, ones: ones, value: value,
      steps: [
        { t: 'Read the bits', d: 'The number ' + fmtN(p.ip, [], 2) + ' has ' + p.ip.length + ' bits.' },
        { t: 'Count the 1s', d: 'There are ' + ones + ' ones. Its value is ' + value + ' in decimal.', look: 'The orange cells are the 1s.' },
      ],
      plate: [['Bits', String(p.ip.length)], ['Ones', String(ones)], ['Value', value]],
    };
  }

  ND.register({
    id: 'my-topic',                       /* used in the address: digital.html#my-topic */
    short: 'My topic',                    /* name in the topic list */
    kind: 'One-line description',         /* line under the name, and the kicker over the title */
    name: 'My topic, full title',         /* the big title on the board */
    sub: 'A short subtitle',
    icon: '<rect x="6" y="12" width="32" height="20" rx="3"/><text x="22" y="26.5">01</text>',  /* 44 x 44 */
    principle: 'Two or three sentences on the idea behind the topic.',
    formulas: ['A key relation', 'Another key relation'],
    slips: ['A mistake students often make.'],
    init: () => ({ num: '101101' }),
    controls: (st) => C.input('num', 'Binary number', st.num, 18, 'numeric'),
    random(st) { let s = '1'; for (let i = 0; i < 7; i++) s += Math.random() < 0.5 ? '0' : '1'; st.num = s; },
    compute: compute,
    draw(c) {
      const W = c.W, m = c.m, k = c.k, n = m.bits.length;
      const s = Math.floor(clamp((W - 40) / (n * 1.2), 22, 64)), gap = Math.round(s * 0.2);
      const x0 = Math.round((W - (n * (s + gap) - gap)) / 2);
      let o = S.lbl(x0, 30, 'The number', lblFs(W)), y = 44;
      m.bits.forEach((d, i) => { o += S.bit(x0 + i * (s + gap), y, s, d, k === 1 && d === 1 ? 'hot' : ''); });
      y += s + 30;
      if (k >= 1) {
        const txt = m.ones + ' ones · value ' + m.value;
        o += S.g(nw(c), 0, S.t(x0, y + 24, txt, 't-disp', { fs: fit(txt, W - 2 * x0, 32, 0.6) }), 'data-focus="1"');
        y += 50;
      }
      return S.svg(W, y + 10, 'My topic drawing', o);
    },
  });
})();
