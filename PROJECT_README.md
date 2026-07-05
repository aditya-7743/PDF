# Project Readme - Must Read First

This project is a website-only math equation repair and original-form preview tool.

## Main Instructions

1. Website only. Do not create APK, Android, or desktop builds unless the user asks later.
2. Keep the app in branches/modules so future editing is easy.
3. Main layout now has three parts:
   - Left: empty Tools column reserved for future user-requested features.
   - Middle: paste box for copied ChatGPT/Gemini/LaTeX equation text.
   - Right: professional original-form preview, like a textbook/photo equation.
4. The three columns must stay manually resizable with drag handles, and column sizes should autosave.
5. Math should accept common AI-copied formats such as `$$...$$`, `\\[...\\]`, fractions, roots, powers, matrices, aligned steps, trig, calculus, and Unicode math.
6. After meaningful changes, update this change log.

## Branch Map

- `src/branches/toolBranch.js`: reserved future tool controls; left Tools column is currently empty.
- `src/branches/sampleBranch.js`: sample equations and quick snippets.
- `src/branches/editorBranch.js`: middle paste editor defaults.
- `src/branches/previewBranch.js`: right-side preview defaults.
- `src/branches/appBranch.js`: app-level title and status settings.
- `src/core/normalizer.js`: cleans copied AI/LaTeX/math text.
- `src/core/mathml.js`: parses cleaned math into MathML.
- `src/core/store.js`: browser autosave state.
- `src/ui/layout.js`: renders the three-column website.

## Run

```powershell
C:\Python314\python.exe -m http.server 8765 --bind 127.0.0.1
```

Open:

```text
http://127.0.0.1:8765/
```

## Change Log

### 2026-07-05 - Added Image Tools Button

- Added a third top mode button named Image Tools beside Equation Editor and Math Figures.
- Wired Image Tools as a real app mode so its active state works instead of falling back to Equation Editor.

### 2026-07-05 - Emptied Image Tools Mode

- Removed the temporary label, markup, canvas, and toolbar content from Image Tools.
- Kept the Image Tools top button active, with an empty workspace reserved for future image features.

### 2026-07-05 - Added Image To PDF Tool

- Added an Image to PDF button inside Image Tools with a dedicated upload and conversion workspace.
- Added browser-side image-to-PDF export without external services or build dependencies.
- Added image queue previews, ordering controls, remove/clear actions, page size, orientation, fit, margin, quality, background, and filename customization.

### 2026-07-05 - Expanded Image Add Options

- Made the Image to PDF add area explicitly support Browse, Drag & Drop, and Ctrl+V paste sources.
- Added clipboard image handling so copied screenshots/images can be pasted directly into the queue.
- Added a Paste button that reads supported clipboard images or focuses the panel for Ctrl+V fallback.

### 2026-06-28 - Fresh Three-Panel Website

- Rebuilt the empty folder as a new static website.
- Added a professional three-part UI:
  - left chapter/tools panel
  - middle pasted equation editor
  - right original-form equation preview
- Added modular branch files for tools, samples, editor settings, preview settings, and app settings.
- Added a math normalizer for AI-copied equation text.
- Added a MathML renderer so fractions, square roots, brackets, powers, matrices, and aligned equations render in a proper textbook style.

### 2026-06-28 - Removed Equation Preview Scrollbar

- Removed internal scroll behavior from the original-form preview.
- Added automatic equation fitting after render so long equations shrink visually to fit inside the preview canvas.
- Kept the font-size control as the maximum size; the app only reduces the displayed size when the equation would overflow.

### 2026-06-28 - Removed Canvas Width Controls

- Removed the Canvas Width slider and Width number input from the right preview panel.
- The preview canvas now automatically uses the available panel width.
- Removed canvas width from default state and preview branch settings.

### 2026-06-28 - Improved Bracket Sizing

- Adjusted `\\left(...\\right)` output to use custom stretch-fence classes.
- Parentheses around fractions now render taller and closer to the original reference image.
- Kept normal parentheses smaller while only stretching explicit left/right bracket groups.

### 2026-06-28 - Enabled Visual Output Editing

- Replaced the source-code edit mode in the right preview panel.
- The rendered equation output itself is now directly editable with `contenteditable`.
- Manual visual edits are saved as a visual override, so no LaTeX/source textarea appears in the preview.
- Added `Rebuild From Input` to discard visual edits and regenerate the output from the middle paste box.

### 2026-06-28 - Removed Left Tools Panel

- Removed the left Chapters/Samples/Insert sidebar from the UI.
- Changed the workbench to a clean two-column layout: paste input and original-form preview.
- Removed active chapter/tool state from the running app.

### 2026-06-28 - Restored Empty Tools Column

- Restored the left Tools column after the user clarified the column should remain.
- Kept the column empty so future features can be added there without bringing back old chapter/sample items.
- Changed the workbench back to three columns: empty Tools, paste input, and original-form preview.

### 2026-06-28 - Added Draggable Column Resize

- Added drag handles between Tools/Input and Input/Preview so all three columns can be resized by cursor drag.
- Saved column sizes in local autosave state so the user's custom layout remains after refresh.
- Moved column defaults and minimum widths into `src/branches/appBranch.js`.
- Cleared `src/branches/toolBranch.js` to an empty `groups: []` branch for future feature additions.

### 2026-06-28 - Added Professional Math Tools Catalog

- Filled the left Tools column with grouped insert options for geometry shapes, mensuration, algebra, trigonometry, coordinate geometry, calculus, and statistics.
- Added direct canvas insertion for shape/solid tools using ready SVG figures with formulas.
- Added formula tools that insert LaTeX into the paste input and immediately render in the original-form canvas.
- Kept the tools data in `src/branches/toolBranch.js` so more chapters and templates can be added without changing the layout code.

### 2026-06-28 - Compacted Tools Panel

- Converted tool items into dense single-line insert rows with compact type badges.
- Collapsed all tool groups by default so the sidebar stays clean as more features are added.
- Moved item details into hover text and reduced spacing across the Tools column.

### 2026-06-28 - Preserved Active Tool Group

- Saved the open Tools category in app state so selecting a tool no longer jumps the sidebar back to Geometry.
- Made the Tools panel behave like a compact accordion with only one category open at a time.
- Added a subtle active state for the selected tool row.

### 2026-06-28 - Converted Tools To Two-Column Dropdowns

- Replaced expandable tool lists with compact dropdown menus for each category.
- Arranged tool categories in a two-column grid to reduce empty space in the Tools panel.

### 2026-06-28 - Added Preview Editing Toolbar

- Replaced the Original Form title strip with a compact text/equation editing toolbar.
- Added font, size, bold, italic, underline, color, highlight, link, image, list, indent, clear-formatting, and quick equation insert controls.
- Connected Left/Center/Right alignment to the actual canvas placement, so left and right move content to the canvas edges.

### 2026-06-28 - Added Figure Customizer Bar

- Replaced the bottom preview help/footer row with selected-figure customization controls.
- Added live controls for stroke color, fill color, fill on/off, line width, line style, fill opacity, and object opacity.
- Added selected-figure actions for duplicate, front/back layering, crop mode, crop reset, and delete.

### 2026-06-28 - Simplified Figure Customizer Bar

- Removed the X, Y, W, H, and Rot numeric fields from the selected-figure customizer.
- Kept move, resize, stretch, and rotate available through the on-canvas selection handles.

### 2026-06-28 - Further Compacted Figure Customizer

- Removed L, T, R, and B crop sliders from the bottom customizer.
- Removed Cap and Join dropdowns from the bottom customizer.
- Kept crop, resize, stretch, rotate, line cap, and line join behavior available through defaults and canvas handles.

### 2026-06-28 - Fixed Cropped Figure Edge Clipping

- Added stroke-aware padding to crop clip masks so cropped figures keep their outer outline intact.
- Kept crop handles aligned to the true crop boundary while only expanding the hidden SVG mask.
- Added a small overlap on active crop edges to remove white anti-alias seams at the crop boundary.
- Kept direct canvas insertion behavior when a dropdown option is selected.

### 2026-06-28 - Simplified Dropdown Grid Styling

- Removed category card borders and count badges from the Tools grid.
- Removed type prefixes from dropdown option labels for a cleaner professional look.
- Flattened spacing and typography so the Tools panel reads as a compact form instead of stacked mini cards.

### 2026-06-28 - Added Manual Authoring Below Dropdowns

- Added a divider line directly below the Tools dropdown grid.
- Added compact chapter icon shortcuts below the divider for Geometry, Mensuration, Algebra, Trigonometry, Coordinate Geometry, and Calculus.
- Added equation snippet buttons for manual formula writing.
- Added manual drawing buttons with label text, label position, and alignment controls for basic figure creation.

### 2026-06-28 - Removed Lower Template Dropdowns

- Removed Algebra, Trigonometry, Coordinate Geometry, and Calculus & Statistics from the top template dropdown grid.
- Kept Geometry Shapes and Mensuration above the divider, with manual chapter tools below the divider.

### 2026-06-28 - Replaced Figure Dropdowns With Icon Palette

- Removed the remaining Geometry Shapes and Mensuration dropdown controls.
- Added compact SVG icon buttons for Geometry and Mensuration figures.
- Figure icon selection now draws only the shape/solid on the canvas with no title, formula, or text labels.
- Removed the manual Label draw option from the Free Draw section.

### 2026-06-28 - Made Figure Palette Icons Visible

- Replaced reused large figure SVGs in the palette with dedicated compact icon glyphs.
- Added icon-specific SVG styling so figure choices are visible inside small square buttons.
- Kept canvas drawing free of automatic side labels such as repeated `a` markers.

### 2026-06-28 - Added Freeform Figure Editing

- Changed figure icon behavior from instant hardcoded insert to tool selection.
- Added drag-to-draw behavior on the original-form canvas for selected figure tools.
- Kept the newly drawn figure selected until the user clicks outside it.
- Added selection handles for resize/stretch, a rotate handle, and a crop toggle with crop handles.

### 2026-06-28 - Expanded Drawing Surface To Full Canvas

- Removed the fixed centered drawing workspace in figure drawing mode.
- Made the drawing SVG fill the entire original-form canvas so figures can be drawn anywhere inside it.
- Removed drawing-mode canvas padding so pointer coordinates map to the full visible canvas area.

### 2026-06-28 - Fixed Drawn Shape Edge Clipping

- Stopped applying SVG clip paths to normally drawn shapes.
- Kept clipping only for shapes that the user has intentionally cropped.
- Prevented curved and stroked figure edges from being cut off at their bounding box.
