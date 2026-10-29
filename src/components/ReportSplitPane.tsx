import React, { useRef, useState } from 'react';
import { GripVertical } from 'lucide-react';

const minimum = 260;
const maximum = 520;
export function ReportSplitPane({ controls, children, initialWidth = 320, controlsLabel = 'Thiết lập và bộ lọc báo cáo', controlsTitle = 'Thiết lập & bộ lọc', resultsLabel = 'Biểu đồ và số liệu báo cáo' }: {
  controls: React.ReactNode; children: React.ReactNode; initialWidth?: number; controlsLabel?: string; controlsTitle?: string; resultsLabel?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(initialWidth);
  const [dragging, setDragging] = useState(false);
  const clamp = (value: number) => Math.max(minimum, Math.min(maximum, (container.current?.clientWidth ?? 1000) - 430, value));

  return <div ref={container} className="report-split-pane" style={{ '--report-controls-width': `${width}px` } as React.CSSProperties}>
    <aside aria-label={controlsLabel} className="report-split-controls min-w-0">
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <h3 className="text-xs font-semibold text-slate-700">{controlsTitle}</h3>
        <span className="report-resize-hint text-[11px] text-slate-400">Kéo thanh bên để co giãn</span>
      </div>
      {controls}
    </aside>
    <div role="separator" aria-label={controlsTitle === 'Thiết lập & bộ lọc' ? 'Điều chỉnh độ rộng bộ lọc' : 'Điều chỉnh độ rộng ' + controlsTitle.toLocaleLowerCase('vi')} aria-orientation="vertical"
      aria-valuemin={minimum} aria-valuemax={maximum} aria-valuenow={width} tabIndex={0}
      className={'report-split-handle' + (dragging ? ' is-dragging' : '')}
      title="Kéo để đổi độ rộng · Nhấp đúp để đặt lại"
      onDoubleClick={() => setWidth(initialWidth)}
      onKeyDown={event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        setWidth(value => clamp(event.key === 'Home' ? minimum : event.key === 'End' ? maximum : value + (event.key === 'ArrowLeft' ? -20 : 20)));
      }}
      onPointerDown={event => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
      }}
      onPointerMove={event => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId) || !container.current) return;
        setWidth(clamp(event.clientX - container.current.getBoundingClientRect().left - 6));
      }}
      onPointerUp={event => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        setDragging(false);
      }}
      onPointerCancel={() => setDragging(false)} onLostPointerCapture={() => setDragging(false)}>
      <GripVertical className="h-5 w-4" />
    </div>
    <section aria-label={resultsLabel} className="min-w-0">{children}</section>
  </div>;
}
