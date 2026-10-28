// Enhance centered dialogs while preserving their original CSS size on opening.
export function enablePopupWindows() {
  const selector = '.fixed.inset-0.flex.items-center.justify-center > :is(div,form,section)[class*="max-w-"][class*="rounded-"]';
  const entries = new Map<HTMLElement, () => void>();
  const scan = () => {
    for (const [panel, cleanup] of entries) if (!panel.isConnected) { cleanup(); entries.delete(panel); }
    document.querySelectorAll<HTMLElement>(selector).forEach(panel => {
      if (entries.has(panel)) return;
      const layer = document.createElement('div');
      layer.className = 'popup-window-controls';
      document.body.append(layer);
      let active = false;
      const sync = () => {
        const r = panel.getBoundingClientRect();
        layer.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;z-index:${getComputedStyle(panel.parentElement!).zIndex};pointer-events:none;`;
        layer.hidden = !panel.getClientRects().length || innerWidth < 768;
      };
      const start = (event: PointerEvent, edge: string) => {
        if (event.button !== 0 || innerWidth < 768) return;
        event.preventDefault();
        const r = panel.getBoundingClientRect();
        const x = event.clientX, y = event.clientY;
        active = true;
        const apply = (left: number, top: number, width: number, height: number) => {
          Object.assign(panel.style, { position: 'fixed', margin: '0', transform: 'none', animation: 'none', boxSizing: 'border-box', overflow: 'auto', left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px`, maxWidth: 'none', maxHeight: 'none', minWidth: '0', minHeight: '0', flexShrink: '0' });
          sync();
        };
        const move = (e: PointerEvent) => {
          const dx = e.clientX - x, dy = e.clientY - y;
          if (!edge) { apply(Math.max(8, Math.min(innerWidth - r.width - 8, r.left + dx)), Math.max(8, Math.min(innerHeight - 48, r.top + dy)), r.width, r.height); return; }
          let left = r.left, top = r.top, right = r.right, bottom = r.bottom;
          const minW = Math.min(320, innerWidth - 16), minH = Math.min(180, innerHeight - 16);
          if (edge.includes('w')) left = Math.max(8, Math.min(right - minW, r.left + dx));
          if (edge.includes('e')) right = Math.min(innerWidth - 8, Math.max(left + minW, r.right + dx));
          if (edge.includes('n')) top = Math.max(8, Math.min(bottom - minH, r.top + dy));
          if (edge.includes('s')) bottom = Math.min(innerHeight - 8, Math.max(top + minH, r.bottom + dy));
          apply(left, top, right - left, bottom - top);
        };
        const end = () => { active = false; document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', end); document.removeEventListener('pointercancel', end); };
        document.addEventListener('pointermove', move);
        document.addEventListener('pointerup', end);
        document.addEventListener('pointercancel', end);
      };
      for (const edge of ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']) {
        const handle = document.createElement('div');
        handle.className = `popup-resize-handle popup-resize-${edge}`;
        handle.onpointerdown = e => start(e, edge);
        layer.append(handle);
      }
      const drag = (event: PointerEvent) => {
        const target = event.target as HTMLElement;
        if (target.closest('button,input,select,textarea,a,[role="button"],[contenteditable="true"]')) return;
        const title = panel.querySelector('h2,h3');
        if (!title || (target !== title && !title.contains(target) && target !== title.parentElement && target !== title.parentElement?.parentElement)) return;
        if (event.clientY > panel.getBoundingClientRect().top + 110) return;
        start(event, '');
      };
      panel.addEventListener('pointerdown', drag);
      const resize = new ResizeObserver(sync); resize.observe(panel);
      const viewport = () => { if (!active && panel.style.position === 'fixed') { panel.style.left = `${Math.max(8, Math.min(parseFloat(panel.style.left), innerWidth - panel.offsetWidth - 8))}px`; panel.style.top = `${Math.max(8, Math.min(parseFloat(panel.style.top), innerHeight - 48))}px`; } sync(); };
      window.addEventListener('resize', viewport);
      entries.set(panel, () => { resize.disconnect(); layer.remove(); panel.removeEventListener('pointerdown', drag); window.removeEventListener('resize', viewport); });
      sync();
    });
  };
  const observer = new MutationObserver(scan);
  observer.observe(document.body, { childList: true, subtree: true });
  scan();
}
