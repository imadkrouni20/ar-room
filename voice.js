import {
  addFurniture, moveSelected, rotateSelected, scaleSelected,
  deleteSelected, clearAll, selectAtCenter, changeColorSelected
} from './editor.js';

const micBtn = document.getElementById('micBtn');
const aiBtn  = document.getElementById('aiBtn');
const status = document.getElementById('status');

let recognition = null;
let listening = false;
let aiEnabled = false;

const COLORS = {
  'احمر':0xff3333, 'أحمر':0xff3333, 'red':0xff3333,
  'ازرق':0x3366ff, 'أزرق':0x3366ff, 'blue':0x3366ff,
  'اخضر':0x33cc33, 'أخضر':0x33cc33, 'green':0x33cc33,
  'اصفر':0xffdd33, 'أصفر':0xffdd33, 'yellow':0xffdd33,
  'ابيض':0xeeeeee, 'أبيض':0xeeeeee, 'white':0xeeeeee,
  'اسود':0x222222, 'أسود':0x222222, 'black':0x222222,
  'بني':0x8b5a2b, 'brown':0x8b5a2b,
};

const TYPES = [
  [/كرسي|chair/i, 'chair'],
  [/طاولة|table/i, 'table'],
  [/صندوق|box/i, 'box'],
  [/تلفاز|تلفزيون|tv/i, 'tv'],
  [/سرير|bed/i, 'bed'],
  [/خزانة|wardrobe/i, 'wardrobe'],
  [/مصباح|لمبة|lamp/i, 'lamp'],
];

function detectType(text) {
  for (const [re, t] of TYPES) if (re.test(text)) return t;
  return null;
}

function detectColor(text) {
  for (const [k, v] of Object.entries(COLORS)) {
    if (text.includes(k)) return v;
  }
  return null;
}

function parseLocal(text) {
  const t = text.trim();

  if (/مسح|امسح|حذف الكل|clear/i.test(t)) { clearAll(); return 'تم مسح الكل'; }
  if (/احذف|احذفي|delete/i.test(t) && !/الكل/.test(t)) {
    return deleteSelected() ? 'تم الحذف' : 'لا يوجد عنصر محدد';
  }
  if (/اختر|حدد|select/i.test(t)) {
    const o = selectAtCenter();
    return o ? `تم اختيار ${o.userData.type}` : 'لا يوجد عنصر في الوسط';
  }

  const addMatch = t.match(/(?:اضف|أضف|ضع|add)\s+(.+)/i);
  const body = addMatch ? addMatch[1] : t;
  const type = detectType(body);
  if (type) {
    const color = detectColor(body);
    addFurniture(type, color);
    return `أضفت ${type}` + (color ? ' بلون' : '');
  }

  if (/قدم|امام|أمام|forward/i.test(t)) { moveSelected(0.3);  return 'تحريك للأمام'; }
  if (/تراجع|خلف|back/i.test(t))         { moveSelected(-0.3); return 'تحريك للخلف'; }
  if (/يمين|right/i.test(t))             { rotateSelected(-Math.PI/8); return 'دوران يمين'; }
  if (/يسار|left/i.test(t))              { rotateSelected(Math.PI/8);  return 'دوران يسار'; }
  if (/كبر|أكبر|bigger/i.test(t))        { scaleSelected(1.2); return 'تكبير'; }
  if (/صغر|أصغر|smaller/i.test(t))       { scaleSelected(0.8); return 'تصغير'; }

  if (/لون|color/i.test(t)) {
    const color = detectColor(t);
    if (color) { changeColorSelected(color); return 'تغيير اللون'; }
  }
  return null;
}

function execute(json) {
  if (!json || !json.action) return false;
  switch (json.action) {
    case 'add':
      if (json.type) {
        const c = json.color ? COLORS[json.color] ?? COLORS[Object.keys(COLORS)
          .find(k => k.toLowerCase() === json.color.toLowerCase())] ?? null : null;
        addFurniture(json.type, c);
        return true;
      }
      return false;
    case 'clear':  clearAll(); return true;
    case 'delete': return deleteSelected();
    case 'select': return !!selectAtCenter();
    case 'color':
      if (json.color) {
        const hex = COLORS[json.color] ?? COLORS[Object.keys(COLORS)
          .find(k => k.toLowerCase() === json.color.toLowerCase())] ?? null;
        if (hex != null) { changeColorSelected(hex); return true; }
      }
      return false;
    case 'move':   moveSelected(json.amount ? Number(json.amount) : 0.3); return true;
    case 'rotate': rotateSelected(Math.PI/8); return true;
    case 'scale':  scaleSelected(json.factor ? Number(json.factor) : 1.2); return true;
    default: return false;
  }
}

async function askAI(text) {
  const prompt =
    'حول أمر المستخدم إلى JSON فقط بدون شرح: ' +
    '{"action":"add|move|rotate|scale|delete|clear|select|color",' +
    '"type":"chair|table|box|tv|bed|wardrobe|lamp",' +
    '"color":"red|blue|green|yellow|white|black|brown"}.\n' +
    'الأمر: "' + text + '"\nJSON:';
  try {
    const res = await fetch('https://text.pollinations.ai/' + encodeURIComponent(prompt));
    const txt = await res.text();
    const m = txt.match(/\{[\s\S]*?\}/);
    if (!m) return null;
    return JSON.parse(m[0]);
  } catch (e) { return null; }
}

async function handle(text) {
  const local = parseLocal(text);
  if (local) return local;

  if (aiEnabled) {
    status.textContent = '🤖 يفكر...';
    const json = await askAI(text);
    if (json && execute(json)) return 'AI: ' + json.action + (json.type ? ' ' + json.type : '');
    return 'AI لم يفهم';
  }
  return 'لم أفهم: ' + text;
}

export function initVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { status.textContent = '⚠️ STT غير مدعوم في هذا المتصفح'; return; }

  recognition = new SR();
  recognition.lang = 'ar-SA';
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    listening = true;
    micBtn.classList.add('listening');
    status.textContent = '🎤 أستمع...';
  };
  recognition.onresult = async (e) => {
    const text = e.results[0][0].transcript;
    const result = await handle(text);
    status.textContent = '📝 "' + text + '" → ' + result;
  };
  recognition.onerror = (e) => {
    status.textContent = '❌ صوت: ' + e.error;
    listening = false;
    micBtn.classList.remove('listening');
  };
  recognition.onend = () => {
    listening = false;
    micBtn.classList.remove('listening');
  };

  micBtn.addEventListener('click', () => {
    if (listening) { recognition.stop(); return; }
    try { recognition.start(); } catch (e) {}
  });

  aiBtn.addEventListener('click', () => {
    aiEnabled = !aiEnabled;
    aiBtn.classList.toggle('on', aiEnabled);
    status.textContent = aiEnabled ? '🤖 AI مفعل' : 'AI معطل';
  });
}
