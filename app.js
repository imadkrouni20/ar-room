import { startCamera } from './main.js';
import { addFurniture, clearAll } from './editor.js';
import { initVoice } from './voice.js';

const status = document.getElementById('status');
const startBtn = document.getElementById('startBtn');
const addBtn = document.getElementById('addBtn');
const clearBtn = document.getElementById('clearBtn');

startBtn.addEventListener('click', async () => {
  status.textContent = 'فتح الكاميرا...';
  const ok = await startCamera();
  if (ok) {
    startBtn.style.display = 'none';
    status.textContent = '✅ جاهز — استخدم 🎤 أو ➕';
  } else {
    status.textContent = '❌ تعذر فتح الكاميرا (لازم HTTPS وسماح)';
  }
});

addBtn.addEventListener('click', () => {
  addFurniture('box', 0x8888ff);
  status.textContent = 'أضفت صندوق';
});

clearBtn.addEventListener('click', () => {
  clearAll();
  status.textContent = 'تم مسح الكل';
});

initVoice();
