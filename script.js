import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

const canvas = document.getElementById("scene");
const progressFill = document.getElementById("progressFill");
const progressValue = document.getElementById("progressValue");

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x05070b, 0.042);

const camera = new THREE.PerspectiveCamera(
  42,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 2.8, 12);

const ambient = new THREE.AmbientLight(0xcdd8ff, 1.4);
scene.add(ambient);

const keyLight = new THREE.DirectionalLight(0x88f4ff, 3.4);
keyLight.position.set(5, 8, 7);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x7d82ff, 2.2);
fillLight.position.set(-6, 3, -5);
scene.add(fillLight);

const pointLight = new THREE.PointLight(0x55d4ff, 30, 30, 2);
pointLight.position.set(0, 2, 8);
scene.add(pointLight);

const rig = new THREE.Group();
scene.add(rig);

const gpu = new THREE.Group();
rig.add(gpu);

/* -------------------- Materials -------------------- */
const matDark = new THREE.MeshStandardMaterial({
  color: 0x141a24,
  metalness: 0.88,
  roughness: 0.34
});

const matDark2 = new THREE.MeshStandardMaterial({
  color: 0x0d1118,
  metalness: 0.9,
  roughness: 0.28
});

const matPanel = new THREE.MeshStandardMaterial({
  color: 0x1a2230,
  metalness: 0.86,
  roughness: 0.26
});

const matBoard = new THREE.MeshStandardMaterial({
  color: 0x17352e,
  metalness: 0.2,
  roughness: 0.68
});

const matMetal = new THREE.MeshStandardMaterial({
  color: 0xa8b6ca,
  metalness: 0.95,
  roughness: 0.21
});

const matGold = new THREE.MeshStandardMaterial({
  color: 0xba8e34,
  metalness: 0.9,
  roughness: 0.28
});

const matCore = new THREE.MeshPhysicalMaterial({
  color: 0x6d74ff,
  emissive: 0x1a1f66,
  emissiveIntensity: 1.1,
  metalness: 0.45,
  roughness: 0.14,
  clearcoat: 1,
  clearcoatRoughness: 0.1
});

const matGlow = new THREE.MeshBasicMaterial({
  color: 0x7feeff,
  transparent: true,
  opacity: 0.26
});

function roundedBox(w, h, d, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  return mesh;
}

/* -------------------- GPU Parts -------------------- */
const parts = [];
const focusPoints = {};

function registerPart(name, object, base, exploded) {
  object.position.copy(base);
  object.userData.base = base.clone();
  object.userData.exploded = exploded.clone();
  object.userData.partName = name;
  gpu.add(object);
  parts.push(object);
  return object;
}

// PCB
const pcb = roundedBox(9.4, 0.22, 3.6, matBoard);
registerPart(
  "pcb",
  pcb,
  new THREE.Vector3(0, -0.55, 0),
  new THREE.Vector3(0, -1.25, 0)
);

// Gold finger connector
const connector = roundedBox(2.1, 0.08, 0.38, matGold);
registerPart(
  "connector",
  connector,
  new THREE.Vector3(0.85, -0.7, 1.73),
  new THREE.Vector3(0.85, -1.42, 2.2)
);

// GPU core
const coreGroup = new THREE.Group();
const coreBase = roundedBox(1.45, 0.16, 1.1, matCore);
const coreGlow = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.03, 1.35), matGlow);
coreGlow.position.y = 0.1;
coreGroup.add(coreBase);
coreGroup.add(coreGlow);
registerPart(
  "core",
  coreGroup,
  new THREE.Vector3(0, -0.3, 0),
  new THREE.Vector3(0, -0.05, 0)
);

// VRAM
const vramGroup = new THREE.Group();
const vramPositions = [
  [-1.6, 0, -0.8],
  [1.6, 0, -0.8],
  [-1.6, 0, 0.8],
  [1.6, 0, 0.8]
];
vramPositions.forEach(([x, y, z]) => {
  const chip = roundedBox(0.85, 0.13, 0.62, matDark2);
  chip.position.set(x, y, z);
  vramGroup.add(chip);
});
registerPart(
  "vram",
  vramGroup,
  new THREE.Vector3(0, -0.38, 0),
  new THREE.Vector3(1.25, -0.15, 0.85)
);

// Heatsink fins
const heatsinkGroup = new THREE.Group();
for (let i = 0; i < 18; i++) {
  const fin = roundedBox(8.3, 0.06, 0.08, matMetal);
  fin.position.set(0, i * 0.09, -0.72 + i * 0.085);
  heatsinkGroup.add(fin);
}
registerPart(
  "heatsink",
  heatsinkGroup,
  new THREE.Vector3(0, 0.2, -0.72),
  new THREE.Vector3(0, 1.35, -0.8)
);

// Shroud
const shroud = new THREE.Group();
const shroudBase = roundedBox(9.75, 0.85, 3.35, matPanel);
shroud.add(shroudBase);

// decorative frame
const frameTop = roundedBox(9.9, 0.08, 0.24, matMetal);
frameTop.position.set(0, 0.46, -1.42);
shroud.add(frameTop);

const frameBottom = roundedBox(9.9, 0.08, 0.24, matMetal);
frameBottom.position.set(0, 0.46, 1.42);
shroud.add(frameBottom);

registerPart(
  "shroud",
  shroud,
  new THREE.Vector3(0, 0.85, 0),
  new THREE.Vector3(0, 2.25, 0.15)
);

// Fans
function createFan() {
  const g = new THREE.Group();

  const ring = new THREE.Mesh(
    new THREE.CylinderGeometry(1.04, 1.04, 0.18, 40),
    matDark
  );
  ring.rotation.x = Math.PI / 2;
  g.add(ring);

  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 0.25, 24),
    matMetal
  );
  hub.rotation.x = Math.PI / 2;
  g.add(hub);

  const blades = new THREE.Group();
  for (let i = 0; i < 9; i++) {
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.02, 0.72),
      matMetal
    );
    blade.position.z = 0.34;
    blade.rotation.y = Math.PI / 7;
    const bladeWrap = new THREE.Group();
    bladeWrap.rotation.z = (Math.PI * 2 * i) / 9;
    bladeWrap.add(blade);
    blades.add(bladeWrap);
  }

  g.add(blades);
  g.userData.blades = blades;
  return g;
}

const fanLeft = createFan();
registerPart(
  "fanLeft",
  fanLeft,
  new THREE.Vector3(-2.9, 1.32, 0),
  new THREE.Vector3(-3.55, 2.95, 0.45)
);

const fanMid = createFan();
registerPart(
  "fanMid",
  fanMid,
  new THREE.Vector3(0, 1.32, 0),
  new THREE.Vector3(0, 3.15, 0)
);

const fanRight = createFan();
registerPart(
  "fanRight",
  fanRight,
  new THREE.Vector3(2.9, 1.32, 0),
  new THREE.Vector3(3.55, 2.95, -0.45)
);

// Side bracket
const bracket = new THREE.Group();
const bracketMain = roundedBox(0.2, 2.5, 3.4, matMetal);
bracketMain.position.set(0, 0, 0);
bracket.add(bracketMain);

const bracketLip = roundedBox(0.55, 0.2, 3.4, matMetal);
bracketLip.position.set(0.22, -1.15, 0);
bracket.add(bracketLip);

registerPart(
  "bracket",
  bracket,
  new THREE.Vector3(-5.0, 0.2, 0),
  new THREE.Vector3(-6.1, 0.6, 0)
);

// Backplate
const backplate = roundedBox(9.25, 0.12, 3.3, matDark);
registerPart(
  "backplate",
  backplate,
  new THREE.Vector3(0, 0.35, 0),
  new THREE.Vector3(0, 1.0, -1.55)
);

// Screws
const screws = [];
const screwCoords = [
  [-4.0, 1.42, -1.25],
  [-4.0, 1.42, 1.25],
  [4.0, 1.42, -1.25],
  [4.0, 1.42, 1.25],
  [0.0, 1.42, -1.25],
  [0.0, 1.42, 1.25]
];

screwCoords.forEach((pos, i) => {
  const screw = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 0.18, 18),
    matMetal
  );
  screw.rotation.x = Math.PI / 2;
  registerPart(
    `screw${i}`,
    screw,
    new THREE.Vector3(pos[0], pos[1], pos[2]),
    new THREE.Vector3(pos[0] * 1.12, pos[1] + 2.1 + i * 0.12, pos[2] * 1.22)
  );
  screws.push(screw);
});

// tiny pcb bits for futuristic density
const detailGroup = new THREE.Group();
for (let i = 0; i < 18; i++) {
  const cap = roundedBox(0.2, 0.11, 0.13, matDark2);
  cap.position.set(-3.4 + i * 0.38, -0.33, -1.25 + (i % 2) * 0.2);
  detailGroup.add(cap);
}
registerPart(
  "details",
  detailGroup,
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0, -0.1, 0)
);

// Focus points
focusPoints.whole = new THREE.Vector3(0, 0.7, 0);
focusPoints.shroud = new THREE.Vector3(0, 1.15, 0);
focusPoints.pcb = new THREE.Vector3(0, -0.55, 0);
focusPoints.core = new THREE.Vector3(0, -0.22, 0);
focusPoints.vram = new THREE.Vector3(1.55, -0.25, 0.8);
focusPoints.heatsink = new THREE.Vector3(0, 1.15, -0.75);
focusPoints.bracket = new THREE.Vector3(-5.0, 0.5, 0);
focusPoints.screws = new THREE.Vector3(3.9, 2.0, 1.2);

/* -------------------- Background particles -------------------- */
const particleCount = 500;
const particlePositions = new Float32Array(particleCount * 3);

for (let i = 0; i < particleCount; i++) {
  const radius = 8 + Math.random() * 18;
  const angle = Math.random() * Math.PI * 2;
  const y = (Math.random() - 0.5) * 16;

  particlePositions[i * 3] = Math.cos(angle) * radius;
  particlePositions[i * 3 + 1] = y;
  particlePositions[i * 3 + 2] = Math.sin(angle) * radius;
}

const particleGeo = new THREE.BufferGeometry();
particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));

const particleMat = new THREE.PointsMaterial({
  color: 0x6e86a7,
  size: 0.03,
  transparent: true,
  opacity: 0.6
});

const particles = new THREE.Points(particleGeo, particleMat);
scene.add(particles);

/* -------------------- Stage control -------------------- */
const stages = [
  {
    key: "home",
    explode: 0.0,
    focus: "whole",
    cam: new THREE.Vector3(0.2, 2.7, 12.5),
    rotY: 0.18,
    rotX: -0.12
  },
  {
    key: "about",
    explode: 0.08,
    focus: "shroud",
    cam: new THREE.Vector3(1.4, 2.5, 10.7),
    rotY: 0.28,
    rotX: -0.12
  },
  {
    key: "coursework",
    explode: 0.38,
    focus: "pcb",
    cam: new THREE.Vector3(0.4, 1.9, 8.0),
    rotY: 0.35,
    rotX: -0.09
  },
  {
    key: "projects",
    explode: 0.72,
    focus: "core",
    cam: new THREE.Vector3(2.85, 1.35, 5.7),
    rotY: 0.72,
    rotX: -0.08
  },
  {
    key: "research",
    explode: 0.86,
    focus: "heatsink",
    cam: new THREE.Vector3(-2.5, 1.55, 5.6),
    rotY: -0.38,
    rotX: -0.05
  },
  {
    key: "certifications",
    explode: 0.92,
    focus: "bracket",
    cam: new THREE.Vector3(-2.3, 1.0, 4.9),
    rotY: -1.05,
    rotX: -0.04
  },
  {
    key: "skills",
    explode: 0.8,
    focus: "vram",
    cam: new THREE.Vector3(2.2, 1.15, 5.15),
    rotY: 1.04,
    rotX: -0.06
  },
  {
    key: "contact",
    explode: 0.0,
    focus: "whole",
    cam: new THREE.Vector3(0.1, 2.7, 12.1),
    rotY: 0.24,
    rotX: -0.11
  }
];

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function ease(t) {
  return t * t * (3 - 2 * t);
}

function lerpVector(a, b, t) {
  return new THREE.Vector3(
    lerp(a.x, b.x, t),
    lerp(a.y, b.y, t),
    lerp(a.z, b.z, t)
  );
}

let scrollProgress = 0;
let smoothedProgress = 0;

function updateScroll() {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  scrollProgress = maxScroll > 0 ? window.scrollY / maxScroll : 0;

  const pct = Math.round(scrollProgress * 100);
  progressFill.style.height = `${pct}%`;
  progressValue.textContent = `${String(pct).padStart(2, "0")}%`;
}

window.addEventListener("scroll", updateScroll, { passive: true });
updateScroll();

function getStageState() {
  const scaled = scrollProgress * (stages.length - 1);
  const index = Math.floor(scaled);
  const nextIndex = Math.min(index + 1, stages.length - 1);
  const localT = ease(scaled - index);

  const current = stages[index];
  const next = stages[nextIndex];

  return {
    explode: lerp(current.explode, next.explode, localT),
    cam: lerpVector(current.cam, next.cam, localT),
    rotY: lerp(current.rotY, next.rotY, localT),
    rotX: lerp(current.rotX, next.rotX, localT),
    focus: lerpVector(
      focusPoints[current.focus],
      focusPoints[next.focus],
      localT
    )
  };
}

function applyExplosion(amount) {
  parts.forEach((part) => {
    part.position.lerpVectors(part.userData.base, part.userData.exploded, amount);
  });

  // extra movement and spin for screws
  screws.forEach((screw, i) => {
    screw.rotation.z += 0.02 + i * 0.0015;
  });
}

const pointer = { x: 0, y: 0 };

window.addEventListener("pointermove", (e) => {
  pointer.x = (e.clientX / window.innerWidth - 0.5) * 2;
  pointer.y = (e.clientY / window.innerHeight - 0.5) * 2;
}, { passive: true });

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function animate(time) {
  requestAnimationFrame(animate);

  smoothedProgress += (scrollProgress - smoothedProgress) * (prefersReducedMotion ? 1 : 0.06);

  const scaled = smoothedProgress * (stages.length - 1);
  const index = Math.floor(scaled);
  const nextIndex = Math.min(index + 1, stages.length - 1);
  const localT = ease(scaled - index);

  const current = stages[index];
  const next = stages[nextIndex];

  const explode = lerp(current.explode, next.explode, localT);
  const rotY = lerp(current.rotY, next.rotY, localT);
  const rotX = lerp(current.rotX, next.rotX, localT);
  const cam = lerpVector(current.cam, next.cam, localT);
  const focus = lerpVector(focusPoints[current.focus], focusPoints[next.focus], localT);

  applyExplosion(explode);

  // subtle floating
  const floatY = prefersReducedMotion ? 0 : Math.sin(time * 0.0007) * 0.08;
  const floatX = prefersReducedMotion ? 0 : Math.cos(time * 0.0005) * 0.04;

  rig.position.y = floatY;
  rig.position.x = floatX;
  rig.rotation.y = rotY + pointer.x * 0.06;
  rig.rotation.x = rotX - pointer.y * 0.035;

  // fan spin
  [fanLeft, fanMid, fanRight].forEach((fan) => {
    fan.userData.blades.rotation.z -= 0.14;
  });

  // particles drift
  particles.rotation.y = time * 0.00002;
  particles.rotation.x = Math.sin(time * 0.00004) * 0.05;

  camera.position.lerp(cam, 0.09);
  camera.lookAt(focus.x, focus.y, focus.z);

  renderer.render(scene, camera);
}

animate(0);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
});

/* -------------------- Detail panel -------------------- */
const detailPanel = document.getElementById("detailPanel");
const detailTitle = document.getElementById("detailTitle");
const detailBody = document.getElementById("detailBody");
const closeDetail = document.getElementById("closeDetail");

function certificateEmbed(path, fallbackText = "Open certificate in a new tab") {
  return `
    <div class="cert-embed">
      <iframe src="${path}" title="Certificate Preview"></iframe>
    </div>
    <p class="cert-fallback"><a href="${path}" target="_blank" rel="noreferrer">${fallbackText}</a></p>
  `;
}

const details = {
  "cw-architecture": {
    title: "Computer Architecture",
    body: `
      <p>This coursework supports your understanding of processor organization, memory systems, and low-level computational structure.</p>
      <p class="detail-tech">PROCESSORS · MEMORY · LOW-LEVEL SYSTEMS</p>
    `
  },
  "cw-embedded": {
    title: "Embedded Systems",
    body: `
      <p>Focus on firmware, microcontrollers, embedded interfaces, debugging, and real-world system integration.</p>
      <p class="detail-tech">MICROCONTROLLERS · FIRMWARE · INTERFACES</p>
    `
  },
  "cw-digital": {
    title: "Digital Logic Design",
    body: `
      <p>Core logic and digital system design foundations that connect directly to RTL, FPGA, and hardware thinking.</p>
      <p class="detail-tech">DIGITAL LOGIC · HARDWARE FOUNDATIONS</p>
    `
  },
  "cw-software": {
    title: "Software Engineering",
    body: `
      <p>Structured software development, implementation, testing, debugging, and collaborative workflow.</p>
      <p class="detail-tech">DESIGN · TESTING · DEBUGGING · DEVELOPMENT</p>
    `
  },
  "cw-dsa": {
    title: "Data Structures & Algorithms",
    body: `
      <p>Algorithmic efficiency, data organization, and systematic problem solving in software.</p>
      <p class="detail-tech">ALGORITHMS · DATA STRUCTURES · PROBLEM SOLVING</p>
    `
  },
  "cw-circuits": {
    title: "Electronic Circuits",
    body: `
      <p>Circuit-level foundations supporting analog reasoning, embedded hardware understanding, and testing work.</p>
      <p class="detail-tech">CIRCUITS · HARDWARE · ANALYSIS</p>
    `
  },

  "project-thermostat": {
    title: "Embedded Digital Thermostat",
    body: `
      <p>This project focused on embedded control and temperature monitoring for a digital thermostat / sand-casting context.</p>
      <ul>
        <li>Developed C/C++ firmware for temperature monitoring and automated control.</li>
        <li>Integrated sensors and control logic.</li>
        <li>Tested and debugged firmware and hardware through iterative validation.</li>
        <li>Created Python scripts to automate supporting technical tasks.</li>
      </ul>
      <p class="detail-tech">C/C++ · SENSORS · CONTROL LOGIC · DEBUGGING · PYTHON</p>
    `
  },

  "project-poyo": {
    title: "Poyo's Potion Dashboard",
    body: `
      <p>A HackUTD full-stack inventory dashboard project.</p>
      <ul>
        <li>Built with React, JavaScript, HTML, and CSS.</li>
        <li>Developed backend functionality using Node.js, Express.js, REST APIs, and SQLite/database workflows.</li>
        <li>Implemented auditing and discrepancy detection between physical measurements and business records.</li>
        <li>Created real-time visualization and collaborated on testing/debugging features.</li>
      </ul>
      <p class="detail-tech">REACT · JAVASCRIPT · NODE.JS · EXPRESS · SQLITE · REST APIs</p>
    `
  },

  "project-esp32": {
    title: "ESP32 Sensing & Monitoring System",
    body: `
      <p>IEEE project combining sensing, monitoring, and wireless embedded firmware.</p>
      <ul>
        <li>Developed C/C++ firmware for environmental monitoring and camera streaming.</li>
        <li>Integrated sensors, embedded hardware, and wireless communication.</li>
        <li>Implemented real-time monitoring functionality.</li>
        <li>Tested and debugged system functionality.</li>
      </ul>
      <p class="detail-tech">ESP32 · EMBEDDED C/C++ · WIFI · SENSORS · DEBUGGING</p>
    `
  },

  "project-solis": {
    title: "Solis Rover",
    body: `
      <p>Robotics and embedded systems work on the Comet Robotics rover platform.</p>
      <ul>
        <li>Developed C++/ROS2 firmware and nodes for rover sensors and motor control.</li>
        <li>Worked with BNO08X IMU and LiDAR integration.</li>
        <li>Performed board bring-up, hardware testing, and firmware debugging.</li>
        <li>Supported system-level hardware-software integration.</li>
      </ul>
      <p class="detail-tech">C++ · ROS2 · IMU · LIDAR · EMBEDDED SYSTEMS</p>
    `
  },

  "project-hls": {
    title: "HLS & FPGA Optimization",
    body: `
      <p>Digital hardware optimization and verification work across Verilog, HLS, and FPGA-oriented flows.</p>
      <ul>
        <li>Used Verilog and C/C++ for digital hardware implementation.</li>
        <li>Applied pipelining, parallelism, loop optimization, and HLS concepts.</li>
        <li>Validated designs using simulation and waveform analysis.</li>
      </ul>
      <p class="detail-tech">VERILOG · HLS · FPGA · PIPELINING · SIMULATION</p>
    `
  },

  "research-darc": {
    title: "DARC Labs — Digital Hardware Research",
    body: `
      <p><strong>May 2026 – Aug 2026</strong></p>
      <ul>
        <li>Developed and optimized digital hardware using Verilog, C/C++, HLS, and FPGA workflows.</li>
        <li>Applied pipelining, parallelism, loop optimization, and related optimization techniques.</li>
        <li>Validated designs through simulation and waveform analysis.</li>
        <li>Built Python automation tools to support research workflows.</li>
        <li>Used AI-assisted development tools to improve efficiency.</li>
      </ul>
      <p class="detail-tech">VERILOG · C/C++ · HLS · FPGA · PYTHON AUTOMATION · WAVEFORM ANALYSIS</p>
    `
  },

  "research-qml": {
    title: "Quantum Materials Lab — Semiconductor Research",
    body: `
      <p><strong>May 2025 – Aug 2025</strong></p>
      <ul>
        <li>Worked on semiconductor device fabrication and characterization.</li>
        <li>Used photolithography, CVD, and etching processes.</li>
        <li>Performed device measurements and process characterization.</li>
        <li>Analyzed experimental data and contributed to lab research workflows.</li>
      </ul>
      <p class="detail-tech">SEMICONDUCTORS · PHOTOLITHOGRAPHY · CVD · ETCHING · DEVICE MEASUREMENTS</p>
    `
  },

  "cert-claude": {
    title: "Claude Code in Action",
    body: `
      <p>Anthropic — AI-assisted development tooling and workflows.</p>
      <p class="detail-tech">AI-ASSISTED DEVELOPMENT</p>
      ${certificateEmbed("assets/certificates/claude-code-in-action.pdf")}
    `
  },

  "cert-aws": {
    title: "AWS Cloud Practitioner Essentials",
    body: `
      <p>AWS Training & Certification — completed September 07, 2026.</p>
      <p class="detail-tech">AWS · CLOUD FOUNDATIONS</p>
      ${certificateEmbed("assets/certificates/aws-cloud-practitioner.pdf")}
    `
  },

  "cert-ibm": {
    title: "Introduction to Cloud",
    body: `
      <p>IBM / Cognitive Class — issued September 06, 2026.</p>
      <p class="detail-tech">CLOUD COMPUTING</p>
      ${certificateEmbed("assets/certificates/introduction-to-cloud.pdf")}
    `
  },

  "cert-cisco": {
    title: "Introduction to Cybersecurity",
    body: `
      <p>Cisco Networking Academy — completed September 06, 2026.</p>
      <p class="detail-tech">CYBERSECURITY FOUNDATIONS</p>
      ${certificateEmbed("assets/certificates/introduction-to-cybersecurity.pdf")}
    `
  },

  "cert-python": {
    title: "Python (Basic)",
    body: `
      <p>HackerRank skill certification.</p>
      <p class="detail-tech">PYTHON</p>
      ${certificateEmbed("assets/certificates/hackerrank-python-basic.pdf")}
    `
  },

  "cert-java": {
    title: "Java (Basic)",
    body: `
      <p>HackerRank skill certification.</p>
      <p class="detail-tech">JAVA</p>
      ${certificateEmbed("assets/certificates/hackerrank-java-basic.pdf")}
    `
  },

  "skill-programming": {
    title: "Programming",
    body: `
      <p>Languages represented across your materials include C, C++, Python, Java, JavaScript, SQL, MATLAB, and Bash.</p>
      <p class="detail-tech">LANGUAGES · SOFTWARE FOUNDATIONS</p>
    `
  },

  "skill-hardware": {
    title: "Digital Hardware",
    body: `
      <p>Verilog, VHDL, RTL design, FPGA design, High-Level Synthesis, hardware optimization, and verification.</p>
      <p class="detail-tech">RTL · FPGA · HLS · VERIFICATION</p>
    `
  },

  "skill-embedded": {
    title: "Embedded & Robotics",
    body: `
      <p>ESP32, ROS2, sensors, firmware, board bring-up, motor control, IMU/LiDAR integration, and hardware-software integration.</p>
      <p class="detail-tech">EMBEDDED SYSTEMS · ROS2 · FIRMWARE · ROBOTICS</p>
    `
  },

  "skill-tools": {
    title: "Testing & Engineering Tools",
    body: `
      <p>Linux, Git/GitHub, oscilloscopes, logic analyzers, multimeters, simulation, waveform analysis, KiCad, OrCAD, and SolidWorks.</p>
      <p class="detail-tech">TOOLS · DEBUGGING · MEASUREMENT · ENGINEERING WORKFLOW</p>
    `
  },

  "skill-ai": {
    title: "Software, Cloud & AI",
    body: `
      <p>React, Node.js, REST APIs, databases, AWS, generative AI, LLMs, AI-assisted development, and automation workflows.</p>
      <p class="detail-tech">FULL STACK · CLOUD · AI · AUTOMATION</p>
    `
  }
};

function openDetail(key) {
  const item = details[key];
  if (!item) return;

  detailTitle.textContent = item.title;
  detailBody.innerHTML = item.body;
  detailPanel.classList.add("open");
  detailPanel.setAttribute("aria-hidden", "false");
}

function closePanel() {
  detailPanel.classList.remove("open");
  detailPanel.setAttribute("aria-hidden", "true");
}

document.querySelectorAll("[data-detail]").forEach((el) => {
  el.addEventListener("click", () => {
    openDetail(el.dataset.detail);
  });
});

closeDetail.addEventListener("click", closePanel);

detailPanel.addEventListener("click", (e) => {
  if (e.target === detailPanel) closePanel();
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && detailPanel.classList.contains("open")) {
    closePanel();
  }
});
