// 부팅 진입점 (마지막에 로드)
(function (G) {
  'use strict';
  if (typeof document === 'undefined') return;
  const start = () => { try { G.boot(); } catch (e) { G.log.err('boot', e); document.body.insertAdjacentHTML('beforeend', '<div class="fatal">앗, 시작하지 못했어요. 새로고침해 주세요.<br><small>' + String(e).replace(/</g, '&lt;') + '</small></div>'); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})(globalThis.G);
