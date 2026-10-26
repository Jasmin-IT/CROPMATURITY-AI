import React, { useState } from 'react';

export default function TrendLineChart({ data = [] }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        No historical trends recorded yet.
      </div>
    );
  }

  // Sorted chronologically (oldest to newest)
  const items = [...data].reverse();
  const width = 580;
  const height = 260;
  const padding = { top: 20, right: 30, bottom: 40, left: 45 };

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const n = items.length;
  const getX = (i) => (n > 1 ? padding.left + (i / (n - 1)) * chartW : padding.left + chartW / 2);
  const getY = (val) => padding.top + chartH - (Math.max(0, Math.min(100, val || 0)) / 100) * chartH;

  // Build SVG path
  const readinessPoints = items.map((d, i) => `${getX(i)},${getY(d.readiness)}`);
  const ripePoints = items.map((d, i) => `${getX(i)},${getY(d.readiness_spec)}`);

  const pathReadiness = `M ${readinessPoints.join(' L ')}`;
  const pathRipe = `M ${ripePoints.join(' L ')}`;

  // Area under readiness curve
  const areaReadiness = `${pathReadiness} L ${getX(n - 1)},${padding.top + chartH} L ${getX(0)},${padding.top + chartH} Z`;

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        <defs>
          <linearGradient id="readinessGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal Grid lines */}
        {[0, 25, 50, 75, 100].map((tick) => {
          const y = getY(tick);
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
                {tick}%
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <path d={areaReadiness} fill="url(#readinessGrad)" />

        {/* Ripe Share line */}
        <path d={pathRipe} fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="5 5" opacity="0.8" />

        {/* Readiness line */}
        <path d={pathReadiness} fill="none" stroke="#10b981" strokeWidth="3" />

        {/* Data points */}
        {items.map((d, i) => {
          const x = getX(i);
          const yr = getY(d.readiness);
          const isHovered = hoveredIndex === i;
          return (
            <g key={d.id || i} onMouseEnter={() => setHoveredIndex(i)} onMouseLeave={() => setHoveredIndex(null)}>
              <circle
                cx={x}
                cy={yr}
                r={isHovered ? 6 : 4}
                fill="#ffffff"
                stroke="#10b981"
                strokeWidth="2.5"
                style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
              />
              {/* X label */}
              <text
                x={x}
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
            Session #{items[hoveredIndex].id} ({items[hoveredIndex].source})
          </div>
          <div style={{ color: '#10b981', marginTop: '2px' }}>
            Harvest Readiness: <b>{items[hoveredIndex].readiness}%</b>
          </div>
          <div style={{ color: '#ef4444' }}>
            Ripe Share: <b>{items[hoveredIndex].readiness_spec}%</b>
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>
            Total: {items[hoveredIndex].total} crops
          </div>
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          <div style={{ width: '14px', height: '3px', background: '#10b981', borderRadius: '2px' }} />
          <span>Readiness Score</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          <div style={{ width: '14px', height: '2px', background: '#ef4444', borderBottom: '2px dashed #ef4444' }} />
          <span>Ripe Share (%)</span>
        </div>
      </div>
    </div>
  );
}
