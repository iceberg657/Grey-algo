
import React, { useEffect, useRef } from 'react';
import { useTheme } from './contexts/ThemeContext';

export const NeuralBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { theme } = useTheme();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Resize handler
        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', handleResize);
        handleResize(); // Initial size

        let animationFrameId: number;

        interface Particle {
            x: number;
            y: number;
            vx: number;
            vy: number;
            size: number;
        }

        const particles: Particle[] = [];
        // Calculate particle count based on screen area to maintain density
        const particleCount = Math.floor((window.innerWidth * window.innerHeight) / 12000);

        const initParticles = () => {
            particles.length = 0;
            for (let i = 0; i < particleCount; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    vx: (Math.random() - 0.5) * 1.5, // Increased speed from 0.5 to 1.5
                    vy: (Math.random() - 0.5) * 1.5, // Increased speed from 0.5 to 1.5
                    size: Math.random() * 2 + 1
                });
            }
        };

        initParticles();

        const animate = () => {
            if (!ctx || !canvas) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const isDark = theme === 'dark';
            // Brighter particles for dark mode
            const particleFill = isDark ? 'rgba(34, 211, 238, 0.8)' : 'rgba(14, 165, 233, 0.8)'; // Cyan
            const lineBase = isDark ? '34, 211, 238' : '14, 165, 233';

            particles.forEach((p, i) => {
                p.x += p.vx;
                p.y += p.vy;

                // Wrap around edges
                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = particleFill;
                ctx.fill();

                // Connections
                for (let j = i + 1; j < particles.length; j++) {
                    const p2 = particles[j];
                    const dx = p.x - p2.x;
                    const dy = p.y - p2.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 150) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(${lineBase}, ${0.2 * (1 - dist / 150)})`;
                        ctx.lineWidth = 1;
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.stroke();
                    }
                }
            });

            animationFrameId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
        };
    }, [theme]);

    return (
        <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none z-0 bg-slate-50/70 dark:bg-[#070b14] transition-colors duration-700">
            {/* Liquid Bubble Gradients / Blobs of Light both on light and dark mode */}
            <div className="absolute inset-0 overflow-hidden mix-blend-multiply dark:mix-blend-screen opacity-75 dark:opacity-60">
                {/* Bubble 1: Top Left - Indigo / Blue */}
                <div className="absolute top-[-10%] left-[-15%] w-[60vw] h-[60vw] rounded-full bg-indigo-200/35 dark:bg-indigo-900/20 blur-[130px] md:blur-[190px] animate-blob-1" />
                
                {/* Bubble 2: Middle Right - Cyan / Teal / Turquoise */}
                <div className="absolute top-[25%] right-[-15%] w-[55vw] h-[55vw] rounded-full bg-teal-200/30 dark:bg-cyan-900/15 blur-[130px] md:blur-[190px] animate-blob-2" />
                
                {/* Bubble 3: Bottom Left - Emerald / Amber / Soft Violet */}
                <div className="absolute bottom-[-15%] left-[5%] w-[50vw] h-[50vw] rounded-full bg-emerald-200/25 dark:bg-violet-900/20 blur-[110px] md:blur-[170px] animate-blob-3" />

                {/* Bubble 4: Center/Top-Right - Soft Rose / Gold / Bright Fuchsia */}
                <div className="absolute top-[10%] left-[35%] w-[45vw] h-[45vw] rounded-full bg-rose-200/25 dark:bg-pink-950/15 blur-[140px] md:blur-[200px] animate-blob-2" />
            </div>

            {/* Neural Net Layer */}
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-50 dark:opacity-75" />
        </div>
    );
};
