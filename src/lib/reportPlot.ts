import {REPORT_FONT_FAMILY} from './reportTypography';
export type ReportChartKind = 'column' | 'bar' | 'line' | 'area' | 'donut' | 'pie' | 'lollipop' | 'treemap';
export interface PlotDatum { key: string; label: string; value: number | null; previous?: number | null }
export const reportChartNames: Record<ReportChartKind, string> = { column: 'Cột', bar: 'Thanh ngang', line: 'Đường', area: 'Miền', donut: 'Tròn', pie: 'Tròn đặc', lollipop: 'Chấm', treemap: 'Ô tỷ trọng' };
const colors = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#db2777', '#7c3aed', '#2563eb', '#ea580c'];
const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
export function availableReportCharts(temporal: boolean, additive: boolean, data: PlotDatum[], comparison = false): ReportChartKind[] {
  return ['column', 'bar', 'lollipop', ...(temporal ? ['line', 'area'] as ReportChartKind[] : []),
    ...(additive && !comparison && data.every(row => row.value === null || row.value >= 0) ? ['donut', 'pie', 'treemap'] as ReportChartKind[] : [])];
}

/** Shared, escaped SVG for on-screen charts and the isolated print document. */
export function renderReportPlot(data: PlotDatum[], kind: ReportChartKind, format: (value: number | null) => string,
  options: { title: string; groupLabel?: string; metricLabel?: string; interactive?: boolean; selectedKey?: string; comparison?: boolean; idPrefix?: string } ): string {
  const gradientId = (options.idPrefix || 'report-plot').replace(/[^a-zA-Z0-9_-]/g, '');
  const interaction = (row: PlotDatum) => options.interactive ? ` data-report-key="${esc(row.key)}" role="button" tabindex="0" aria-label="${esc(row.label + ': ' + format(row.value))}" aria-pressed="${row.key === options.selectedKey}" style="cursor:pointer;${options.selectedKey && row.key !== options.selectedKey ? 'opacity:.45' : ''}"` : '';
  const tip = (row: PlotDatum) => `<title>${esc(row.label + ': ' + format(row.value) + (options.comparison ? ' / Đối chiếu: ' + format(row.previous ?? null) : ''))}</title>`;
  const values = data.flatMap(row => [row.value, options.comparison ? row.previous : null]).filter((value): value is number => value != null);
  const periods: Array<'value' | 'previous'> = options.comparison ? ['value', 'previous'] : ['value'];
  const min = Math.min(0, ...values), max = Math.max(1, ...values), total = data.reduce((sum, row) => sum + (row.value || 0), 0);
  const label = (row: PlotDatum, length = 18) => esc(row.label.length > length ? row.label.slice(0, length - 1) + '…' : row.label);
  let body = '', height = 300;
  if (['donut', 'pie', 'treemap'].includes(kind)) {
    if (total <= 0) return '<p class="plot-empty">Tổng bằng 0, chưa thể thể hiện cơ cấu.</p>';
    if (kind === 'treemap') {
      // A slice-and-dice treemap: every area is proportional to its value.
      let offset = 0;
      body = data.map((row, index) => {
        const width = (row.value || 0) / total * 680, x = 20 + offset; offset += width;
        return `<g${interaction(row)}>${tip(row)}<rect x="${x}" y="25" width="${width}" height="235" fill="${colors[index % colors.length]}" stroke="white" stroke-width="2"/>${width > 45 ? `<text x="${x + width / 2}" y="135" text-anchor="middle" fill="white" font-size="11">${label(row, Math.max(4, Math.floor(width / 7)))}</text><text x="${x + width / 2}" y="155" text-anchor="middle" fill="white" font-size="12">${esc(format(row.value))}</text>` : ''}</g>`;
      }).join('');
    } else {
      let angle = -Math.PI / 2;
      body = data.map((row, index) => {
        const share = (row.value || 0) / total, end = angle + share * Math.PI * 2, radius = 105;
        const x1 = 195 + radius * Math.cos(angle), y1 = 145 + radius * Math.sin(angle), x2 = 195 + radius * Math.cos(end), y2 = 145 + radius * Math.sin(end);
        const shape = share >= .999999 ? '<circle cx="195" cy="145" r="105"/>' : `<path d="M195 145 L${x1} ${y1} A105 105 0 ${share > .5 ? 1 : 0} 1 ${x2} ${y2} Z"/>`;
        angle = end;
        return share ? `<g fill="${colors[index % colors.length]}" stroke="white" stroke-width="2"${interaction(row)}>${tip(row)}${shape}</g>` : '';
      }).join('');
      if (kind === 'donut') body += `<circle cx="195" cy="145" r="65" fill="white" pointer-events="none"/><text x="195" y="140" text-anchor="middle" font-size="10" fill="#64748b">Tổng hiển thị</text><text x="195" y="163" text-anchor="middle" font-size="20" font-weight="bold">${esc(format(total))}</text>`;
      body += data.map((row, index) => `<g${interaction(row)}>${tip(row)}<rect x="355" y="${22 + index * 23}" width="10" height="10" fill="${colors[index % colors.length]}"/><text x="375" y="${31 + index * 23}" font-size="11">${label(row, 28)}</text><text x="690" y="${31 + index * 23}" text-anchor="end" font-size="11">${esc(format(row.value))} (${((row.value || 0) / total * 100).toFixed(1)}%)</text></g>`).join('');
      height = Math.max(300, data.length * 23 + 40);
    }
  } else if (kind === 'bar' || kind === 'lollipop') {
    const step = options.comparison ? 47 : 34; height = Math.max(140, data.length * step + 25);
    const x = (value: number) => 180 + (value - min) / (max - min) * 440;
    body = data.map((row, index) => `<g${interaction(row)}>${tip(row)}<text x="8" y="${25 + index * step}" font-size="11">${label(row, 24)}</text>${periods.map((period, periodIndex) => {
      const value = row[period]; if (value == null) return '';
      const y = 14 + index * step + periodIndex * 17, color = periodIndex ? '#d97706' : options.comparison ? '#4f46e5' : colors[index % colors.length];
      return (kind === 'bar' ? `<rect x="${Math.min(x(0), x(value))}" y="${y}" width="${Math.abs(x(value) - x(0))}" height="12" rx="2" fill="${color}"/>` : `<line x1="${x(0)}" y1="${y + 6}" x2="${x(value)}" y2="${y + 6}" stroke="${color}" stroke-width="3"/><circle cx="${x(value)}" cy="${y + 6}" r="5" fill="${color}"/>`) + `<text x="${x(value) + 8}" y="${y + 10}" font-size="10">${esc(format(value))}</text>`;
    }).join('')}</g>`).join('');
  } else {
    const y = (value: number) => 235 - (value - min) / (max - min) * 200;
    const dates = data.map(row => /^\d{4}-\d{2}(?:-\d{2})?$/.test(row.key) ? Date.parse(row.key.length === 7 ? row.key + '-01T00:00:00Z' : row.key + 'T00:00:00Z') : NaN);
    const spacedTime = kind !== 'column' && dates.length > 1 && dates.every(Number.isFinite) && dates.every((date, index) => !index || date >= dates[index - 1]) && dates[dates.length - 1] > dates[0];
    const x = (index: number) => 65 + (spacedTime ? (dates[index] - dates[0]) / (dates[dates.length - 1] - dates[0]) : (index + .5) / Math.max(1, data.length)) * 620;
    const width = Math.min(options.comparison ? 19 : 32, 225 / Math.max(1, data.length));
    body = [0, .25, .5, .75, 1].map(tick => { const value = min + tick * (max - min); return `<line x1="60" x2="700" y1="${y(value)}" y2="${y(value)}" stroke="#e2e8f0" stroke-dasharray="4 4"/><text x="53" y="${y(value) + 4}" text-anchor="end" font-size="10" fill="#64748b">${esc(format(value))}</text>`; }).join('');
    if (kind !== 'column') periods.forEach((period, periodIndex) => {
      const segments: Array<Array<{ index: number; value: number }>> = [[]];
      data.forEach((row, index) => { const value = row[period]; if (value == null) segments.push([]); else segments[segments.length - 1].push({ index, value }); });
      segments.filter(segment => segment.length).forEach(segment => {
        const points = segment.map(point => `${x(point.index)},${y(point.value)}`).join(' '), color = periodIndex ? '#d97706' : '#4f46e5';
        if (kind === 'area') body += `<polygon points="${x(segment[0].index)},${y(0)} ${points} ${x(segment[segment.length - 1].index)},${y(0)}" fill="url(#${gradientId}-${periodIndex})"/>`;
        body += `<polyline points="${points}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"${periodIndex ? ' stroke-dasharray="5 3"' : ''}/>`;
      });
    });
    body += data.map((row, index) => `<g${interaction(row)}>${tip(row)}<rect x="${x(index) - 24}" y="22" width="48" height="245" fill="transparent"/>${periods.map((period, periodIndex) => {
      const value = row[period]; if (value == null) return '';
      const position = x(index) + (options.comparison && kind === 'column' ? periodIndex ? width / 2 + 2 : -width / 2 - 2 : 0);
      const color = periodIndex ? '#d97706' : options.comparison || kind !== 'column' ? '#4f46e5' : colors[index % colors.length];
      return kind === 'column' ? `<rect x="${position - width / 2}" y="${Math.min(y(value), y(0))}" width="${width}" height="${Math.abs(y(value) - y(0))}" rx="3" fill="${color}"/>` : `<circle cx="${position}" cy="${y(value)}" r="5" fill="${color}"/>`;
    }).join('')}<text x="${x(index)}" y="270" text-anchor="middle" font-size="10" fill="#475569">${label(row, 13)}</text></g>`).join('');
  }
  const gradients = kind === 'area' ? `<defs>${['#4f46e5', '#d97706'].map((color, index) => `<linearGradient id="${gradientId}-${index}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${color}" stop-opacity=".35"/><stop offset="100%" stop-color="${color}" stop-opacity=".03"/></linearGradient>`).join('')}</defs>` : '';
  const cartesian=!['pie','donut','treemap'].includes(kind);
  const horizontal=kind==='bar'||kind==='lollipop';
  const xLabel=horizontal ? options.metricLabel || options.title : options.groupLabel || 'Nhóm';
  const yLabel=horizontal ? options.groupLabel || 'Nhóm' : options.metricLabel || options.title;
  const axes=cartesian ? `<text aria-label="Trục tung" x="10" y="${height/2+8}" transform="rotate(-90 10 ${height/2+8})" text-anchor="middle" font-size="9" font-weight="500" fill="#64748b">${esc(yLabel)}</text><text aria-label="Trục hoành" x="390" y="${height+25}" text-anchor="middle" font-size="9" font-weight="500" fill="#64748b">${esc(xLabel)}</text>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cartesian?755:720} ${height+(cartesian?38:0)}" role="${options.interactive ? 'group' : 'img'}" aria-label="${esc(options.title)}" style="display:block;width:100%;height:auto;font-family:${REPORT_FONT_FAMILY.replaceAll('"', '&quot;')};color:#0f172a">${gradients}${cartesian?'<g transform="translate(30 8)">':''}${body}${cartesian?'</g>':''}${axes}</svg>`;
}
