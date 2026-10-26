import React from 'react';

export default function GaugeChart({ value = 0, subtitle = '' }) {
  const clamped = Math.max(0, Math.min(100, Number(value) || 0));
  
  // Angle: -90 deg (0%) to +90 deg (100%)
  const angle = -90 + (clamped / 100) * 180;
  
  const cx = 150;
  const cy = 135;
  const r = 100;
  const strokeWidth = 20;

  const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  const describeArc = (x, y, radius, startAngle, endAngle) => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return ['M', start.x, start.y, 'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(' ');
  };

  // Natural organic farm color bands:
  // 0-30% Red (#dc2626), 30-60% Amber (#d97706), 60-85% Olive (#65a30d), 85-100% Forest Green (#15803d)
  const arc1 = describeArc(cx, cy, r, -90, -36);
  const arc2 = describeArc(cx, cy, r, -36, 18);
  const arc3 = describeArc(cx, cy, r, 18, 63);
  const arc4 = describeArc(cx, cy, r, 63, 90);

  let statusText = 'Early Green';
  let statusColor = '#dc2626';
  if (clamped >= 85) {
    statusText = 'Ready to Harvest';
    statusColor = '#15803d';
  } else if (clamped >= 60) {
    statusText = 'Turning / Almost Ready';
    statusColor = '#65a30d';
  } else if (clamped >= 30) {
    statusText = 'Still Developing';
    statusColor = '#d97706';
  }

  return (
    <div style={{ textAlign: 'center', width: '100%', padding: '4px 0' }}>
      <svg viewBox="0 0 300 190" style={{ width: '100%', maxWidth: '300px', margin: '0 auto', display: 'block' }}>
        {/* Background track */}
        <path
          d={describeArc(cx, cy, r, -90, 90)}
          fill="none"
          stroke="rgba(0,0,0,0.06)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* 4 Colored Segments */}
        <path d={arc1} fill="none" stroke="#fecaca" strokeWidth={strokeWidth} />
        <path d={arc2} fill="none" stroke="#fef3c7" strokeWidth={strokeWidth} />
        <path d={arc3} fill="none" stroke="#ecfccb" strokeWidth={strokeWidth} />
        <path d={arc4} fill="none" stroke="#bbf7d0" strokeWidth={strokeWidth} />

        {/* Active Fill Arc */}
        {clamped > 0 && (
          <path
            d={describeArc(cx, cy, r, -90, angle)}
            fill="none"
            stroke={statusColor}
            strokeWidth={strokeWidth + 2}
            strokeLinecap="round"
            style={{ transition: 'stroke 0.3s ease' }}
          />
        )}

        {/* Center Needle */}
        <g transform={`rotate(${angle}, ${cx}, ${cy})`} style={{ transition: 'transform 0.5s ease' }}>
          <polygon
            points={`${cx - 3.5},${cy} ${cx + 3.5},${cy} ${cx},${cy - r + 10}`}
            fill="#334155"
          />
          <circle cx={cx} cy={cy} r="6" fill="#334155" />
          <circle cx={cx} cy={cy} r="3" fill="#ffffff" />
        </g>

        {/* Text readout */}
        <text
          x={cx}
          y={cy + 34}
          textAnchor="middle"
          fill="var(--text-primary)"
          style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: '36px',
            fontWeight: '800',
            letterSpacing: '-0.02em',
          }}
        >
          {clamped.toFixed(0)}%
        </text>

        <text
          x={cx}
          y={cy + 50}
          textAnchor="middle"
          fill={statusColor}
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '11px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          {statusText}
        </text>
      </svg>
      {subtitle && <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>{subtitle}</div>}
    </div>
  );
}
