"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

const AUTO_ADVANCE_SEC = 5;

interface SplashScreenProps {
  onEnter: () => void;
}

export function SplashScreen({ onEnter }: SplashScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [progress, setProgress] = useState(0);
  const [exiting, setExiting] = useState(false);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const handleEnter = useCallback(() => {
    if (exiting) return;
    setExiting(true);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setTimeout(onEnter, 700);
  }, [exiting, onEnter]);

  // Countdown + auto-advance
  useEffect(() => {
    const duration = AUTO_ADVANCE_SEC * 1000;

    function tick(ts: number) {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const pct = Math.min(elapsed / duration, 1);
      setProgress(pct);
      if (pct < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        handleEnter();
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [handleEnter]);

  // Particle canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = (canvas.width = window.innerWidth);
    let H = (canvas.height = window.innerHeight);

    const onResize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    const COLORS = ["#c044ef", "#8b5cf6", "#a78bfa", "#7c3aed", "#6366f1", "#e879f9"];

    interface P {
      x: number; y: number; vx: number; vy: number;
      r: number; life: number; maxLife: number; color: string;
    }

    const particles: P[] = Array.from({ length: 120 }, () => spawnParticle(W, H, COLORS));

    function spawnParticle(w: number, h: number, colors: string[]): P {
      const maxLife = 120 + Math.random() * 180;
      return {
        x: Math.random() * w,
        y: h + Math.random() * 60,
        vx: (Math.random() - 0.5) * 0.6,
        vy: -(0.4 + Math.random() * 1.2),
        r: 0.8 + Math.random() * 2,
        life: 0,
        maxLife,
        color: colors[Math.floor(Math.random() * colors.length)],
      };
    }

    let animId: number;

    function draw() {
      ctx.clearRect(0, 0, W, H);

      // subtle grid lines for depth
      ctx.strokeStyle = "rgba(192,68,239,0.03)";
      ctx.lineWidth = 1;
      const GRID = 60;
      for (let x = 0; x < W; x += GRID) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y < H; y += GRID) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      // particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.life++;
        p.x += p.vx;
        p.y += p.vy;

        const t = p.life / p.maxLife;
        const opacity = t < 0.1 ? t * 10 : t > 0.8 ? (1 - t) * 5 : 1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        const hex = Math.floor(opacity * 0.8 * 255).toString(16).padStart(2, "0");
        ctx.fillStyle = p.color + hex;
        ctx.fill();

        // glow
        if (p.r > 1.5) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 2.5, 0, Math.PI * 2);
          const gHex = Math.floor(opacity * 0.15 * 255).toString(16).padStart(2, "0");
          ctx.fillStyle = p.color + gHex;
          ctx.fill();
        }

        if (p.life >= p.maxLife || p.y < -20) {
          particles[i] = spawnParticle(W, H, COLORS);
        }
      }

      animId = requestAnimationFrame(draw);
    }

    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const CIRCUMFERENCE = 2 * Math.PI * 26;
  const secondsLeft = Math.ceil(AUTO_ADVANCE_SEC * (1 - progress)) || 0;

  return (
    <div
      onClick={handleEnter}
      className={cn(
        "fixed inset-0 z-[100] flex flex-col items-center justify-center cursor-pointer select-none",
        "bg-[#060609] transition-all duration-700",
        exiting ? "opacity-0 scale-[1.04]" : "opacity-100 scale-100"
      )}
    >
      {/* Particle canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      {/* Ambient corner glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-brand-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-violet-600/10 blur-[100px] pointer-events-none" />

      {/* Main 3D title block */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Glow halo behind the text */}
        <div className="relative">
          <div className="rm-glow-bg" />

          {/* 3D floating text */}
          <h1 className="rm-text relative">
            REELMIND
          </h1>

          {/* Reflection / mirror text */}
          <div
            className="absolute left-0 right-0 flex justify-center pointer-events-none"
            style={{
              top: "100%",
              transform: "scaleY(-0.3)",
              transformOrigin: "top center",
              maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.4), transparent 70%)",
              WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.4), transparent 70%)",
            }}
          >
            <span
              style={{
                fontSize: "clamp(4.5rem, 13vw, 9.5rem)",
                fontWeight: 900,
                letterSpacing: "-0.03em",
                background: "linear-gradient(135deg, #c044ef, #8b5cf6)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                filter: "blur(2px)",
              }}
            >
              REELMIND
            </span>
          </div>
        </div>

        {/* Tagline */}
        <p
          className="text-xs sm:text-sm tracking-[0.35em] uppercase font-light"
          style={{
            background: "linear-gradient(90deg, #a78bfa, #c044ef, #8b5cf6, #a78bfa)",
            backgroundSize: "300%",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            animation: "rm-shimmer 4s ease infinite reverse",
          }}
        >
          Turn Saved Reels Into Ideas
        </p>

        {/* Decorative separator */}
        <div className="flex items-center gap-3 w-64">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-brand-500/40 to-transparent" />
          <span className="text-brand-500/60 text-xs">✦</span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-brand-500/40 to-transparent" />
        </div>
      </div>

      {/* Countdown + CTA */}
      <div className="relative z-10 mt-14 flex flex-col items-center gap-3">
        {/* SVG countdown ring */}
        <div className="relative w-16 h-16">
          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 60 60">
            <circle cx="30" cy="30" r="26" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2" />
            <circle
              cx="30" cy="30" r="26"
              fill="none"
              stroke="url(#splashRingGrad)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
              style={{ transition: "stroke-dashoffset 0.1s linear" }}
            />
            <defs>
              <linearGradient id="splashRingGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#c044ef" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white text-sm font-semibold tabular-nums">
              {secondsLeft > 0 ? secondsLeft : "✓"}
            </span>
          </div>
        </div>

        <p className="rm-blink text-gray-500 text-[11px] tracking-widest uppercase">
          Click anywhere to enter
        </p>
      </div>

      {/* Bottom brand mark */}
      <div className="absolute bottom-6 text-gray-700 text-xs tracking-widest uppercase">
        reelmind.app
      </div>
    </div>
  );
}
