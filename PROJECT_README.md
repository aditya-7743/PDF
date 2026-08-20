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

### 2026-08-20 - Multi-Image Per Slide (2-3+ Diagrams) & Slide Navigation Fixes

- **Multiple Images Per Slide**:
  - You can now add **2, 3, or more diagrams/graphs/images** onto a single slide!
  - Use `Ctrl + V` (paste) or `[ + Add Image ]` or `[ 📁 Browse ]` to add as many images as you need.
  - Each image gets its own independent Canva transform box (`✥ Diagram 1`, `✥ Diagram 2`, etc.), independent drag position, independent dimensions, and individual `✕` / `🗑️` delete button.
  - Synchronized in full quality across Canva canvas, Live Preview, PDF exports, and PPTX exports.
- **Fixed Slide Navigation & Functions**:
  - Added dedicated **`+ New Slide`** button right next to `◀ Prev` / `Next ▶` in the top toolbar for 1-click slide addition.
  - Fixed slide index boundary validations and active focus retention so clicking slide navigation buttons always switches slides instantly without getting stuck.

### 2026-08-20 - Divider Line Move & Width Stretch Free-Transform Fix

- **2D Freeform Move (X & Y)**:
  - Enabled full vertical (`dividerPosY`) and horizontal (`dividerPosX`) drag repositioning on the **`✥ Divider`** pill.
- **Canva Stretch Handles & Live Sync**:
  - Attached Canva transform box and edge stretch handles directly to `.slide-divider-wrapper` with live CSS translation and width scaling.
  - Divider adjustments synchronize perfectly across canvas, live preview, PDF exports, and PPTX exports.

### 2026-08-20 - Previous / Next Slide Quick Navigation Icons in Top Toolbar

- **Toolbar Slide Navigation Group**:
  - Added dedicated **`◀ Prev`** and **`Next ▶`** navigation icon buttons with a live **`Slide X / Y`** counter directly in the Top Toolbar (right next to `[ 🖼️ Add Image ]`).
  - Allows 1-click switching between slides without having to scroll down to the slide tab strip.
- **Keyboard Shortcuts**:
  - `PageUp` / `Alt + ←` to go to Previous Slide.
  - `PageDown` / `Alt + →` to go to Next Slide.

### 2026-08-20 - Direct Whole-Box Dragging & 1-Click Diagram Removal Fix

- **Direct Whole-Box Dragging**:
  - You can now click and drag **anywhere directly inside the diagram box or image** to move it smoothly across the slide (like in PowerPoint/Canva), in addition to using the `✥ Diagram / Graph` pill.
  - Image drag handles scale smoothly without leaving blank letterboxes or distortions (`object-fit: contain`).
- **1-Click Diagram Removal**:
  - Clicking the red **`✕`** on the canvas or **`🗑️ Remove`** in the middle editor immediately and cleanly removes the diagram from the slide.

### 2026-08-20 - Made Diagram an Independent Absolute Floating Layer (Zero Text/Option Displacement)

- **Independent Absolute Layer**:
  - Moved `.slide-image-container` to `position: absolute;` on its own dedicated canvas floating layer.
  - Adding, resizing, or moving a diagram now has **ZERO effect** on English text, Hindi text, Exam Tag, or Options Grid — all other elements and fonts **stay 100% frozen in their exact positions**!

### 2026-08-20 - Removed Restrictive Clamping on Options & Question Drag Positions

- **100% Unconstrained Freeform Drag**:
  - Removed artificial vertical clamping limits (previously restricted to `+60px` max down) on `optionsPosY`, `engPosY`, `hindiPosY`, `examTagPosY`, and `topicPosY`.
  - You can now drag the **Options Grid** all the way to the very bottom, footer, or anywhere on the slide without it getting stuck!

### 2026-08-20 - Slide Diagram / Graph / Image Paste & Canva 8-Point Free-Transform

- **Instant Clipboard Image Paste (`Ctrl + V`)**:
  - Simply copy any math diagram, geometry figure, pie chart, or take a screenshot with **`Win + Shift + S`**, and press **`Ctrl + V`** anywhere on the slide canvas or editor to attach it instantly to the active question slide.
- **Dedicated Diagram / Graph Card & Toolbar Button**:
  - Added **`🖼️ Add Image`** button in the Top Toolbar and a dedicated **`🖼️ Diagram / Graph (Optional)`** card in the Middle Content Editor with `📁 Browse Diagram Image` and `📋 Paste Image` buttons.
- **Canva 8-Point Free-form Bounding Box**:
  - The pasted diagram gets a live interactive bounding box (`✥ Diagram / Graph`) with 8 handles (`nw`, `ne`, `se`, `sw`, `n`, `s`, `e`, `w`) for scaling, width stretching, and drag repositioning anywhere on the slide.
  - Delete button (`✕` / `🗑️ Remove`) to clear the diagram anytime.
- **Export Parity (PDF & PPTX)**:
  - Slide diagrams render seamlessly in both PDF canvas exports and native PowerPoint `.pptx` presentations!

### 2026-08-20 - Context-Aware Formatting Toolbar (Smart Target Detection)

- **Smart Target Detection & Formatting**:
  - Clicking / selecting any element (e.g. **Options A/B/C/D**, **Hindi Question**, **English Question**, **Topic Name**, **Exam Tag**) dynamically shifts toolbar focus to that specific element.
  - Clicking **`+` / `−`** (Font Size) or adjusting the font dropdown / text color now precisely modifies the **active target's styling** (e.g. `optionFontSize`, `optionFontFamily`, `optionTextColor` when focused on Options).
  - The toolbar font size badge dynamically shows target context: `Font Size (Options: 18px)`, `Font Size (English: 19px)`, `Font Size (Hindi: 18px)`, etc.
- **Left Panel Option Font Size Slider**:
  - Added dedicated `Option Font Size (px)` slider in the Left Panel Customizer under **Option Cards & Layout** for full manual control.

### 2026-08-20 - Fixed Scroll Position Jumping & Active Slide Tab Auto-Centering

- **Persistent Panel Scroll Positions**:
  - Automatically snapshots and restores the exact vertical and horizontal scroll positions of the Left Customizer Panel (`.ppt-tools-panel`), Middle Content Editor (`.ppt-editor-body`), and Slide Tabs strip across renders.
  - When editing Option inputs or question fields at the bottom of the editor, the view **stays locked at that exact spot** instead of jumping back up to the top!
- **Active Slide Tab Auto-Centering**:
  - Selecting any slide (e.g. `Q.5`, `Q.12`, `Q.25`) automatically scrolls the horizontal slide tab bar to keep that active slide in view, rather than snapping back to `Q.1`.
- **Input Focus & Caret Retention**:
  - Preserves input focus and cursor position during live edits.

### 2026-08-20 - Added "Apply Changes Scope: 🌐 All Slides (Master) vs 🎯 Slide Only" Feature

- **Visible Scope Control (Top Toolbar & Left Customizer Panel)**:
  - **`🌐 All Slides (Master)`**: Changes made to colors, fonts, widths, and drag positions apply across all slides as the global default.
  - **`🎯 Slide [X] Only`**: Fine-tune an individual question (e.g. adjust width for a longer Hindi question or reposition elements for a specific math diagram) **without disturbing or shifting any previous or next slides**.
- **`🚀 Push to All` & `🔄 Reset Slide` Buttons**:
  - When a slide has custom adjustments, a **`🎯 Custom`** badge appears along with a **`🚀 Push to All`** button (to copy this slide's custom layout to all other slides with 1 click) and a **`🔄 Reset Slide`** button (to revert back to master defaults).
- **Full Exporter Parity**:
  - Both PDF Exporter (`pdfExporter.js`) and PPTX Exporter (`pptxExporter.js`) now use `getSlideSettings(globalSettings, q)` so all slide-specific customizations are rendered and exported with 100% pixel fidelity.

### 2026-08-19 - Added Canva/PowerPoint 8-Point Bounding Box, Clean Single-Row Tabs, Topic Positioning, & Divider Transform

- **Canva/PowerPoint 8-Point Free-Transform Bounding Box**:
  - Replaced legacy handles with standard 8-point bounding boxes: 4 round corner circle handles (`nw`, `ne`, `se`, `sw`) and 4 side pill handles (`n`, `s`, `e`, `w`) with crisp purple outline `#8b5cf6`.
  - Floating top drag pill (`✥ English`, `✥ Hindi`, `✥ Topic`, `✥ Divider`, `✥ Exam Tag`, `✥ Options Grid`) allows 100% effortless, rock-solid dragging anywhere without losing hover state.
  - Clicking any element gives it persistent `is-selected` state.
- **Single-Row Horizontal Slide Selector Tabs**:
  - Restored clean, single horizontal line scrolling tabs (`Q.1, Q.2, ... Q.25`) with `flex-wrap: nowrap; overflow-x: auto;` in the middle editor.
- **Topic Title Drag & Positioning**:
  - Added Topic title positioning (`topicPosX`, `topicPosY`, `topicFontSize`) with direct on-canvas drag pill (`✥ Topic`), corner scaling handles, and left panel inputs.
- **Divider Line Free Transform & Width**:
  - Added adjustable width (`dividerWidth` from `10%` to `100%`), position (`dividerPosX`), edge stretch handles (`↔`), and 1-click `Match Eng` button to align divider width with English text.
- **Full PDF and PPTX Exporter Parity**:
  - All Topic offsets, Divider widths/positions, and 8-point transformed elements faithfully exported.

### 2026-08-19 - Added Independent Drag Handles for Each Element & SSC GD YouTube Slide Layout

- **Separate Drag Handles (`✥`) for Every Element**: Added individual move handles directly on the canvas for:
  1. **English Question (`✥ Eng`)**: Drag to move English question horizontally (X%) and vertically (Y px) independently.
  2. **Hindi Question (`✥ Hindi`)**: Drag to move Hindi question horizontally (X%) and vertically (Y px) independently.
  3. **Exam Tag Badge (`✥ Exam`)**: Drag to move Exam Tag anywhere independently.
  4. **Options Grid (`✥ Opt`)**: Drag to move Option Cards / Clean options grid anywhere independently.
  5. **Whole Slide Body (`✥ All`)**: Move entire question content container together if preferred.
- **Standalone Exam Tag Placement & Badges**: Added support for Exam Tag placement:
  - `Below Hindi Question (🎯 SSC GD / YouTube Style)`: Renders as a dedicated pill badge (e.g. `(SSC GD 22 Feb., 2024 Shift III)` in red pill) right below Hindi question.
  - `Top Header (📌)`: Displays inside top header bar.
  - `None (❌)`: Hides the tag from slide.
  - Badge styles: `🔴 Red Pill`, `🟡 Yellow Box Highlight`, `📝 Plain Text`.
- **Customizer Position Inputs & 1-Click Reset**: Added numerical inputs in the customizer for `engPosX`, `engPosY`, `hindiPosX`, `hindiPosY`, `examTagPosX`, `examTagPosY`, `optionsPosX`, `optionsPosY`, plus a `🔄 Reset` button to return all positions to default `0, 0`.
- **Seamless Multi-Format Exporter Sync**: Updated PDF Exporter (`renderSlideToCanvas`) and PPTX Exporter (`exportQuestionsToPptx`) to faithfully export custom element coordinates and standalone exam pill badges.

### 2026-08-19 - Added On-Slide Direct Editing (WYSIWYG) & Custom Boundary Controls

- **Direct In-Place Editing**: Every text element on the slide preview canvas (Q.No, Exam tag, Topic, English question, Hindi question, Option cards A/B/C/D, and Footer) is directly editable on the slide with live bidirectional sync to the middle editor and Undo (`Ctrl+Z`) history.
- **Linked Word & LaTeX Toolbar**: Formatting buttons (Bold, Italic, Underline, Text/Highlight Color, LaTeX snippets, Math symbols, Alignment, Lists, and Clean) apply directly to selected text on the canvas and input areas.
- **Custom Question Boundaries**: Added controls for Question Box Width %, Padding, Divider Margin/Spacing, and Line Height.
- **Custom Option Boundaries & Layouts**: Added 3 layout modes (`2 × 2 Grid`, `1 Column Stacked`, `4 Columns Horizontal`), Container Width %, Card Padding / Height, Card Gap, Border Thickness, and Corner Radius with seamless PDF and PPTX export support.

### 2026-08-19 - Fixed English Question Swapping with Exam Tag

- Fixed `isExamTagLine` in `src/core/docxParser.js` to enforce strict word boundaries `\b` around exam acronyms (e.g. `\bPO\b`), preventing questions with words like `compound` (which contains `po`) from mistakenly being parsed as exam tags.
- Added heuristic filtering to ensure lines with question patterns (e.g. `In how many...`, `?`, `।`) are strictly treated as question bodies and never as exam tags.

### 2026-08-19 - Added Global Undo/Redo & Ctrl+Z Shortcut in PPT Builder

- Added global keydown listener for `Ctrl+Z` (Undo) and `Ctrl+Y` / `Ctrl+Shift+Z` (Redo).
- Added Undo (`↶`) and Redo (`↷`) buttons to the PPT Formatting Toolbar.
- Wired `recordUndo()` across all PPT Builder operations (slide additions, deletions, duplicates, theme presets, text inputs, LaTeX insertions, formatting changes, and setting adjustments).

### 2026-08-19 - Fixed Question Splitting & Ratio Option Collision (DOCX/Paste Parser)

- Fixed `qRegex` to support `Q.No: 1` through `Q.No: 25`, ensuring all 25 questions in a document/paste are cleanly split into individual slides instead of collapsing into a single slide.
- Fixed `optRegex` collision where math ratios like `A: B = 7:5` and `C: D = 4:5` in the question text were mistakenly captured as options.
- Added smart stripping of `Answer : A` appended to the last option.
- Improved bilingual separation to preserve English and Hindi question lines independently.

### 2026-08-19 - Fixed Live Toggle for Divider Line and Footer Bar

- Fixed slide canvas DOM structure so `.slide-divider` and `.slide-footer-bar` remain persistently available in the DOM with inline display toggles.
- Added live update handler in `updateLiveCanvasSlide()` for footer background, text, height, font size, and visibility.
- Fixed PDF and PPTX exporter conditions to ensure divider and footer export seamlessly.

### 2026-08-19 - Removed Bottom Status Bar

- Removed the bottom status bar strip (`Paste input and edit visible output directly...`) across all modes including PPT/PDF Builder.
- Adjusted app-shell layout grid to let the main workspace fill the full available height.

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
