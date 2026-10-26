import React, { useState } from 'react';

const COLORS = {
  unripe: '#84cc16',
  semiripe: '#f59e0b',
  ripe: '#ef4444',
};

export default function MaturityBarChart({ data = [] }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        No historical sessions available.
      </div>
    );
  }

  // Max 12 recent sessions
  const items = [...data].reverse().slice(-12);
  const width = 580;
  const height = 260;
  const padding = { top: 20, right: 20, bottom: 40, left: 45 };

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Max total in these sessions
  const maxTotal = Math.max(...items.map((d) => d.total || 0), 10);
  const maxAxis = Math.ceil(maxTotal / 5) * 5;

  const barWidth = Math.min(32, (chartW / items.length) * 0.65);

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        {/* Horizontal Grid lines */}
        {[0, Math.round(maxAxis / 2), maxAxis].map((tick) => {
          const y = padding.top + chartH - (tick / maxAxis) * chartH;
          return (
            <g key={tick}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="rgba(255,255,255,0.06)"
                strokeDasharray={tick === 0 ? 'none' : '4 4'}
              />
              <text
                x={padding.left - 10}
                y={y + 4}
                textAnchor="end"
                fill="var(--text-muted)"
                fontSize="10"
                fontFamily="Inter, sans-serif"
              >
                {tick}
              </text>
            </g>
          );
        })}

        {/* Stacked bars */}
        {items.map((d, i) => {
          const x = padding.left + (i + 0.5) * (chartW / items.length) - barWidth / 2;
          const counts = d.counts || { unripe: 0, semiripe: 0, ripe: 0 };
          const u = counts.unripe || 0;
          const s = counts.semiripe || 0;
          const r = counts.ripe || 0;

          const hu = (u / maxAxis) * chartH;
          const hs = (s / maxAxis) * chartH;
          const hr = (r / maxAxis) * chartH;

          const yu = padding.top + chartH - hu;
          const ys = yu - hs;
          const yr = ys - hr;

          const isHovered = hoveredIndex === i;

          return (
            <g
              key={d.id || i}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{ cursor: 'pointer' }}
            >
              {/* Highlight background */}
              {isHovered && (
                <rect
                  x={x - 4}
                  y={padding.top}
                  width={barWidth + 8}
                  height={chartH}
                  fill="rgba(255,255,255,0.05)"
                  rx="4"
                />
              )}

              {/* Unripe (bottom) */}
              {hu > 0 && (
                <rect
                  x={x}
                  y={yu}
                  width={barWidth}
                  height={hu}
                  fill={COLORS.unripe}
                  rx={s === 0 && r === 0 ? 4 : 0}
                />
              )}
              {/* Semiripe (middle) */}
              {hs > 0 && (
                <rect
                  x={x}
                  y={ys}
                  width={barWidth}
                  height={hs}
                  fill={COLORS.semiripe}
                  rx={r === 0 ? 4 : 0}
                />
              )}
              {/* Ripe (top) */}
              {hr > 0 && (
                <rect
                  x={x}
                  y={yr}
                  width={barWidth}
                  height={hr}
                  fill={COLORS.ripe}
                  rx="4"
                />
              )}

              {/* X label */}
              <text
                x={x + barWidth / 2}
                y={height - 12}
                textAnchor="middle"
                fill={isHovered ? 'var(--text-primary)' : 'var(--text-muted)'}
                fontSize="10"
                fontWeight={isHovered ? '700' : '500'}
                fontFamily="Inter, sans-serif"
              >
                #{d.id}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip on hover */}
      {hoveredIndex !== null && items[hoveredIndex] && (
        <div
          style={{
            position: 'absolute',
            top: '12px',
            right: '16px',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-glass)',
            padding: '8px 14px',
            borderRadius: '8px',
            fontSize: '0.8rem',
            boxShadow: 'var(--shadow-md)',
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
            Session #{items[hoveredIndex].id} ({items[hoveredIndex].total} total)
          </div>
          <div style={{ color: COLORS.unripe, marginTop: '2px' }}>
            Unripe: {items[hoveredIndex].counts?.unripe || 0}
          </div>
          <div style={{ color: COLORS.semiripe }}>
            Semiripe: {items[hoveredIndex].counts?.semiripe || 0}
          </div>
          <div style={{ color: COLORS.ripe }}>
            Ripe: {items[hoveredIndex].counts?.ripe || 0}
          </div>
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          <div style={{ width: '10px', height: '10px', background: COLORS.unripe, borderRadius: '2px' }} />
          <span>Unripe</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          <div style={{ width: '10px', height: '10px', background: COLORS.semiripe, borderRadius: '2px' }} />
          <span>Semiripe</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          <div style={{ width: '10px', height: '10px', background: COLORS.ripe, borderRadius: '2px' }} />
          <span>Ripe</span>
        </div>
      </div>
    </div>
  );
}
