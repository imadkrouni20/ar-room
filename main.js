import * as THREE from 'three';

export const scene = new THREE.Scene();
const canvas = document.getElementById('scene');
const video = document.getElementById('camera');

export const renderer = new THREE.WebGLRenderer({
  canvas, alpha: true, antialias: false, powerPreference: 'high-performance'
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0);

export const camera = new THREE.PerspectiveCamera(
  70, window.innerWidth / window.innerHeight, 0.05, 100
);
camera.position.set(0, 1.6, 0);

scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.6));
const dl = new THREE.DirectionalLight(0xffffff, 0.7);
dl.position.set(2, 4, 2);
scene.add(dl);

const grid = new THREE.GridHelper(10, 10, 0x00ff88, 0x333333);
grid.position.y = -0.01;
grid.material.opacity = 0.35;
grid.material.transparent = true;
scene.add(grid);

const orient = { alpha: 0, beta: 0, gamma: 0 };
let lastOrientTime = 0;

window.addEventListener('deviceorientation', (e) => {
  if (e.alpha === null) return;
  orient.alpha = THREE.MathUtils.degToRad(e.alpha);
  orient.beta  = THREE.MathUtils.degToRad(e.beta);
  orient.gamma = THREE.MathUtils.degToRad(e.gamma);
  lastOrientTime = Date.now();
});

// Touch fallback when sensors unavailable
let touchYaw = 0, touchPitch = 0, touchStart = null;
canvas.addEventListener('touchstart', (e) => {
  if (e.touches.length === 1) {
    touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY,
                   yaw: touchYaw, pitch: touchPitch };
  }
});
canvas.addEventListener('touchmove', (e) => {
  if (!touchStart || e.touches.length !== 1) return;
  const dx = e.touches[0].clientX - touchStart.x;
  const dy = e.touches[0].clientY - touchStart.y;
  touchYaw = touchStart.yaw - dx * 0.005;
  touchPitch = Math.max(-Math.PI/2.2, Math.min(Math.PI/2.2,
               touchStart.pitch - dy * 0.005));
}, { passive: true });
canvas.addEventListener('touchend', () => { touchStart = null; });

const euler = new THREE.Euler(0, 0, 0, 'YXZ');
function updateCamera() {
  if (Date.now() - lastOrientTime < 2000) {
    euler.set(orient.beta - Math.PI/2, orient.alpha, -orient.gamma, 'YXZ');
  } else {
    euler.set(touchPitch, touchYaw, 0, 'YXZ');
  }
  camera.quaternion.setFromEuler(euler);
}

export async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } }, audio: false
    });
    video.srcObject = stream;
    await video.play();
    return true;
  } catch (err) { console.error(err); return false; }
}

function animate() {
  requestAnimationFrame(animate);
  updateCamera();
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

export { THREE };
