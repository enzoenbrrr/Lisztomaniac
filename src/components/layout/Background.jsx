import React, { useEffect, useRef } from 'react';

/**
 * Arrière-plan vivant et interactif (Canvas 60fps + Halos fluides) adapté à chaque thème :
 * - 'dark'   : Particules argentées flottantes, lignes de constellation subtiles & halo souris monochrome
 * - 'light'  : Rubans nacrés en mouvement, poussières lumineuses douces & halo perle interactif
 * - 'galaxy' : Champ d'étoiles scintillantes à parallaxe, nébuleuses en mouvement & ondes cosmiques
 *
 * Réagit en douceur aux mouvements de la souris ainsi qu'aux notes jouées au clavier MIDI.
 */
export default function Background({
  theme = 'dark',
  customBg = null,
  concertTone = 'dark',
  interactive = true,
  lastPlayedNote = null,
}) {
  const canvasRef = useRef(null);
  const ripplesRef = useRef([]);

  // Déclenche une onde lumineuse subtile lorsqu'une note MIDI est jouée dans le menu
  useEffect(() => {
    if (!lastPlayedNote || !interactive || theme === 'concert') return;
    ripplesRef.current.push({
      x: (0.2 + ((lastPlayedNote.midi - 36) / 60) * 0.6) * window.innerWidth,
      y: window.innerHeight * 0.5,
      radius: 10,
      maxRadius: 260,
      alpha: 0.35,
    });
  }, [lastPlayedNote, interactive, theme]);

  useEffect(() => {
    if (theme === 'concert') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const mouse = {
      x: width * 0.5,
      y: height * 0.38,
      targetX: width * 0.5,
      targetY: height * 0.38,
      active: false,
    };

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
      mouse.active = true;
    };

    const handleMouseClick = (e) => {
      if (!interactive) return;
      ripplesRef.current.push({
        x: e.clientX,
        y: e.clientY,
        radius: 6,
        maxRadius: 220,
        alpha: 0.28,
      });
    };

    const handleVisibilityChange = () => {
      if (!document.hidden && !animationFrameId) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mousedown', handleMouseClick, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Génération des particules selon le thème
    const count = theme === 'galaxy' ? 95 : 55;
    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * (theme === 'galaxy' ? 0.22 : 0.32),
      vy: (Math.random() - 0.5) * (theme === 'galaxy' ? 0.22 : 0.32),
      size:
        theme === 'galaxy'
          ? Math.random() * 1.9 + 0.5
          : Math.random() * 2.1 + 0.7,
      depth: Math.random() * 0.8 + 0.2,
      twinkleSpeed: Math.random() * 0.025 + 0.008,
      twinklePhase: Math.random() * Math.PI * 2,
      hue:
        theme === 'galaxy'
          ? [225, 255, 280, 198][Math.floor(Math.random() * 4)]
          : 0,
    }));

    let time = 0;

    const render = () => {
      time += 0.012;
      ctx.clearRect(0, 0, width, height);

      // Interpolation fluide de la position du curseur (inertie Apple)
      mouse.x += (mouse.targetX - mouse.x) * 0.06;
      mouse.y += (mouse.targetY - mouse.y) * 0.06;

      const speedFactor = interactive ? 1 : 0.35;
      const opacityFactor = interactive ? 1 : 0.45;

      // 1. Halo interactif doux qui suit le curseur
      if (interactive) {
        const haloRadius = Math.max(width, height) * 0.34;
        const grad = ctx.createRadialGradient(
          mouse.x,
          mouse.y,
          0,
          mouse.x,
          mouse.y,
          haloRadius
        );

        if (theme === 'galaxy') {
          grad.addColorStop(0, 'rgba(129, 140, 248, 0.13)');
          grad.addColorStop(0.45, 'rgba(168, 85, 247, 0.06)');
          grad.addColorStop(1, 'rgba(6, 7, 19, 0)');
        } else if (theme === 'light') {
          grad.addColorStop(0, 'rgba(24, 24, 27, 0.055)');
          grad.addColorStop(0.5, 'rgba(113, 113, 122, 0.025)');
          grad.addColorStop(1, 'rgba(245, 245, 247, 0)');
        } else {
          grad.addColorStop(0, 'rgba(255, 255, 255, 0.075)');
          grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.02)');
          grad.addColorStop(1, 'rgba(5, 5, 6, 0)');
        }

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }

      // 2. Ondes fluides (Rubans de portée stylisés en mouvement lent)
      if (interactive) {
        ctx.save();
        const waveCount = 3;
        for (let w = 0; w < waveCount; w++) {
          ctx.beginPath();
          const baseY = height * (0.32 + w * 0.18);
          for (let x = 0; x <= width; x += 24) {
            const distMouseX = (x - mouse.x) / width;
            const mouseInfluence =
              Math.exp(-distMouseX * distMouseX * 8) *
              ((mouse.y - height * 0.5) * 0.08);
            const y =
              baseY +
              Math.sin(x * 0.0022 + time * (0.8 + w * 0.2) + w) * 28 +
              Math.cos(x * 0.0011 - time * 0.5) * 16 +
              mouseInfluence;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }

          if (theme === 'galaxy') {
            ctx.strokeStyle =
              w === 0
                ? 'rgba(129, 140, 248, 0.09)'
                : w === 1
                  ? 'rgba(192, 132, 252, 0.07)'
                  : 'rgba(56, 189, 248, 0.06)';
          } else if (theme === 'light') {
            ctx.strokeStyle = `rgba(24, 24, 27, ${0.045 - w * 0.01})`;
          } else {
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.048 - w * 0.01})`;
          }
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
        ctx.restore();
      }

      // 3. Particules / Étoiles avec parallaxe souris et connexions subtiles
      const parallaxOffsetX = (mouse.x - width * 0.5) * 0.035;
      const parallaxOffsetY = (mouse.y - height * 0.5) * 0.035;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx * speedFactor;
        p.y += p.vy * speedFactor;
        p.twinklePhase += p.twinkleSpeed;

        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;
        if (p.y < -20) p.y = height + 20;
        if (p.y > height + 20) p.y = -20;

        const drawX = p.x + parallaxOffsetX * p.depth;
        const drawY = p.y + parallaxOffsetY * p.depth;

        // Légère répulsion élastique autour du curseur
        const dx = drawX - mouse.x;
        const dy = drawY - mouse.y;
        const distSq = dx * dx + dy * dy;
        let offsetX = 0;
        let offsetY = 0;
        if (interactive && distSq < 18000 && distSq > 1) {
          const dist = Math.sqrt(distSq);
          const force = (1 - dist / 134) * 14;
          offsetX = (dx / dist) * force;
          offsetY = (dy / dist) * force;
        }

        const fx = drawX + offsetX;
        const fy = drawY + offsetY;

        const twinkle = (Math.sin(p.twinklePhase) + 1) * 0.5;
        const alpha = (0.18 + twinkle * 0.52) * opacityFactor;

        ctx.beginPath();
        ctx.arc(fx, fy, p.size, 0, Math.PI * 2);

        if (theme === 'galaxy') {
          ctx.fillStyle = `hsla(${p.hue}, 85%, 82%, ${alpha})`;
        } else if (theme === 'light') {
          ctx.fillStyle = `rgba(24, 24, 27, ${alpha * 0.42})`;
        } else {
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.65})`;
        }
        ctx.fill();

        // Connexions fines entre particules proches du curseur (dans le menu)
        if (interactive && distSq < 26000) {
          for (let j = i + 1; j < particles.length; j++) {
            const p2 = particles[j];
            const d2x = fx - (p2.x + parallaxOffsetX * p2.depth);
            const d2y = fy - (p2.y + parallaxOffsetY * p2.depth);
            const d2Sq = d2x * d2x + d2y * d2y;
            if (d2Sq < 9500) {
              const lineAlpha = (1 - d2Sq / 9500) * 0.14 * opacityFactor;
              ctx.beginPath();
              ctx.moveTo(fx, fy);
              ctx.lineTo(
                p2.x + parallaxOffsetX * p2.depth,
                p2.y + parallaxOffsetY * p2.depth
              );
              ctx.strokeStyle =
                theme === 'galaxy'
                  ? `rgba(165, 180, 252, ${lineAlpha})`
                  : theme === 'light'
                    ? `rgba(24, 24, 27, ${lineAlpha * 0.7})`
                    : `rgba(255, 255, 255, ${lineAlpha})`;
              ctx.lineWidth = 0.7;
              ctx.stroke();
            }
          }
        }
      }

      // 4. Ondes circulaires au clic ou à la pression d'une note MIDI
      for (let r = ripplesRef.current.length - 1; r >= 0; r--) {
        const ripple = ripplesRef.current[r];
        ripple.radius += 3.2;
        ripple.alpha *= 0.96;

        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
        ctx.strokeStyle =
          theme === 'galaxy'
            ? `rgba(165, 180, 252, ${ripple.alpha})`
            : theme === 'light'
              ? `rgba(24, 24, 27, ${ripple.alpha * 0.55})`
              : `rgba(255, 255, 255, ${ripple.alpha})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        if (ripple.alpha < 0.01 || ripple.radius > ripple.maxRadius) {
          ripplesRef.current.splice(r, 1);
        }
      }

      if (document.hidden) {
        animationFrameId = null;
        return;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseClick);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [theme, interactive]);

  if (theme === 'concert') {
    const resolvedBg = customBg || `${import.meta.env.BASE_URL}bg-concert.webp`;
    const isLightImage = concertTone === 'light';
    return (
      <div
        className={`fixed inset-0 -z-10 overflow-hidden pointer-events-none select-none ${
          isLightImage ? 'bg-[#f5f5f7]' : 'bg-[#050506]'
        }`}
        aria-hidden="true"
      >
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-500"
          style={{
            backgroundImage: `url("${resolvedBg}")`,
          }}
        />
        {/* Voile adaptatif (clair si l'image est claire, sombre si l'image est sombre) */}
        <div
          className={`absolute inset-0 transition-colors duration-500 ${
            isLightImage ? 'bg-white/30' : 'bg-black/50'
          }`}
        />
      </div>
    );
  }

  return (
    <div
      className={`fixed inset-0 -z-10 overflow-hidden pointer-events-none select-none transition-colors duration-700 ${theme === 'light'
          ? 'bg-[#f5f5f7]'
          : theme === 'galaxy'
            ? 'bg-[#060713]'
            : 'bg-[#050506]'
        }`}
      aria-hidden="true"
    >
      {/* Couche de dégradés atmosphériques propres à chaque thème */}
      {theme === 'light' && (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.95)_0%,_rgba(238,238,244,1)_80%)]" />
          <div className="animate-orb-1 absolute -top-28 -left-20 w-[36rem] h-[36rem] rounded-full bg-white/90 blur-[110px]" />
          <div className="animate-orb-2 absolute -bottom-32 -right-20 w-[40rem] h-[40rem] rounded-full bg-zinc-300/45 blur-[130px]" />
        </>
      )}

      {theme === 'galaxy' && (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.2)_0%,_rgba(88,28,135,0.11)_45%,_rgba(6,7,19,1)_82%)]" />
          <div className="animate-orb-1 absolute -top-28 -left-20 w-[38rem] h-[38rem] rounded-full bg-indigo-500/[0.15] blur-[140px]" />
          <div className="animate-orb-2 absolute -bottom-32 -right-20 w-[42rem] h-[42rem] rounded-full bg-purple-500/[0.13] blur-[150px]" />
          <div className="animate-orb-1 absolute top-1/4 right-1/4 w-[28rem] h-[28rem] rounded-full bg-sky-400/[0.07] blur-[130px]" />
        </>
      )}

      {theme === 'dark' && (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.065)_0%,_rgba(5,5,6,1)_72%)]" />
          <div className="animate-orb-1 absolute -top-32 -left-24 w-[36rem] h-[36rem] rounded-full bg-white/[0.05] blur-[135px]" />
          <div className="animate-orb-2 absolute -bottom-36 -right-24 w-[40rem] h-[40rem] rounded-full bg-zinc-300/[0.04] blur-[145px]" />
        </>
      )}

      {/* Canvas interactif 60fps (Ondes harmoniques, Particules & Halo Souris/MIDI) */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
    </div>
  );
}
