/**
 * THE SEA WE BREATHE — Interactive 3D Underwater Frame Scrubber & Audio Experience
 * 300 Full-HD frames synchronized to scroll with progressive caching and Web Audio synthesizer.
 */

(function () {
  'use strict';

  // --- CONFIGURATION ---
  const TOTAL_FRAMES = 300;
  const FRAME_PREFIX = 'images/ezgif-frame-';
  const FRAME_EXTENSION = '.png';

  // Elements
  const canvas = document.getElementById('hero-canvas');
  const ctx = canvas.getContext('2d');
  const preloader = document.getElementById('preloader');
  const preloaderBar = document.getElementById('preloader-bar');
  const preloaderPercent = document.getElementById('preloader-percent');

  const heroInner = document.querySelector('.hero-inner');
  const beginBtn = document.getElementById('begin-btn');
  const replayBtn = document.getElementById('replay-btn');
  const soundBtn = document.getElementById('sound-btn');
  const soundLabel = document.getElementById('sound-label');
  const infoBtn = document.getElementById('info-btn');
  const infoModal = document.getElementById('info-modal');
  const modalClose = document.getElementById('modal-close');
  const modalBackdrop = document.querySelector('.modal-backdrop');

  // HUD elements
  const hudDepth = document.getElementById('hud-depth');
  const hudTemp = document.getElementById('hud-temp');
  const hudPressure = document.getElementById('hud-pressure');
  const hudFrame = document.getElementById('hud-frame');
  const timelineFill = document.getElementById('timeline-fill');
  const timelineDots = document.querySelectorAll('.t-dot');
  const navItems = document.querySelectorAll('.nav-item');
  const storyCards = document.querySelectorAll('.story-card');

  // --- STATE ---
  const frameImages = new Array(TOTAL_FRAMES + 1);
  const loadedFrames = new Set();
  let firstFrameLoaded = false;
  let targetFrame = 1;
  let currentFrame = 1;
  let lastDrawnFrame = -1;
  let isTicking = false;

  // Audio State
  let audioCtx = null;
  let isSoundActive = false;
  let ambientGain = null;
  let lowpassFilter = null;
  let bubbleTimer = null;

  // --- IMAGE PATH HELPER ---
  function getFrameUrl(index) {
    const padded = String(index).padStart(3, '0');
    return `${FRAME_PREFIX}${padded}${FRAME_EXTENSION}`;
  }

  // --- RESIZE CANVAS WITH HIGH-DPI SUPPORT ---
  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;

    // Force redraw on resize
    lastDrawnFrame = -1;
    drawCurrentFrame();
  }

  window.addEventListener('resize', resizeCanvas);

  // --- DRAW IMAGE WITH OBJECT-FIT: COVER ---
  function drawImageProp(ctx, img, x, y, w, h, offsetX = 0.5, offsetY = 0.5) {
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const r = Math.min(w / iw, h / ih);
    let nw = iw * r;
    let nh = ih * r;
    let cx, cy, cw, ch, ar = 1;

    // Decide which side to fill
    if (nw < w) ar = w / nw;
    if (Math.abs(ar - 1) < 1e-14 && nh < h) ar = h / nh;
    nw *= ar;
    nh *= ar;

    // Calculate source rectangle
    cw = iw / (nw / w);
    ch = ih / (nh / h);
    cx = (iw - cw) * offsetX;
    cy = (ih - ch) * offsetY;

    if (cx < 0) cx = 0;
    if (cy < 0) cy = 0;
    if (cw > iw) cw = iw;
    if (ch > ih) ch = ih;

    ctx.drawImage(img, cx, cy, cw, ch, x, y, w, h);
  }

  // --- DRAW CURRENT FRAME WITH FALLBACK TO CLOSEST LOADED ---
  function drawFrame(index) {
    let img = frameImages[index];

    // If target frame is not yet fully loaded, find the closest loaded frame
    if (!img || !img.complete || img.naturalWidth === 0) {
      let closest = -1;
      let minDiff = Infinity;
      for (const loadedIdx of loadedFrames) {
        const diff = Math.abs(loadedIdx - index);
        if (diff < minDiff) {
          minDiff = diff;
          closest = loadedIdx;
        }
      }
      if (closest !== -1) {
        img = frameImages[closest];
      }
    }

    if (img && img.complete && img.naturalWidth > 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawImageProp(ctx, img, 0, 0, canvas.width, canvas.height);
      lastDrawnFrame = index;
    }
  }

  function drawCurrentFrame() {
    const frameIndex = Math.min(TOTAL_FRAMES, Math.max(1, Math.round(currentFrame)));
    drawFrame(frameIndex);
  }

  // --- PROGRESSIVE FRAME LOADER ---
  function preloadImages() {
    let loadedCount = 0;
    const priorityThreshold = 25; // First 25 frames needed to hide preloader early

    function markLoaded(idx, img) {
      frameImages[idx] = img;
      loadedFrames.add(idx);
      loadedCount++;

      const percent = Math.min(100, Math.round((loadedCount / TOTAL_FRAMES) * 100));
      preloaderBar.style.width = `${percent}%`;
      preloaderPercent.textContent = `${percent}%`;

      if (idx === 1 && !firstFrameLoaded) {
        firstFrameLoaded = true;
        drawFrame(1);
      }

      // Hide preloader as soon as first 20 frames are ready for instant interaction
      if (loadedCount >= priorityThreshold && !preloader.classList.contains('fade-out')) {
        setTimeout(() => {
          preloader.classList.add('fade-out');
        }, 300);
      }
    }

    // 1. Load Frame 1 immediately
    const firstImg = new Image();
    firstImg.src = getFrameUrl(1);
    firstImg.onload = () => markLoaded(1, firstImg);

    // 2. Load priority batch (frames 2 to 30)
    for (let i = 2; i <= 30; i++) {
      const img = new Image();
      img.src = getFrameUrl(i);
      img.onload = () => markLoaded(i, img);
      img.onerror = () => loadedCount++;
    }

    // 3. Load every 5th frame for immediate responsive scrubbing
    for (let i = 35; i <= TOTAL_FRAMES; i += 5) {
      const img = new Image();
      img.src = getFrameUrl(i);
      img.onload = () => markLoaded(i, img);
      img.onerror = () => loadedCount++;
    }

    // 4. Fill in remaining frames progressively with slight spacing
    setTimeout(() => {
      for (let i = 2; i <= TOTAL_FRAMES; i++) {
        if (!frameImages[i]) {
          const img = new Image();
          img.src = getFrameUrl(i);
          img.onload = () => markLoaded(i, img);
          img.onerror = () => loadedCount++;
        }
      }
    }, 400);

    // Fallback safety: hide preloader after 3.5s regardless
    setTimeout(() => {
      if (!preloader.classList.contains('fade-out')) {
        preloader.classList.add('fade-out');
      }
    }, 3500);
  }

  // --- SCROLL ANIMATION & LERP LOOP ---
  function getScrollProgress() {
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollHeight <= 0) return 0;
    return Math.min(1, Math.max(0, window.scrollY / scrollHeight));
  }

  function updateHUDandOverlays(progress) {
    // 1. Depth (0m to 1250m)
    const depth = Math.round(progress * 1250);
    hudDepth.innerHTML = `${depth} <small>m</small>`;

    // 2. Temperature (24.5°C down to 2.8°C)
    const temp = (24.5 - progress * 21.7).toFixed(1);
    hudTemp.innerHTML = `${temp} <small>°C</small>`;

    // 3. Pressure (1.0 ATM to 126 ATM)
    const pressure = (1.0 + (depth / 10)).toFixed(1);
    hudPressure.innerHTML = `${pressure} <small>ATM</small>`;

    // 4. Frame HUD
    const currentFrameInt = Math.min(TOTAL_FRAMES, Math.max(1, Math.round(currentFrame)));
    hudFrame.innerHTML = `${String(currentFrameInt).padStart(3, '0')} <small>/ 300</small>`;

    // 5. Timeline tracker fill
    timelineFill.style.height = `${progress * 100}%`;

    // 6. Hero Banner Parallax & Fade Out
    if (progress < 0.16) {
      const heroOpacity = Math.max(0, 1 - (progress / 0.12));
      const heroY = -(progress * 280);
      const heroScale = 1 - (progress * 0.15);
      heroInner.style.opacity = heroOpacity;
      heroInner.style.transform = `translate3d(0, ${heroY}px, 0) scale(${heroScale})`;
      heroInner.style.pointerEvents = heroOpacity < 0.1 ? 'none' : 'auto';
    } else {
      heroInner.style.opacity = 0;
      heroInner.style.pointerEvents = 'none';
    }

    // 7. Story Cards In-View Detection
    const windowH = window.innerHeight;
    storyCards.forEach(card => {
      const rect = card.getBoundingClientRect();
      const inView = rect.top < windowH * 0.75 && rect.bottom > windowH * 0.25;
      if (inView) {
        card.classList.add('in-view');
      } else {
        card.classList.remove('in-view');
      }
    });

    // 8. Update Active Navigation Links & Timeline Dots
    updateActiveChapters(progress);

    // 9. Modulate Audio Filter Depth with Scroll
    if (isSoundActive && lowpassFilter && audioCtx) {
      // Frequency goes from 1800Hz at surface down to 280Hz in abyss
      const targetFreq = 1800 - (progress * 1520);
      lowpassFilter.frequency.setTargetAtTime(targetFreq, audioCtx.currentTime, 0.1);
    }
  }

  function updateActiveChapters(progress) {
    // Thresholds:
    // 0: Surface (0 - 0.15)
    // 1: Sunlight (0.15 - 0.38)
    // 2: Reef (0.38 - 0.62)
    // 3: Twilight (0.62 - 0.85)
    // 4: Abyss (0.85 - 1.0)
    let activeIdx = 0;
    if (progress >= 0.82) activeIdx = 4;
    else if (progress >= 0.58) activeIdx = 3;
    else if (progress >= 0.35) activeIdx = 2;
    else if (progress >= 0.14) activeIdx = 1;

    navItems.forEach((item, idx) => {
      if (idx === activeIdx) item.classList.add('active');
      else item.classList.remove('active');
    });

    timelineDots.forEach((dot, idx) => {
      if (idx === activeIdx) dot.classList.add('active');
      else dot.classList.remove('active');
    });
  }

  // Smooth render loop
  function loop() {
    const progress = getScrollProgress();
    targetFrame = 1 + progress * (TOTAL_FRAMES - 1);

    // Linear interpolation for buttery smoothness
    const diff = targetFrame - currentFrame;
    currentFrame += diff * 0.14;

    const roundedFrame = Math.round(currentFrame);
    if (roundedFrame !== lastDrawnFrame) {
      drawFrame(roundedFrame);
    }

    updateHUDandOverlays(progress);
    requestAnimationFrame(loop);
  }

  // --- PROCEDURAL WEB AUDIO SYNTHESIZER ---
  // Authentic underwater sound generator without needing any external MP3 files!
  function initUnderwaterAudio() {
    if (audioCtx) return;

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();

    // 1. Ambient Ocean Rumble Pink Noise Generator
    const bufferSize = audioCtx.sampleRate * 2;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
      b6 = white * 0.115926;
    }

    const whiteNoise = audioCtx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Resonant Lowpass Filter for underwater hydrostatic feel
    lowpassFilter = audioCtx.createBiquadFilter();
    lowpassFilter.type = 'lowpass';
    lowpassFilter.frequency.setValueAtTime(1400, audioCtx.currentTime);
    lowpassFilter.Q.setValueAtTime(3.2, audioCtx.currentTime);

    // Deep Sub-Bass Drone Oscillator (48Hz)
    const subOsc = audioCtx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(48, audioCtx.currentTime);

    const subGain = audioCtx.createGain();
    subGain.gain.setValueAtTime(0.06, audioCtx.currentTime);
    subOsc.connect(subGain);

    // Main Ambient Gain Master
    ambientGain = audioCtx.createGain();
    ambientGain.gain.setValueAtTime(0.001, audioCtx.currentTime);

    // Connect noise through filter to master gain
    whiteNoise.connect(lowpassFilter);
    lowpassFilter.connect(ambientGain);
    subGain.connect(ambientGain);
    ambientGain.connect(audioCtx.destination);

    whiteNoise.start();
    subOsc.start();

    // Start random procedural bubble pops
    startBubbleLoop();
  }

  function playBubblePop() {
    if (!audioCtx || !isSoundActive) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    const startFreq = 500 + Math.random() * 400;
    const endFreq = 180 + Math.random() * 120;
    const duration = 0.09 + Math.random() * 0.07;
    const now = audioCtx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

    gain.gain.setValueAtTime(0.045, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + duration);
  }

  function startBubbleLoop() {
    function scheduleNext() {
      if (isSoundActive) {
        playBubblePop();
      }
      const nextDelay = 1200 + Math.random() * 2600;
      bubbleTimer = setTimeout(scheduleNext, nextDelay);
    }
    scheduleNext();
  }

  function toggleSound(forceState) {
    if (!audioCtx) {
      initUnderwaterAudio();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    if (forceState !== undefined) {
      isSoundActive = forceState;
    } else {
      isSoundActive = !isSoundActive;
    }

    if (isSoundActive) {
      soundBtn.classList.add('playing');
      soundLabel.textContent = 'SOUND: ON';
      ambientGain.gain.setTargetAtTime(0.28, audioCtx.currentTime, 0.4);
      playBubblePop();
    } else {
      soundBtn.classList.remove('playing');
      soundLabel.textContent = 'SOUND: OFF';
      if (ambientGain) {
        ambientGain.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 0.3);
      }
    }
  }

  // --- BUTTON INTERACTIONS & SMOOTH NAVIGATION ---
  const heroSubtitle = document.querySelector('.hero-subtitle');
  if (heroSubtitle) {
    heroSubtitle.style.cursor = 'pointer';
    heroSubtitle.title = 'Click to enable underwater audio';
    heroSubtitle.addEventListener('click', () => {
      toggleSound();
    });
  }

  const learnBtn = document.getElementById('learn-btn');
  if (learnBtn) {
    learnBtn.addEventListener('click', () => {
      infoModal.classList.add('open');
    });
  }

  beginBtn.addEventListener('click', () => {
    // 1. Activate audio on first interaction
    if (!isSoundActive) {
      toggleSound(true);
    }
    // 2. Smoothly scroll into the first dive chapter
    const scrollTarget = window.innerHeight * 1.35;
    window.scrollTo({
      top: scrollTarget,
      behavior: 'smooth'
    });
  });

  replayBtn.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });

  soundBtn.addEventListener('click', () => {
    toggleSound();
  });

  // Timeline dots click navigation
  timelineDots.forEach(dot => {
    dot.addEventListener('click', () => {
      const targetPercent = parseFloat(dot.getAttribute('data-target'));
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo({
        top: scrollHeight * targetPercent,
        behavior: 'smooth'
      });
    });
  });

  // Header Nav links
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = item.getAttribute('href');
      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // Info Modal Open/Close
  infoBtn.addEventListener('click', () => {
    infoModal.classList.add('open');
  });

  modalClose.addEventListener('click', () => {
    infoModal.classList.remove('open');
  });

  modalBackdrop.addEventListener('click', () => {
    infoModal.classList.remove('open');
  });

  // Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.key === 'm' || e.key === 'M') {
      toggleSound();
    } else if (e.key === 'Escape' && infoModal.classList.contains('open')) {
      infoModal.classList.remove('open');
    }
  });

  // --- INITIALIZATION ---
  resizeCanvas();
  preloadImages();
  requestAnimationFrame(loop);

})();
