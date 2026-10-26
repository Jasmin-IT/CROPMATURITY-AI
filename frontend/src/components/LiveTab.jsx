import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  Play,
  Square,
  Camera,
  Save,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
} from 'lucide-react';
import { analyzeLiveFrame, saveLiveSnapshot } from '../api';

export default function LiveTab({ onSnapshotSaved }) {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);
  const [liveData, setLiveData] = useState(null);
  const [annotatedFrame, setAnnotatedFrame] = useState(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameId = useRef(null);
  const isLoopRunning = useRef(false);

  useEffect(() => {
    return () => stopLive();
  }, []);

  const startLive = async () => {
    setError(null);
    setSaveSuccessMsg('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'environment' },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsRunning(true);
      isLoopRunning.current = true;
      processLoop();
    } catch (err) {
      setError('Cannot access camera: ' + err.message);
      setIsRunning(false);
      isLoopRunning.current = false;
    }
  };

  const stopLive = () => {
    isLoopRunning.current = false;
    setIsRunning(false);
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const processLoop = async () => {
    if (!isLoopRunning.current) return;

    if (videoRef.current && videoRef.current.readyState === 4) {
      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = Math.min(640, videoRef.current.videoWidth || 640);
      canvas.height = Math.round((canvas.width * (videoRef.current.videoHeight || 480)) / (videoRef.current.videoWidth || 640));
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        async (blob) => {
          if (!blob || !isLoopRunning.current) return;
          try {
            const data = await analyzeLiveFrame(blob, false, 640);
            if (!isLoopRunning.current) return;

            setLiveData(data);
            if (data.annotated_jpg_base64) {
              setAnnotatedFrame(`data:image/jpeg;base64,${data.annotated_jpg_base64}`);
            }
          } catch (err) {
            console.warn('Live frame dropped:', err);
          } finally {
            if (isLoopRunning.current) {
              setTimeout(() => {
                animationFrameId.current = requestAnimationFrame(processLoop);
              }, 120);
            }
          }
        },
        'image/jpeg',
        0.8
      );
    } else {
      if (isLoopRunning.current) {
        animationFrameId.current = requestAnimationFrame(processLoop);
      }
    }
  };

  const handleSaveSnapshot = async () => {
    if (!liveData || liveData.total <= 0) return;
    try {
      const res = await saveLiveSnapshot(liveData);
      setSaveSuccessMsg(`Saved to your field records as #${res.id}!`);
      if (onSnapshotSaved) onSnapshotSaved();
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err) {
      setError('Save failed: ' + err.message);
    }
  };

  return (
    <div>
      {/* Live Controls Card */}
      <div className="farm-card">
        <div className="farm-card-header">
          <div className="card-heading-group">
            <div className="card-badge-icon">
              <Video size={22} />
            </div>
            <div>
              <h2 className="card-h2">Live Field Camera Scanner</h2>
              <p className="card-p">Point your camera at your tomato plants for instant ripeness feedback</p>
            </div>
          </div>

          <div>
            {!isRunning ? (
              <button type="button" className="btn-farm-green" onClick={startLive}>
                <Play size={18} /> Start Camera Scanner
              </button>
            ) : (
              <button type="button" className="btn-farm-danger" onClick={stopLive}>
                <Square size={18} /> Stop Camera
              </button>
            )}
          </div>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', background: 'var(--tomato-soft)', color: 'var(--tomato-red)', borderRadius: 'var(--radius-md)', fontSize: '0.9rem', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {/* Video feed & Live details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px' }}>
          {/* Feed */}
          <div style={{ background: '#000', borderRadius: 'var(--radius-lg)', overflow: 'hidden', minHeight: '380px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <video ref={videoRef} playsInline muted style={{ display: 'none' }} />

            {annotatedFrame && isRunning ? (
              <img src={annotatedFrame} alt="Live Tomato Scanner" style={{ width: '100%', maxHeight: '480px', objectFit: 'contain' }} />
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                <Camera size={44} style={{ opacity: 0.35, marginBottom: '12px' }} />
                <div style={{ fontSize: '1.1rem', fontWeight: '700' }}>Camera is currently turned off</div>
                <div style={{ fontSize: '0.86rem', marginTop: '4px' }}>Click "Start Camera Scanner" to scan tomato vines</div>
              </div>
            )}
          </div>

          {/* Right Live Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="stage-card-clean" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '16px', color: 'var(--text-primary)' }}>
                  Live Plant Reading
                </h3>

                {liveData ? (
                  <div>
                    {/* Ripeness summary */}
                    <div style={{ padding: '16px', background: 'var(--forest-soft)', border: '1px solid var(--forest-border)', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
                      <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700' }}>
                        Field Ripeness
                      </div>
                      <div style={{ fontSize: '2.2rem', fontWeight: '800', color: 'var(--forest-green)' }}>
                        {liveData.readiness}% Ready
                      </div>
                      <div style={{ fontSize: '0.88rem', fontWeight: '600', color: 'var(--text-primary)', marginTop: '4px' }}>
                        {liveData.status}
                      </div>
                    </div>

                    {/* Progress bars */}
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--tomato-red)', fontWeight: '600' }}>🍅 Ripe (Pick Now)</span>
                        <b>{liveData.counts?.ripe || 0} ({liveData.percentages?.ripe || 0}%)</b>
                      </div>
                      <div className="clean-progress-track">
                        <div className="clean-progress-fill" style={{ width: `${liveData.percentages?.ripe || 0}%`, background: 'var(--tomato-red)' }} />
                      </div>
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--amber-turning)', fontWeight: '600' }}>🍊 Turning (Ready Soon)</span>
                        <b>{liveData.counts?.semiripe || 0} ({liveData.percentages?.semiripe || 0}%)</b>
                      </div>
                      <div className="clean-progress-track">
                        <div className="clean-progress-fill" style={{ width: `${liveData.percentages?.semiripe || 0}%`, background: 'var(--amber-turning)' }} />
                      </div>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--forest-green)', fontWeight: '600' }}>🍏 Green (Growing)</span>
                        <b>{liveData.counts?.unripe || 0} ({liveData.percentages?.unripe || 0}%)</b>
                      </div>
                      <div className="clean-progress-track">
                        <div className="clean-progress-fill" style={{ width: `${liveData.percentages?.unripe || 0}%`, background: 'var(--forest-green)' }} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '30px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    Start the camera to see live tomato counts.
                  </div>
                )}
              </div>

              {liveData && liveData.total > 0 && (
                <div>
                  <button
                    type="button"
                    className="btn-farm-green"
                    onClick={handleSaveSnapshot}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <Save size={16} /> Save This View to Records
                  </button>

                  {saveSuccessMsg && (
                    <div style={{ marginTop: '10px', padding: '8px', background: 'var(--forest-soft)', color: 'var(--forest-green)', borderRadius: 'var(--radius-sm)', fontSize: '0.84rem', textAlign: 'center' }}>
                      {saveSuccessMsg}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
