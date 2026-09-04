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

### 2026-09-03 - Fixed Drag Disappear & Layout Jumping Bug

- **Fixed Q.No and Canvas Element Disappearing on Drag/Move**:
  - Fixed discrepancy in `updateLiveCanvasSlide` where `boxPosX` evaluated to `0%` instead of `42%` in `Side-Split` layout preset during mouse drag, which caused the entire question content container to violently shift 403px to the left, throwing the Q.No badge off-screen.
  - Aligned `updateLiveCanvasSlide` body position calculation with `slideCanvas.js` (`posXPercent = (boxPosX && Number(boxPosX) !== 0) ? Number(boxPosX) : (layoutPreset === "right-split" ? 42 : 0)`).
  - Sanitized position coordinates across `onBoxMouseMove` and `onMouseMove` using `Number.parseFloat` to eliminate `NaN` transform values.
  - Ensured `standaloneQBox.style.display` is cleanly controlled by `(!showHeader && showQBadge)` so it never gets hidden when actively toggled.
  - Bumped cache version in `index.html` to `v228-fix-drag-disappear-jump`.

### 2026-09-03 - Robust DOCX & Question/Option Parser

- **Fixed DOCX Line-Break Truncation & Option Parsing**:
  - Word (.docx) files are now extracted via Mammoth's HTML converter (`convertToHtml`) rather than `extractRawText`, preserving paragraph breaks (`<p>`), line breaks (`<br>`), tables, and list structures.
  - Added pre-processing normalization to automatically separate questions and bracketed options (`[A]`, `(A)`, etc.) even if Word XML stripped intermediate spaces or newlines.
  - Updated option regex to match all bracket styles (`[A]`, `(A)`, `【A】`, `［A］`) even if directly adjacent to previous text, ensuring Option C and Option D are never dropped.
  - Truncated option values at `Answer : [A-E]` to prevent trailing question text from leaking into Option D.
  - Removed unwanted default fallback "SSC CGL (Shift 1)" exam tag when the document does not contain an exam line.
  - Bumped cache version in `index.html` to `v227-fix-docx-and-paste-parser`.

### 2026-09-03 - Fixed Clear All Data Direct Execution

- **Direct & Reliable Clear All Data**:
  - Fixed issue where clicking "Clear All Data" in Home tab did not clear slides due to broken modal z-index layering and state interception.
  - Clicking "Clear All Data" now directly triggers standard browser confirmation (`window.confirm`) and immediately resets all slides to a single clean slide (`Q.1`), clears localStorage, and updates the canvas without altering the user's configured theme or fonts.
  - Bumped cache version in `index.html` to `v226-fix-clear-all-data-direct`.

### 2026-09-03 - Direct DOCX & Paste Import (Preserve User Layout & Alignment)

- **Bypassed Import Wizard Modal**:
  - Removed the intrusive "Choose Live Teaching Layout (Setup before Create)" modal during `.docx` upload, drag-and-drop, and Paste Text.
  - When importing questions from `.docx` files or pasted text, the system now immediately parses and loads questions directly onto slides using the user's currently configured layout, alignment, positioning (`boxPosX`, `boxPosY`, `questionBoxWidth`, `layoutPreset`), theme, custom background image, and font sizes.
  - Automatically activates content elements (`showEnglish`, `showHindi`, `showDivider`, `showExamTag`, `showOptions`) based on each question's actual parsed content while respecting global settings.
  - Bumped cache version in `index.html` to `v225-direct-docx-import-keep-layout`.

### 2026-09-03 - Shifted Footer Settings Group to Design Tab

- **Ribbon Group Reorganization**:
  - Moved the Footer settings group (`footerText`, `footerHeight`, and `footerFontSize`) from the `Home` ribbon tab (`src/branches/ppt/fullscreen/ribbon/ribbonHome.js`) into the `Design` ribbon tab (`src/branches/ppt/fullscreen/ribbon/ribbonDesign.js`) as Group 4 (`4. Footer`).
  - Renumbered `Docx & Paste` in `Home` tab to Group 6 (`6. Docx & Paste`).
  - Bumped cache version in `index.html` to `v224-shift-footer-to-design`.

### 2026-09-03 - Fixed Live Preview Out of Boundary with Dynamic Auto-Fit Stage Scaler

- **Live Preview Boundary & Responsive Auto-Fit**:
  - Fixed severe layout overflow issue where the 960x540 slide canvas went out of screen boundary on compact laptop windows or split screens.
  - Closed missing HTML tags in `src/branches/ppt/fullscreen/components/slideCanvas.js` (`.ppt-fs-stage-scaler` and `<main class="ppt-fs-stage-viewport">` were unclosed, which broke the flexbox tree and pushed the bottom status bar out of viewport).
  - Introduced `.ppt-fs-stage-scaler-box` container with dynamic pixel layout bounding box matching the visual scaled dimensions, perfectly centering the slide in `.ppt-fs-stage-viewport`.
  - Implemented real `calculateAutoFitZoom` in `fullscreenController.js` that measures available stage viewport dimensions (`clientWidth` and `clientHeight`) and calculates the exact fit percentage (25%–100%) so the 16:9 slide always fits completely on screen without cutting off elements or scrollbars.
  - Connected responsive `window.resize` listener and updated "Fit" button (`ppt-fs-zoom-reset` & `Ctrl + 0`) to dynamically auto-fit.
  - Updated zoom interaction scale calculations across `pptController.js` so drag-and-drop, bounding box move, and resize handles map 1:1 at any scale.
  - Bumped cache version in `index.html` to `v223-fix-slide-canvas-autofit-boundary`.

### 2026-09-03 - Removed Redundant Theme & BG Group from Design Tab

- **De-duplicated Ribbon Tabs**:
  - Removed redundant `1. Background & Themes` group from the `Design` ribbon tab (`src/branches/ppt/fullscreen/ribbon/ribbonDesign.js`) as Theme and Background options are already hosted in the `Home` ribbon tab.
  - Renumbered groups in `Design` tab cleanly: `1. Colours for Every Element`, `2. Exam Badge`, and `3. Typography`.
  - Added all 7 predefined themes (`Dark`, `Maroon`, `Navy`, `Emerald`, `Purple`, `Slate`, `White`) to `Home` tab (`src/branches/ppt/fullscreen/ribbon/ribbonHome.js`) so users have one unified place for themes and wallpaper background controls.
  - Bumped cache version in `index.html` to `v222-remove-redundant-design-themes`.

### 2026-09-02 - Professional Custom Background Upload & Canvas Overlay Fix

- **Custom Background Rendering & Clean Canvas Fix**:
  - Fixed issue where uploading a custom background on a blank or question slide was covered by an opaque white "Fresh Blank Slide" box with dashed borders.
  - Corrected `slideCanvas.js` placeholder visibility check to verify `!bgImgUrl` (which includes `activeQ.bgImage`, `activeQ.settings.bgImage`, and `settings.bgImage`). When any background image is present, placeholder overlays are completely removed.
  - Replaced legacy forced `#000000 url(...)` with clean CSS `background-image: url(...)` combined with slide background color and responsive scaling (`100% 100%`, `cover`, or `contain`).
  - Updated `getSlideSettings` in `src/branches/pptBranch.js` to automatically incorporate `q.bgImage` into slide settings across all renderers, thumbnail generators, and PDF/PPTX exporters.
  - Updated `slideThumbnails.js` to mirror custom background images identically and suppress the "Blank Slide" text label whenever a custom background is applied.
  - Bumped cache buster in `index.html` to `v211-fix-custom-bg-render`.

### 2026-09-02 - Pure Fullscreen-Only PPT Builder & Legacy Workbench Cleanup

- **Fullscreen-Only PPT Builder Studio**:
  - Removed all obsolete legacy embedded workbench UI in PPT Builder (the cluttered left sidebar "PPT Customizer & Import", duplicate top toolbar, duplicate canvas container, and extra export footer).
  - PPT Builder now directly launches and runs the complete, professional PowerPoint Full Screen Ribbon interface (`renderPptFullscreenOverlay`).
  - Preserved 100% of all full-screen features:
    - Ribbon Tabs: **Home**, **Design**, **Editor**, **Insert**, **Export**, **View**.
    - Scope toggle (`Current Slide Only` vs `All Slides`).
    - Thumbnails sidebar with reorder, duplicate, delete.
    - Interactive 16:9 Slide Canvas with in-place image selection and crop engine.
    - Undo / Redo toolbar and keyboard shortcuts.
    - Batch sets generator and multi-quality PDF/PPTX export modals.
  - Added dedicated **🏠 Home** button in the PowerPoint title bar and status bar for instantaneous return to the Home page.
  - Bumped cache buster in `index.html` to `v210-fullscreen-only-ppt`.

### 2026-09-02 - Dedicated Home Page with 4 Large Interactive Tool Blocks

- **Dedicated Home Page Dashboard**:
  - Added new **Home Page** (`homeUI.js` and `homeBranch.js`) providing a centralized dashboard.
  - 4 large interactive blocks (cards) with distinct color themes, hero icons, feature bullet points, and hover lift effects:
    1. **Equation Editor**: LaTeX / AI Math normalizer, live MathML preview, high-res PNG export.
    2. **Math Figures**: Geometry diagrams, vector shapes, snapping grid, SVG/PNG export.
    3. **Image Tools**: Multi-image to PDF converter, custom margins, high-precision image resizer.
    4. **PPT Builder**: Bilingual (Hindi + English) question slides, MCQ cards, exam badges, in-place crop, PDF & PPTX export.
  - Clicking anywhere on a card or its action button immediately opens that workspace.
  - Added **🏠 Home** button to the top navigation bar for seamless return from any workspace.
  - Added clickable brand title on the top left navigating back to the Home page.
  - Bumped cache buster in `index.html` to `v207-home-page-blocks`.

### 2026-08-29 - Fixed Top Mode Navigation Buttons ("Equation Editor", "Math Figures", "Image Tools", "PPT Builder")

- **Top Navigation Mode Switching Fix**:
  - Fixed click handlers in `src/main.js` and `src/ui/layout.js` so clicking **Equation Editor**, **Math Figures**, **Image Tools**, and **PPT Builder** immediately switches active workspace modes.
  - Added support for both `data-action="switch-mode"` and `data-mode` / `data-set-mode` selectors.
  - Added sub-mode switching handler for **Image Tools** (`Image to PDF` vs `Image resize`).
  - Exposed `window.state`, `window.app`, and state helper functions globally so child branch controllers execute with zero runtime ReferenceErrors.
  - Bumped cache buster query parameter in `index.html` to `v206-fix-mode-buttons` ensuring GitHub Pages serves fresh un-cached scripts.

### 2026-08-27 - Options Size & Gap Controls in Design Ribbon Tab

- **Dedicated Options Size & Gap Ribbon Group**:
  - Placed right next to the **Options Layout** group in the **Design** ribbon tab.
  - **Gap (px)**: Direct number input stepper to adjust horizontal and vertical card spacing between options (0 to 40px, default 10px).
  - **Size / Height (px)**: Number input stepper to adjust vertical padding and height of each option card (2 to 30px, default 8px).
  - **Corner Radius (px)**: Direct number input stepper to adjust corner roundness of option boxes (0 to 30px, default 8px).
  - **Width (%)**: Live slider to adjust overall options grid width relative to the slide (50% to 100%, default 96%).
  - Fully synced with universal scope (`Current Slide Only` vs `All Slides`) and instantaneous live canvas rendering.

### 2026-08-27 - Canva-Style In-Place Image Selection & In-Place Crop Engine (Matching Reference Screenshots 1 & 2)

- **Single-Click Selection (Matches User Pic 1)**:
  - **Ultra-Crisp 8-Node Handles**: 4 corner circular nodes (14px, solid white with bold `#0066ff` border and drop shadow) and 4 edge pill bars (22×8px), guaranteed `z-index: 100` so they never hide or clip.
  - **Top Rotation Stem & Handle**: Vertical pin extending from top center with a circular `🔄` rotation handle.
  - **Floating Action Toolbar**: Canva-style rounded white pill below selected image with `✏️ Edit image ✨`, `🪄 Remove BG`, `✂️ Crop`, and `🗑️ Delete`.
- **Double-Click In-Place Crop Mode (Matches User Pic 2)**:
  - Double-clicking any slide image activates **In-Place Crop Mode** directly on the slide canvas.
  - **4 Thick Corner L-Brackets (`┌`, `┐`, `└`, `┘`) & 4 Side Bars**: High-visibility Canva crop handles with 3x3 rule-of-thirds grid.
  - **Floating Action Bar with `✓ Done`**: Features **`✓ Done` (Tick)** button, **`✕ Cancel`**, and **`↺ Reset`**.
  - **Finalize on Tick**: Crop executes pixel-perfect sub-rectangle extraction only when clicking **`✓ Done`** (or pressing Enter).

### 2026-08-27 - Double-Click Interactive Crop Mode, Single-Click Image Selection & Full Image Studio

- **Double-Click Interactive Crop Mode**:
  - Double-clicking any slide image immediately enters full-focus **Crop Mode** with darkened backdrop overlay (`rgba(0, 0, 0, 0.88)`).
  - Features an 8-point interactive Canva/Photoshop crop frame with rule-of-thirds grid lines, corner brackets, and edge handles.
  - Floating top action bar with **`✓ Done (Apply)`** (or Enter key), **`✕ Cancel`** (or Esc key), **`↺ Reset`**, and Aspect Ratio presets (`Free`, `16:9`, `4:3`, `1:1`).
  - High-resolution HTML5 Canvas pixel extraction preserves full sharpness and adjusts slide dimensions proportionally.
- **Single-Click Selection & Auto-Tab Switching**:
  - Single-clicking any slide image selects it (active glowing border) and automatically activates the **Insert** ribbon tab with image-specific editing tools.
- **Remove Background & Clean Math Formula Tools**:
  - `🪄 Remove White BG`: 1-click automatic background removal turning white screenshot backgrounds transparent.
  - `✨ Clean Formula BG`: High-contrast transparent math equation/figure isolation.
- **Image Adjustments (Opacity, Brightness, Contrast)**:
  - Live real-time sliders for Opacity (0–100%), Brightness (-100% to +100%), and Contrast (-100% to +100%).
- **Recolor & Color Presets**:
  - Instant filters: `Grayscale` (B&W print), `Invert` (Dark studio board), `Hi-Contrast`, `Warm Gold`, `Cool Blue`, and `Normal`.
- **Transform & Arrange**:
  - `Rotate 90°`, `Flip Horizontal ⇋`, `Flip Vertical ⇅`, and `Delete 🗑️`.

### 2026-08-27 - Universal Scope Checkbox & Exact Duplicate Slide Number Fix

- **Clean Universal Scope Control (Single Top Checkbox)**:
  - Removed all redundant individual "Apply to All", "Apply All", "All / Curr" scope buttons across **Home**, **Design**, **Editor**, and **View** ribbon tabs.
  - The universal ribbon top checkbox (`[x] 📌 Current Slide Only` vs `[ ] 🌐 All Slides (Global)`) is now the single source of truth:
    - **Unchecked (All Slides / Global)**: Any change made (topic name, themes, custom background, colors, fonts, margins, option styles, footer text, exam badges, visibility) immediately applies to ALL slides.
    - **Checked (Current Slide Only)**: Any change made applies strictly and exclusively to the active current slide.
- **Exact Duplicate Slide Parity ("Duplicate means Duplicate")**:
  - Fixed duplicate slide action (`ppt-duplicate-slide`) so it clones the slide 100% identically without mutating or renumbering the question number (e.g. duplicating `Q.1` keeps `Q.1`).

### 2026-08-27 - Universal Undo / Redo for Everything (Header, Footer, Content, Styling & Drag/Resize)

- **Universal Full-Stack Undo / Redo (Ctrl+Z & Ctrl+Y)**:
  - Fixed keyboard shortcut handler so `Ctrl+Z` (Undo) and `Ctrl+Y` / `Ctrl+Shift+Z` (Redo) are no longer blocked when typing or focused in `contenteditable` or input elements.
  - Added clean snapshot restoration engine (`applySnapshot`) that completely replaces, adds, and removes properties accurately on undo/redo.
  - Enabled instant undo & redo for **Header Bar** (Topic title, Exam tag, Q badge, Header height, Topic box positioning/scaling).
  - Enabled instant undo & redo for **Footer Bar** (Footer text, Footer styling, Footer height).
  - Enabled instant undo & redo for **Slide Content & Formatting** (English, Hindi, Options, LaTeX formulas, Inline colors, Highlights, Font sizes, Alignments).
  - Added dedicated **Quick Access Undo / Redo** buttons in Fullscreen top titlebar, Home/Design/Editor ribbon tabs, and bottom status bar.

### 2026-08-27 - 100% WYSIWYG Live Render Export Parity (Rich HTML & Formatting)

- **100% WYSIWYG Live Render to Export Match**:
  - Synchronized `renderSlideCleanExportHtml` in `slideCanvas.js` to render exact rich HTML formatted markup (`activeQ.topicHtml || settings.topicHtml`, `activeQ.examHtml`, `activeQ.englishHtml`, `activeQ.hindiHtml`, `opt.textHtml`, `settings.footerHtml`, `activeQ.numberHtml`).
  - Fixed issue where custom header colors, highlight boxes (e.g. blue background topic box), spans, and inline formatting in Image 1 were previously stripped to plain text during export.
  - Whatever is rendered live on screen in the editor is now exported 1:1 identically to PDF and PPTX.

### 2026-08-27 - Medium Lite PDF Export Diagonal Distortion & Dimension Parity Fix

- **Zero Distortion & Diagonal Skew Fix for Medium Lite & Low Quality**:
  - Fixed `scale` calculation in `pdfExporter.js` to use exact fractional scales (`2560 / 960 = 2.6666666666666665`, `1280 / 960 = 1.3333333333333333`).
  - Pass dynamic `canvas.width` and `canvas.height` directly to `buildPdf` XObject image dictionaries instead of hardcoded width/height constants.
  - Eliminated the 1-pixel scanline mismatch (2559px vs 2560px) that was causing progressive scanline shearing, slanted text, diagonal image distortion, and aspect-ratio squeezing in PDF readers.

### 2026-08-25 - Full Customization Export Hub & Batch Sets Generator

- **Dedicated 'Export' Ribbon Tab**:
  - Added new **`Export`** tab in ribbon navigation: **Home | Design | Editor | Insert | Export | View**.
  - **Quality Selector**: Low (720p Fast/WhatsApp), Medium (1080p Crisp HD), High (Ultra 4K Print).
  - **Format Toggle**: PDF vs PPTX.
  - **Range & Selection**: All Slides, Current Slide, Custom Range (`1, 2, 51-75`), Batch Sets Maker.
  - **Custom File Naming Template**: Dynamic tokens `{topic}`, `{set}`, `{start}`, `{end}`, `{quality}`.
- **Interactive Export Hub & Batch Sets Splitter**:
  - Automatically divides 300 questions into sets of 25 (or custom `N`).
  - Prepend **Mandatory Intro Slides** (e.g. `1, 2` for Thumbnail & WhatsApp QR) to **every generated set**.
  - Individual set 1-click downloads ([📥 PDF] / [📊 PPTX]) or 1-click **Batch Download All Sets** with live progress bar!

### 2026-08-25 - Exam Badge & Options Layout Shifted to Home & Design Tabs

- **Streamlined Ribbon Workflow**:
  - Shifted the **Exam Badge** (`🎯 Below Question`, `📌 In Header`, `🔴 Red Pill`, `🟡 Yellow Box`) and **Options Layout** (`🔲 Card Boxes`, `📝 Clean (a)(b)`, `2 × 2 Grid`, `1 Column`) controls directly into the **`Home`** and **`Design`** tabs.
  - Removed duplicate options controls from the `Editor` tab so Editor stays 100% focused on text editing, formatting, fonts, and paragraph layout.
  - Removed duplicate badge controls from the `Insert` tab so Insert stays 100% focused on Media, Images, and Math formulas.

### 2026-08-25 - Advanced Editor Ribbon: Paragraph Alignments, Line Spacing & Lists

- **Google Docs / PowerPoint Style Rich Text Controls**:
  - **Horizontal Text Alignment**: Left (`align-left`), Center (`align-center`), Right (`align-right`), Justify (`align-justify`).
  - **Vertical Text Alignment**: Top (`valign-top`), Middle (`valign-middle`), Bottom (`valign-bottom`).
  - **Line & Paragraph Spacing**: Dedicated `↕ Line Spacing` selector (`1.0`, `1.15`, `1.25`, `1.34`, `1.5`, `1.8`, `2.0`).
  - **Lists & Indentation**: Bulleted list (`bullet-list`), Numbered list (`number-list`), Outdent / Decrease Indent (`outdent`), Indent / Increase Indent (`indent`).
  - **Clean Math Polish**: `✨ Clean` tool for auto-formatting operator spacing in formulas (+, −, ×, ÷, =).

### 2026-08-25 - Ribbon Tab Reorganization: 'Home 2' renamed to 'Design'

- **Clean PowerPoint Ribbon Tab Hierarchy**:
  - Renamed the comprehensive styling tab `Home 2 (Style)` to **`Design`** (`data-tab="design"`).
  - Removed the old duplicate separate "Design" button.
  - Final clean ribbon navigation: **Home | Design | Editor | Insert | View**.
  - Updated keyboard shortcuts (Alt+2, Alt+D, Alt+G switch to the unified Design tab).

### 2026-08-25 - 100% WYSIWYG PDF & PPTX Export Rendering Fix

- **Perfect 1:1 Match Between Live Preview and Exported Files**:
  - Fixed `pdfExporter.js` and `pptxExporter.js` to strictly honor `showHeader === false` (custom background mode) — hiding the red/maroon header bar and unused Topic titles instead of drawing them on top of custom background headers.
  - Added full support for `boxPosY` and `boxPosX` in both exporters so user-dragged slide body sections maintain exact vertical and horizontal placement below custom template banners.
  - Fixed standalone Q-number badge rendering when header is hidden: badge is drawn in the correct position with `qBadgeBg` pill and `qBadgeColor` text (fixing the invisible white text bug).
  - Floating image / diagram layer coordinates now map 1:1 with canvas coordinate space `(img.posX, img.posY)` without extra header offsets.
  - Verified all visibility toggles (`showEnglish`, `showHindi`, `showExamTag`, `showOptions`, `showFooter`, `showDivider`) in export engines.

### 2026-08-25 - 100% Screen Zoom Live Preview & 4-Way Arrow Direct Box Dragging Fix

- **100% Zoom Live Preview Full Slide Visibility**:
  - Re-engineered `.ppt-fs-stage-viewport` in `styles.css` with top-aligned flex layout and `transform-origin: top center` so the entire 16:9 slide canvas (including the top header bar) is 100% visible at 100% screen zoom without being tucked or clipped under the ribbon toolbar.
  - Compacted ribbon height (titlebar 28px, tabs 28px, container 72px) saving 50px of vertical height for the center live preview.
  - Optimized default slide typography and vertical padding in `pptBranch.js` so multi-line questions and 4 options fit inside the 16:9 canvas with ideal breathing room.
  - Set default fullscreen zoom and reset zoom strictly to 100% (`ppt.fsZoom = 100`) in `store.js`, `pptController.js`, and `fullscreenController.js` overriding stale 90% localStorage caches.
- **PowerPoint-Style 4-Way Arrow Move Cursor & Direct Box Dragging**:
  - Added `cursor: move !important` to all transform boxes (`.slide-topic-box`, `.slide-q-badge-box`, `.slide-exam-header-box`, `.slide-eng-section`, `.slide-hindi-section`, `.slide-divider-wrapper`, `.slide-options-container`, `.slide-image-container`).
  - Implemented universal direct drag on all `.canva-transform-box` elements in `pptController.js` so clicking and dragging anywhere on the box frame, border, padding, or pill smoothly translates the element in real time while preserving text-editing when clicking text.

- **Dedicated Modular Fullscreen Folder** (`src/branches/ppt/fullscreen/`):
  - `ribbon/`: `ribbonHome.js`, `ribbonInsert.js`, `ribbonDesign.js`, `ribbonView.js`, `ribbonCommon.js`.
  - `components/`: `slideThumbnails.js` (left slide navigation strip), `slideCanvas.js` (center 16:9 live slide canvas with 100% WYSIWYG match of main page state), `statusBar.js` (bottom status bar, zoom slider, exit button).
  - `fullscreenUI.js` & `fullscreenController.js`: Fullscreen modal shell, ribbon tab switching, zoom scaler, keyboard shortcuts (PageUp/PageDown, Esc to exit).
  - **100% WYSIWYG Rendering**: The center canvas renders the exact live slide that was rendered on the main page (exact questions, topics, exam tags, fonts, colors, draggable bounding boxes, diagrams, and options).

### 2026-08-25 - Modular Branch Architecture Refactoring (Zero Regressions)

- **Clean Modular Isolation**:
  - `src/branches/ppt/pptUI.js`: Dedicated PPT slide builder UI template rendering (`renderPptBuilderWorkbench`, `renderPptEditorToolbar`, `renderPptImportWizardModal`).
  - `src/branches/ppt/pptController.js`: Complete PPT builder events, 8-point interactive canvas resizing, inline slide editing, drag & drop uploads, and PDF/PPTX exporters.
  - `src/branches/pptBranch.js`: Unified entry point re-exporting state defaults, themes, samples, UI, and controller.
  - `src/branches/imagePdf/imagePdfController.js`: Isolated Image to PDF batch converter, reordering, and PDF splitting.
  - `src/branches/imageResize/imageResizeController.js`: Isolated Image Resize workspace, units conversion, and format exporters.
  - `src/branches/drawing/drawingController.js`: Isolated Math Figures & Geometric Drawing canvas engine.
  - `src/branches/equation/equationController.js`: Isolated Equation Editor, visual MathML sync, and LaTeX palettes.
  - `src/main.js`: Refactored from a 6200+ line monolith down to a lightweight, elegant central orchestrator (~400 lines) with 100% test pass rate and zero regressions.

### 2026-08-24 - 100% WYSIWYG Live Preview to PDF/PPTX Export Synchronization Fix

- **Perfect Alignment Match**:
  - Fixed scaling calculation bug for `optionsPosX` and `examTagPosX` in PDF exporter and PPTX exporter (was erroneously dividing by 100).
  - Synchronized `textAlign` ("left", "center", "right") and `optionAlign` across PDF canvas rendering and PPTX slides.
  - Synchronized custom font families (`engFontFamily`, `hindiFontFamily`, `optionFontFamily`) and line heights across PDF and PPTX exporters.
  - Multi-line question paragraphs with `\n` line breaks now wrap and render identically between live preview and exported PDF.
  - Minimalist "Clean" digital board options `(a) text` are correctly exported in both PDF and PPTX.

### 2026-08-20 - "Apply to All Slides" Global Propagation Fix

- **Instant Full Deck Propagation**:
  - Clicking **`🚀 Apply to All`** (in Toolbar or Customizer) now calculates the active slide's complete computed styles (positions, widths, paddings, fonts, colors, divider, options layout) and sets it as the Master settings.
  - Clears all per-slide override dictionaries across all slides in `ppt.questions`, guaranteeing 100% uniformity across all slides in the deck.
  - In Master mode (`applyScope = "all"`), per-property updates automatically purge matching slide-specific overrides so canvas dragging or slider changes take effect immediately across all slides.

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

- **100% WYSIWYG DOM-SVG Snapshot Engine**:
  - Replaced manual Canvas 2D text coordinate measurements with native browser DOM SVG `foreignObject` rendering in `pdfExporter.js`.
  - Guarantees 100.00% identical line wrapping, font rendering, subpixel kerning, padding, transforms, and option card placements between live editor and exported PDF.
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

### 2026-09-03 - Serial Order Element Stacking & "(Exam Name)" Placeholder

- Fixed element placement so elements appear in a clean, professional vertical serial order (`Q.No` → `English` → `Divider` → `Hindi` → `Exam Tag` → `Options`) regardless of the order in which they are added, avoiding any scattered ("jaha taha") layout.
- Cleaned default layout preset to full-width left-aligned standard stack (`boxPosX: 0`, `questionBoxWidth: 100%`).
- Removed all hardcoded old exam strings (`SSC GD 22 Feb., 2024 Shift III`, `SSC CGL 12/09/2025 (Shift 1)`, etc.) and replaced with editable `(Exam Name)`.
- Removed confusing `Blank` layout button from Ribbon Group 4 ("Question & Options Layout"), keeping only the 3 question layouts (`Side-Split`, `2x2 Grid`, `1-Column`).
- Fixed `☰ 1-Column` layout preset button: now directly sets `optionsLayout: "1-col"` (and `⊞ 2x2 Grid` sets `optionsLayout: "2-col"`) so options instantly switch between 1-column vertical stack and 2x2 grid, with accurate active button highlighting.
- Added `⋯ 4-In-Line` layout button in Ribbon Group 4: puts all four options in a single horizontal row (`repeat(4, 1fr)`) with compact spacing and padding.
- Extracted font size inputs into a dedicated ribbon group (`4. Font Sizes`) positioned cleanly between `3. + Add Elements` and `5. Question & Options Layout`, with clear labels for `Eng`, `हिंदी`, `Opt`, and `Exam`.
- Bumped cache buster to `v221-dedicated-font-sizes-group`.
