// Oweleaf 3D dashboard: every invoice in the book is a coin in 3D space.
// Height above the floor = days overdue, coin size = amount, colour = status.
// Data comes from the live API (/api/invoices, /api/state) - mock mode is labelled.
import * as THREE from 'three';

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf1f4ed);
scene.fog = new THREE.Fog(0xf1f4ed, 30, 90);

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
let orbitTheta = 0.6, orbitPhi = 1.02, orbitR = 30;
const lookAt = new THREE.Vector3(0, 2.2, 0);

scene.add(new THREE.AmbientLight(0xffffff, 1.8));
const key = new THREE.DirectionalLight(0xffffff, 2.5);
key.position.set(8, 18, 10);
scene.add(key);
const rim = new THREE.PointLight(0xdbf49d, 25, 60);
rim.position.set(-10, 8, -8);
scene.add(rim);

const floor = new THREE.GridHelper(80, 40, 0xd9e1d0, 0xe8ede0);
scene.add(floor);

// slow rotating "now" ring on the floor
const ring = new THREE.Mesh(
  new THREE.TorusGeometry(9, 0.05, 8, 96),
  new THREE.MeshBasicMaterial({ color: 0xc6d4b8 })
);
ring.rotation.x = Math.PI / 2;
ring.position.y = 0.02;
scene.add(ring);

const coinGroup = new THREE.Group();
scene.add(coinGroup);

function colourFor(inv) {
  if (inv.status === 'PAID' || Number(inv.dueAmount) === 0 && inv.status !== 'SENT') return 0x72a582;
  const d = inv.daysOverdue ?? -1;
  if (d <= 0) return 0x628d9b;
  if (d <= 14) return 0xc4b45d;
  return 0xbf8873;
}

const coins = [];
function buildCoins(invoices) {
  while (coinGroup.children.length) coinGroup.remove(coinGroup.children[0]);
  coins.length = 0;
  const n = invoices.length || 1;
  invoices.forEach((inv, i) => {
    const amount = Number(inv.amount) || 0;
    const radius = 0.9 + Math.min(2.2, Math.sqrt(amount) / 22);
    const days = Math.max(0, inv.daysOverdue ?? 0);
    const height = 0.8 + Math.min(8, days * 0.28);
    const geo = new THREE.CylinderGeometry(radius, radius, 0.28, 48);
    const colour = colourFor(inv);
    const mat = new THREE.MeshStandardMaterial({ color: colour, metalness: 0.22, roughness: 0.38, emissive: colour, emissiveIntensity: 0.12 });
    const coin = new THREE.Mesh(geo, mat);
    const angle = (i / n) * Math.PI * 2;
    const ringR = 7 + (i % 3) * 4;
    coin.position.set(Math.cos(angle) * ringR, height, Math.sin(angle) * ringR);
    coin.userData = { inv, baseY: height, phase: Math.random() * Math.PI * 2 };
    coinGroup.add(coin);
    // tether line to the floor so height reads as "days late"
    const tetherGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(coin.position.x, 0, coin.position.z),
      new THREE.Vector3(coin.position.x, height, coin.position.z),
    ]);
    const tether = new THREE.Line(tetherGeo, new THREE.LineBasicMaterial({ color: 0xc6d4b8 }));
    coinGroup.add(tether);
    coins.push(coin);
  });
}

async function load() {
  try {
    const [invRes, stRes] = await Promise.all([fetch('/api/invoices'), fetch('/api/state')]);
    const invData = await invRes.json();
    const stData = await stRes.json();
    const invoices = invData.invoices || [];
    buildCoins(invoices);
    const overdue = invoices.filter((x) => x.chaseable);
    const outstanding = overdue.reduce((s, x) => s + (Number(x.amount) || 0), 0);
    document.getElementById('s-count').textContent = String(invoices.length);
    document.getElementById('s-over').textContent = String(overdue.length);
    document.getElementById('s-amt').textContent = outstanding.toLocaleString('en-GB', { style: 'currency', currency: invoices[0]?.currency || 'GBP' });
    document.getElementById('s-prop').textContent = String((stData.proposals || []).filter((p) => p.status === 'pending').length);
    if (invData.mock || stData.mock) document.getElementById('mocktag').textContent = 'MOCK fixture data - no live PayPal';
  } catch (e) {
    document.getElementById('s-count').textContent = 'API unreachable';
  }
}

// hover tooltip
const ray = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const tip = document.getElementById('tip');
window.addEventListener('pointermove', (e) => {
  const b = canvas.getBoundingClientRect();
  mouse.set(((e.clientX-b.left) / b.width) * 2 - 1, -((e.clientY-b.top) / b.height) * 2 + 1);
  ray.setFromCamera(mouse, camera);
  const hit = ray.intersectObjects(coins)[0];
  if (hit) {
    const inv = hit.object.userData.inv;
    tip.style.display = 'block';
    tip.style.left = e.clientX + 14 + 'px';
    tip.style.top = e.clientY + 10 + 'px';
    const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
    tip.innerHTML = `<div class="amt">${esc(inv.currency)} ${esc(inv.amount ?? '?')} - ${esc(inv.number)}</div>` +
      `<div>${esc(inv.payerName)}</div>` +
      `<div class="st">${esc(inv.status)}${(inv.daysOverdue ?? 0) > 0 ? ` - ${inv.daysOverdue} days overdue` : inv.daysOverdue === 0 ? ' - due today' : ' - in term'}</div>`;
  } else {
    tip.style.display = 'none';
  }
});

// drag to orbit (no external controls - keeps the vendor footprint to one file)
let dragging = false, px = 0, py = 0;
window.addEventListener('pointerdown', (e) => { dragging = true; px = e.clientX; py = e.clientY; });
window.addEventListener('pointerup', () => { dragging = false; });
window.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  orbitTheta -= (e.clientX - px) * 0.005;
  orbitPhi = Math.min(1.45, Math.max(0.35, orbitPhi - (e.clientY - py) * 0.005));
  px = e.clientX; py = e.clientY;
});
window.addEventListener('wheel', (e) => { orbitR = Math.min(60, Math.max(10, orbitR + e.deltaY * 0.02)); });

function resize() {
  const box = canvas.getBoundingClientRect();
  renderer.setSize(box.width, box.height, false);
  camera.aspect = box.width / box.height;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

const clock = new THREE.Clock();
function tick() {
  const t = clock.getElapsedTime();
  for (const c of coins) {
    c.position.y = c.userData.baseY + Math.sin(t * 0.9 + c.userData.phase) * 0.18;
    c.rotation.y = t * 0.35 + c.userData.phase;
  }
  ring.rotation.z = t * 0.08;
  camera.position.set(
    lookAt.x + orbitR * Math.sin(orbitPhi) * Math.cos(orbitTheta),
    lookAt.y + orbitR * Math.cos(orbitPhi),
    lookAt.z + orbitR * Math.sin(orbitPhi) * Math.sin(orbitTheta)
  );
  camera.lookAt(lookAt);
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

load();
setInterval(load, 60_000);
tick();
