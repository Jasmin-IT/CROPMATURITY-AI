import React, { useState } from 'react';

const COLORS = {
  unripe: '#15803d',
  semiripe: '#d97706',
  ripe: '#dc2626',
};

export default function DonutChart({ counts = { unripe: 0, semiripe: 0, ripe: 0 }, total = 0 }) {
  const [hoveredKey, setHoveredKey] = useState(null);

  const stages = [
    { key: 'ripe', label: 'Ripe (Pick Today)', count: counts.ripe || 0, color: COLORS.ripe },
    { key: 'semiripe', label: 'Turning (2-3 Days)', count: counts.semiripe || 0, color: COLORS.semiripe },
    { key: 'unripe', label: 'Green (Leave on Vine)', count: counts.unripe || 0, color: COLORS.unripe },
  ];

  const effectiveTotal = total || stages.reduce((acc, s) => acc + s.count, 0);

  const size = 200;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let cumulativePercent = 0;
  const segments = stages.map((stage) => {
    const fraction = effectiveTotal > 0 ? stage.count / effectiveTotal : 0;
    const strokeDasharray = `${fraction * circumference} ${circumference}`;
    const strokeDashoffset = -cumulativePercent * circumference;
    cumulativePercent += fraction;
    return {
      ...stage,
      fraction,
      percent: (fraction * 100).toFixed(0),
      strokeDasharray,
      strokeDashoffset,
    };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
          {/* Background Ring */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="rgba(0,0,0,0.06)"
            strokeWidth={strokeWidth}
          />

          {/* Slices */}
          {segments.map((seg) => {
            if (seg.count === 0) return null;
            const isHovered = hoveredKey === seg.key;
            return (
              <circle
                key={seg.key}
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke={seg.color}
                strokeWidth={isHovered ? strokeWidth + 3 : strokeWidth}
                strokeDasharray={seg.strokeDasharray}
                strokeDashoffset={seg.strokeDashoffset}
                strokeLinecap="round"
                style={{
                  transition: 'stroke-width 0.2s ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={() => setHoveredKey(seg.key)}
                onMouseLeave={() => setHoveredKey(null)}
              />
            );
          })}
        </svg>

        {/* Center content */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <span
            style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: '2.2rem',
              fontWeight: '800',
              lineHeight: 1,
              color: 'var(--text-primary)',
            }}
          >
            {effectiveTotal}
          </span>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Tomatoes
          </span>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px', width: '100%', maxWidth: '240px' }}>
        {segments.map((seg) => {
          return (
            <div
              key={seg.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.86rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: seg.color,
                  }}
                />
                <span style={{ color: 'var(--text-secondary)' }}>{seg.label}</span>
              </div>
              <b style={{ color: 'var(--text-primary)' }}>
                {seg.count} ({seg.percent}%)
              </b>
            </div>
          );
        })}
      </div>
    </div>
  );
}
