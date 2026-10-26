# Electrica

Prepared by **Dr M. V. Srikanth**, EEE, VWU

Interactive teaching pages for electrical engineering, grouped in three modules:

| Module | Page | What it covers |
| --- | --- | --- |
| Machines | `index.html` | 3D machines you can take apart: series and parallel magnetic circuits, single-phase transformer, 1 MVA distribution transformer, DC shunt motor, induction motor, alternator |
| Power systems | `substation.html` | A working 110 / 22 kV zone substation in 3D, with a live single-line diagram, switching, power flow, a guided tour and exercises |
| Digital | `digital.html` | Digital electronics, Module 1: number systems worked step by step from the student's own numbers |

The site is plain HTML, CSS and JavaScript. There is no build step and nothing to install.
The three pages link to each other through the bar at the top right.

## What is in this folder

```
index.html                     Machines page; lists the machine files in the order they appear
substation.html                Power systems page (zone substation)
digital.html                   Digital electronics page; lists the topic files in order
favicon.svg                    browser-tab icon
README.md                      this file

css/style.css                  colours, fonts and layout for Machines and Power systems (light and dark)
css/substation.css             extra layout for the substation page
css/digital.css                colours, fonts and layout for the Digital page (light and dark)

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

Double-click `index.html` (or `substation.html`, `digital.html`). It opens in your browser and
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
illustrative. Further power-systems models can sit beside it in `js/power-systems/` with their
own page, linked from the bar at the top.

## Colours and themes

Every page follows the computer's light or dark setting. Colours are set once at the top of each
CSS file as variables (`--copper`, `--flux`, `--good` and so on), with the dark values just below.
