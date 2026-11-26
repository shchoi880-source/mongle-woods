// Painted furniture, pantry items and plated dishes. All cells use a 4px clear border.
(function (G) {
  'use strict';
  const A = G.art;
  const sheets = Object.create(null);
  const coloredFrames = new Map();
  const animalColors = new Map();
  for (const name of ['home', 'room', 'objects', 'decor', 'harvest', 'crops-a', 'crops-b', 'food-a', 'food-b', 'food-c',
    'bugs-a', 'bugs-b', 'fish', 'water-life', 'ranch', 'bugs-c', 'fish-b', 'water-life-b']) {
    const image = new Image();
    image.onload = () => { A.clearCache(); A.iconReset?.(); };
    image.src = 'assets/scenery/items/' + name + '.webp';
    sheets[name] = image;
  }

  // Width and height are world units. Furniture shares the house renderer's existing floor anchor.
  const furniture = {
    lamp: ['home', 2, 25, 35], rug: ['home', 3, 58, 54], cushion: ['home', 4, 27, 23],
    workbench: ['home', 8, 59, 43], sofa: ['room', 0, 60, 43], desk: ['room', 1, 59, 47],
    shelf: ['room', 2, 57, 49], crate: ['room', 3, 28, 27], table: ['room', 4, 29, 25],
    plant: ['room', 5, 27, 33], tree_pot: ['room', 6, 30, 48], wardrobe: ['room', 7, 53, 54],
    bench: ['room', 8, 58, 44], radio: ['objects', 0, 27, 28], tv: ['objects', 1, 27, 35],
    piano: ['objects', 2, 58, 47], fridge: ['objects', 3, 25, 47], stove: ['objects', 4, 27, 42],
    floorlamp: ['objects', 5, 24, 46], starlamp: ['objects', 6, 23, 37], teddy: ['objects', 7, 29, 38],
    bathtub: ['objects', 8, 58, 43],
    clock: ['decor', 0, 24, 31], fireplace: ['decor', 1, 62, 51], aquarium: ['decor', 2, 58, 43],
    cake: ['decor', 3, 28, 34], globe: ['decor', 4, 26, 36],
  };
  const chair = [['home', 5, 26, 41], ['home', 7, 27, 42], ['home', 6, 26, 41], ['home', 7, 27, 42]];
  const bed = [['home', 0, 31, 66], ['home', 1, 59, 42]];

  const palettes = [
    null, [135, 178, 199], [161, 186, 135], [221, 179, 106], [177, 153, 196], [223, 214, 199],
  ];

  function frameFor(it, w, h) {
    if (it.f === 'bed') return bed[w > h ? 1 : 0];
    if (it.f === 'chair') return chair[(it.r || 0) & 3];
    return furniture[it.f];
  }

  function recolor(image, sheet, index, color) {
    const key = sheet + ':' + index + ':' + color;
    if (coloredFrames.has(key)) return coloredFrames.get(key);
    const cell = image.naturalWidth / 3;
    const size = cell - 8, canvas = A.mkCanvas(size, size);
    const g = canvas.getContext('2d', { willReadFrequently: true });
    A.atlasFrame(g, image, index, 0, 0, size, size);
    const imageData = g.getImageData(0, 0, size, size);
    const pixels = imageData.data, target = palettes[color];
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i], green = pixels[i + 1], b = pixels[i + 2];
      // Rose pigment has more blue than green. Timber, brass and ivory keep their own colors.
      if (!pixels[i + 3] || r - green < 10 || b <= green + 1) continue;
      const mix = Math.min(1, (r - green - 8) / 18, (b - green - 1) / 5);
      const shade = (r + green * 2 + b) / 4 - 164;
      for (let channel = 0; channel < 3; channel++) {
        pixels[i + channel] = pixels[i + channel] * (1 - mix) + (target[channel] + shade) * mix;
      }
    }
    g.putImageData(imageData, 0, 0);
    coloredFrames.set(key, canvas);
    return canvas;
  }

  function imageReady(name) {
    const image = sheets[name];
    return image.complete && image.naturalWidth ? image : null;
  }

  function draw(g, sheet, index, x, y, w, h, color = 0, flip = false) {
    const image = imageReady(sheet);
    if (!image) return false;
    if (flip) {
      g.save();
      g.translate(x + w, 0); g.scale(-1, 1);
      x = 0;
    }
    if (palettes[color]) g.drawImage(recolor(image, sheet, index, color), x, y, w, h);
    else A.atlasFrame(g, image, index, x, y, w, h);
    if (flip) g.restore();
    return true;
  }

  function drawDetails(g, id, x, y, w, h, icon) {
    if (id === 'clock') {
      const minutes = icon ? 620 : G.time.now() / 60000;
      const cx = x + w * 0.5, cy = y + h * 0.415;
      g.save();
      g.strokeStyle = '#694834'; g.lineCap = 'round'; g.lineWidth = w * 0.046;
      g.beginPath();
      for (const [turn, radius] of [[minutes / 60, w * 0.19], [minutes / 720, w * 0.14]]) {
        const angle = turn * Math.PI * 2;
        g.moveTo(cx, cy); g.lineTo(cx + Math.sin(angle) * radius, cy - Math.cos(angle) * radius);
      }
      g.stroke(); g.restore();
    } else if (id === 'fireplace') {
      const t = icon ? 0 : G.time.now() / 1200;
      const cx = x + w * 0.5, cy = y + h * 0.77, size = h * (0.096 + Math.sin(t) * 0.012);
      A.paint.blob(g, cx, cy, w * 0.102, size, '#e59743');
      A.paint.blob(g, cx - w * 0.022, cy + size * 0.31, w * 0.061, size * 0.59, '#ffdb93');
    } else if (id === 'aquarium') {
      const t = icon ? 1.2 : G.time.now() / 60000 * 0.22;
      g.save();
      g.beginPath(); g.rect(x + w * 0.12, y + h * 0.18, w * 0.76, h * 0.4); g.clip();
      for (const [i, color] of [[0, '#c77c52'], [1, '#e7b45f']]) {
        const phase = t + i * 1.7;
        const fx = x + w * (0.48 + Math.sin(phase) * 0.23), fy = y + h * (0.34 + i * 0.135);
        const tail = w * (Math.cos(phase) < 0 ? 0.075 : -0.075);
        g.fillStyle = color; g.beginPath(); g.moveTo(fx, fy);
        g.lineTo(fx + tail, fy - h * 0.045); g.lineTo(fx + tail, fy + h * 0.045); g.closePath(); g.fill();
        A.paint.blob(g, fx, fy, w * 0.054, h * 0.044, color);
      }
      g.restore();
    }
  }

  function drawFurniture(g, it, W, H, icon = false) {
    const frame = frameFor(it, W, H);
    if (!frame) return false;
    const [sheet, index, width, height] = frame;
    const color = G.data.get('furn', it.f)?.col ? it.c : 0;
    const scale = icon ? 27 / Math.max(width, height) : 1;
    const w = width * scale, h = height * scale;
    const x = (icon ? 32 - w : W - width) / 2;
    const y = icon ? (32 - h) / 2 : it.f === 'rug' ? (H - h) / 2 : H - h - 3;
    if (!draw(g, sheet, index, x, y, w, h, color, it.f === 'chair' && it.r === 1)) return false;
    drawDetails(g, it.f, x, y, w, h, icon);
    return true;
  }

  const iconFrames = new Map();
  const stack = (sheet, names, prefix = '') => names.forEach((entry, index) => {
    if (!entry) return;
    const [id, width, height] = entry;
    iconFrames.set(prefix + id, [sheet, index, width, height]);
  });
  stack('harvest', [['fruit_acorn', 27, 27], ['crop:watermelon', 24, 27], ['crop:strawberry', 27, 25],
    ['crop:carrot', 24, 28], ['crop:pumpkin', 28, 25], null,
    ['crop:cabbage', 22, 28], ['crop:tomato', 27, 25], ['crop:potato', 26, 25]]);
  stack('crops-a', [['radish', 24, 28], ['spinach', 24, 28], ['corn', 23, 28],
    ['sweet_potato', 28, 24], ['wheat', 22, 29], ['lettuce', 27, 25],
    ['pea', 28, 23], ['onion', 25, 27], ['pepper', 25, 27]], 'crop:');
  stack('crops-b', [['crop:eggplant', 22, 28], ['crop:cucumber', 27, 24], ['crop:sunflower', 25, 28],
    ['crop:peanut', 28, 24], ['crop:broccoli', 24, 28], ['crop:garlic', 25, 26],
    ['crop:green_onion', 25, 28], ['wood', 28, 24], ['stone', 28, 21]]);
  stack('food-a', [['radish_soup', 28, 24], ['cabbage_stew', 28, 23], ['jam', 23, 28],
    ['carrot_soup', 28, 23], ['hwachae', 28, 25], ['grilled_corn', 28, 23],
    ['pumpkin_pie', 28, 23], ['matang', 28, 23], ['lettuce_salad', 28, 24]], 'dish:');
  stack('food-b', [['pea_soup', 28, 23], ['onion_rings', 28, 23], ['gochujang', 28, 26],
    ['eggplant_bake', 28, 22], ['cucumber_kimchi', 28, 23], ['sunflower_seeds', 25, 28],
    ['peanut_butter', 24, 28], ['broccoli_soup', 28, 24], ['garlic_bread', 28, 23]], 'dish:');
  stack('food-c', [['dish:pajeon', 28, 24], ['dish:potato_pancake', 28, 23], ['dish:pumpkin_porridge', 28, 24],
    ['dish:bibimbap', 28, 25], ['branch', 27, 23], ['clay', 28, 23],
    ['iron', 28, 24], ['fossil_raw', 28, 24], ['money', 23, 28]]);
  stack('decor', [null, null, null, null, null, ['net', 26, 28],
    ['rod', 27, 29], ['shovel', 24, 28], ['axe', 26, 28]], 'tool:');
  stack('water-life', [null, null, null, null, null, null,
    ['pancake', 28, 25], ['omelet', 28, 23], ['truffle_soup', 28, 24]], 'dish:');
  stack('ranch', [null, null, null, null, null, null, ['egg', 25, 28], ['milk', 22, 28], ['wool', 28, 24]]);

  function icon(g, id) {
    if (id === 'gold_egg') return animal(g, 'ranch', 6, 4, 2, 24, 28, '#eab755', 4);
    const frame = iconFrames.get(id);
    if (!frame) return false;
    const [sheet, i, w, h] = frame;
    return draw(g, sheet, i, (32 - w) / 2, (32 - h) / 2, w, h);
  }

  const acornTree = (g) => draw(g, 'harvest', 5, 1, 3, 62, 71);
  function animal(g, sheet, index, x, y, w, h, color, variant) {
    const image = imageReady(sheet);
    if (!image) return false;
    if (!color) return draw(g, sheet, index, x, y, w, h);
    const key = [sheet, index, color, variant || 0].join(':');
    let frame = animalColors.get(key);
    if (!frame) {
      const size = 64;
      frame = A.mkCanvas(size, size);
      const target = parseInt(color.slice(1), 16);
      const rgb = [target >> 16, (target >> 8) & 255, target & 255];
      const ctx = frame.getContext('2d', { willReadFrequently: true });
      A.atlasFrame(ctx, image, index, 0, 0, size, size);
      const data = ctx.getImageData(0, 0, size, size), pixels = data.data;
      for (let i = 0; i < pixels.length; i += 4) {
        if (!pixels[i + 3]) continue;
        const light = (pixels[i] * 0.26 + pixels[i + 1] * 0.59 + pixels[i + 2] * 0.15) / 255;
        const mix = Math.min(0.88, Math.max(0, (light - 0.18) * 2.1));
        const stripe = variant === 3 && Math.floor((i / 4 % size + 0.32 * Math.floor(i / 4 / size)) / 6) % 3 === 1 ? 31 : 0;
        for (let c = 0; c < 3; c++) {
          const mid = rgb[c];
          const pigment = light < 0.54 ? mid * (0.25 + light / 0.72) : mid + (248 - mid) * (light - 0.54) / 0.46;
          pixels[i + c] = pixels[i + c] * (1 - mix) + (pigment - stripe) * mix;
        }
      }
      ctx.putImageData(data, 0, 0);
      animalColors.set(key, frame);
      if (animalColors.size > 240) animalColors.delete(animalColors.keys().next().value);
    }
    g.drawImage(frame, x, y, w, h);
    return true;
  }

  const bugs = {
    butterfly: ['bugs-a', 0, 22, 17], moth: ['bugs-a', 1, 19, 16], dragonfly: ['bugs-a', 2, 23, 18],
    ladybug: ['bugs-a', 3, 12, 12], pillbug: ['bugs-a', 4, 13, 8], ant: ['bugs-a', 5, 13, 9],
    cricket: ['bugs-a', 6, 17, 12], beetle: ['bugs-a', 7, 14, 21], whirligig: ['bugs-a', 8, 10, 8],
    firefly: ['bugs-b', 0, 9, 12], bee: ['bugs-b', 1, 13, 12], cicada: ['bugs-b', 2, 13, 19],
    mantis: ['bugs-b', 3, 18, 13], stag: ['bugs-b', 4, 15, 21], snail: ['bugs-b', 5, 15, 11],
    caterpillar: ['bugs-b', 6, 14, 8],
    // 2026-11 GPT 새 그림 (bugs-c)
    rhino: ['bugs-c', 0, 18, 15], grasshopper: ['bugs-c', 1, 20, 14], longhorn: ['bugs-c', 2, 22, 14],
    strider: ['bugs-c', 3, 20, 15], diving: ['bugs-c', 4, 15, 14], dung: ['bugs-c', 5, 20, 14],
    stick: ['bugs-c', 6, 24, 10], spider: ['bugs-c', 7, 16, 14], cloudfly: ['bugs-c', 8, 22, 19],
  };
  function bug(g, b, colors, flap, t) {
    const type = b.sp.art || b.sp.tpl;
    if (b.state === 'curl' || !bugs[type]) return false;
    let [sheet, i, w, h] = bugs[type];
    if (type === 'butterfly' && /swallowtail|morpho/.test(b.sp.id)) {
      sheet = 'bugs-b';
      i = b.sp.id.includes('swallowtail') ? 7 : 8;
    }
    if (!imageReady(sheet)) return false;
    if (type === 'butterfly' || type === 'moth' || type === 'dragonfly' || type === 'cloudfly') w *= 0.43 + Math.abs(flap) * 0.57;
    if (type === 'bee') {
      w *= 0.93 + Math.abs(flap) * 0.07;
      h *= 0.88 + Math.abs(flap) * 0.12;
    }
    if (type === 'firefly') {
      const glow = 0.3 + 0.22 * Math.sin(t * 3 + b.seed);
      A.paint.blob(g, 0, 3, 6, 5, `rgba(245,237,156,${glow})`);
    }
    if (type === 'whirligig') {
      const k = (t * 1.3 + b.seed) % 1;
      A.paint.blob(g, 0, 2, 4 + k * 6, 2 + k * 3, null, `rgba(250,245,218,${0.52 * (1 - k)})`, 0.7);
    }
    // 새 그림 원래 색 그대로(art 지정 + tint 없음), 같은 모양 다른 종은 tint로 색만 바꾼다
    const tint = b.sp.art ? (b.v ? colors[0] : b.sp.tint || null) : colors[0];
    return animal(g, sheet, i, -w / 2, -h / 2, w, h, tint, b.v);
  }

  const waterLife = { squid: [0, 23, 29], octo: [1, 27, 26], jelly: [2, 22, 29],
    crab: [3, 29, 23], turtle: [4, 29, 23], sunfish: [5, 25, 29] };
  // 2026-11 GPT 새 그림: fish-b(해마·가재·새우·가오리·상어·참치·철갑상어·개구리·별빛송사리), water-life-b(바다)
  const FISHB = { seahorse: [0, 20, 29], crayfish: [1, 28, 22], shrimp: [2, 28, 24], ray: [3, 28, 23], shark: [4, 30, 20],
    tuna: [5, 30, 19], sturgeon: [6, 30, 17], frog: [7, 26, 24], starfry: [8, 26, 16] };
  const SEAB = { starfish: [0, 26, 26], urchin: [1, 26, 26], hermit: [2, 27, 24], lobster: [3, 29, 23], seacuc: [4, 29, 18],
    nudi: [5, 29, 19], scallop: [6, 26, 24], moray: [7, 28, 23], cloudjelly: [8, 24, 29] };
  // 아무 칸이나 32×32 아이콘 칸 가운데에 (tint가 있으면 그 색으로)
  function cell(g, art, tint, variant) {
    if (!art) return false;
    let sheet, i, w, h;
    if (FISHB[art]) { [i, w, h] = FISHB[art]; sheet = 'fish-b'; }
    else if (SEAB[art]) { [i, w, h] = SEAB[art]; sheet = 'water-life-b'; }
    else if (waterLife[art]) { [i, w, h] = waterLife[art]; sheet = 'water-life'; }
    else return false;
    return animal(g, sheet, i, -w / 2, -h / 2 - 0.4, w, h, tint || null, variant);
  }
  function fish(g, key, shape, color, variant) {
    const sp = G.data.get('fish', key);
    if (FISHB[shape] || SEAB[shape]) return cell(g, shape, variant ? color : sp && sp.tint, variant);
    if (waterLife[shape]) {
      const [i, w, h] = waterLife[shape];
      return animal(g, 'water-life', i, -w / 2, -h / 2 - 0.4, w, h, variant ? color : null, variant);
    }
    let i = 0, w = 28, h = 19;
    if (shape === 'eel' || shape === 'long') { i = 5; h = 14; }
    else if (shape === 'flat') { i = 3; h = 20; }
    else if (shape === 'puffer') { i = 4; w = 26; h = 24; }
    else if (key === 'catfish' || key === 'bagrid') { i = 6; h = 18; }
    else if (key === 'goldfish') { i = 8; h = 23; }
    else if (/salmon|tuna|yellowtail|seabream|trout/.test(key)) { i = 2; h = 18; }
    else if (/mackerel|rockfish|mandarin/.test(key)) { i = 7; h = 17; }
    else if (/minnow|medaka|smelt|chub|sweetfish|bitterling/.test(key)) { i = 1; h = 15; }
    return animal(g, 'fish', i, -w / 2, -h / 2 - 0.5, w, h, color, variant);
  }

  const farmAnimals = { chicken: [0, 22, 24], cow: [1, 39, 29], sheep: [2, 33, 27],
    pig: [3, 30, 23], pony: [4, 38, 30] };
  function ranch(g, kind, young) {
    if (kind === 'chicken' && young) return draw(g, 'ranch', 5, -10, -23, 20, 23);
    if (!farmAnimals[kind]) return false;
    const [i, w, h] = farmAnimals[kind];
    return draw(g, 'ranch', i, -w / 2, -h, w, h);
  }
  function ranchIcon(g, kind) {
    if (!farmAnimals[kind]) return false;
    const [i, w, h] = farmAnimals[kind];
    const s = 27 / Math.max(w, h);
    return draw(g, 'ranch', i, (32 - w * s) / 2, (32 - h * s) / 2, w * s, h * s);
  }
  G.itemArt = { furniture: drawFurniture, icon, acornTree, bug, fish, ranch, ranchIcon, cell };
})(globalThis.G);
