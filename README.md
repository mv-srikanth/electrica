# Electrica

Prepared by **Dr M. V. Srikanth**, EEE, VWU

Interactive teaching pages for electrical engineering, grouped in three modules:

| Module | Page | What it covers |
| --- | --- | --- |
| Machines | `index.html` | 3D machines you can take apart: series and parallel magnetic circuits, single-phase transformer, 1 MVA distribution transformer, DC shunt motor, induction motor, alternator |
| Power systems | `substation.html` | A working 110 / 22 kV zone substation in 3D, with a live single-line diagram, switching, power flow, a guided tour and exercises |
| Power systems | `hydro.html` | A 3 × 40 MW hydro power plant in 3D: the water's path from reservoir to tailrace, the surge tank, a cutaway powerhouse with Francis turbines, and live head, flow and power as you operate it |
| Digital | `digital.html` | Digital electronics, Module 1: number systems worked step by step from the student's own numbers |

The site is plain HTML, CSS and JavaScript. There is no build step and nothing to install.
The three pages link to each other through the bar at the top right, beside the theme switch.

## What is in this folder

```
index.html                     Machines page; lists the machine files in the order they appear
substation.html                Power systems page (zone substation)
hydro.html                     Power systems page (hydro power plant)
digital.html                   Digital electronics page; lists the topic files in order
favicon.svg                    browser-tab icon
README.md                      this file

css/base.css                   the shared look of all three pages: colours, fonts, header, figure card, buttons
css/style.css                  layout for Machines, and the 3D figure card shared with Power systems
css/substation.css             extra layout for the substation page
css/hydro.css                  extra layout for the hydro page, and the colours of its ground and water
css/digital.css                layout for the Digital page, and the colours of its drawings

js/site.js                     the theme switch in the header (Auto, Light, Dark), shared by all pages
js/core.js                     the 3D viewer and page logic for Machines (normally left alone)
js/machines/                   one file per machine
    magnetic-circuit-series.js
    magnetic-circuit-parallel.js
    transformer.js
    distribution-transformer.js
    dc-motor.js
    induction-motor.js
    alternator.js
    _template.js               a working example to copy when you add a machine

js/power-systems/              one folder per power-systems model
    substation/
        data.js                equipment list, descriptions, tour and exercises
        network.js             switching logic: what is live, earthed or dead
        sld.js                 the single-line diagram
        scene.js               the 3D model
        app.js                 the page around them
    hydro/
        data.js                the components in the order the water meets them, the rating plate, formulas
        model.js               the plant in numbers: heads, flows, efficiency, power and the surge tank
        scene.js               the 3D model: the valley as a block, the dam, tunnel, penstock, powerhouse, line
        app.js                 the page around them

js/digital/
    core.js                    number helpers, the drawing kit and the step-by-step page (normally left alone)
    topics/                    one file per topic, Module 1
        01-digital-systems.js        analog vs digital, sampling, quantizing, noise
        02-number-systems.js         binary, octal, decimal, hexadecimal; place values; counting
        03-radix-conversion.js       any base to any base, with fractions
        04-complements.js            r's and (r-1)'s complements
        05-signed-numbers.js         unsigned, sign-magnitude, 1's and 2's complement
        06-complement-arithmetic.js  addition and subtraction with 1's and 2's complement, overflow
        07-binary-codes.js           BCD 8421, Excess-3, Gray code and the shaft encoder
        08-gray-binary.js            Gray to binary and binary to Gray with XOR
    _template.js               a working example to copy when you add a topic

js/vendor/                     three.js r128 (3D library, MIT licence), kept here so it works offline
```

## Try it on your computer

Double-click `index.html` (or `substation.html`, `hydro.html`, `digital.html`). It opens in your browser and
works without internet, which is handy in a lab. With internet it also loads the Google fonts;
without, it falls back to the computer's own fonts.

Direct links work too:
`index.html#induction-motor`, `digital.html#complements`, `digital.html#codes`.

## Put it online

The folder is a static site, so any static host works.

### Option A: GitHub + Vercel

1. Make a free account at github.com. Click **New repository**, name it `electrica`,
   choose **Public**, and create it.
2. On the new repository page, click **uploading an existing file**. Drag in everything
   inside this folder (so `index.html` sits at the top level, not inside another folder).
   Click **Commit changes**.
3. Go to vercel.com and sign up with your GitHub account. Choose **Add New → Project**,
   pick the `electrica` repository and click **Import**.
4. Leave **Framework Preset** as **Other** and click **Deploy**.

Every later upload to the repository redeploys the site within about a minute.
Press Ctrl+Shift+R on the live site to skip the browser's cached copy.

### Option B: GitHub Pages

After step 2 above, open the repository's **Settings → Pages**, set **Source** to
**Deploy from a branch**, choose **main** and **/ (root)**, and save. The site appears at
`https://<your-user-name>.github.io/electrica/` after a minute or two.

### Option C: any web server

Copy the folder to the server's web root. Nothing needs to run on the server.

### Updating an existing site

Upload the **contents** of the new folder to the repository, not the folder itself, and commit.
Files with the same name are replaced and new files are added. Files that are no longer used
are not removed by an upload; they do no harm, and you can delete them on GitHub if you like
(for example the old `js/substation/` folder, now `js/power-systems/substation/`).

## Add a machine

1. Copy `js/machines/_template.js` and rename it, for example `js/machines/stepper-motor.js`.
2. Change its `id` to match the file name, then build the parts as the comments explain.
3. In `index.html`, add a line above `<script>Electrica.start();</script>`:
   `<script src="js/machines/stepper-motor.js"></script>`
4. Open `index.html` and click the new machine. If something is wrong the viewer says which
   file to check (more detail in the browser console, F12).

## Add a Digital topic

1. Copy `js/digital/_template.js` to `js/digital/topics/`, for example `09-error-detection.js`.
2. Give it its own `id`, names, controls, a `compute` function that works out the steps from the
   student's input, and a `draw` function that draws each step. The comments in the template
   list the drawing kit (cells, bits, carry chips, arrows) and the number helpers.
3. In `digital.html`, add a line above `<script>ND.start();</script>`:
   `<script src="js/digital/topics/09-error-detection.js"></script>`
4. Open `digital.html`. Topics appear in the order of their script lines.

The Digital page keeps all arithmetic exact (whole numbers and fractions as BigInt), so long
numbers and fractions in any base from 2 to 16 give the right digits.

## Power systems

The substation model is based on the TasNetworks *Substation General Equipment Detail and
Layout Standard* (R1089602, July 2018): the equipment list in section 2, the 'H' arrangement in
Appendix D and the single bus in Appendix F. Layout, dimensions and ratings marked "typical" are
illustrative.

The hydro power plant is a teaching example rather than a real station. Its numbers are typical
of a medium-head storage plant:

- **Levels:** full reservoir 505 m, minimum drawdown 475 m, tailwater 400 m, dam crest 512 m.
- **Units:** three 40 MW vertical Francis units at 100 m and 45 m³/s each, 300 rpm (20 poles, 50 Hz).
- **Waterway:** a 1.8 km, 6 m tunnel with a 19.5 m surge tank.

The page works these out from `js/power-systems/hydro/model.js`:

- **Power:** P = ρ g Q H η.
- **Net head:** the gross head, less friction in the tunnel and penstock, plus any surge in the tank.
- **Turbine efficiency:** best near 85% of rated flow.
- **Surge tank:** the tunnel's water column speeding up and slowing down. Its swing is shown 20 times
  faster than real; the true period is about 4.5 minutes.

The model is drawn as a block of valley cut out of the ground, with the tunnel and the surge shaft
shown through the hill.

Each power-systems model has its own page and a folder in `js/power-systems/`. A switch above the
heading of each page moves between them; add a link there for any new model.

## Look and themes

The pages follow the figure style of the Anatomy skill (github.com/wheresryan22/anatomy):

- Neutral paper tones, and square cards with a thin frame.
- Each figure has small labels in its corners: **Fig n** at top left, the title at top right, how to
  use it at bottom left, and a live readout at bottom right (for example `Exploded · 85% apart`,
  `6 / 6 customers supplied · 43.6 MW`, `Step 03 / 06`).
- Colour only where colour means something: phases, flux, live and dead circuits, the 1s in a number.
- The Machines viewer uses an isometric camera, raised 30 degrees, so parallel edges stay parallel
  as in a technical drawing. Drag still turns the machine and scrolling still zooms.

The button at the top right of every page switches the colour theme: **Auto** follows the computer's
light or dark setting, **Light** and **Dark** override it. The browser remembers the choice.
Light usually reads better on a classroom projector.

Colours are set once as variables (`--ink`, `--panel`, `--line` and so on) at the top of
`css/base.css`, with the dark values just below. Page files add their own colours there too
(`--copper`, `--flux`, `--live110` and so on).
