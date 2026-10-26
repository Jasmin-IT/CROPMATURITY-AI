// API Client for CropMaturityAI FastAPI Backend

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
  return res.json();
}

export async function predictImage(fileOrBlob, annotate = true, save = true, filename = 'image.jpg') {
  const formData = new FormData();
  formData.append('file', fileOrBlob, filename);
  
  const url = `${API_BASE}/predict?annotate=${annotate}&save=${save}`;
  const res = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorText = await res.text();
    let message = errorText;
    try {
      const parsed = JSON.parse(errorText);
      message = parsed.detail || errorText;
    } catch (_) {}
    throw new Error(message);
  }
  return res.json();
}

export async function fetchSamples() {
  const res = await fetch(`${API_BASE}/samples`);
  if (!res.ok) throw new Error('Failed to load sample images');
  return res.json();
}

export function getSampleImageUrl(category, filename) {
  return `${API_BASE}/samples/${encodeURIComponent(category)}/${encodeURIComponent(filename)}`;
}

export async function predictSampleImage(category, filename, annotate = true, save = true) {
  // Fetch sample blob and post to predict
  const imgRes = await fetch(getSampleImageUrl(category, filename));
  if (!imgRes.ok) throw new Error('Failed to fetch sample image');
  const blob = await imgRes.blob();
  return predictImage(blob, annotate, save, filename);
}

export async function fetchHistory(limit = 100) {
  const res = await fetch(`${API_BASE}/history?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to load history');
  return res.json();
}

export async function deleteHistoryItem(id) {
  const res = await fetch(`${API_BASE}/history/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete history item');
  return res.json();
}

export async function clearAllHistory() {
  const res = await fetch(`${API_BASE}/history`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to clear history');
  return res.json();
}

export async function fetchAiAnalysis(detectionId = null) {
  const url = detectionId ? `${API_BASE}/ai/analyze?detection_id=${detectionId}` : `${API_BASE}/ai/analyze`;
  const res = await fetch(url, { method: 'POST' });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Failed to generate AI analysis');
  }
  return res.json();
}

export async function fetchAiDailyReport(detectionId = null) {
  const url = detectionId ? `${API_BASE}/ai/report?detection_id=${detectionId}` : `${API_BASE}/ai/report`;
  const res = await fetch(url, { method: 'POST' });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Failed to generate daily report');
  }
  return res.json();
}

export async function sendAiChat(question, detectionId = null, history = []) {
  const res = await fetch(`${API_BASE}/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question,
      detection_id: detectionId,
      history,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Failed to get chat response');
  }
  return res.json();
}

export async function analyzeLiveFrame(blob, masks = false, imgsz = 640) {
  const formData = new FormData();
  formData.append('file', blob, 'frame.jpg');

  const url = `${API_BASE}/live/frame?masks=${masks}&imgsz=${imgsz}`;
  const res = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) throw new Error('Live frame analysis failed');
  return res.json();
}

export async function saveLiveSnapshot(payload) {
  const res = await fetch(`${API_BASE}/live/save-snapshot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to save snapshot');
  return res.json();
}

export async function triggerRagReindex() {
  const res = await fetch(`${API_BASE}/rag/reindex`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to reindex knowledge base');
  return res.json();
}
