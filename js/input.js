// 입력: 키보드·터치 조이스틱(화면 왼쪽 55%)·버튼 → 가상 액션 (r2-기술 §2.4-C)
(function (G) {
  'use strict';
  const I = G.input = {
    move: { x: 0, y: 0, mag: 0 }, mode: 'walk', locks: new Set(),
    stick: null, // {id, ox, oy, x, y} CSS px
    keys: new Set(),
    lock(r) { this.locks.add(r); }, unlock(r) { this.locks.delete(r); },
    locked() { return this.locks.size > 0; },
    emit(type, extra) { G.audio && G.audio.unlock(); const ev = Object.assign({ type }, extra); G.scene.input(ev); },
    lastTouch: false,
    // 터치 기기인가: 마지막 입력이 터치였거나, 기본 포인터가 손가락인 기기
    isTouch() { return this.lastTouch || (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches && !this.lastKey); },
  };
  const KEYMAP = {
    ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd', ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r',
  };
  const ACTION_KEYS = new Set(['Space']);
  const TOOL_KEYS = new Set(['KeyQ']);
  let runHold = 0;
  const STICK_R = 56;

  I.init = (canvas) => {
    addEventListener('pointerdown', (e) => { I.lastTouch = e.pointerType === 'touch' || e.pointerType === 'pen'; if (I.lastTouch) I.lastKey = false; }, true);
    addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      I.lastTouch = false; I.lastKey = true;
      if (!e.repeat) {
        // Enter는 친구 채팅 전용. 일반 행동은 화면 표시와 동일하게 Space 하나만 쓴다.
        if ((e.code === 'Enter' || e.code === 'NumpadEnter') && G.net && G.net.active) { I.emit('chat'); e.preventDefault(); }
        else if (ACTION_KEYS.has(e.code)) { I.emit('act'); e.preventDefault(); }
        else if (TOOL_KEYS.has(e.code)) I.emit('tool');
        else if (e.code === 'Tab' || e.code === 'KeyI' || e.code === 'KeyB') { I.emit('menu'); e.preventDefault(); }
        else if (e.code === 'KeyM') I.emit('map');
        else if (e.code === 'KeyT' || e.code === 'Slash') { I.emit('chat'); e.preventDefault(); }
        else if (e.code === 'Escape' || e.code === 'Backspace') I.emit('back');
      }
      I.keys.add(e.code);
      if (KEYMAP[e.code]) e.preventDefault();
    });
    addEventListener('keyup', (e) => { I.keys.delete(e.code); if (ACTION_KEYS.has(e.code)) I.emit('actUp'); });
    addEventListener('blur', () => { I.keys.clear(); I.stick = null; });

    // 조이스틱: 캔버스 왼쪽 55%에서 시작한 포인터
    // 씬이 포인터를 직접 다루면(하우징 편집) 그쪽으로 보낸다
    const scenePtr = (kind, e) => { const top = G.scene.top(); if (top && top.pointer && top.pointer(kind, e)) { e.preventDefault(); return true; } return false; };
    canvas.addEventListener('pointerdown', (e) => {
      G.audio && G.audio.unlock();
      if (scenePtr('down', e)) { canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId); return; }
      const w = canvas.clientWidth;
      if (e.pointerType !== 'mouse') I.lastTouch = true;
      if (e.clientX < w * 0.55 && !I.stick && e.pointerType !== 'mouse') {
        I.stick = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY, t: performance.now() };
        canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
      } else {
        // 마우스 클릭/오른쪽 탭 = 월드 탭
        I.emit('tapWorld', { cx: e.clientX, cy: e.clientY, mouse: e.pointerType === 'mouse' });
      }
    });
    canvas.addEventListener('pointermove', (e) => {
      if (scenePtr('move', e)) return;
      if (I.stick && e.pointerId === I.stick.id) { I.stick.x = e.clientX; I.stick.y = e.clientY; }
    });
    const end = (e) => { scenePtr('up', e); if (I.stick && e.pointerId === I.stick.id) I.stick = null; };
    canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  };

  // 매 프레임: 이동 벡터 계산
  I.update = (dt) => {
    let x = 0, y = 0, mag = 0, mode = 'walk';
    if (I.stick) {
      let dx = I.stick.x - I.stick.ox, dy = I.stick.y - I.stick.oy;
      const len = Math.hypot(dx, dy);
      // 조이스틱 원점이 손가락을 따라옴(최대 반경 밖으로 끌면)
      if (len > STICK_R) { I.stick.ox = I.stick.x - dx / len * STICK_R; I.stick.oy = I.stick.y - dy / len * STICK_R; dx = dx / len * STICK_R; dy = dy / len * STICK_R; }
      mag = Math.min(1, len / STICK_R);
      if (mag > 0.12) { x = dx / (mag * STICK_R); y = dy / (mag * STICK_R); } else mag = 0;
      // 달리기: 기울기 ≥ 92%를 250ms 유지, < 70%면 복귀
      if (mag >= 0.92) runHold += dt; else if (mag < 0.7) runHold = 0;
      mode = runHold >= 0.25 ? 'run' : mag < 0.45 ? 'sneak' : 'walk';
    } else {
      const k = I.keys;
      if (k.has('ArrowUp') || k.has('KeyW')) y -= 1;
      if (k.has('ArrowDown') || k.has('KeyS')) y += 1;
      if (k.has('ArrowLeft') || k.has('KeyA')) x -= 1;
      if (k.has('ArrowRight') || k.has('KeyD')) x += 1;
      const len = Math.hypot(x, y);
      if (len) { x /= len; y /= len; mag = 1; }
      mode = (k.has('ShiftLeft') || k.has('ShiftRight')) ? 'run' : (k.has('KeyC') || k.has('ControlLeft')) ? 'sneak' : 'walk';
      runHold = 0;
    }
    if (I.locked()) { x = 0; y = 0; mag = 0; }
    I.move.x = x; I.move.y = y; I.move.mag = mag; I.mode = mode;
  };

  G.modules.add('input');
})(globalThis.G);
