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
    const colors = ["#00d4ff", "#a855f7", "#ec4899", "#7c3aed", "#06b6d4"];

    for (let i = 0; i < 70; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.5 + 0.15,
        color: colors[Math.floor(Math.random() * colors.length)],
        pulse: Math.random() * Math.PI * 2,
      });
    }

    let frame: number;
    let tick = 0;

    const animate = () => {
      tick++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            const alpha = 0.1 * (1 - dist / 130);
            ctx.beginPath();
            ctx.strokeStyle = `rgba(0, 212, 255, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      for (const p of particles) {
        p.pulse += 0.02;
        const pulseOpacity = p.opacity + Math.sin(p.pulse) * 0.15;
        const hexOpacity = Math.floor(Math.max(0, Math.min(1, pulseOpacity)) * 255).toString(16).padStart(2, "0");

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color + hexOpacity;
        ctx.shadowBlur = 10;
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
      <div className="absolute inset-0 cyber-grid opacity-25" />

      <div
        className="floating-blob"
        style={{
          top: "5%", left: "10%",
          width: "500px", height: "500px",
          background: "radial-gradient(circle, rgba(0,212,255,0.10) 0%, transparent 70%)",
          animationDelay: "0s", animationDuration: "12s",
        }}
      />
      <div
        className="floating-blob"
        style={{
          top: "30%", right: "5%",
          width: "450px", height: "450px",
          background: "radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)",
          animationDelay: "-4s", animationDuration: "14s",
        }}
      />
      <div
        className="floating-blob"
        style={{
          bottom: "10%", left: "25%",
          width: "400px", height: "400px",
          background: "radial-gradient(circle, rgba(236,72,153,0.09) 0%, transparent 70%)",
          animationDelay: "-8s", animationDuration: "16s",
        }}
      />
      <div
        className="floating-blob"
        style={{
          top: "60%", right: "30%",
          width: "350px", height: "350px",
          background: "radial-gradient(circle, rgba(124,58,237,0.10) 0%, transparent 70%)",
          animationDelay: "-2s", animationDuration: "10s",
        }}
      />
      <div
        className="floating-blob"
        style={{
          top: "15%", left: "55%",
          width: "300px", height: "300px",
          background: "radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)",
          animationDelay: "-6s", animationDuration: "18s",
        }}
      />

      <ParticleCanvas />
    </div>
  );
}
