
import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ analyser, isPlaying }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();

  useEffect(() => {
    if (!canvasRef.current || !analyser) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      requestRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (!isPlaying) {
        // Draw a flat line when idle
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
        return;
      }

      ctx.lineWidth = 3;
      
      // Create a gradient for the wave
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      gradient.addColorStop(0, '#8e75ff');
      gradient.addColorStop(0.5, '#4d91ff');
      gradient.addColorStop(1, '#8e75ff');
      
      ctx.strokeStyle = gradient;
      ctx.lineCap = 'round';
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * canvas.height / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();

      // Add a glow effect
      ctx.shadowBlur = 15;
      ctx.shadowColor = 'rgba(142, 117, 255, 0.5)';
    };

    draw();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [analyser, isPlaying]);

  return (
    <div className="relative w-full h-32 flex items-center justify-center overflow-hidden rounded-2xl bg-black/40 border border-white/5">
      <canvas 
        ref={canvasRef} 
        className="w-full h-full"
        width={800}
        height={150}
      />
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-xs font-medium uppercase tracking-[0.2em]">
          Ready to speak
        </div>
      )}
    </div>
  );
};

export default AudioVisualizer;
