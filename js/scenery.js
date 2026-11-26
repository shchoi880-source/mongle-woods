// Hand-painted exterior atlases. Destinations use the existing world-space sprite anchors.
(function (G) {
  'use strict';

  const images = Object.create(null);
  const textures = new Map();
  const materials = {
    grass: ['materials', 0, 136], dirt: ['materials', 1, 136],
    water: ['materials', 2, 144], stone: ['materials', 3, 86],
    wood: ['details', 0, 61], soil: ['details', 1, 68],
    cliff: ['details', 2, 85], paper: ['details', 3, 117],
  };
  const patterns = new WeakMap();
  for (const name of ['materials', 'details', 'buildings', 'trees', 'props', 'title']) {
    const image = new Image();
    image.onload = () => G.art?.clearCache();
    image.src = 'assets/scenery/' + name + (name === 'title' ? '.jpg' : '.webp');
    images[name] = image;
  }
  const loaded = (name) => images[name].complete && images[name].naturalWidth > 0;

  const buildings = {
    // Atlas index, center x, ground y, width, height.
    post: [0, 80, 136, 132, 112],
    house: [1, 80, 136, 126, 112],
    tent: [2, 64, 104, 102, 73],
    museum: [3, 80, 136, 134, 115],
    cabin: [4, 64, 106, 110, 94],
    smallhouse: [5, 64, 106, 110, 91],
    bighouse: [6, 64, 106, 116, 104],
    dreamhouse: [7, 64, 106, 120, 105],
    stall: [8, 80, 134, 122, 94],
  };
  const props = {
    mailbox: [0, 32, 76, 27, 43],
    lamp: [1, 32, 76, 24, 66],
    signboard: [2, 32, 76, 32, 40],
    bench: [3, 48, 76, 59, 34],
    board: [4, 48, 76, 60, 50],
  };
  function sprite(g, sheet, index, center, foot, w, h) {
    const image = images[sheet];
    const cell = image.naturalWidth / 3;
    const x = (index % 3) * cell + 4;
    const y = Math.floor(index / 3) * cell + 4;
    g.drawImage(image, x, y, cell - 8, cell - 8, center - w / 2, foot - h, w, h);
  }

  function groundShadow(g, center, foot, width) {
    g.save(); g.translate(center + 2, foot - 4); g.scale(1, 0.27);
    G.art.paint.shadow(g, 0, 0, width, 0.27);
    g.restore();
  }

  function texture(name, sheet, index) {
    if (textures.has(name)) return textures.get(name);
    const image = images[sheet];
    const half = image.naturalWidth / 2;
    const x = (index % 2) * half;
    const y = Math.floor(index / 2) * half;
    const canvas = G.art.mkCanvas(half * 2, half * 2);
    const g = canvas.getContext('2d');
    // Mirrored seams keep the brushwork continuous across both tiles and chunks.
    for (let row = 0; row < 2; row++) for (let col = 0; col < 2; col++) {
      g.setTransform(col ? -1 : 1, 0, 0, row ? -1 : 1, col * half * 2, row * half * 2);
      g.drawImage(image, x, y, half, half, 0, 0, half, half);
    }
    textures.set(name, canvas);
    return canvas;
  }

  function material(g, name, rect, alpha, mode = 'source-over') {
    const [sheet, index, size] = materials[name];
    if (!loaded(sheet)) return false;
    let cache = patterns.get(g);
    if (!cache) { cache = new Map(); patterns.set(g, cache); }
    let pattern = cache.get(name);
    if (!pattern) {
      const canvas = texture(name, sheet, index);
      pattern = g.createPattern(canvas, 'repeat');
      if (!pattern) return false;
      pattern.setTransform(new DOMMatrix().scale(size * 2 / canvas.width));
      cache.set(name, pattern);
    }
    g.save();
    g.globalAlpha = alpha;
    g.globalCompositeOperation = mode;
    g.fillStyle = pattern;
    g.fillRect(...rect);
    g.restore();
    return true;
  }

  function tree(g, kind, season) {
    if (!loaded('trees')) return false;
    if (kind === 'oak') {
      const i = season === 'winter' ? 8 : season === 'autumn' ? 7 : 6;
      groundShadow(g, 56, 118, 98);
      sprite(g, 'trees', i, 56, 118, 109, 112);
    } else {
      const i = kind === 'pine' ? (season === 'winter' ? 5 : 1) : kind === 'fruit' ? 2 :
        season === 'winter' ? 4 : season === 'autumn' ? 3 : 0;
      groundShadow(g, 32, 74, 49);
      sprite(g, 'trees', i, 32, 74, i === 1 || i === 5 ? 52 : 62, 71);
    }
    return true;
  }

  function flower(g, variant, season) {
    if (!loaded('props') || season === 'winter') return false;
    const i = [8, 7, 6, 6][variant % 4];
    if (variant % 4 === 3) g.filter = 'hue-rotate(24deg) saturate(0.75)';
    sprite(g, 'props', i, [15, 19, 13, 17][variant % 4], 27, 21, 19);
    g.filter = 'none';
    return true;
  }

  function rock(g) {
    if (!loaded('props')) return false;
    groundShadow(g, 16, 28, 28);
    sprite(g, 'props', 5, 16, 28, 27, 19);
    return true;
  }

  function prop(g, kind, season) {
    const type = kind === 'mailbox_full' ? 'mailbox' : kind.startsWith('lantern') ? 'lamp' : kind;
    const frame = props[type];
    if (!frame || !loaded('props')) return false;
    const [i, center, foot, w, h] = frame;
    const P = G.art.paint;
    groundShadow(g, center, foot, w * 0.85);
    sprite(g, 'props', i, center, foot, w, h);
    if (kind === 'mailbox_full') {
      P.rrect(g, center - 5, foot - h - 5, 13, 9, 2, '#fff5da', '#9a604b', 1);
      g.beginPath(); g.moveTo(center - 4, foot - h - 4);
      g.lineTo(center + 1.5, foot - h); g.lineTo(center + 7, foot - h - 4); g.stroke();
    }
    if (kind === 'lantern_lit') P.vol(g, center, 26, 11, 13, 0.8);
    if (season === 'winter' && (type === 'bench' || type === 'board')) {
      P.blob(g, center, foot - h + 4, w * 0.32, 2, '#edf4f3');
    }
    return true;
  }

  function building(g, kind, season) {
    const type = kind === 'museum_closed' ? 'museum' : kind;
    const frame = buildings[type];
    if (!frame || !loaded('buildings')) return false;
    const [i, center, foot, w, h] = frame;
    const P = G.art.paint;
    if (type !== 'stall') groundShadow(g, center, foot - 2, w);
    sprite(g, 'buildings', i, center, foot, w, h);
    if (season === 'winter') {
      g.save();
      g.globalCompositeOperation = 'source-atop';
      for (const [dx, dy, rw] of [[-0.14, 0.14, 0.22], [0.14, 0.18, 0.17], [-0.26, 0.26, 0.1]]) {
        P.blob(g, center + w * dx, foot - h + h * dy, w * rw, 2.7, 'rgba(244,248,245,0.74)');
      }
      g.restore();
    }
    // Labels stay live so the open/closed state and readable Korean travel with the building.
    const label = type === 'museum' ? '조약돌 박물관' : type === 'stall' ? '땅굴상점' : '';
    if (label) {
      const y = type === 'museum' ? 80 : 78;
      P.rrect(g, center - 32, y, 64, 15, 4, '#fff2d8', '#947956', 1);
      g.fillStyle = '#574331'; g.font = G.fontPx(10);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(label, center, y + 8);
      if (kind === 'museum_closed') {
        P.rrect(g, center - 27, foot - 21, 54, 14, 4, '#f8e2bc', '#aa6f54', 1);
        g.fillStyle = '#903e31'; g.fillText('내일 개관!', center, foot - 13.5);
      }
    }
    return true;
  }

  function title(g, w, h) {
    if (!loaded('title')) return false;
    const image = images.title;
    const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    const x = (w - width) * (w < h ? 0.58 : 0.5);
    g.drawImage(image, x, (h - height) * 0.55, width, height);
    return true;
  }

  G.scenery = { material, tree, flower, rock, prop, building, title };
})(globalThis.G);
