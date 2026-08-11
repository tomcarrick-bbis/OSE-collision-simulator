"use strict";

// ======================================
// 1. CONFIGURATION
// ======================================

const CONFIG = Object.freeze({
  masses: [0.5, 1.0, 1.5, 2.0],
  speeds: [1.0, 1.5, 2.0, 2.5, 3.0],
  defaultMass: 1.0,
  defaultSpeed: 2.0,

  // Educational model: expected box displacement (cm) = k × mass × speed²
  distanceConstant: 4,
  trialVariation: 0.10,
  rulerMaxCm: 100,

  animation: {
    springReleaseDurationMs: 600,
    collisionDurationMs: 0,
    cartTravelDurationBySpeedMs: {
      "1": 1400,
      "1.5": 1200,
      "2": 1000,
      "2.5": 850,
      "3": 700
    },
    boxTravelMinDurationMs: 800,
    boxTravelMaxDurationMs: 1800,
    maxFrameStepMs: 50
  },

  geometry: {
    cartWidth: 110,
    cartY: 183,
    boxStartX: 560,
    boxY: 172,
    rulerStartX: 560,
    rulerEndX: 1080,
    rulerY: 310,
    springAnchorX: 88,
    springY: 205,
    cartReleaseX: 260,
    cartContactX: 450,
    readyCartXBySpeed: {
      "1": 225,
      "1.5": 215,
      "2": 205,
      "2.5": 195,
      "3": 185
    }
  }
});

const PHASE = Object.freeze({
  READY: "READY",
  SPRING_RELEASE: "SPRING_RELEASE",
  CART_TRAVEL: "CART_TRAVEL",
  COLLISION: "COLLISION",
  BOX_TRAVEL: "BOX_TRAVEL",
  COMPLETE: "COMPLETE"
});

// ======================================
// 2. DOM REFERENCES
// ======================================

const DOM = {
  spring: document.getElementById("spring"),
  cart: document.getElementById("cart"),
  box: document.getElementById("box"),
  massBlocks: document.getElementById("mass-blocks"),
  ruler: document.getElementById("ruler"),
  massButtons: Array.from(document.querySelectorAll("[data-mass]")),
  speedButtons: Array.from(document.querySelectorAll("[data-speed]")),
  launchButton: document.getElementById("launch-button"),
  resetButton: document.getElementById("reset-button"),
  distanceResult: document.getElementById("distance-result")
};

// ======================================
// 3. SIMULATION STATE
// ======================================

const state = {
  phase: PHASE.READY,
  selectedMass: CONFIG.defaultMass,
  selectedSpeed: CONFIG.defaultSpeed,

  expectedDistance: 0,
  trialDistance: 0,

  cartX: 0,
  boxX: CONFIG.geometry.boxStartX,

  phaseElapsedMs: 0,
  previousFrameTimestamp: null,
  animationFrameId: null
};

// ======================================
// 4. TRIAL CALCULATION
// ======================================

function calculateExpectedDistance(mass, speed) {
  return CONFIG.distanceConstant * mass * speed ** 2;
}

function calculateTrialDistance(expectedDistance) {
  const randomVariation = (Math.random() * 2 - 1) * CONFIG.trialVariation;
  const rawDistance = expectedDistance * (1 + randomVariation);

  // The displayed value and final visual position share the same rounded value.
  return Math.round(rawDistance * 10) / 10;
}

// ======================================
// 5. ANIMATION / RENDERING
// ======================================

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function easeInCubic(t) {
  return t * t * t;
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function cmToSvgDistance(distanceCm) {
  const usableWidth = CONFIG.geometry.rulerEndX - CONFIG.geometry.rulerStartX;
  return (distanceCm / CONFIG.rulerMaxCm) * usableWidth;
}

function readyCartX() {
  return CONFIG.geometry.readyCartXBySpeed[String(state.selectedSpeed)];
}

function cartTravelDurationMs() {
  return CONFIG.animation.cartTravelDurationBySpeedMs[String(state.selectedSpeed)];
}

function boxTravelDurationMs() {
  const fractionOfRuler = clamp(state.trialDistance / CONFIG.rulerMaxCm, 0, 1);
  return lerp(
    CONFIG.animation.boxTravelMinDurationMs,
    CONFIG.animation.boxTravelMaxDurationMs,
    fractionOfRuler
  );
}

function buildSpringPoints(startX, endX, y) {
  const points = [];
  const leadLength = 12;
  const amplitude = 14;
  const coilCount = 10;

  points.push(`${startX},${y}`);

  const coilStart = startX + leadLength;
  const coilEnd = Math.max(coilStart + 10, endX - leadLength);
  points.push(`${coilStart},${y}`);

  for (let i = 1; i <= coilCount * 2; i += 1) {
    const fraction = i / (coilCount * 2);
    const x = lerp(coilStart, coilEnd, fraction);
    const offset = i % 2 === 0 ? -amplitude : amplitude;
    points.push(`${x},${y + offset}`);
  }

  points.push(`${coilEnd},${y}`);
  points.push(`${endX},${y}`);

  return points.join(" ");
}

function renderMassBlocks() {
  const extraBlocks = Math.max(0, Math.round((state.selectedMass - 0.5) / 0.5));
  DOM.massBlocks.replaceChildren();

  for (let i = 0; i < extraBlocks; i += 1) {
    const block = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    const x = 24 + (i % 2) * 34;
    const y = -42 - Math.floor(i / 2) * 32;
    block.setAttribute("x", String(x));
    block.setAttribute("y", String(y));
    block.setAttribute("width", "30");
    block.setAttribute("height", "28");
    block.setAttribute("rx", "4");
    block.setAttribute("class", "mass-block");
    DOM.massBlocks.appendChild(block);

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", String(x + 5));
    line.setAttribute("x2", String(x + 25));
    line.setAttribute("y1", String(y + 14));
    line.setAttribute("y2", String(y + 14));
    line.setAttribute("class", "mass-block-line");
    DOM.massBlocks.appendChild(line);
  }
}

function renderRuler() {
  DOM.ruler.replaceChildren();

  const rulerLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
  rulerLine.setAttribute("x1", String(CONFIG.geometry.rulerStartX));
  rulerLine.setAttribute("x2", String(CONFIG.geometry.rulerEndX));
  rulerLine.setAttribute("y1", String(CONFIG.geometry.rulerY));
  rulerLine.setAttribute("y2", String(CONFIG.geometry.rulerY));
  rulerLine.setAttribute("class", "ruler-line");
  DOM.ruler.appendChild(rulerLine);

  for (let cm = 0; cm <= CONFIG.rulerMaxCm; cm += 5) {
    const x = CONFIG.geometry.rulerStartX + cmToSvgDistance(cm);
    const major = cm % 10 === 0;

    const tick = document.createElementNS("http://www.w3.org/2000/svg", "line");
    tick.setAttribute("x1", String(x));
    tick.setAttribute("x2", String(x));
    tick.setAttribute("y1", String(CONFIG.geometry.rulerY));
    tick.setAttribute("y2", String(CONFIG.geometry.rulerY + (major ? 16 : 9)));
    tick.setAttribute("class", "ruler-tick");
    DOM.ruler.appendChild(tick);

    if (major) {
      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute("x", String(x));
      label.setAttribute("y", String(CONFIG.geometry.rulerY + 39));
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("class", "ruler-label");
      label.textContent = String(cm);
      DOM.ruler.appendChild(label);
    }
  }

  const unit = document.createElementNS("http://www.w3.org/2000/svg", "text");
  unit.setAttribute("x", String(CONFIG.geometry.rulerEndX + 26));
  unit.setAttribute("y", String(CONFIG.geometry.rulerY + 39));
  unit.setAttribute("class", "ruler-unit");
  unit.textContent = "cm";
  DOM.ruler.appendChild(unit);
}

function render() {
  DOM.cart.setAttribute(
    "transform",
    `translate(${state.cartX} ${CONFIG.geometry.cartY})`
  );

  DOM.box.setAttribute(
    "transform",
    `translate(${state.boxX} ${CONFIG.geometry.boxY})`
  );

  let springEndX;
  if (state.phase === PHASE.READY) {
    springEndX = state.cartX;
  } else if (state.phase === PHASE.SPRING_RELEASE) {
    springEndX = state.cartX;
  } else {
    springEndX = CONFIG.geometry.cartReleaseX;
  }

  DOM.spring.setAttribute(
    "points",
    buildSpringPoints(
      CONFIG.geometry.springAnchorX,
      springEndX,
      CONFIG.geometry.springY
    )
  );
}

function enterPhase(nextPhase) {
  state.phase = nextPhase;
  state.phaseElapsedMs = 0;

  if (nextPhase === PHASE.COMPLETE) {
    finishTrial();
  }
}

function updateSpringRelease() {
  const duration = CONFIG.animation.springReleaseDurationMs;
  const progress = clamp(state.phaseElapsedMs / duration, 0, 1);
  const eased = easeInCubic(progress);

  state.cartX = lerp(readyCartX(), CONFIG.geometry.cartReleaseX, eased);

  if (progress >= 1) {
    state.cartX = CONFIG.geometry.cartReleaseX;
    enterPhase(PHASE.CART_TRAVEL);
  }
}

function updateCartTravel() {
  const duration = cartTravelDurationMs();
  const progress = clamp(state.phaseElapsedMs / duration, 0, 1);

  state.cartX = lerp(
    CONFIG.geometry.cartReleaseX,
    CONFIG.geometry.cartContactX,
    progress
  );

  if (progress >= 1) {
    state.cartX = CONFIG.geometry.cartContactX;
    enterPhase(PHASE.COLLISION);
  }
}

function updateCollision() {
  state.cartX = CONFIG.geometry.cartContactX;
  state.boxX = CONFIG.geometry.boxStartX;

  if (state.phaseElapsedMs >= CONFIG.animation.collisionDurationMs) {
    enterPhase(PHASE.BOX_TRAVEL);
  }
}

function updateBoxTravel() {
  const duration = boxTravelDurationMs();
  const progress = clamp(state.phaseElapsedMs / duration, 0, 1);
  const eased = easeOutCubic(progress);
  const displacementSvg = cmToSvgDistance(state.trialDistance) * eased;

  state.boxX = CONFIG.geometry.boxStartX + displacementSvg;
  state.cartX = CONFIG.geometry.cartContactX + displacementSvg;

  if (progress >= 1) {
    const finalDisplacementSvg = cmToSvgDistance(state.trialDistance);
    state.boxX = CONFIG.geometry.boxStartX + finalDisplacementSvg;
    state.cartX = CONFIG.geometry.cartContactX + finalDisplacementSvg;
    enterPhase(PHASE.COMPLETE);
  }
}

function animationLoop(timestamp) {
  if (state.previousFrameTimestamp === null) {
    state.previousFrameTimestamp = timestamp;
  }

  const rawDelta = timestamp - state.previousFrameTimestamp;
  const delta = clamp(rawDelta, 0, CONFIG.animation.maxFrameStepMs);
  state.previousFrameTimestamp = timestamp;
  state.phaseElapsedMs += delta;

  switch (state.phase) {
    case PHASE.SPRING_RELEASE:
      updateSpringRelease();
      break;
    case PHASE.CART_TRAVEL:
      updateCartTravel();
      break;
    case PHASE.COLLISION:
      updateCollision();
      break;
    case PHASE.BOX_TRAVEL:
      updateBoxTravel();
      break;
    default:
      break;
  }

  render();

  if (state.phase !== PHASE.COMPLETE && state.phase !== PHASE.READY) {
    state.animationFrameId = requestAnimationFrame(animationLoop);
  } else {
    state.animationFrameId = null;
    state.previousFrameTimestamp = null;
  }
}

function startAnimation() {
  if (state.animationFrameId !== null) {
    cancelAnimationFrame(state.animationFrameId);
  }

  state.previousFrameTimestamp = null;
  state.animationFrameId = requestAnimationFrame(animationLoop);
}

// ======================================
// 6. USER INTERACTIONS
// ======================================

function setOptionButtonsEnabled(enabled) {
  [...DOM.massButtons, ...DOM.speedButtons].forEach((button) => {
    button.disabled = !enabled;
  });
}

function updateOptionSelection(buttons, attributeName, selectedValue) {
  buttons.forEach((button) => {
    const value = Number(button.dataset[attributeName]);
    button.setAttribute("aria-pressed", String(value === selectedValue));
  });
}

function setReadyState() {
  state.phase = PHASE.READY;
  state.expectedDistance = 0;
  state.trialDistance = 0;
  state.phaseElapsedMs = 0;
  state.previousFrameTimestamp = null;
  state.cartX = readyCartX();
  state.boxX = CONFIG.geometry.boxStartX;

  DOM.distanceResult.textContent = "—";
  DOM.launchButton.disabled = false;
  setOptionButtonsEnabled(true);

  renderMassBlocks();
  render();
}

function launchTrial() {
  if (state.phase !== PHASE.READY) return;

  state.expectedDistance = calculateExpectedDistance(
    state.selectedMass,
    state.selectedSpeed
  );

  state.trialDistance = calculateTrialDistance(state.expectedDistance);

  DOM.distanceResult.textContent = "—";
  DOM.launchButton.disabled = true;
  setOptionButtonsEnabled(false);

  enterPhase(PHASE.SPRING_RELEASE);
  startAnimation();
}

function finishTrial() {
  DOM.distanceResult.textContent = `${state.trialDistance.toFixed(1)} cm`;
  DOM.launchButton.disabled = true;
  setOptionButtonsEnabled(false);
}

function resetSimulation() {
  if (state.animationFrameId !== null) {
    cancelAnimationFrame(state.animationFrameId);
    state.animationFrameId = null;
  }

  setReadyState();
}

function selectMass(event) {
  if (state.phase !== PHASE.READY) return;

  state.selectedMass = Number(event.currentTarget.dataset.mass);
  updateOptionSelection(DOM.massButtons, "mass", state.selectedMass);
  renderMassBlocks();
}

function selectSpeed(event) {
  if (state.phase !== PHASE.READY) return;

  state.selectedSpeed = Number(event.currentTarget.dataset.speed);
  updateOptionSelection(DOM.speedButtons, "speed", state.selectedSpeed);
  state.cartX = readyCartX();
  render();
}

function initialise() {
  renderRuler();

  updateOptionSelection(DOM.massButtons, "mass", state.selectedMass);
  updateOptionSelection(DOM.speedButtons, "speed", state.selectedSpeed);

  DOM.massButtons.forEach((button) => {
    button.addEventListener("click", selectMass);
  });

  DOM.speedButtons.forEach((button) => {
    button.addEventListener("click", selectSpeed);
  });

  DOM.launchButton.addEventListener("click", launchTrial);
  DOM.resetButton.addEventListener("click", resetSimulation);

  setReadyState();
}

initialise();
