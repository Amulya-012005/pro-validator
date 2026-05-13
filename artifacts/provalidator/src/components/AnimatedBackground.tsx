import { useEffect, useRef } from "react";

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const particles: {
      x: number; y: number; vx: number; vy: number;
      size: number; opacity: number; color: string; pulse: number;
    }[] = [];
    const colors = ["#00d4ff", "#a855f7", "#ec4899", "#7c3aed", "#06b6d4", "#818cf8", "#f472b6"];

    for (let i = 0; i < 90; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.40,
        vy: (Math.random() - 0.5) * 0.40,
        size: Math.random() * 2.5 + 0.6,
        opacity: Math.random() * 0.65 + 0.20,
        color: colors[Math.floor(Math.random() * colors.length)],
        pulse: Math.random() * Math.PI * 2,
      });
    }

    let frame: number;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 140) {
            const alpha = 0.15 * (1 - dist / 140);
            ctx.beginPath();
            ctx.strokeStyle = `rgba(80, 160, 255, ${alpha})`;
            ctx.lineWidth = 0.6;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      for (const p of particles) {
        p.pulse += 0.018;
        const pulseOpacity = p.opacity + Math.sin(p.pulse) * 0.20;
        const hexOpacity = Math.floor(Math.max(0, Math.min(1, pulseOpacity)) * 255).toString(16).padStart(2, "0");

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color + hexOpacity;
        ctx.shadowBlur = 14;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.shadowBlur = 0;

        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
      }

      frame = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ pointerEvents: "none" }}
    />
  );
}

export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      <div className="absolute inset-0 cyber-grid opacity-30" />

      {/* Light streaks */}
      <div
        className="light-streak"
        style={{ top: "18%", left: 0, "--streak-delay": "0s" } as React.CSSProperties}
      />
      <div
        className="light-streak-2"
        style={{ top: "55%", left: 0, "--streak-delay": "4s" } as React.CSSProperties}
      />
      <div
        className="light-streak"
        style={{ top: "78%", left: 0, "--streak-delay": "9s" } as React.CSSProperties}
      />

      {/* Large ambient orbs */}
      <div
        className="floating-blob"
        style={{
          top: "3%", left: "8%",
          width: "620px", height: "620px",
          background: "radial-gradient(circle, rgba(0,212,255,0.20) 0%, rgba(0,100,200,0.08) 50%, transparent 70%)",
          animationDelay: "0s", animationDuration: "12s",
        }}
      />
      <div
        className="floating-blob"
        style={{
          top: "25%", right: "3%",
          width: "560px", height: "560px",
          background: "radial-gradient(circle, rgba(168,85,247,0.22) 0%, rgba(100,50,200,0.08) 50%, transparent 70%)",
          animationDelay: "-4s", animationDuration: "14s",
        }}
      />
      <div
        className="floating-blob"
        style={{
          bottom: "8%", left: "20%",
          width: "500px", height: "500px",
          background: "radial-gradient(circle, rgba(236,72,153,0.18) 0%, rgba(150,40,100,0.07) 50%, transparent 70%)",
          animationDelay: "-8s", animationDuration: "16s",
        }}
      />
      <div
        className="floating-blob"
        style={{
          top: "55%", right: "28%",
          width: "420px", height: "420px",
          background: "radial-gradient(circle, rgba(124,58,237,0.18) 0%, rgba(80,30,180,0.07) 50%, transparent 70%)",
          animationDelay: "-2s", animationDuration: "10s",
        }}
      />
      <div
        className="floating-blob"
        style={{
          top: "12%", left: "52%",
          width: "380px", height: "380px",
          background: "radial-gradient(circle, rgba(6,182,212,0.16) 0%, transparent 70%)",
          animationDelay: "-6s", animationDuration: "18s",
        }}
      />
      <div
        className="floating-blob"
        style={{
          bottom: "30%", left: "2%",
          width: "320px", height: "320px",
          background: "radial-gradient(circle, rgba(129,140,248,0.16) 0%, transparent 70%)",
          animationDelay: "-3s", animationDuration: "13s",
        }}
      />
      <div
        className="floating-blob"
        style={{
          top: "40%", left: "35%",
          width: "280px", height: "280px",
          background: "radial-gradient(circle, rgba(244,114,182,0.12) 0%, transparent 70%)",
          animationDelay: "-10s", animationDuration: "20s",
        }}
      />

      <ParticleCanvas />
    </div>
  );
}
