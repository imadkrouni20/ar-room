import { scene, camera, THREE } from './main.js';

export const objects = [];
let selected = null;

export function createFurniture(type, color) {
  const group = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: color ?? 0x9aa0a6 });
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x111111 });

  const box = (w, h, d, x, y, z) => {
    const g = new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Mesh(g, mat);
    m.position.set(x, y, z);
    m.add(new THREE.LineSegments(new THREE.EdgesGeometry(g), edgeMat));
    group.add(m);
  };

  switch (type) {
    case 'chair':
      box(0.5, 0.05, 0.5, 0, 0.45, 0);
      box(0.5, 0.5, 0.05, 0, 0.70, -0.225);
      [[-0.2,-0.2],[0.2,-0.2],[-0.2,0.2],[0.2,0.2]].forEach(([x,z]) =>
        box(0.05, 0.45, 0.05, x, 0.225, z));
      break;
    case 'table':
      box(1.0, 0.06, 0.6, 0, 0.75, 0);
      [[-0.45,-0.25],[0.45,-0.25],[-0.45,0.25],[0.45,0.25]].forEach(([x,z]) =>
        box(0.06, 0.75, 0.06, x, 0.375, z));
      break;
    case 'box':
      box(0.4, 0.4, 0.4, 0, 0.2, 0);
      break;
    case 'tv':
      box(1.0, 0.6, 0.06, 0, 1.0, 0);
      box(0.6, 0.35, 0.35, 0, 0.18, 0);
      break;
    case 'bed':
      box(1.4, 0.2, 2.0, 0, 0.35, 0);
      box(1.4, 0.6, 0.1, 0, 0.65, -0.95);
      break;
    case 'wardrobe':
      box(1.0, 2.0, 0.5, 0, 1.0, 0);
      break;
    case 'lamp': {
      box(0.16, 0.04, 0.16, 0, 0.02, 0);
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.4, 8), mat);
      cyl.position.y = 0.72; group.add(cyl);
      const shade = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.3, 12), mat);
      shade.position.y = 1.5; group.add(shade);
      break;
    }
    default:
      box(0.5, 0.5, 0.5, 0, 0.25, 0);
  }

  group.userData.type = type;
  return group;
}

export function addFurniture(type, color) {
  const f = createFurniture(type, color);
  const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  dir.y = 0;
  if (dir.lengthSq() < 0.0001) dir.set(0, 0, -1);
  dir.normalize();
  const pos = camera.position.clone().addScaledVector(dir, 2);
  pos.y = 0;
  f.position.copy(pos);
  f.lookAt(camera.position.x, 0, camera.position.z);
  scene.add(f);
  objects.push(f);
  return f;
}

export function clearAll() {
  objects.forEach(o => scene.remove(o));
  objects.length = 0;
  selected = null;
}

export function deleteSelected() {
  if (!selected) return false;
  scene.remove(selected);
  const i = objects.indexOf(selected);
  if (i >= 0) objects.splice(i, 1);
  selected = null;
  return true;
}

const raycaster = new THREE.Raycaster();
const center = new THREE.Vector2(0, 0);

export function selectAtCenter() {
  raycaster.setFromCamera(center, camera);
  const hits = raycaster.intersectObjects(objects, true);
  if (!hits.length) return null;
  let obj = hits[0].object;
  while (obj.parent && !objects.includes(obj)) obj = obj.parent;
  if (!objects.includes(obj)) return null;
  selected = obj;
  return obj;
}

export function getSelected() { return selected; }

export function moveSelected(delta) {
  if (!selected) return;
  const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  dir.y = 0;
  if (dir.lengthSq() < 0.0001) return;
  dir.normalize();
  selected.position.addScaledVector(dir, delta);
}

export function rotateSelected(angle) {
  if (selected) selected.rotation.y += angle;
}

export function scaleSelected(factor) {
  if (!selected) {
    selected = selectAtCenter();
    if (!selected) return;
  }
  selected.scale.multiplyScalar(factor);
}

export function changeColorSelected(hex) {
  if (!selected) selected = selectAtCenter();
  if (!selected) return;
  selected.traverse(c => { if (c.isMesh) c.material.color.set(hex); });
}
