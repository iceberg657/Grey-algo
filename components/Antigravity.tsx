
import React, { useEffect, useRef } from 'react';

interface AntigravityProps {
  count?: number;
  magnetRadius?: number;
  ringRadius?: number;
  waveSpeed?: number;
  waveAmplitude?: number;
  particleSize?: number;
  lerpSpeed?: number;
  color?: string;
  autoAnimate?: boolean;
  particleVariance?: number;
  rotationSpeed?: number;
  depthFactor?: number;
  pulseSpeed?: number;
  particleShape?: 'circle' | 'capsule' | 'square';
  fieldStrength?: number;
}

const Antigravity: React.FC<AntigravityProps> = ({
  count = 300,
  magnetRadius = 19,
  ringRadius = 7,
  waveSpeed = 0.4,
  waveAmplitude = 1,
  particleSize = 1.5,
  lerpSpeed = 0.05,
  color = '#1a7aad',
  autoAnimate = true,
  particleVariance = 1,
  rotationSpeed = 0,
  depthFactor = 1,
  pulseSpeed = 3,
  particleShape = 'capsule',
  fieldStrength = 10,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];

    class Particle {
      x: number;
      y: number;
      targetX: number;
      targetY: number;
      size: number;
      angle: number;
      distance: number;
      baseX: number;
      baseY: number;
      randomOffset: number;

      constructor(width: number, height: number) {
        this.baseX = Math.random() * width;
        this.baseY = Math.random() * height;
        this.x = this.baseX;
        this.y = this.baseY;
        this.targetX = this.x;
        this.targetY = this.y;
        this.size = particleSize + (Math.random() - 0.5) * particleVariance;
        this.angle = Math.random() * Math.PI * 2;
        this.distance = ringRadius + Math.random() * magnetRadius;
        this.randomOffset = Math.random() * 1000;
      }

      update(width: number, height: number, time: number) {
        const centerX = width / 2;
        const centerY = height / 2;

        // Wave motion
        const waveX = Math.sin(time * waveSpeed + this.randomOffset) * waveAmplitude * 10;
        const waveY = Math.cos(time * waveSpeed + this.randomOffset) * waveAmplitude * 10;

        // Depth / Pulse effect
        const pulse = Math.sin(time * pulseSpeed + this.randomOffset) * depthFactor;
        const currentSize = this.size * (1 + pulse * 0.2);

        // Rotation
        this.angle += rotationSpeed * 0.01;
        
        // Field magnetism logic
        const targetX = centerX + Math.cos(this.angle) * (this.distance * fieldStrength) + waveX;
        const targetY = centerY + Math.sin(this.angle) * (this.distance * fieldStrength) + waveY;

        // Lerp towards target
        this.x += (targetX - this.x) * lerpSpeed;
        this.y += (targetY - this.y) * lerpSpeed;

        return { x: this.x, y: this.y, size: currentSize };
      }

      draw(context: CanvasRenderingContext2D, x: number, y: number, size: number) {
        context.fillStyle = color;
        context.beginPath();
        if (particleShape === 'capsule') {
          context.roundRect(x - size, y - size * 2, size * 2, size * 4, size);
        } else if (particleShape === 'square') {
          context.fillRect(x - size, y - size, size * 2, size * 2);
        } else {
          context.arc(x, y, size, 0, Math.PI * 2);
        }
        context.fill();
      }
    }

    const init = () => {
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      
      particles = Array.from({ length: count }, () => new Particle(width, height));
    };

    const animate = (time: number) => {
      const { width, height } = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        const { x, y, size } = p.update(width, height, time / 1000);
        p.draw(ctx, x, y, size);
      });

      if (autoAnimate) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    window.addEventListener('resize', init);
    init();
    animationFrameId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', init);
      cancelAnimationFrame(animationFrameId);
    };
  }, [
    count,
    magnetRadius,
    ringRadius,
    waveSpeed,
    waveAmplitude,
    particleSize,
    lerpSpeed,
    color,
    autoAnimate,
    particleVariance,
    rotationSpeed,
    depthFactor,
    pulseSpeed,
    particleShape,
    fieldStrength,
  ]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />;
};

export default Antigravity;
