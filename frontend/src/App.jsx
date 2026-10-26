import React, { useState, useEffect } from 'react';
import {
  Camera,
  Video,
  History as HistoryIcon,
  MessageSquare,
  BookOpen,
  Leaf,
  Sun,
  Moon,
  Sparkles,
} from 'lucide-react';
import AnalyzeTab from './components/AnalyzeTab';
import LiveTab from './components/LiveTab';
import HistoryTab from './components/HistoryTab';
import AssistantTab from './components/AssistantTab';
import AboutTab from './components/AboutTab';
import { fetchHealth } from './api';

export default function App() {
  const [activeTab, setActiveTab] = useState('analyze');
  const [theme, setTheme] = useState('light');
  const [backendConnected, setBackendConnected] = useState(false);
  const [preselectedChatSession, setPreselectedChatSession] = useState(null);

  useEffect(() => {
    fetchHealth()
      .then(() => setBackendConnected(true))
      .catch(() => setBackendConnected(false));
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const navigateToChatWithSession = (sessionId) => {
    setPreselectedChatSession(sessionId);
    setActiveTab('chat');
  };

  return (
    <div className="app-shell">
      {/* Clean Floating Header (Field A removed) */}
      <header className="clean-header">
        <div className="brand-wrapper" onClick={() => setActiveTab('analyze')}>
          <div className="brand-icon">
            <Leaf size={22} />
          </div>
          <div>
            <div className="brand-title">AgriHarvest</div>
            <div className="brand-sub">Tomato Harvest Guide</div>
          </div>
        </div>

        {/* Center Navigation Tabs */}
        <nav className="nav-tab-strip">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'analyze' ? 'active' : ''}`}
            onClick={() => setActiveTab('analyze')}
          >
            <Camera size={16} />
            <span>Check Crops</span>
          </button>

          <button
            type="button"
            className={`tab-btn ${activeTab === 'live' ? 'active' : ''}`}
            onClick={() => setActiveTab('live')}
          >
            <Video size={16} />
            <span>Live Camera</span>
          </button>

          <button
            type="button"
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <HistoryIcon size={16} />
            <span>Harvest Records</span>
          </button>

          <button
            type="button"
            className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            <MessageSquare size={16} />
            <span>Farm Advisor</span>
          </button>

          <button
            type="button"
            className={`tab-btn ${activeTab === 'about' ? 'active' : ''}`}
            onClick={() => setActiveTab('about')}
          >
            <BookOpen size={16} />
            <span>Harvesting Guide</span>
          </button>
        </nav>

        {/* Right Info & Display Mode */}
        <div className="header-right">
          <button
            type="button"
            className="theme-btn"
            onClick={toggleTheme}
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>
      </header>

      {/* Main Content Stage */}
      <main className="content-stage">
        {/* Scenic Photographic Hero Banner */}
        <div
          className="scenic-hero-banner"
          style={{ backgroundImage: 'url(/farm_hero.jpg)' }}
        >
          <div className="scenic-hero-overlay">
            <div className="hero-pill-tag">
              <Sparkles size={14} />
              <span>Smart Harvest Companion</span>
            </div>
            <h1 className="hero-main-title">Tomato Ripeness & Harvest Guide</h1>
            <p className="hero-lead-text">
              Easily scan your vines to see ripeness percentages, know exactly what is ready to pick today, and get practical field advice.
            </p>
          </div>
        </div>

        {/* 3 Visual Story Cards (Using Pictures) */}
        <div className="farm-visual-cards-row">
          <div className="farm-visual-card" onClick={() => setActiveTab('analyze')}>
            <img src="/harvest_basket.jpg" alt="Fresh Harvest Basket" className="farm-visual-card-img" />
            <div className="farm-visual-card-body">
              <div className="farm-visual-tag">Harvest Decision</div>
              <h3 className="farm-visual-title">Pick at Peak Flavor</h3>
              <p className="farm-visual-desc">Scan tomato clusters to identify fully red fruit ready for picking today.</p>
            </div>
          </div>

          <div className="farm-visual-card" onClick={() => setActiveTab('about')}>
            <img src="/tomato_stages.jpg" alt="Tomato Ripening Stages" className="farm-visual-card-img" />
            <div className="farm-visual-card-body">
              <div className="farm-visual-tag" style={{ color: 'var(--amber-turning)', background: 'var(--amber-soft)' }}>
                Ripeness Stages
              </div>
              <h3 className="farm-visual-title">Green &bull; Turning &bull; Ripe</h3>
              <p className="farm-visual-desc">Leave green fruit on the vine to develop sugars; ship turning fruit safely.</p>
            </div>
          </div>

          <div className="farm-visual-card" onClick={() => setActiveTab('live')}>
            <img src="/greenhouse_rows.jpg" alt="Greenhouse Vine Rows" className="farm-visual-card-img" />
            <div className="farm-visual-card-body">
              <div className="farm-visual-tag" style={{ color: '#2563eb', background: '#eff6ff' }}>
                Field Scanner
              </div>
              <h3 className="farm-visual-title">Live Row Monitoring</h3>
              <p className="farm-visual-desc">Point your phone or webcam down rows for continuous plant ripeness readings.</p>
            </div>
          </div>
        </div>

        {/* Active Tab View */}
        <div>
          {activeTab === 'analyze' && <AnalyzeTab />}
          {activeTab === 'live' && <LiveTab />}
          {activeTab === 'history' && <HistoryTab onSelectSessionForChat={navigateToChatWithSession} />}
          {activeTab === 'chat' && <AssistantTab preselectedSessionId={preselectedChatSession} />}
          {activeTab === 'about' && <AboutTab />}
        </div>
      </main>
    </div>
  );
}
