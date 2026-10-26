import React, { useState, useEffect } from 'react';
import {
  History,
  TrendingUp,
  FileText,
  Download,
  Trash2,
  RefreshCw,
  Search,
  MessageSquare,
  Hash,
  Activity,
  Layers,
} from 'lucide-react';
import TrendLineChart from './TrendLineChart';
import MaturityBarChart from './MaturityBarChart';
import { fetchHistory, deleteHistoryItem, clearAllHistory, fetchAiDailyReport } from '../api';

export default function HistoryTab({ onSelectSessionForChat }) {
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await fetchHistory(100);
      setHistoryList(data);
    } catch (err) {
      console.warn('History load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm(`Delete harvest record #${id}?`)) return;
    try {
      await deleteHistoryItem(id);
      setHistoryList((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Delete all past harvest records?')) return;
    try {
      await clearAllHistory();
      setHistoryList([]);
      setReport(null);
    } catch (err) {
      alert('Clear failed: ' + err.message);
    }
  };

  const handleGenerateReport = async () => {
    if (historyList.length === 0) return;
    setReportLoading(true);
    try {
      const latest = historyList[0];
      const rep = await fetchAiDailyReport(latest.id);
      setReport(rep);
    } catch (err) {
      alert('Failed to generate report: ' + err.message);
    } finally {
      setReportLoading(false);
    }
  };

  const handleDownloadReport = () => {
    if (!report || !report.report) return;
    const blob = new Blob([report.report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `farm_harvest_summary_${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredSessions = historyList.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return s.id.toString().includes(q) || (s.source && s.source.toLowerCase().includes(q));
  });

  const totalSessions = historyList.length;
  const latestSession = historyList[0] || null;
  const prevSession = historyList[1] || null;
  const delta =
    latestSession && prevSession
      ? (latestSession.readiness - prevSession.readiness).toFixed(1)
      : null;

  return (
    <div>
      {/* Header Card */}
      <div className="farm-card">
        <div className="farm-card-header">
          <div className="card-heading-group">
            <div className="card-badge-icon">
              <History size={22} />
            </div>
            <div>
              <h2 className="card-h2">Harvest Records & History</h2>
              <p className="card-p">Review past crop checks and watch your field ripen over time</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="btn-farm-secondary" onClick={loadHistory} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'spinner-clean' : ''} /> Refresh
            </button>
            {historyList.length > 0 && (
              <button type="button" className="btn-farm-danger" onClick={handleClearAll}>
                <Trash2 size={14} /> Clear Records
              </button>
            )}
          </div>
        </div>

        {totalSessions > 0 && (
          <div className="stage-cards-grid" style={{ marginBottom: 0 }}>
            <div className="stage-card-clean">
              <div className="stage-card-top">
                <span style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Total Checks
                </span>
                <Hash size={18} color="var(--forest-green)" />
              </div>
              <div className="stage-big-number">{totalSessions}</div>
              <div className="stage-card-desc">Inspections recorded</div>
            </div>

            <div className="stage-card-clean">
              <div className="stage-card-top">
                <span style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Latest Ripeness
                </span>
                <Activity size={18} color="var(--forest-green)" />
              </div>
              <div className="stage-big-number" style={{ color: 'var(--forest-green)' }}>
                {latestSession?.readiness ?? 0}%
              </div>
              <div className="stage-card-desc">From check #{latestSession?.id}</div>
            </div>

            <div className="stage-card-clean">
              <div className="stage-card-top">
                <span style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Ripeness Delta
                </span>
                <TrendingUp size={18} color="var(--amber-turning)" />
              </div>
              <div className="stage-big-number">
                {delta !== null ? (delta > 0 ? `+${delta}%` : `${delta}%`) : 'N/A'}
              </div>
              <div className="stage-card-desc">vs prior inspection</div>
            </div>

            <div className="stage-card-clean">
              <div className="stage-card-top">
                <span style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Tomatoes Found
                </span>
                <Layers size={18} color="var(--forest-green)" />
              </div>
              <div className="stage-big-number">{latestSession?.total ?? 0}</div>
              <div className="stage-card-desc">Counted in latest photo</div>
            </div>
          </div>
        )}
      </div>

      {totalSessions === 0 && !loading && (
        <div className="farm-card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <History size={48} style={{ opacity: 0.35, marginBottom: '14px', color: 'var(--forest-green)' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: '700' }}>No Saved Harvest Records Yet</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '6px' }}>
            Scan your tomatoes in the "Check Crops" tab and save your findings to see records here.
          </p>
        </div>
      )}

      {totalSessions > 0 && (
        <>
          {/* Charts Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
            <div className="farm-card" style={{ marginBottom: 0 }}>
              <div className="farm-card-header" style={{ marginBottom: '8px' }}>
                <h3 className="card-h2">Ripeness Progression</h3>
              </div>
              <TrendLineChart data={historyList} />
            </div>

            <div className="farm-card" style={{ marginBottom: 0 }}>
              <div className="farm-card-header" style={{ marginBottom: '8px' }}>
                <h3 className="card-h2">Tomato Counts by Check</h3>
              </div>
              <MaturityBarChart data={historyList} />
            </div>
          </div>

          {/* Daily Farm Summary Report */}
          <div className="farm-card">
            <div className="farm-card-header">
              <div className="card-heading-group">
                <div className="card-badge-icon" style={{ background: '#eff6ff', color: '#2563eb', borderColor: '#bfdbfe' }}>
                  <FileText size={22} />
                </div>
                <div>
                  <h3 className="card-h2">Daily Farm Harvest Report</h3>
                  <p className="card-p">Create a clean printable summary of field conditions for workers or buyers</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-farm-green"
                  onClick={handleGenerateReport}
                  disabled={reportLoading}
                >
                  <RefreshCw size={15} className={reportLoading ? 'spinner-clean' : ''} />
                  <span>{reportLoading ? 'Writing Report...' : 'Create Harvest Report'}</span>
                </button>
                {report && (
                  <button type="button" className="btn-farm-secondary" onClick={handleDownloadReport}>
                    <Download size={15} /> Download (.txt)
                  </button>
                )}
              </div>
            </div>

            {report ? (
              <div style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-md)', padding: '20px', lineHeight: '1.65', fontSize: '0.94rem', whiteSpace: 'pre-wrap' }}>
                {report.report}
              </div>
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Click "Create Harvest Report" to generate an easy-to-read daily field briefing.
              </div>
            )}
          </div>

          {/* Records Table */}
          <div className="farm-card">
            <div className="farm-card-header">
              <h3 className="card-h2">Past Field Inspections</h3>

              <div style={{ position: 'relative', width: '220px' }}>
                <Search
                  size={15}
                  style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                />
                <input
                  type="text"
                  placeholder="Filter records..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px 8px 32px',
                    borderRadius: 'var(--radius-pill)',
                    background: 'var(--bg-base)',
                    border: '1px solid var(--border-card)',
                    color: 'var(--text-primary)',
                    fontSize: '0.84rem',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div className="clean-table-box">
              <table className="clean-table">
                <thead>
                  <tr>
                    <th>Check #</th>
                    <th>Date & Time</th>
                    <th>Source</th>
                    <th>Tomatoes Found</th>
                    <th>Ripeness Index</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSessions.map((row) => (
                    <tr key={row.id}>
                      <td style={{ fontWeight: '700' }}>#{row.id}</td>
                      <td>{row.created_at || 'Recently'}</td>
                      <td>{row.source || 'Photo'}</td>
                      <td><b>{row.total}</b> tomatoes</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontWeight: '700', minWidth: '40px', color: 'var(--forest-green)' }}>
                            {row.readiness}%
                          </span>
                          <div className="clean-progress-track" style={{ width: '80px' }}>
                            <div className="clean-progress-fill" style={{ width: `${row.readiness}%`, background: 'var(--forest-green)' }} />
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button
                            type="button"
                            className="btn-farm-secondary"
                            onClick={() => onSelectSessionForChat && onSelectSessionForChat(row.id)}
                            style={{ padding: '6px 14px', fontSize: '0.82rem' }}
                          >
                            <MessageSquare size={13} /> Ask Advisor
                          </button>
                          <button
                            type="button"
                            className="btn-farm-danger"
                            onClick={() => handleDelete(row.id)}
                            style={{ padding: '6px 12px' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
