/**
 * Realistic Mist/Fog Particle System
 * Designed for high performance, automatic parting, and easy reversal.
 */

class MistSystem {
  constructor() {
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'mistCanvas';
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.particleCount = 65;
    this.hero = document.getElementById('hero');
    this.partFactor = 0;
    this.running = false;

    if (!this.hero) return;

    window.__dismissMist = () => this.dismiss();

    if (this.reducedMotion) {
      document.body.style.overflow = '';
      return;
    }

    this.running = true;
    this.init();
  }

  dismiss() {
    this.running = false;
    this.partFactor = 1;
    document.body.style.overflow = '';
    if (this.canvas.isConnected) {
      this.canvas.style.display = 'none';
    }
  }

  init() {
    this.hero.appendChild(this.canvas);
    this.resize();

    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push(this.createParticle());
    }

    if (typeof gsap !== 'undefined') {
      document.body.style.overflow = 'hidden';

      gsap.to(this, {
        partFactor: 1,
        duration: 3.5,
        delay: 0.5,
        ease: 'power2.inOut',
        onComplete: () => {
          this.dismiss();
        }
      });

      setTimeout(() => {
        if (document.body.style.overflow === 'hidden') {
          this.dismiss();
        }
      }, 6000);
    } else {
      document.body.style.overflow = 'hidden';
      setTimeout(() => {
        let start = null;
        const animatePart = (timestamp) => {
          if (!start) start = timestamp;
          const progress = (timestamp - start) / 3500;
          this.partFactor = Math.min(progress, 1);
          if (progress < 1) {
            requestAnimationFrame(animatePart);
          } else {
            this.partFactor = 1;
            setTimeout(() => {
              this.dismiss();
            }, 50);
          }
        };
        requestAnimationFrame(animatePart);
      }, 500);
    }

    window.addEventListener('resize', () => this.resize());
    this.animate();
  }

  createParticle() {
    const side = Math.random() > 0.5 ? 1 : -1;
    return {
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height,
      radius: Math.random() * 300 + 200,
      opacity: Math.random() * 0.5 + 0.5,
      speedX: (Math.random() - 0.5) * 0.2,
      speedY: (Math.random() - 0.5) * 0.1,
      parallax: Math.random() * 0.4 + 0.1,
      side: side
    };
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  drawParticle(p) {
    const scrollY = window.scrollY;
    const partOffset = p.side * (this.canvas.width * 0.8) * this.partFactor;
    const xPos = p.x + partOffset;
    const yPos = p.y + (scrollY * p.parallax);
    const currentOpacity = Math.max(0, p.opacity * (1 - (this.partFactor * 1.05)));

    const gradient = this.ctx.createRadialGradient(
      xPos, yPos, 0,
      xPos, yPos, p.radius
    );

    gradient.addColorStop(0, `rgba(255, 255, 255, ${currentOpacity})`);
    gradient.addColorStop(0.4, `rgba(255, 255, 255, ${currentOpacity * 0.6})`);
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(xPos, yPos, p.radius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  update() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.particles.forEach(p => {
      p.x += p.speedX;
      p.y += p.speedY;

      if (p.x < -p.radius) p.x = this.canvas.width + p.radius;
      if (p.x > this.canvas.width + p.radius) p.x = -p.radius;
      if (p.y < -p.radius) p.y = this.canvas.height + p.radius;
      if (p.y > this.canvas.height + p.radius) p.y = -p.radius;

      this.drawParticle(p);
    });
  }

  animate() {
    if (!this.running) return;
    this.update();
    requestAnimationFrame(() => this.animate());
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new MistSystem();
});
