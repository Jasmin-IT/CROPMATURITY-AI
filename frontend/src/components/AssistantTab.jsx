import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Trash2,
  Sparkles,
  Bot,
  User,
} from 'lucide-react';
import { fetchHistory, sendAiChat } from '../api';

const FARMER_QUESTIONS = [
  'When is the best time of day to pick ripe tomatoes?',
  'Should I pick turning tomatoes now or wait?',
  'How should I store these tomatoes after picking?',
  'What should I check on the fruit besides color before harvesting?',
];

export default function AssistantTab({ preselectedSessionId }) {
  const [sessions, setSessions] = useState([]);
  const [selectedId, setSelectedId] = useState(preselectedSessionId || null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchHistory(50).then((data) => {
      setSessions(data);
      if (!selectedId && data.length > 0) {
        setSelectedId(data[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (preselectedSessionId) {
      setSelectedId(preselectedSessionId);
    }
  }, [preselectedSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const currentSession = sessions.find((s) => s.id === Number(selectedId)) || sessions[0] || null;

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputText.trim();
    if (!text || loading) return;

    setInputText('');
    setError(null);

    const newMessages = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const historyPayload = newMessages.map((m) => ({ role: m.role, content: m.content }));
      const response = await sendAiChat(text, currentSession?.id, historyPayload);

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response.answer,
        },
      ]);
    } catch (err) {
      setError('Advisor error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  return (
    <div>
      {/* Header */}
      <div className="farm-card" style={{ marginBottom: '24px' }}>
        <div className="farm-card-header" style={{ marginBottom: 0 }}>
          <div className="card-heading-group">
            <div className="card-badge-icon" style={{ background: '#eff6ff', color: '#2563eb', borderColor: '#bfdbfe' }}>
              <MessageSquare size={22} />
            </div>
            <div>
              <h2 className="card-h2">Farm Advisor</h2>
              <p className="card-p">
                Ask any questions about crop ripeness, picking timing, or tomato care
              </p>
            </div>
          </div>

          {messages.length > 0 && (
            <button type="button" className="btn-farm-secondary" onClick={handleClearChat}>
              <Trash2 size={14} /> Clear Conversation
            </button>
          )}
        </div>
      </div>

      <div className="clean-chat-grid">
        {/* Left Side: Session Context & Suggestions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Active Field Context */}
          <div className="farm-card" style={{ marginBottom: 0 }}>
            <h3 style={{ fontSize: '0.94rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '10px' }}>
              Field Inspection Check
            </h3>

            {sessions.length > 0 ? (
              <div>
                <select
                  value={selectedId || ''}
                  onChange={(e) => setSelectedId(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'var(--surface-elevated)',
                    border: '1px solid var(--border-card)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '0.88rem',
                  }}
                >
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      Check #{s.id} &bull; {s.total} tomatoes ({s.readiness}% ready)
                    </option>
                  ))}
                </select>

                {currentSession && (
                  <div
                    style={{
                      marginTop: '14px',
                      background: 'var(--forest-soft)',
                      border: '1px solid var(--forest-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px',
                      fontSize: '0.86rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Tomatoes Checked:</span>
                      <b>{currentSession.total}</b>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Ripeness Score:</span>
                      <b style={{ color: 'var(--forest-green)' }}>{currentSession.readiness}%</b>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Date:</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{currentSession.created_at}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.86rem' }}>
                No saved checks. Inspect your tomatoes first to discuss specific counts.
              </div>
            )}
          </div>

          {/* Quick Questions */}
          <div className="farm-card" style={{ marginBottom: 0 }}>
            <h3 style={{ fontSize: '0.94rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '10px' }}>
              Common Questions
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {FARMER_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(q)}
                  disabled={loading}
                  style={{
                    background: 'var(--surface-elevated)',
                    border: '1px solid var(--border-card)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 14px',
                    color: 'var(--text-secondary)',
                    fontSize: '0.84rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    lineHeight: '1.4',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--forest-green)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-card)';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Chat Thread */}
        <div className="farm-card" style={{ display: 'flex', flexDirection: 'column', height: '600px', padding: '0', overflow: 'hidden' }}>
          <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {messages.length === 0 && (
              <div style={{ margin: 'auto', textAlign: 'center', maxWidth: '380px', color: 'var(--text-muted)' }}>
                <Sparkles size={38} style={{ opacity: 0.35, marginBottom: '12px', color: 'var(--forest-green)' }} />
                <h4 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                  Farm Ripeness Advisor
                </h4>
                <p style={{ fontSize: '0.88rem', marginTop: '6px', lineHeight: '1.5' }}>
                  Ask questions about when to pick, how to store tomatoes, or what to do with green and turning fruit.
                </p>
              </div>
            )}

            {messages.map((m, idx) => (
              <div key={idx} className={m.role === 'user' ? 'chat-bubble-user-clean' : 'chat-bubble-advisor-clean'}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontSize: '0.78rem', opacity: 0.85 }}>
                  {m.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                  <span style={{ fontWeight: '700' }}>{m.role === 'user' ? 'You' : 'Farm Advisor'}</span>
                </div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
              </div>
            ))}

            {loading && (
              <div className="chat-bubble-advisor-clean" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="spinner-clean" />
                <span style={{ fontSize: '0.86rem' }}>Consulting harvest guidelines...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {error && (
            <div style={{ padding: '8px 16px', background: 'var(--tomato-soft)', color: 'var(--tomato-red)', fontSize: '0.84rem' }}>
              {error}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            style={{ padding: '16px', borderTop: '1px solid var(--border-card)', background: 'var(--bg-base)', display: 'flex', gap: '10px' }}
          >
            <input
              type="text"
              placeholder="Ask a question about your tomatoes..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={loading}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid var(--border-card)',
                background: 'var(--surface-card)',
                color: 'var(--text-primary)',
                fontSize: '0.94rem',
                outline: 'none',
              }}
            />
            <button type="submit" className="btn-farm-green" disabled={loading || !inputText.trim()} style={{ padding: '0 22px' }}>
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
