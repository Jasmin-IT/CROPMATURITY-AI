import React from 'react';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Thermometer,
  HelpCircle,
} from 'lucide-react';

const STAGES = [
  {
    name: 'Green (Immature)',
    color: 'var(--forest-green)',
    badge: 'Leave on Vine',
    desc: 'The tomato is firm, hard, and solid green. Sugars and internal flavor gel are still forming. Do not pick yet unless making green preserves.',
    timing: 'Needs 7–14 more days to begin ripening.',
  },
  {
    name: 'Turning / Breaker',
    color: 'var(--amber-turning)',
    badge: 'Pick for Shipping',
    desc: 'The first visible break of color from green to tannish-yellow or pink on the bottom. Internal ripening has permanently begun.',
    timing: 'Ideal for market shipping; ripens fully in 2–4 days.',
  },
  {
    name: 'Ripe & Mature',
    color: 'var(--tomato-red)',
    badge: 'Harvest Today',
    desc: 'Over 90% of the surface is rich crimson red. The fruit gives slightly to gentle finger pressure and has reached peak sweetness and aroma.',
    timing: 'Pick today to prevent splitting or over-softening.',
  },
];

const BEST_PRACTICES = [
  {
    title: 'Pick in the Cool Morning',
    desc: 'Harvest early in the morning when the fruit is cool and firm. Avoid harvesting during hot afternoon sun when fruit loses moisture quickly.',
  },
  {
    title: 'Keep the Calyx (Stem Cap) Intact',
    desc: 'Gently snap or clip the tomato with its green calyx attached. This protects the stem scar and prevents moisture loss and decay.',
  },
  {
    title: 'Avoid Refrigeration for Unripe Fruit',
    desc: 'Never store green or turning tomatoes below 13°C (55°F). Cold temperatures destroy the flavor enzymes and make texture mealy.',
  },
  {
    title: 'Store Stem-Side Down',
    desc: 'When packing or storing in baskets, keep tomatoes stem-side down to prevent rolling, bruising, and air leakage through the stem scar.',
  },
];

export default function AboutTab() {
  return (
    <div>
      {/* Header Card with Visual Guide */}
      <div className="farm-card">
        <div className="farm-card-header">
          <div className="card-heading-group">
            <div className="card-badge-icon">
              <BookOpen size={22} />
            </div>
            <div>
              <h2 className="card-h2">Tomato Harvesting Guide & Best Practices</h2>
              <p className="card-p">Practical visual guide to identifying ripeness stages, picking methods, and storage</p>
            </div>
          </div>
        </div>

        {/* Visual Tomato Stages Image */}
        <div style={{ textAlign: 'center', margin: '14px 0 24px', background: 'var(--surface-elevated)', borderRadius: 'var(--radius-lg)', padding: '20px', border: '1px solid var(--border-card)' }}>
          <img
            src="/tomato_stages.jpg"
            alt="Tomato Ripening Stages: Green, Turning, Ripe"
            style={{ maxWidth: '420px', width: '100%', borderRadius: 'var(--radius-md)', display: 'block', margin: '0 auto' }}
          />
          <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '10px' }}>
            Visual guide to the three ripening stages: <b>Green (Immature)</b> &rarr; <b>Turning (Breaker)</b> &rarr; <b>Ripe (Mature)</b>
          </div>
        </div>

        {/* 3 Ripeness Stages Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
          {STAGES.map((s, idx) => (
            <div
              key={idx}
              className="stage-card-clean"
              style={{
                borderTop: `4px solid ${s.color}`,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: '800', color: s.color }}>{s.name}</span>
                  <span style={{ fontSize: '0.74rem', padding: '3px 10px', borderRadius: 'var(--radius-pill)', background: 'var(--bg-base)', border: '1px solid var(--border-card)', fontWeight: '700' }}>
                    {s.badge}
                  </span>
                </div>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginTop: '6px' }}>
                  {s.desc}
                </p>
              </div>

              <div style={{ marginTop: '16px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={14} />
                <span>{s.timing}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Picking and Storage Tips */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
        {/* Best Practices */}
        <div className="farm-card">
          <h3 className="card-h2" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={20} color="var(--forest-green)" />
            <span>Field Harvesting Best Practices</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {BEST_PRACTICES.map((p, idx) => (
              <div key={idx} style={{ padding: '14px', background: 'var(--surface-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-card)' }}>
                <div style={{ fontWeight: '700', fontSize: '0.94rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                  {p.title}
                </div>
                <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  {p.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Temperature & FAQ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="farm-card">
            <h3 className="card-h2" style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--amber-turning)' }}>
              <Thermometer size={20} />
              <span>Recommended Temperatures</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.88rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-card)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Turning / Breaker Fruit:</span>
                <b>13°C – 18°C (55°F – 65°F)</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-card)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Fully Ripe Fruit:</span>
                <b>18°C – 21°C (65°F – 70°F)</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Minimum Threshold:</span>
                <b style={{ color: 'var(--tomato-red)' }}>Never below 12°C (54°F)</b>
              </div>
            </div>
          </div>

          <div className="farm-card">
            <h3 className="card-h2" style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <HelpCircle size={20} color="var(--forest-green)" />
              <span>Frequently Asked Questions</span>
            </h3>

            <div style={{ fontSize: '0.88rem', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
              <p style={{ marginBottom: '10px' }}>
                <b>Q: How often should I check the crops?</b><br />
                During hot summer days, tomatoes ripen rapidly. Check your fields every 2 to 3 days to catch fruit at the ideal stage.
              </p>
              <p>
                <b>Q: Why do some tomatoes crack near the stem?</b><br />
                Heavy rain or sudden over-watering after a dry spell causes fruit to take up water faster than skin can expand. Harvest turning fruit before expected storms.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
