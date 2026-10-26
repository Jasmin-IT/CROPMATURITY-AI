import React, { useState, useRef, useCallback } from 'react';

export default function ImageComparisonSlider({ originalSrc, annotatedSrc }) {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef(null);
  const isDragging = useRef(false);

  const handleMove = useCallback((clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(percentage);
  }, []);

  const onMouseDown = () => {
    isDragging.current = true;
  };

  const onMouseUp = () => {
    isDragging.current = false;
  };

  const onMouseMove = (e) => {
    if (isDragging.current) {
      handleMove(e.clientX);
    }
  };

  const onTouchMove = (e) => {
    if (e.touches && e.touches[0]) {
      handleMove(e.touches[0].clientX);
    }
  };

  return (
    <div
      ref={containerRef}
      className="clean-slider-wrapper"
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onTouchMove={onTouchMove}
      onTouchEnd={onMouseUp}
    >
      {/* Background: Original crop image */}
      <img src={originalSrc} alt="Original Crop" className="slider-img" />
      <div className="tag-right">Original Photo</div>

      {/* Foreground clipped layer: Marked tomatoes */}
      <div
        className="slider-clip-layer"
        style={{ width: `${sliderPos}%` }}
      >
        <img
          src={annotatedSrc}
          alt="Marked Crop"
          className="slider-img"
          style={{ width: containerRef.current ? containerRef.current.clientWidth : '100%' }}
        />
        <div className="tag-left">Highlighted Tomatoes</div>
      </div>

      {/* Divider */}
      <div
        className="slider-divider-line"
        style={{ left: `${sliderPos}%` }}
        onMouseDown={onMouseDown}
        onTouchStart={onMouseDown}
      >
        <div className="slider-handle-circle">
          &#8596;
        </div>
      </div>
    </div>
  );
}
