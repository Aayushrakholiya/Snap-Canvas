/*
 *  FILE          : sketch.js
 *  PROJECT       : SENG-3040 – Photobooth Application
 *  PROGRAMMER    : Ayushkumar Rakholiya
 *  FIRST VERSION : 2025-11-12
 *  DESCRIPTION   :
 *    This file contains the main logic for a photobooth application.
 */

// Constants for video dimensions and UI layout
const VIDEO_WIDTH = 640;
const VIDEO_HEIGHT = 480;

// The complete interface is drawn on this logical 16:9 surface, then fitted
// uniformly inside the browser. This keeps every control visible at any
// monitor size without changing the coordinates used by drawings and stamps.
const DESIGN_WIDTH = 1280;
const DESIGN_HEIGHT = 720;

// UI layout constants
const UI_PADDING = 16;
const SIDE_PANEL_WIDTH = 220;
const TOP_PANEL_HEIGHT = 80;

// Variables for video position and size
let videoDisplayX, videoDisplayY;
let videoDrawW = VIDEO_WIDTH;
let videoDrawH = VIDEO_HEIGHT;
let layoutScale = 1;
let layoutOffsetX = 0;
let layoutOffsetY = 0;
let video;
let videoBuffer;
let captureBuffer;

// Current tool and settings
let currentTool = "none";
let currentStampIndex = 0;
let currentFilter = "none";
let isDragging = false;
let shapeStartX = 0;
let shapeStartY = 0;
let shapeCurrentX = 0;
let shapeCurrentY = 0;

// Current stroke and fill colors and stroke weight
let currentStrokeCol;
let currentFillCol;
let currentStrokeW = 2;

// UI elements
let toolButtons = [];
let filterButtons = [];
let stampButtons = [];
let resetButton = null;
let strokeSwatches = [];
let fillSwatches = [];
let thicknessButtons = [];
let overlayTimeline = [];
let stampImages = [];

function preload() {
  stampImages[0] = loadImage("Stamp_1.png");
  stampImages[1] = loadImage("Stamp_2.png");
  stampImages[2] = loadImage("Stamp_3.png");
  stampImages[3] = loadImage("Stamp_4.png");
}

/*---------------------------------------------------------
 *  FUNCTION      : setup
 *  DESCRIPTION   :
 *    this function initializes the canvas, video capture,
 *    UI elements, and default settings for the photobooth application.
 *  PARAMETERS    : None
 *  RETURNS       : None
 *---------------------------------------------------------*/
function setup() {
  createCanvas(windowWidth, windowHeight);
  updateResponsiveLayout();

  video = createCapture(VIDEO);
  video.size(VIDEO_WIDTH, VIDEO_HEIGHT);
  video.hide();

  videoBuffer = createGraphics(VIDEO_WIDTH, VIDEO_HEIGHT);

  captureBuffer = createGraphics(VIDEO_WIDTH, VIDEO_HEIGHT);

  initializeButtons();
  currentStrokeCol = color(255);
  currentFillCol = color(255, 255, 255, 50);
}

/*---------------------------------------------------------
 *  FUNCTION      : draw
 *  DESCRIPTION   :
 *    this function is called repeatedly to render the UI,
 *    video feed, and overlays.
 *  PARAMETERS    : None
 *  RETURNS       : None
 *---------------------------------------------------------*/
function draw() {
  background(245,240,235);

  push();
  translate(layoutOffsetX, layoutOffsetY);
  scale(layoutScale);

  // Cover the logical surface as well as any letterbox area on the canvas.
  noStroke();
  fill(245, 240, 235);
  rect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

  drawTopPanel();
  drawLeftPanel();
  drawRightPanel();

  if (video) {
    videoBuffer.image(video, 0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);

    applyCurrentFilterToBuffer();
  }

  image(videoBuffer, videoDisplayX, videoDisplayY, videoDrawW, videoDrawH);

  drawOverlayTimeline();

  drawShapePreview();

  drawStampPreview();

  pop();
}

/*---------------------------------------------------------
 *  FUNCTION      : updateResponsiveLayout
 *  DESCRIPTION   :
 *    fits the full logical interface inside the current browser window.
 *---------------------------------------------------------*/
function updateResponsiveLayout() {
  layoutScale = min(windowWidth / DESIGN_WIDTH, windowHeight / DESIGN_HEIGHT);
  layoutScale = max(layoutScale, 0.01);
  layoutOffsetX = (windowWidth - DESIGN_WIDTH * layoutScale) / 2;
  layoutOffsetY = (windowHeight - DESIGN_HEIGHT * layoutScale) / 2;

  calculateVideoPosition();

  // Button hit areas are stored in logical coordinates and must be rebuilt
  // whenever the layout changes.
  if (typeof color === "function") {
    initializeButtons();
  }
}

/*---------------------------------------------------------
 *  FUNCTION      : screenToDesign
 *  DESCRIPTION   :
 *    converts a browser/canvas pointer position into logical UI coordinates.
 *---------------------------------------------------------*/
function screenToDesign(x, y) {
  return {
    x: (x - layoutOffsetX) / layoutScale,
    y: (y - layoutOffsetY) / layoutScale,
  };
}

/*---------------------------------------------------------
 *  FUNCTION      : calculateVideoPosition
 *  DESCRIPTION   :
 *    this function calculates the position and size of the video feed
 *    based on the current window dimensions and UI layout.
 *  PARAMETERS    : None
 *  RETURNS       : None
 *---------------------------------------------------------*/
function calculateVideoPosition() {
  const leftBound = UI_PADDING + SIDE_PANEL_WIDTH + UI_PADDING;
  const rightBound = DESIGN_WIDTH - (UI_PADDING + SIDE_PANEL_WIDTH + UI_PADDING);
  const topBound = UI_PADDING + TOP_PANEL_HEIGHT + UI_PADDING;
  const bottomBound = DESIGN_HEIGHT - UI_PADDING;

  const availableWidth = max(0, rightBound - leftBound);
  const availableHeight = max(0, bottomBound - topBound);

  const scale = min(
    1,
    availableWidth / VIDEO_WIDTH,
    availableHeight / VIDEO_HEIGHT
  );
  videoDrawW = VIDEO_WIDTH * scale;
  videoDrawH = VIDEO_HEIGHT * scale;

  const centerX = leftBound + availableWidth / 2;
  const centerY = topBound + availableHeight / 2;

  videoDisplayX = centerX - videoDrawW / 2;
  videoDisplayY = centerY - videoDrawH / 2;
}

/*---------------------------------------------------------
 *  FUNCTION      : windowResized
 *  DESCRIPTION   :
 *    this function is called when the window is resized to
 *    adjust the canvas size and recalculate video position.
 *  PARAMETERS    : None
 *  RETURNS       : None
 *---------------------------------------------------------*/
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  updateResponsiveLayout();
}

/*---------------------------------------------------------
 *  FUNCTION      : applyCurrentFilterToGraphics
 *  DESCRIPTION   :
 *    this function applies the currently selected filter
 *    to the given graphics buffer.
 *  PARAMETERS    :
 *    pg - the graphics buffer to apply the filter to
 *  RETURNS       : None
 *---------------------------------------------------------*/
function applyCurrentFilterToGraphics(pg) {
  if (!pg) return;

  switch (currentFilter) {
    case "invert":
      pg.filter(INVERT);
      break;
    case "gray":
      pg.filter(GRAY);
      break;
    case "posterize":
      pg.filter(POSTERIZE, 4);
      break;
    case "blur":
      pg.filter(BLUR, 3);
      break;
    case "none":
    default:
      break;
  }
}

/*---------------------------------------------------------
 *  FUNCTION      : applyCurrentFilterToBuffer
 *  DESCRIPTION   :
 *    this function applies the currently selected filter
 *    to the video buffer.
 *  PARAMETERS    : None
 *  RETURNS       : None
 *---------------------------------------------------------*/
function applyCurrentFilterToBuffer() {
  applyCurrentFilterToGraphics(videoBuffer);
}

/*---------------------------------------------------------
 *  FUNCTION      : drawTopPanel
 *  DESCRIPTION   :
 *    this function draws the top UI panel with filter buttons.
 *  PARAMETERS    : None
 *  RETURNS       : None
 *---------------------------------------------------------*/
function drawTopPanel() {
  fill(70, 130, 180);
  noStroke();
  rect(UI_PADDING, UI_PADDING, DESIGN_WIDTH - 2 * UI_PADDING, TOP_PANEL_HEIGHT, 100);

  fill(255);
  textSize(24);
  textAlign(CENTER, CENTER);
  text("Filters", DESIGN_WIDTH / 2, UI_PADDING - 19 + TOP_PANEL_HEIGHT / 2);

  drawFilterButtons();
}

/*---------------------------------------------------------
 *  FUNCTION      : drawLeftPanel
 *  DESCRIPTION   :
 *    this function draws the left UI panel with tool buttons
 *    and style controls.
 *  PARAMETERS    : None
 *  RETURNS       : None
 *---------------------------------------------------------*/
function drawLeftPanel() {
  let panelY = UI_PADDING + TOP_PANEL_HEIGHT + UI_PADDING;
  let panelHeight = DESIGN_HEIGHT - panelY - UI_PADDING;

  fill(100, 180, 100);
  noStroke();
  rect(UI_PADDING, panelY, SIDE_PANEL_WIDTH, panelHeight, 10);

  fill(255);
  textSize(20);
  textAlign(CENTER, TOP);
  text("Shapes", UI_PADDING + SIDE_PANEL_WIDTH / 2, panelY + 20);

  drawToolButtons();

  drawStyleControls();

  drawResetButton();
}

/*---------------------------------------------------------
 *  FUNCTION      : drawRightPanel
 *  DESCRIPTION   :
 *    this function draws the right UI panel with stamp buttons.
 *  PARAMETERS    : None
 *  RETURNS       : None
 *---------------------------------------------------------*/
function drawRightPanel() {
  let panelX = DESIGN_WIDTH - UI_PADDING - SIDE_PANEL_WIDTH;
  let panelY = UI_PADDING + TOP_PANEL_HEIGHT + UI_PADDING;
  let panelHeight = DESIGN_HEIGHT - panelY - UI_PADDING;

  fill(180, 100, 150);
  noStroke();
  rect(panelX, panelY, SIDE_PANEL_WIDTH, panelHeight, 10);

  fill(255);
  textSize(20);
  textAlign(CENTER, TOP);
  text("Stamps", panelX + SIDE_PANEL_WIDTH / 2, panelY + 20);
  drawStampButtons();
}

/*---------------------------------------------------------
 *  FUNCTION      : createShape
 *  DESCRIPTION   :
 *    this function creates a shape object with the given parameters.
 *  PARAMETERS    :
 *    kind - type of shape ("rect" or "ellipse")
 *    x1, y1 - starting coordinates
 *    x2, y2 - ending coordinates
 *    strokeCol - stroke color
 *    fillCol - fill color
 *    strokeW - stroke weight
 *  RETURNS       : shape object
 *---------------------------------------------------------*/
function createShape(kind, x1, y1, x2, y2, strokeCol, fillCol, strokeW) {
  return { kind, x1, y1, x2, y2, strokeCol, fillCol, strokeW };
}

/*---------------------------------------------------------
 *  FUNCTION      : createStamp
 *  DESCRIPTION   :
 *    this function creates a stamp object with the given parameters.
 *  PARAMETERS    :
 *    stampIndex - index of the stamp image
 *    x, y - position coordinates
 *    w, h - width and height
 *  RETURNS       : stamp object
 *---------------------------------------------------------*/
function createStamp(stampIndex, x, y, w, h) {
  return { stampIndex, x, y, w, h };
}

/*---------------------------------------------------------
 *  FUNCTION      : initializeButtons
 *  DESCRIPTION   :
 *    this function initializes the UI buttons for tools,
 *    filters, stamps, and style controls.
 *  PARAMETERS    : None
 *  RETURNS       : None
 *---------------------------------------------------------*/
function initializeButtons() {
  const toolLabels = ["rect", "ellipse", "stamp", "none"];
  const btnW = SIDE_PANEL_WIDTH - 20;
  const btnH = 35;
  const buttonGap = 10;
  const sectionGap = 28;
  const rowLabelGap = 14;
  const btnX = UI_PADDING + 10;
  const panelTop = UI_PADDING + TOP_PANEL_HEIGHT + UI_PADDING;
  const toolsTop = panelTop + 60;
  let btnY = toolsTop;

  toolButtons = [];
  for (let i = 0; i < toolLabels.length; i++) {
    toolButtons.push({label: toolLabels[i], x: btnX, y: btnY + i * (btnH + buttonGap), w: btnW, h: btnH, action: toolLabels[i],});
  }

  const filters = [
    { label: "No Filter", action: "none" },
    { label: "Invert", action: "invert" },
    { label: "Gray", action: "gray" },
    { label: "Posterize", action: "posterize" },
    { label: "Blur", action: "blur" },
  ];
  const filterBtnW = 100;
  const filterBtnH = 30;
  const filterTotalWidth = filters.length * filterBtnW + (filters.length - 1) * 10;
  const startX = DESIGN_WIDTH / 2 - filterTotalWidth / 2;
  const filterBtnY = UI_PADDING + 40;

  filterButtons = [];
  for (let i = 0; i < filters.length; i++) {
    filterButtons.push({ label: filters[i].label, x: startX + i * (filterBtnW + 10), y: filterBtnY, w: filterBtnW, h: filterBtnH, action: filters[i].action, });
  }

  const stampCount = 4;
  const stampBtnW = SIDE_PANEL_WIDTH - 40;
  // A shorter card height keeps all four stamps visible on 16:9 displays.
  const stampBtnH = 120;
  const stampBtnX = DESIGN_WIDTH - UI_PADDING - SIDE_PANEL_WIDTH + 20;
  let stampBtnY = UI_PADDING + TOP_PANEL_HEIGHT + UI_PADDING + 50;

  stampButtons = [];

  for (let i = 0; i < stampCount; i++) {
    stampButtons.push({ label: "Stamp " + (i + 1), x: stampBtnX, y: stampBtnY + i * (stampBtnH + 10), w: stampBtnW, h: stampBtnH, stampIndex: i, });
  }

  const toolsBlockHeight = toolLabels.length * btnH + (toolLabels.length - 1) * buttonGap;
  const styleSectionY = btnY + toolsBlockHeight + sectionGap;
  const strokeLabelY = styleSectionY;
  const strokeRowY = strokeLabelY + rowLabelGap + 12;

  const palette = [ color(255), color(0), color(255, 0, 0), color(0, 200, 0), color(0, 120, 255), color(255, 200, 0), ];
  const swatchSize = 24;
  const swatchGap = 8;
  const swatchRowX = btnX + 6;

  strokeSwatches = [];
  for (let i = 0; i < palette.length; i++) {
    strokeSwatches.push({ x: swatchRowX + i * (swatchSize + swatchGap), y: strokeRowY, w: swatchSize, h: swatchSize, col: palette[i], });
  }

  const fillLabelY = strokeRowY + swatchSize + sectionGap;
  const fillRowY = fillLabelY + rowLabelGap + 12;

  fillSwatches = [];
  for (let i = 0; i < palette.length; i++) {
    fillSwatches.push({ x: swatchRowX + i * (swatchSize + swatchGap), y: fillRowY, w: swatchSize, h: swatchSize, col: palette[i], });
  }

  const thickLabels = [ { label: "NONE", value: 0 }, { label: "THIN", value: 1 }, { label: "MED", value: 3 }, { label: "THICK", value: 6 }, ];
  const tBtnW = (btnW - 10) / thickLabels.length;
  const tBtnH = 28;
  const thicknessLabelY = fillRowY + swatchSize + sectionGap + 8;
  const tBtnY = thicknessLabelY + rowLabelGap + 8;
  thicknessButtons = [];

  for (let i = 0; i < thickLabels.length; i++) {
    thicknessButtons.push({ label: thickLabels[i].label, value: thickLabels[i].value, x: btnX + 5 + i * tBtnW, y: tBtnY, w: tBtnW - 6, h: tBtnH,});
  }

  const resetBtnY = tBtnY + tBtnH + sectionGap;
  resetButton = { label: "RESET", x: btnX, y: resetBtnY, w: btnW, h: btnH };
}

/*---------------------------------------------------------
 *  FUNCTION      : drawToolButtons
 *  DESCRIPTION   :
 *    this function draws the tool selection buttons.
 *  PARAMETERS    : None
 *  RETURNS       : None
 *---------------------------------------------------------*/
function drawToolButtons() {
  for (let btn of toolButtons) {
    if (currentTool === btn.action) {
      fill(220, 255, 220, 180);
    } else {
      fill(60, 140, 60);
    }
    stroke(255);
    strokeWeight(1);
    rect(btn.x, btn.y, btn.w, btn.h, 10);

    fill(0);
    noStroke();
    textSize(18);
    textAlign(CENTER, CENTER);
    text(btn.label.toUpperCase(), btn.x + btn.w / 2, btn.y + btn.h / 2);
  }
}

/*---------------------------------------------------------
 *  FUNCTION      : drawFilterButtons
 *  DESCRIPTION   :
 *    this function draws the filter selection buttons.
 *  PARAMETERS    : None
 *  RETURNS       : None
 *---------------------------------------------------------*/
function drawFilterButtons() {
  for (let btn of filterButtons) {
    if (currentFilter === btn.action) {
      fill(170, 215, 255, 180);
    } else {
      fill(50, 100, 150);
    }
    stroke(255);
    strokeWeight(1);
    rect(btn.x, btn.y, btn.w, btn.h, 10);

    if (currentFilter === btn.action) {
      fill(0);
    } else {
      fill(255);
    }
    noStroke();
    textSize(16);
    textAlign(CENTER, CENTER);
    text(btn.label.toUpperCase(), btn.x + btn.w / 2, btn.y + btn.h / 2);
  }
}

/*---------------------------------------------------------
 *  FUNCTION      : drawStyleControls
 *  DESCRIPTION   :
 *    this function draws the style control section with
 *    stroke color, fill color, and border thickness options.
 *  PARAMETERS    : None
 *  RETURNS       : None
 *---------------------------------------------------------*/
function drawStyleControls() {
  const btnX = UI_PADDING + 10;
  const btnW = SIDE_PANEL_WIDTH - 20;
  const btnH = 35;
  const toolCount = 4;
  const buttonGap = 10;
  const sectionGap = 28;
  const rowLabelGap = 14;
  const panelTop = UI_PADDING + TOP_PANEL_HEIGHT + UI_PADDING;
  const toolsTop = panelTop + 60;
  const toolsBlockHeight = toolCount * btnH + (toolCount - 1) * buttonGap;
  const styleSectionY = toolsTop + toolsBlockHeight + sectionGap;
  const strokeLabelY = styleSectionY;
  const strokeRowY = strokeLabelY + rowLabelGap + 12;
  const swatchSize = 24;
  const fillLabelY = strokeRowY + swatchSize + sectionGap;
  const thicknessLabelY = fillLabelY + swatchSize + sectionGap + 22;

  fill(255);
  noStroke();
  textSize(18);
  textAlign(LEFT, TOP);
  text("Border Colour", btnX + 6, strokeLabelY);
  text("Fill Colour", btnX + 6, fillLabelY);
  text("Border Thickness", btnX + 6, thicknessLabelY);

  for (let sw of strokeSwatches) {
    stroke(255);
    strokeWeight(1);
    fill(sw.col);
    rect(sw.x, sw.y, sw.w, sw.h, 4);

    if (colorsEqual(sw.col, currentStrokeCol)) {
      noFill();
      stroke(255, 230, 150);
      strokeWeight(3);
      rect(sw.x - 2, sw.y - 2, sw.w + 4, sw.h + 4, 6);
    }
  }

  for (let sw of fillSwatches) {
    stroke(255);
    strokeWeight(1);
    const c = sw.col;
    fill(red(c), green(c), blue(c), 160);
    rect(sw.x, sw.y, sw.w, sw.h, 4);

    if (fillMatches(sw.col, currentFillCol)) {
      noFill();
      stroke(255, 230, 150);
      strokeWeight(3);
      rect(sw.x - 2, sw.y - 2, sw.w + 4, sw.h + 4, 6);
    }
  }

  for (let tb of thicknessButtons) {
    if (currentStrokeW === tb.value) {
      fill(220, 255, 220, 180);
    } else {
      fill(60, 140, 60);
    }
    stroke(255);
    strokeWeight(1);
    rect(tb.x, tb.y, tb.w, tb.h, 5);

    if (currentStrokeW === tb.value) {
      fill(0);
    } else {
      fill(255);
    }
    noStroke();
    textSize(12);
    textAlign(CENTER, CENTER);
    text(tb.label, tb.x + tb.w / 2, tb.y + tb.h / 2);
  }
}

/*---------------------------------------------------------
 *  FUNCTION      : colorsEqual
 *  DESCRIPTION   :
 *    this function checks if two colors are equal.
 *  PARAMETERS    :
 *    c1, c2 - colors to compare
 *  RETURNS       : boolean indicating if colors are equal
 *---------------------------------------------------------*/
function colorsEqual(c1, c2) {
  return (
    red(c1) === red(c2) && green(c1) === green(c2) && blue(c1) === blue(c2)
  );
}

/*---------------------------------------------------------
 *  FUNCTION      : fillMatches
 *  DESCRIPTION   :
 *    this function checks if the fill color matches the swatch color,
 *  PARAMETERS    :
 *    swatchCol - color of the swatch
 *    currentCol - current fill color
 *  RETURNS       : boolean indicating if fill colors match
 *---------------------------------------------------------*/
function fillMatches(swatchCol, currentCol) {
  return (
    red(swatchCol) === red(currentCol) &&
    green(swatchCol) === green(currentCol) &&
    blue(swatchCol) === blue(currentCol)
  );
}

/*---------------------------------------------------------
 *  FUNCTION      : drawResetButton
 *  DESCRIPTION   :
 *    this function draws the reset button in the left panel.
 *  PARAMETERS    : None
 *  RETURNS       : None
 *---------------------------------------------------------*/
function drawResetButton() {
  if (!resetButton) return;

  fill(200, 80, 80);
  stroke(255);
  strokeWeight(1);
  rect(resetButton.x, resetButton.y, resetButton.w, resetButton.h, 10);

  fill(255);
  noStroke();
  textSize(18);
  textAlign(CENTER, CENTER);
  text(
    resetButton.label,
    resetButton.x + resetButton.w / 2,
    resetButton.y + resetButton.h / 2
  );
}

/*---------------------------------------------------------
 *  FUNCTION      : resetPhotobooth
 *  DESCRIPTION   :
 *    this function resets the photobooth to its default state,
 *  PARAMETERS    : None
 *  RETURNS       : None
 *---------------------------------------------------------*/
function resetPhotobooth() {
  overlayTimeline = [];

  currentTool = "none";
  currentFilter = "none";
  currentStampIndex = 0;

  isDragging = false;
}

/*---------------------------------------------------------
 *  FUNCTION      : mousePressed
 *  DESCRIPTION   :
 *    this function handles mouse press events for UI interaction
 *    and drawing shapes or placing stamps.
 *  PARAMETERS    : None
 *  RETURNS       : None
 *---------------------------------------------------------*/
function mousePressed() {
  const pointer = screenToDesign(mouseX, mouseY);
  const pointerX = pointer.x;
  const pointerY = pointer.y;

  for (let btn of toolButtons) {
    if (
      pointerX >= btn.x &&
      pointerX <= btn.x + btn.w &&
      pointerY >= btn.y &&
      pointerY <= btn.y + btn.h
    ) {
      currentTool = btn.action;
      return;
    }
  }

  for (let btn of filterButtons) {
    if (
      pointerX >= btn.x &&
      pointerX <= btn.x + btn.w &&
      pointerY >= btn.y &&
      pointerY <= btn.y + btn.h
    ) {
      currentFilter = btn.action;
      return;
    }
  }

  for (let btn of stampButtons) {
    if (
      pointerX >= btn.x &&
      pointerX <= btn.x + btn.w &&
      pointerY >= btn.y &&
      pointerY <= btn.y + btn.h
    ) {
      if (currentTool === "rect" || currentTool === "ellipse") {
        return;
      }
      currentStampIndex = btn.stampIndex;
      currentTool = "stamp";
      return;
    }
  }

  for (let sw of strokeSwatches) {
    if (
      pointerX >= sw.x &&
      pointerX <= sw.x + sw.w &&
      pointerY >= sw.y &&
      pointerY <= sw.y + sw.h
    ) {
      currentStrokeCol = sw.col;
      return;
    }
  }

  for (let sw of fillSwatches) {
    if (
      pointerX >= sw.x &&
      pointerX <= sw.x + sw.w &&
      pointerY >= sw.y &&
      pointerY <= sw.y + sw.h
    ) {
      const c = sw.col;
      currentFillCol = color(red(c), green(c), blue(c), 120);
      return;
    }
  }

  for (let tb of thicknessButtons) {
    if (
      pointerX >= tb.x &&
      pointerX <= tb.x + tb.w &&
      pointerY >= tb.y &&
      pointerY <= tb.y + tb.h
    ) {
      currentStrokeW = tb.value;
      return;
    }
  }

  if (
    resetButton &&
    pointerX >= resetButton.x &&
    pointerX <= resetButton.x + resetButton.w &&
    pointerY >= resetButton.y &&
    pointerY <= resetButton.y + resetButton.h
  ) {
    resetPhotobooth();
    return;
  }

  if (currentTool === "stamp" && isInsideVideoArea(pointerX, pointerY)) {
    const stampW = min(150, 100);
    const stampH = min(150, 100);

    const minX = videoDisplayX + stampW / 2;
    const maxX = videoDisplayX + videoDrawW - stampW / 2;
    const minY = videoDisplayY + stampH / 2;
    const maxY = videoDisplayY + videoDrawH - stampH / 2;
    const cx = constrain(pointerX, minX, maxX);
    const cy = constrain(pointerY, minY, maxY);

    const stampObj = createStamp(currentStampIndex, cx, cy, stampW, stampH);
    overlayTimeline.push({ type: "stamp", stamp: stampObj });
    return;
  }

  if (currentTool === "rect" || currentTool === "ellipse") {
    if (isInsideVideoArea(pointerX, pointerY)) {
      isDragging = true;
      shapeStartX = pointerX;
      shapeStartY = pointerY;
      shapeCurrentX = pointerX;
      shapeCurrentY = pointerY;
    }
  }
}

/*---------------------------------------------------------
 *  FUNCTION      : mouseDragged
 *  DESCRIPTION   :
 *    this function handles mouse drag events for drawing shapes.
 *  PARAMETERS    : None
 *  RETURNS       : None
 *---------------------------------------------------------*/
function mouseDragged() {
  if (isDragging && (currentTool === "rect" || currentTool === "ellipse")) {
    const pointer = screenToDesign(mouseX, mouseY);
    const p = clampToVideo(pointer.x, pointer.y);
    shapeCurrentX = p.x;
    shapeCurrentY = p.y;
  }
}

/*---------------------------------------------------------
 *  FUNCTION      : mouseReleased
 *  DESCRIPTION   :
 *    this function handles mouse release events to finalize
 *    shape drawing.
 *  PARAMETERS    : None
 *  RETURNS       : None
 *---------------------------------------------------------*/
function mouseReleased() {
  if (isDragging && (currentTool === "rect" || currentTool === "ellipse")) {
    const pointer = screenToDesign(mouseX, mouseY);
    const endP = clampToVideo(pointer.x, pointer.y);
    shapeCurrentX = endP.x;
    shapeCurrentY = endP.y;

    const startP = clampToVideo(shapeStartX, shapeStartY);
    shapeStartX = startP.x;
    shapeStartY = startP.y;

    const newShape = createShape(currentTool, shapeStartX, shapeStartY, shapeCurrentX, shapeCurrentY, currentStrokeCol, currentFillCol, currentStrokeW);
    overlayTimeline.push({ type: "shape", shape: newShape });

    isDragging = false;
  }
}

/*---------------------------------------------------------
 *  FUNCTION      : drawOverlayTimeline
 *  DESCRIPTION   :
 *    this function draws all shapes and stamps from the overlay timeline.
 *  PARAMETERS    : None
 *  RETURNS       : None
 *---------------------------------------------------------*/
function drawOverlayTimeline() {
  for (let item of overlayTimeline) {
    if (item.type === "stamp") {
      const s = item.stamp;
      const img = stampImages[s.stampIndex];
      if (!img) continue;
      image(img, s.x - s.w / 2, s.y - s.h / 2, s.w, s.h);
    } else if (item.type === "shape") {
      drawShape(item.shape);
    }
  }
}

/*---------------------------------------------------------
 *  FUNCTION      : keyPressed
 *  DESCRIPTION   :
 *    this function handles key press events for capturing photos.
 *  PARAMETERS    : None
 *  RETURNS       : None
 *---------------------------------------------------------*/
function keyPressed() {
  if (key === " ") {
    capturePhoto();
  }
}

/*---------------------------------------------------------
 *  FUNCTION      : isInsideVideoArea
 *  DESCRIPTION   :
 *    this function checks if the given coordinates are inside the video area.
 *  PARAMETERS    :
 *    x, y - coordinates to check
 *  RETURNS       : boolean indicating if coordinates are inside video area
 *---------------------------------------------------------*/
function isInsideVideoArea(x, y) {
  return ( x >= videoDisplayX && x <= videoDisplayX + videoDrawW && y >= videoDisplayY && y <= videoDisplayY + videoDrawH);
}

/*---------------------------------------------------------
 *  FUNCTION      : clampToVideo
 *  DESCRIPTION   :
 *    this function clamps the given coordinates to be within the video area.
 *  PARAMETERS    :
 *    x, y - coordinates to clamp
 *  RETURNS       : object with clamped x and y coordinates
 *---------------------------------------------------------*/
function clampToVideo(x, y) {
  const cx = constrain(x, videoDisplayX, videoDisplayX + videoDrawW);
  const cy = constrain(y, videoDisplayY, videoDisplayY + videoDrawH);
  return { x: cx, y: cy };
}

/*---------------------------------------------------------
 *  FUNCTION      : drawShape
 *  DESCRIPTION   :
 *    this function draws a shape based on the given shape object.
 *  PARAMETERS    :
 *    shape - shape object to draw
 *  RETURNS       : None
 *---------------------------------------------------------*/
function drawShape(shape) {
  const { kind, x1, y1, x2, y2, strokeCol, fillCol, strokeW } = shape;

  const x = min(x1, x2);
  const y = min(y1, y2);
  const w = abs(x2 - x1);
  const h = abs(y2 - y1);

  if (strokeW > 0) {
    stroke(strokeCol);
    strokeWeight(strokeW);
  } else {
    noStroke();
  }
  fill(fillCol);

  if (kind === "rect") {
    rect(x, y, w, h);
  } else if (kind === "ellipse") {
    ellipse(x + w / 2, y + h / 2, w, h);
  }
}

/*---------------------------------------------------------
 *  FUNCTION      : drawShapePreview
 *  DESCRIPTION   :
 *    this function draws a preview of the shape being drawn.
 *  PARAMETERS    : None
 *  RETURNS       : None
 *---------------------------------------------------------*/
function drawShapePreview() {
  if (!isDragging) return;
  if (currentTool !== "rect" && currentTool !== "ellipse") return;

  const previewShape = createShape( currentTool, shapeStartX, shapeStartY, shapeCurrentX, shapeCurrentY,currentStrokeCol,currentFillCol,currentStrokeW);

  push();
  drawShape(previewShape);
  pop();
}

/*---------------------------------------------------------
 *  FUNCTION      : drawStampButtons
 *  DESCRIPTION   :
 *    this function draws the stamp selection buttons.
 *  PARAMETERS    : None
 *  RETURNS       : None
 *---------------------------------------------------------*/
function drawStampButtons() {
  for (let btn of stampButtons) {
    if (currentTool === "stamp" && currentStampIndex === btn.stampIndex) {
      fill(255, 220, 255, 180);
    } else {
      fill(140, 80, 120);
    }
    stroke(255);
    strokeWeight(1);
    rect(btn.x, btn.y, btn.w, btn.h, 10);

    if (currentTool === "stamp" && currentStampIndex === btn.stampIndex) {
      fill(0);
    } else {
      fill(255);
    }
    noStroke();
    textSize(20);
    textAlign(CENTER, TOP);
    const labelY = btn.y + 8;
    text(btn.label.toUpperCase(), btn.x + btn.w / 2, labelY);

    if (btn.stampIndex >= 0 && stampImages[btn.stampIndex]) {
      const imgSize = min(64, btn.w - 20);
      const imgY = btn.y + btn.h / 2 + 10;
      push();
      imageMode(CENTER);
      image(stampImages[btn.stampIndex], btn.x + btn.w / 2, imgY, imgSize,imgSize);
      pop();
    }
  }
}

/*---------------------------------------------------------
 *  FUNCTION      : drawStampPreview
 *  DESCRIPTION   :
 *    this function draws a preview of the stamp at the mouse position.
 *  PARAMETERS    : None
 *  RETURNS       : None
 *---------------------------------------------------------*/
function drawStampPreview() {
  if (currentTool !== "stamp") return;
  const pointer = screenToDesign(mouseX, mouseY);
  if (!isInsideVideoArea(pointer.x, pointer.y)) return;

  const img = stampImages[currentStampIndex];
  if (!img) return;

  push();
  tint(255, 150);
  imageMode(CENTER);
  image(img, pointer.x, pointer.y, 100, 100);
  pop();
}

/*---------------------------------------------------------
 *  FUNCTION      : capturePhoto
 *  DESCRIPTION   :
 *    this function captures the current video frame with
 *    applied filters, shapes, and stamps, and saves it as a PNG file.
 *  PARAMETERS    : None
 *  RETURNS       : None
 *---------------------------------------------------------*/
function capturePhoto() {
  if (!captureBuffer || !video) return;

  captureBuffer.clear();

  captureBuffer.image(video, 0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);

  applyCurrentFilterToGraphics(captureBuffer);

  drawTimelineToCapture();

  save(captureBuffer, "photobooth.png");
}

/*---------------------------------------------------------
 *  FUNCTION      : drawTimelineToCapture
 *  DESCRIPTION   :
 *    this function draws all shapes and stamps from the overlay
 *    timeline onto the capture buffer, scaling them appropriately.
 *  PARAMETERS    : None
 *  RETURNS       : None
 *---------------------------------------------------------*/
function drawTimelineToCapture() {
  const scaleX = VIDEO_WIDTH / videoDrawW;
  const scaleY = VIDEO_HEIGHT / videoDrawH;
  for (let item of overlayTimeline) {
    if (item.type === "stamp") {
      const s = item.stamp;
      const img = stampImages[s.stampIndex];
      if (!img) continue;
      const relX = (s.x - videoDisplayX) * scaleX;
      const relY = (s.y - videoDisplayY) * scaleY;
      const drawW = s.w * scaleX;
      const drawH = s.h * scaleY;

      captureBuffer.image(img, relX - drawW / 2, relY - drawH / 2, drawW, drawH);
    } else if (item.type === "shape") {
      drawShapeOn(captureBuffer, item.shape, videoDisplayX, videoDisplayY, scaleX, scaleY);
    }
  }
}

/*---------------------------------------------------------
 *  FUNCTION      : drawShapeOn
 *  DESCRIPTION   :
 *    this function draws a shape onto the given graphics buffer
 *    with specified offsets and scaling.
 *  PARAMETERS    :
 *    pg - graphics buffer to draw on
 *    shape - shape object to draw
 *    offsetX, offsetY - offsets for positioning
 *    scaleX, scaleY - scaling factors
 *  RETURNS       : None
 *---------------------------------------------------------*/
function drawShapeOn(pg, shape, offsetX, offsetY, scaleX = 1, scaleY = 1) {
  const { kind, x1, y1, x2, y2, strokeCol, fillCol, strokeW } = shape;

  const tx1 = (x1 - offsetX) * scaleX;
  const ty1 = (y1 - offsetY) * scaleY;
  const tx2 = (x2 - offsetX) * scaleX;
  const ty2 = (y2 - offsetY) * scaleY;

  const x = min(tx1, tx2);
  const y = min(ty1, ty2);
  const w = abs(tx2 - tx1);
  const h = abs(ty2 - ty1);

  if (strokeW > 0) {
    pg.stroke(strokeCol);
    pg.strokeWeight(strokeW * scaleX);
  } else {
    pg.noStroke();
  }
  pg.fill(fillCol);

  if (kind === "rect") {
    pg.rect(x, y, w, h);
  } else if (kind === "ellipse") {
    pg.ellipse(x + w / 2, y + h / 2, w, h);
  }
}
