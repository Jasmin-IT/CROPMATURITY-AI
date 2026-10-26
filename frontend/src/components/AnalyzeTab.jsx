import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  UploadCloud,
  Camera,
  Layers,
  CheckCircle2,
  Clock,
  RefreshCw,
  Eye,
  Check,
  AlertTriangle,
  Sliders,
  Scale,
} from 'lucide-react';
import ImageComparisonSlider from './ImageComparisonSlider';
import GaugeChart from './GaugeChart';
import DonutChart from './DonutChart';
import { predictImage, fetchAiAnalysis } from '../api';

export default function AnalyzeTab({ onAnalysisComplete }) {
  const [inputMode, setInputMode] = useState('upload'); // 'upload' | 'camera'
  const [dragActive, setDragActive] = useState(false);
  const [saveToHistory, setSaveToHistory] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [error, setError] = useState(null);

  // Analysis result
  const [originalImageUrl, setOriginalImageUrl] = useState(null);
  const [annotatedImageUrl, setAnnotatedImageUrl] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [aiAdvisory, setAiAdvisory] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Display mode for images: 'slider' | 'side-by-side'
  const [viewStyle, setViewStyle] = useState('slider');

  // Interactive checklist state
  const [checkedTasks, setCheckedTasks] = useState({});

  // Camera stream
  const videoRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);

  useEffect(() => {
    if (inputMode === 'camera') startCamera();
    else stopCamera();
    return () => stopCamera();
  }, [inputMode]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      setError('Cannot access camera: ' + err.message);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const captureCameraPhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) handleFileProcessing(blob, 'field_scan.jpg');
    }, 'image/jpeg', 0.95);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcessing(e.dataTransfer.files[0], e.dataTransfer.files[0].name);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileProcessing(e.target.files[0], e.target.files[0].name);
    }
  };

  const handleFileProcessing = async (fileOrBlob, filename) => {
    setError(null);
    setLoading(true);
    setLoadingStage('Scanning crop picture...');
    setCheckedTasks({});

    const previewUrl = URL.createObjectURL(fileOrBlob);
    setOriginalImageUrl(previewUrl);

    try {
      const result = await predictImage(fileOrBlob, true, saveToHistory, filename);
      setAnalysisResult(result);

      if (result.annotated_jpg_base64) {
        setAnnotatedImageUrl(`data:image/jpeg;base64,${result.annotated_jpg_base64}`);
      } else {
        setAnnotatedImageUrl(previewUrl);
      }

      if (result.readiness >= 80) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#15803d', '#166534', '#d97706', '#dc2626'],
        });
      }

      if (onAnalysisComplete) onAnalysisComplete();

      if (result.total > 0) {
        setLoadingStage('Preparing field harvesting advice...');
        loadAiAdvisory(result.id);
      } else {
        setAiAdvisory(null);
      }
    } catch (err) {
      setError(err.message || 'Could not process crop image.');
    } finally {
      setLoading(false);
    }
  };

  const loadAiAdvisory = async (detectionId) => {
    setAiLoading(true);
    try {
      const advisory = await fetchAiAnalysis(detectionId);
      setAiAdvisory(advisory);
    } catch (err) {
      console.warn('Advisory error:', err);
    } finally {
      setAiLoading(false);
    }
  };

  const toggleTask = (key) => {
    setCheckedTasks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getDecisionBadge = (readiness, total) => {
    if (!total) return { label: 'No Tomatoes Found', class: 'growing' };
    if (readiness >= 85) return { label: 'Harvest Today', class: 'ready' };
    if (readiness >= 60) return { label: 'Almost Ready (2-3 Days)', class: 'turning' };
    return { label: 'Growing (Wait & Monitor)', class: 'growing' };
  };

  const estimatedYieldKg = analysisResult && analysisResult.total
    ? ((analysisResult.counts?.ripe || 0) * 0.15).toFixed(1)
    : 0;

  return (
    <div>
      {/* Upload & Capture Hub */}
      <div className="farm-card">
        <div className="farm-card-header">
          <div className="card-heading-group">
            <div className="card-badge-icon">
              <Camera size={22} />
            </div>
            <div>
              <h2 className="card-h2">Inspect Your Crops</h2>
              <p className="card-p">Choose a photo of your tomato vines or take a photo with your camera</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.86rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={saveToHistory}
                onChange={(e) => setSaveToHistory(e.target.checked)}
                style={{ accentColor: 'var(--forest-green)', width: '16px', height: '16px' }}
              />
              <span>Save to Field Records</span>
            </label>

            <div style={{ display: 'flex', background: 'var(--bg-base)', padding: '4px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border-card)' }}>
              <button
                type="button"
                className={`tab-btn ${inputMode === 'upload' ? 'active' : ''}`}
                onClick={() => setInputMode('upload')}
              >
                <UploadCloud size={16} /> Choose Photo
              </button>
              <button
                type="button"
                className={`tab-btn ${inputMode === 'camera' ? 'active' : ''}`}
                onClick={() => setInputMode('camera')}
              >
                <Camera size={16} /> Take Photo
              </button>
            </div>
          </div>
        </div>

        {/* Upload Dropzone */}
        {inputMode === 'upload' && (
          <div
            className={`clean-dropzone ${dragActive ? 'drag-active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById('field-file-input')?.click()}
          >
            <input
              id="field-file-input"
              type="file"
              accept=".jpg,.jpeg,.png"
              style={{ display: 'none' }}
              onChange={handleFileInput}
            />
            <div className="dropzone-circle">
              <UploadCloud size={32} />
            </div>
            <div>
              <div className="dropzone-main-text">
                Click to select a photo of your tomato plant
              </div>
              <div className="dropzone-sub-text">
                Supports JPG and PNG &bull; Drag and drop files from phone or computer
              </div>
            </div>
          </div>
        )}

        {/* Camera Viewfinder */}
        {inputMode === 'camera' && (
          <div style={{ background: '#000', borderRadius: 'var(--radius-lg)', padding: '20px', textAlign: 'center' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ width: '100%', maxHeight: '440px', borderRadius: 'var(--radius-md)', objectFit: 'contain' }}
            />
            <div style={{ marginTop: '18px' }}>
              <button
                type="button"
                className="btn-farm-green"
                onClick={captureCameraPhoto}
                disabled={!cameraActive || loading}
                style={{ fontSize: '1rem', padding: '14px 32px' }}
              >
                <Camera size={20} /> Snap Photo & Check Ripeness
              </button>
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', padding: '28px', color: 'var(--forest-green)', fontWeight: '700' }}>
            <div className="spinner-clean" />
            <span>{loadingStage}</span>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div style={{ marginTop: '16px', padding: '16px', borderRadius: 'var(--radius-md)', background: 'var(--tomato-soft)', border: '1px solid var(--tomato-border)', color: 'var(--tomato-red)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Analysis Results View */}
      {analysisResult && (
        <div>
          {/* Decision Row */}
          <div className="clean-decision-row">
            {/* Left: Ripeness Dial & Decision */}
            <div className="meter-box-clean">
              <div style={{ fontSize: '0.84rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                Field Harvest Verdict
              </div>

              <div style={{ margin: '14px 0' }}>
                <GaugeChart value={analysisResult.readiness} />
              </div>

              {(() => {
                const badge = getDecisionBadge(analysisResult.readiness, analysisResult.total);
                return (
                  <div className={`verdict-badge-clean ${badge.class}`}>
                    {badge.label}
                  </div>
                );
              })()}

              <div style={{ marginTop: '16px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                {analysisResult.status}
              </div>

              {analysisResult.counts?.ripe > 0 && (
                <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)', width: '100%', display: 'flex', justifyContent: 'space-around', fontSize: '0.86rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Estimated Pick:</span>
                    <div style={{ fontWeight: '800', color: 'var(--text-primary)', fontSize: '1.15rem' }}>
                      ~{estimatedYieldKg} kg
                    </div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Total Found:</span>
                    <div style={{ fontWeight: '800', color: 'var(--forest-green)', fontSize: '1.15rem' }}>
                      {analysisResult.total} fruit
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right: 3 Stage Cards */}
            <div className="stage-cards-grid">
              {/* Ripe */}
              <div className="stage-card-clean" style={{ borderTop: '4px solid var(--tomato-red)' }}>
                <div className="stage-card-top">
                  <span className="stage-pill" style={{ background: 'var(--tomato-soft)', color: 'var(--tomato-red)', border: '1px solid var(--tomato-border)' }}>
                    Pick Today
                  </span>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--tomato-red)' }} />
                </div>
                <div className="stage-big-number" style={{ color: 'var(--tomato-red)' }}>
                  {analysisResult.counts?.ripe || 0}
                </div>
                <div className="stage-card-title">Ripe & Ready</div>
                <div className="stage-card-desc">
                  {analysisResult.percentages?.ripe || 0}% of crop &bull; Full red color and firm skin. Harvest today for top flavor and freshness.
                </div>
              </div>

              {/* Turning */}
              <div className="stage-card-clean" style={{ borderTop: '4px solid var(--amber-turning)' }}>
                <div className="stage-card-top">
                  <span className="stage-pill" style={{ background: 'var(--amber-soft)', color: 'var(--amber-turning)', border: '1px solid var(--amber-border)' }}>
                    Pick in 2-3 Days
                  </span>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--amber-turning)' }} />
                </div>
                <div className="stage-big-number" style={{ color: 'var(--amber-turning)' }}>
                  {analysisResult.counts?.semiripe || 0}
                </div>
                <div className="stage-card-title">Turning / Breaker</div>
                <div className="stage-card-desc">
                  {analysisResult.percentages?.semiripe || 0}% of crop &bull; Showing yellow-orange blush. Leave on vine 48–72 hours to ripen fully.
                </div>
              </div>

              {/* Green */}
              <div className="stage-card-clean" style={{ borderTop: '4px solid var(--forest-green)' }}>
                <div className="stage-card-top">
                  <span className="stage-pill" style={{ background: 'var(--forest-soft)', color: 'var(--forest-green)', border: '1px solid var(--forest-border)' }}>
                    Leave on Vine
                  </span>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--forest-green)' }} />
                </div>
                <div className="stage-big-number" style={{ color: 'var(--forest-green)' }}>
                  {analysisResult.counts?.unripe || 0}
                </div>
                <div className="stage-card-title">Green & Developing</div>
                <div className="stage-card-desc">
                  {analysisResult.percentages?.unripe || 0}% of crop &bull; Immature fruit still forming sugars. Needs 7–12 more days on the plant.
                </div>
              </div>
            </div>
          </div>

          {/* Visual Crop Inspector */}
          <div className="farm-card">
            <div className="farm-card-header">
              <div className="card-heading-group">
                <div className="card-badge-icon">
                  <Eye size={22} />
                </div>
                <div>
                  <h3 className="card-h2">Visual Crop Inspection</h3>
                  <p className="card-p">Slide to compare original picture with identified tomatoes</p>
                </div>
              </div>

              <div style={{ display: 'flex', background: 'var(--bg-base)', padding: '3px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border-card)' }}>
                <button
                  type="button"
                  className={`tab-btn ${viewStyle === 'slider' ? 'active' : ''}`}
                  onClick={() => setViewStyle('slider')}
                >
                  <Sliders size={15} /> Slide Comparison
                </button>
                <button
                  type="button"
                  className={`tab-btn ${viewStyle === 'side-by-side' ? 'active' : ''}`}
                  onClick={() => setViewStyle('side-by-side')}
                >
                  <Eye size={15} /> Side-by-Side
                </button>
              </div>
            </div>

            {viewStyle === 'slider' && originalImageUrl && annotatedImageUrl && (
              <div>
                <ImageComparisonSlider
                  originalSrc={originalImageUrl}
                  annotatedSrc={annotatedImageUrl}
                />
                <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                  ↔ Drag the slider left and right to inspect highlighted tomatoes
                </div>
              </div>
            )}

            {viewStyle === 'side-by-side' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ background: '#000', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                  <div style={{ padding: '10px 16px', background: 'rgba(15,23,42,0.85)', fontSize: '0.84rem', fontWeight: '700', color: '#fff' }}>
                    Original Photo
                  </div>
                  {originalImageUrl && (
                    <img src={originalImageUrl} alt="Original Crop" style={{ width: '100%', height: '380px', objectFit: 'contain' }} />
                  )}
                </div>

                <div style={{ background: '#000', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                  <div style={{ padding: '10px 16px', background: 'rgba(15,23,42,0.85)', fontSize: '0.84rem', fontWeight: '700', color: 'var(--forest-green)' }}>
                    Marked Tomatoes (Red, Orange, Green)
                  </div>
                  {annotatedImageUrl && (
                    <img src={annotatedImageUrl} alt="Marked Crop" style={{ width: '100%', height: '380px', objectFit: 'contain' }} />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Today's Checklist & Field Advice */}
          {analysisResult.total > 0 && (
            <div className="farm-card">
              <div className="farm-card-header">
                <div className="card-heading-group">
                  <div className="card-badge-icon" style={{ background: 'var(--amber-soft)', color: 'var(--amber-turning)', borderColor: 'var(--amber-border)' }}>
                    <CheckCircle2 size={22} />
                  </div>
                  <div>
                    <h3 className="card-h2">Today's Field Action Plan</h3>
                    <p className="card-p">Actionable picking instructions and storage guidance</p>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-farm-secondary"
                  onClick={() => loadAiAdvisory(analysisResult.id)}
                  disabled={aiLoading}
                >
                  <RefreshCw size={14} className={aiLoading ? 'spinner-clean' : ''} />
                  <span>{aiLoading ? 'Updating Advice...' : 'Refresh Plan'}</span>
                </button>
              </div>

              <div className="checklist-advice-grid">
                {/* Grower Checklist */}
                <div>
                  <h4 style={{ fontSize: '0.98rem', fontWeight: '800', marginBottom: '14px', color: 'var(--text-primary)' }}>
                    Picking Checklist
                  </h4>

                  <div
                    className={`clean-checklist-card ${checkedTasks['task1'] ? 'completed' : ''}`}
                    onClick={() => toggleTask('task1')}
                  >
                    <div className={`check-square ${checkedTasks['task1'] ? 'checked' : ''}`}>
                      {checkedTasks['task1'] && <Check size={14} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '0.94rem' }}>
                        Harvest {analysisResult.counts?.ripe || 0} ripe tomatoes
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Snap gently keeping green calyx cap attached.
                      </div>
                    </div>
                  </div>

                  <div
                    className={`clean-checklist-card ${checkedTasks['task2'] ? 'completed' : ''}`}
                    onClick={() => toggleTask('task2')}
                  >
                    <div className={`check-square ${checkedTasks['task2'] ? 'checked' : ''}`}>
                      {checkedTasks['task2'] && <Check size={14} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '0.94rem' }}>
                        Leave {analysisResult.counts?.semiripe || 0} turning tomatoes on vine
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Check back in 2 to 3 days for maximum sugars.
                      </div>
                    </div>
                  </div>

                  <div
                    className={`clean-checklist-card ${checkedTasks['task3'] ? 'completed' : ''}`}
                    onClick={() => toggleTask('task3')}
                  >
                    <div className={`check-square ${checkedTasks['task3'] ? 'checked' : ''}`}>
                      {checkedTasks['task3'] && <Check size={14} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '0.94rem' }}>
                        Store harvested tomatoes at 18°C (65°F)
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Place stem-side down; do not refrigerate.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Practical Advice */}
                <div>
                  <h4 style={{ fontSize: '0.98rem', fontWeight: '800', marginBottom: '14px', color: 'var(--text-primary)' }}>
                    Harvest Guidelines
                  </h4>

                  {aiAdvisory ? (
                    <div className="advice-callout-clean">
                      <div style={{ fontWeight: '700', color: 'var(--forest-green)', marginBottom: '6px' }}>
                        Crop Condition:
                      </div>
                      <div style={{ marginBottom: '14px', color: 'var(--text-primary)' }}>
                        {aiAdvisory.analysis}
                      </div>

                      <div style={{ fontWeight: '700', color: 'var(--amber-turning)', marginBottom: '6px' }}>
                        Recommended Next Steps:
                      </div>
                      <div style={{ color: 'var(--text-secondary)' }}>
                        {aiAdvisory.recommendation}
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <div className="spinner-clean" style={{ marginBottom: '8px' }} />
                      <div>Formulating agronomic advice...</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
