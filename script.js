import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

const canvas = document.querySelector("#scene");
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: "high-performance"
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x07090d, 0.035);

const camera = new THREE.PerspectiveCamera(
  42,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(8.5, 5.8, 10.5);

scene.add(new THREE.AmbientLight(0xcad9ff, 1.15));

const key = new THREE.DirectionalLight(0x8cf6ff, 4.0);
key.position.set(5, 7, 6);
scene.add(key);

const rim = new THREE.DirectionalLight(0x9f8cff, 3.2);
rim.position.set(-7, 3, -5);
scene.add(rim);

const warm = new THREE.PointLight(0xffc38c, 45, 20, 2);
warm.position.set(0, -3, 4);
scene.add(warm);

const chip = new THREE.Group();
scene.add(chip);

const metal = new THREE.MeshStandardMaterial({
  color: 0x1d2733,
  metalness: 0.9,
  roughness: 0.25
});
const darkMetal = new THREE.MeshStandardMaterial({
  color: 0x0c1118,
  metalness: 0.95,
  roughness: 0.32
});
const boardMat = new THREE.MeshStandardMaterial({
  color: 0x102923,
  metalness: 0.3,
  roughness: 0.65
});
const dieMat = new THREE.MeshPhysicalMaterial({
  color: 0x7f6cff,
  metalness: 0.55,
  roughness: 0.16,
  clearcoat: 1,
  clearcoatRoughness: 0.2,
  emissive: 0x16112f,
  emissiveIntensity: 0.7
});
const copperMat = new THREE.MeshStandardMaterial({
  color: 0xc47d43,
  metalness: 0.9,
  roughness: 0.28
});
const glowMat = new THREE.MeshBasicMaterial({
  color: 0x8cf6ff,
  transparent: true,
  opacity: 0.32
});

function box(name, size, position, material, bevel = false) {
  const geo = new THREE.BoxGeometry(size[0], size[1], size[2], bevel ? 4 : 1, 1, bevel ? 4 : 1);
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = name;
  mesh.position.set(...position);
  chip.add(mesh);
  return mesh;
}

const pcb = box("PCB", [7.6, 0.34, 7.6], [0, -1.7, 0], boardMat);
const substrate = box("Substrate", [5.7, 0.38, 5.7], [0, -0.95, 0], darkMetal);
const interposer = box("Interposer", [4.75, 0.20, 4.75], [0, -0.38, 0], metal);
const die = box("Die", [3.15, 0.28, 3.15], [0, 0.12, 0], dieMat);
const spreader = box("Heat Spreader", [4.15, 0.42, 4.15], [0, 0.78, 0], metal);
const cap = box("Package Cap", [5.25, 0.46, 5.25], [0, 1.48, 0], darkMetal);

// Decorative traces on the PCB
const traceGroup = new THREE.Group();
chip.add(traceGroup);
for (let i = -3; i <= 3; i++) {
  const h = new THREE.Mesh(new THREE.BoxGeometry(6.1, 0.04, 0.045), copperMat);
  h.position.set(0, -1.49, i * 0.62);
  h.rotation.y = i % 2 ? 0.08 : -0.08;
  traceGroup.add(h);

  const v = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.04, 6.1), copperMat);
  v.position.set(i * 0.62, -1.47, 0);
  v.rotation.y = i % 2 ? -0.08 : 0.08;
  traceGroup.add(v);
}

// Pins around PCB edges
const pinGroup = new THREE.Group();
chip.add(pinGroup);
const pinGeo = new THREE.BoxGeometry(0.13, 0.16, 0.42);
for (let i = -7; i <= 7; i++) {
  for (const side of [-1, 1]) {
    const p1 = new THREE.Mesh(pinGeo, copperMat);
    p1.position.set(i * 0.43, -1.74, side * 4.02);
    pinGroup.add(p1);

    const p2 = new THREE.Mesh(pinGeo, copperMat);
    p2.rotation.y = Math.PI / 2;
    p2.position.set(side * 4.02, -1.74, i * 0.43);
    pinGroup.add(p2);
  }
}

// Small emissive core above die
const core = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.06, 1.35), glowMat);
core.position.set(0, 0.30, 0);
chip.add(core);

// Floating data particles
const count = 520;
const positions = new Float32Array(count * 3);
for (let i = 0; i < count; i++) {
  const r = 8 + Math.random() * 15;
  const a = Math.random() * Math.PI * 2;
  const y = (Math.random() - 0.5) * 18;
  positions[i * 3 + 0] = Math.cos(a) * r;
  positions[i * 3 + 1] = y;
  positions[i * 3 + 2] = Math.sin(a) * r;
}
const particlesGeo = new THREE.BufferGeometry();
particlesGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
const particles = new THREE.Points(
  particlesGeo,
  new THREE.PointsMaterial({ color: 0x708399, size: 0.025, transparent: true, opacity: 0.55 })
);
scene.add(particles);

const layerBaseY = {
  pcb: pcb.position.y,
  substrate: substrate.position.y,
  interposer: interposer.position.y,
  die: die.position.y,
  spreader: spreader.position.y,
  cap: cap.position.y,
  traces: traceGroup.position.y,
  pins: pinGroup.position.y,
  core: core.position.y
};

const layerExplode = {
  pcb: -3.2,
  substrate: -1.8,
  interposer: -0.8,
  die: 0.5,
  spreader: 2.0,
  cap: 3.8
};

function clamp(v, min = 0, max = 1) {
  return Math.min(max, Math.max(min, v));
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}
function ease(t) {
  return t * t * (3 - 2 * t);
}

const sections = [...document.querySelectorAll(".story")];
let pageProgress = 0;
let targetProgress = 0;
let mouseX = 0;
let mouseY = 0;
let reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function updateScrollTarget() {
  const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  targetProgress = clamp(window.scrollY / maxScroll);
}
window.addEventListener("scroll", updateScrollTarget, { passive: true });
updateScrollTarget();

window.addEventListener("pointermove", (e) => {
  mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
  mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
}, { passive: true });

function setExplode(t) {
  const e = ease(t);
  pcb.position.y = lerp(layerBaseY.pcb, layerExplode.pcb, e);
  substrate.position.y = lerp(layerBaseY.substrate, layerExplode.substrate, e);
  interposer.position.y = lerp(layerBaseY.interposer, layerExplode.interposer, e);
  die.position.y = lerp(layerBaseY.die, layerExplode.die, e);
  spreader.position.y = lerp(layerBaseY.spreader, layerExplode.spreader, e);
  cap.position.y = lerp(layerBaseY.cap, layerExplode.cap, e);

  traceGroup.position.y = pcb.position.y - layerBaseY.pcb;
  pinGroup.position.y = pcb.position.y - layerBaseY.pcb;
  core.position.y = die.position.y + 0.18;
}

function setStoryPose(progress, time) {
  // Explode early, then orbit / drift as the user moves deeper.
  const explode = clamp(progress * 1.9);
  setExplode(explode);

  const phase = progress * 5;
  const sideShift = Math.sin(phase * 1.35) * 1.35;
  const vertical = Math.sin(phase * 0.8) * 0.4;

  chip.position.x = sideShift;
  chip.position.y = vertical;

  const idle = reducedMotion ? 0 : time * 0.00012;
  chip.rotation.y = 0.65 + progress * 3.6 + idle;
  chip.rotation.x = -0.34 + Math.sin(progress * 3.2) * 0.16;
  chip.rotation.z = Math.sin(progress * 5.2) * 0.08;

  if (!reducedMotion) {
    chip.rotation.y += mouseX * 0.08;
    chip.rotation.x += -mouseY * 0.04;
  }

  const zoom = 10.7 - progress * 1.5;
  camera.position.x = 8.3 + Math.sin(progress * Math.PI * 2.2) * 3.0;
  camera.position.y = 5.6 + Math.cos(progress * Math.PI * 1.4) * 1.4;
  camera.position.z = zoom;
  camera.lookAt(chip.position.x * 0.25, chip.position.y * 0.25, 0);

  particles.rotation.y = time * 0.000025;
  particles.rotation.x = Math.sin(time * 0.00008) * 0.08;
}

const meterFill = document.querySelector(".meter-fill");
const meterValue = document.querySelector(".meter-value");

function animate(time) {
  pageProgress += (targetProgress - pageProgress) * (reducedMotion ? 1 : 0.055);
  setStoryPose(pageProgress, time);

  const pct = Math.round(pageProgress * 100);
  meterFill.style.height = `${pct}%`;
  meterValue.textContent = `${String(pct).padStart(2, "0")}%`;

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener("resize", onResize);

const details = {
  "course-carch": {
    title: "Computer Architecture",
    body: `<p>Coursework connecting software behavior to processor and memory organization.</p><p class="detail-tech">FOUNDATION · PROCESSORS · MEMORY · LOW-LEVEL SYSTEMS</p>`
  },
  "course-embedded": {
    title: "Embedded Systems",
    body: `<p>Microcontroller-focused systems, firmware, hardware interfaces, debugging, and hardware-software interaction.</p><p class="detail-tech">FIRMWARE · MICROCONTROLLERS · INTERFACES</p>`
  },
  "course-digital": {
    title: "Digital Logic Design",
    body: `<p>Digital systems foundations that support later RTL, FPGA, and hardware optimization work.</p><p class="detail-tech">LOGIC · DIGITAL SYSTEMS · RTL FOUNDATION</p>`
  },
  "course-dsa": {
    title: "Data Structures & Algorithms",
    body: `<p>Software problem solving, algorithmic efficiency, and structured approaches to computation.</p><p class="detail-tech">ALGORITHMS · DATA STRUCTURES · EFFICIENCY</p>`
  },
  "course-software": {
    title: "Software Engineering",
    body: `<p>Software development process, design, implementation, testing, debugging, and collaborative engineering workflow.</p><p class="detail-tech">SDLC · TESTING · DEBUGGING · COLLABORATION</p>`
  },
  "course-circuits": {
    title: "Electronic Circuits",
    body: `<p>Circuit-level foundations supporting embedded hardware and hardware testing work.</p><p class="detail-tech">CIRCUITS · MEASUREMENT · HARDWARE</p>`
  },
  "project-thermostat": {
    title: "Embedded Digital Thermostat",
    body: `<p>A temperature-control system developed for a sand-casting furnace context.</p><ul><li>Developed C/C++ firmware for temperature monitoring and automated control.</li><li>Integrated sensors and digital control logic.</li><li>Tested and debugged firmware and hardware.</li><li>Created Python automation scripts to streamline development and testing workflows.</li></ul><p class="detail-tech">C · C++ · SENSORS · CONTROL · PYTHON</p>`
  },
  "project-poyo": {
    title: "Poyo's Potion Dashboard",
    body: `<p>HackUTD full-stack inventory monitoring and auditing system.</p><ul><li>React / JavaScript / HTML / CSS frontend.</li><li>Node.js, Express.js, REST APIs, and SQLite workflows.</li><li>Automated auditing and discrepancy detection.</li><li>Real-time inventory visualization and data processing.</li></ul><p class="detail-tech">REACT · NODE.JS · EXPRESS · SQLITE · REST</p>`
  },
  "project-hls": {
    title: "HLS & FPGA Optimization",
    body: `<p>Digital hardware optimization through High-Level Synthesis and RTL-oriented workflows.</p><ul><li>Used Verilog and C/C++.</li><li>Applied pipelining, parallelism, and loop optimization.</li><li>Validated behavior using simulation and waveform analysis.</li></ul><p class="detail-tech">VERILOG · C/C++ · HLS · FPGA · SIMULATION</p>`
  },
  "project-esp32": {
    title: "ESP32 Wi-Fi Sensing & Monitoring",
    body: `<p>IEEE embedded systems work combining sensing, camera streaming, wireless communication, and firmware.</p><ul><li>Developed C/C++ firmware.</li><li>Integrated sensors and embedded hardware.</li><li>Implemented real-time monitoring functionality.</li><li>Tested and debugged hardware and firmware.</li></ul><p class="detail-tech">ESP32 · C/C++ · WIFI · SENSORS · CAMERA</p>`
  },
  "project-solis": {
    title: "Solis Rover",
    body: `<p>Comet Robotics embedded systems work for a robotic rover.</p><ul><li>Developed C++ / ROS2 firmware and nodes.</li><li>Worked with rover sensors and motor control.</li><li>Integrated BNO08X IMU and LiDAR.</li><li>Performed board bring-up, hardware testing, firmware debugging, and system-level integration.</li></ul><p class="detail-tech">C++ · ROS2 · BNO08X · LIDAR · BOARD BRING-UP</p>`
  },
  "research-darc": {
    title: "DARC Labs — Digital Hardware Research",
    body: `<p>May 2026 — Aug 2026</p><ul><li>Developed and optimized digital hardware using Verilog, C/C++, HLS, and FPGA workflows.</li><li>Applied pipelining, parallelism, loop optimization, and HLS pragmas.</li><li>Validated designs with simulation and waveform analysis.</li><li>Developed Python automation to streamline hardware research workflows.</li><li>Used AI-assisted development tools in workflow automation.</li></ul><p class="detail-tech">VERILOG · HLS · FPGA · PYTHON · OPTIMIZATION</p>`
  },
  "research-qml": {
    title: "Quantum Materials Lab — Semiconductor Research",
    body: `<p>May 2025 — Aug 2025</p><ul><li>Worked on semiconductor device fabrication and characterization.</li><li>Used photolithography, CVD, and etching.</li><li>Performed device measurements and process characterization.</li><li>Analyzed experimental data.</li></ul><p class="detail-tech">PHOTOLITHOGRAPHY · CVD · ETCHING · CHARACTERIZATION</p>`
  },
  "cert-cs50": { title: "CS50 Introduction to AI", body: `<p>Harvard University — AI with Python.</p><p class="detail-tech">ARTIFICIAL INTELLIGENCE · PYTHON</p>` },
  "cert-claude": { title: "Claude Code in Action", body: `<p>Anthropic — AI-assisted development tooling and workflows.</p><p class="detail-tech">AI-ASSISTED DEVELOPMENT</p>` },
  "cert-aws": { title: "AWS Cloud Computing", body: `<p>Cloud Computing with Amazon Web Services.</p><p class="detail-tech">AWS · CLOUD</p>` },
  "cert-ibm": { title: "IBM Introduction to Cloud Computing", body: `<p>Foundational cloud computing concepts.</p><p class="detail-tech">CLOUD COMPUTING</p>` },
  "cert-hackerrank": { title: "HackerRank Verified", body: `<p>Verified programming certifications in Python and Java.</p><p class="detail-tech">PYTHON · JAVA</p>` },
  "skills-programming": { title: "Programming", body: `<p>C, C++, Python, Java, JavaScript, SQL, MATLAB, and Bash appear across the resume variants.</p>` },
  "skills-hardware": { title: "Digital Hardware", body: `<p>Verilog, VHDL, RTL design, FPGA design, High-Level Synthesis, hardware optimization, and hardware verification.</p>` },
  "skills-embedded": { title: "Embedded & Robotics", body: `<p>ESP32, ROS2, sensors, firmware, motor control, LiDAR, IMU integration, board bring-up, and hardware-software integration.</p>` },
  "skills-tools": { title: "Test & Engineering Tools", body: `<p>Oscilloscope, logic analyzer, multimeter, circuit testing, simulation, waveform analysis, Linux, Git/GitHub, KiCad, Cadence OrCAD, SolidWorks, and MATLAB.</p>` },
  "skills-ai": { title: "Software, Cloud & AI", body: `<p>React, Node.js, Express.js, REST APIs, databases, AWS/cloud computing, generative AI, LLM fundamentals, prompt engineering, and AI automation.</p>` }
};

const panel = document.querySelector("#detail-panel");
const detailTitle = document.querySelector("#detail-title");
const detailBody = document.querySelector("#detail-body");
const closeBtn = panel.querySelector(".detail-close");

function openDetail(key) {
  const item = details[key];
  if (!item) return;
  detailTitle.textContent = item.title;
  detailBody.innerHTML = item.body;
  panel.classList.add("open");
  panel.setAttribute("aria-hidden", "false");
  closeBtn.focus();
}
function closeDetail() {
  panel.classList.remove("open");
  panel.setAttribute("aria-hidden", "true");
}

document.querySelectorAll("[data-detail]").forEach((el) => {
  el.addEventListener("click", () => openDetail(el.dataset.detail));
});
closeBtn.addEventListener("click", closeDetail);
panel.addEventListener("click", (e) => {
  if (e.target === panel) closeDetail();
});
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && panel.classList.contains("open")) closeDetail();
});

// WebGL context loss message
canvas.addEventListener("webglcontextlost", (event) => {
  event.preventDefault();
  document.body.classList.add("webgl-lost");
});
