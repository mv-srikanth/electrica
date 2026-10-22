# Electrica Machine Atlas

An interactive 3D explorer of electrical machines for teaching. Students can take each
machine apart, slice it open, step through its parts and watch the magnetic flux move.

Machines included:

- Single-phase transformer (core type)
- Three-phase oil-immersed distribution transformer (11 kV / 433 V, ONAN) with tank, oil,
  conservator, breather, Buchholz relay, radiators, bushings, tap switch and the other fittings
- DC shunt motor (two-pole)
- Three-phase squirrel-cage induction motor (two-pole, TEFC)
- Three-phase salient-pole alternator (four-pole)

The site is plain HTML, CSS and JavaScript. There is no build step and nothing to install.

## What is in this folder

```
index.html                  the page; lists the machine files in the order they appear
favicon.svg                 browser-tab icon
css/style.css               colours, fonts and layout (light and dark themes)
js/core.js                  the 3D viewer, view modes and page logic (normally left alone)
js/machines/                one file per machine
    transformer.js
    distribution-transformer.js
    dc-motor.js
    induction-motor.js
    alternator.js
    _template.js            a working example to copy when you add a machine
js/vendor/                  three.js r128 (3D library, MIT licence), kept here so it works offline
README.md                   this file
```

## Try it on your computer

Double-click `index.html`. It opens in your browser and works without internet,
which is handy in a lab. (With internet it also loads the Google fonts; without, it
falls back to the computer's own fonts.)

Direct links to a machine work too: `index.html#induction-motor`.

## Put it online

The folder is a static site, so any static host works. Two free options:

### Option A: GitHub + Vercel (the same set-up as Mechanica)

1. Make a free account at github.com. Click **New repository**, name it `electrica`,
   choose **Public**, and create it.
2. On the new repository page, click **uploading an existing file**. Drag in everything
   inside this folder (so `index.html` sits at the top level, not inside another folder).
   Click **Commit changes**.
3. Go to vercel.com and sign up with your GitHub account. Choose **Add New → Project**,
   pick the `electrica` repository and click **Import**.
4. Leave **Framework Preset** as **Other** and click **Deploy**. After a minute you get an
   address like `https://electrica-xxxx.vercel.app`. You can change the name under the
   project's **Settings → Domains**.

From then on, every change you commit on GitHub is published automatically.
Vercel's free Hobby plan is for personal, non-commercial use.

### Option B: GitHub Pages only

After step 2 above, open the repository's **Settings → Pages**. Under **Build and
deployment**, set **Source** to **Deploy from a branch**, choose `main` and `/ (root)`,
and click **Save**. The site appears at `https://<your-username>.github.io/electrica/`
after a minute or two.

### Option C: the college web server

Copy the whole folder to any web server (for example a department site). No server-side
code is needed.

## Add a new machine

1. Copy `js/machines/_template.js` to a new file, for example `js/machines/stepper-motor.js`.
2. In the new file, set `id` to the same name (`'stepper-motor'`) and fill in the text:
   `short`, `name`, `kind`, `sub`, `plate`, `principle`, `formulas` and `fluxNote`.
3. Build the model inside `build`. The template is a working solenoid with comments on
   every step. Copying an existing machine that is close to yours is often the quickest
   start (for example `dc-motor.js` for a universal motor).
4. Add one line to `index.html`, above `<script>Electrica.start();</script>`:

   ```html
   <script src="js/machines/stepper-motor.js"></script>
   ```

5. Open `index.html` and check every view: Assembled, Cutaway, Exploded, Walkthrough and Flux.
   If the build fails, the viewer shows the error message and the file to check.
   Press F12 for the browser console if you need more detail.

### The build kit

Inside `build: function (k, m) { ... }`, `k` holds the helpers and `m` is the machine.

| Helper | What it makes |
| --- | --- |
| `part({ name, role, material, look, casing })` | one entry in the components list. `casing: true` fades it out in Flux view |
| `add(part, geometry, material, { pos, rot, ex, rotor, opacity })` | puts a piece in the scene. `ex` is the exploded offset at 100% Separation; `rotor: true` makes it turn; `opacity` below 1 keeps it see-through (oil, glass) |
| `annulus(rOuter, rInner, length, a0, a1)` | a tube along z; give `a0`, `a1` (radians) for a sector such as a pole shoe or commutator segment |
| `cyl(radius, length)` | a solid cylinder along y (rotate by `[Math.PI / 2, 0, 0]` to lie along z) |
| `ringRR(w, d, wall, radius, height)` | a coil wound round a rectangular limb, height along y |
| `frameShape(W, H, R, w, h, r)` + `extrude(shape, depth)` | a rounded rectangle with a hole, such as a transformer lamination |
| `slotPts(r, n, depth, width, dir)` + `polyShape(outline, holes)` + `extrude(...)` | slotted stator and rotor laminations |
| `circlePts(r, n, cx, cy)` | a circle outline for `polyShape` outlines and holes |
| `makeFlux(loops, perLoop, size, colour)` | particles round closed loops of points; colour defaults to `flux` (use `copper` for oil flow) |
| `fluxMaterial(opacity, colour)` | a see-through material in the flux colour, for arrows |
| `material(name, extra)` | a named material with extra settings, such as a canvas texture for a rating plate |
| `THREE`, `V(x, y, z)`, `pol(r, angle, z)`, `TAU` | three.js itself and small shortcuts |

Materials: `lamA lamB steel copper copperDk board paint shaft alu carbon brass porcelain mica dark R Y B oil glass gel`
(`R`, `Y`, `B` are the phase colours; `oil` and `glass` look best with `opacity`).

Settings on `m`:

| Setting | Meaning |
| --- | --- |
| `m.speed` | rotor speed in radians per second on screen; `0` means no moving parts |
| `m.fluxUpdate = (t) => { ... }` | called every frame in Flux view with the time in seconds |
| `m.waves` | lines on the Flux-view scope: `{ label, color, f: (t) => value between -1 and 1 }`. Colours: `copper ink flux phR phY phB` |
| `m.cutNormals` | which quarter Cutaway removes; `[[-1,0,0],[0,-1,0]]` removes x > 0 and y > 0 |
| `m.camDir` | the direction the camera starts from, such as `[7, 4, 7.5]` |
| `m.fluxGroup`, `m.rotor` | groups you can add extra objects to; add `m.fluxGroup` to `m.rotor` if the field turns with the rotor |

## Ideas for next machines

Synchronous motor, universal motor, stepper motor, BLDC motor, shaded-pole motor,
current transformer, on-load tap changer.

## Credits

3D rendering by three.js (MIT licence, see `js/vendor/THREE-LICENSE.txt`).
The ratings on each plate are examples for teaching, and the models are simplified,
not to scale.
