// Motion for the landing page: scroll reveal, a reading-progress bar and a pointer tilt on
// the 3D hero cards. Everything is visible without this script, and nothing runs when the
// visitor asks for reduced motion.
(() => {
  'use strict';
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const REVEAL = '.page h2, .page .lede, .stat, .scene div, .jobs li, .why div, .compare section, .flow div, .facts div, .steps li, figure, .honest div, .sources li';
  const STAGGER_MS = 70;
  const MAX_TILT_DEG = 7;

  const items = [...document.querySelectorAll(REVEAL)];
  const seen = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('in');
      seen.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  for (const el of items) {
    const siblings = [...el.parentElement.children].filter((child) => child.matches(REVEAL));
    el.style.setProperty('--d', `${Math.min(siblings.indexOf(el), 6) * STAGGER_MS}ms`);
    el.classList.add('reveal');
    seen.observe(el);
  }

  const bar = document.querySelector('.progress');
  let ticking = false;
  const paint = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.setProperty('--p', max > 0 ? (scrollY / max).toFixed(4) : '0');
    ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(paint); } }, { passive: true });
  paint();

  const hero = document.querySelector('.hero');
  const stage = document.querySelector('.stage-3d');
  if (hero && stage && matchMedia('(pointer: fine)').matches) {
    hero.addEventListener('pointermove', (event) => {
      const box = hero.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width - 0.5;
      const y = (event.clientY - box.top) / box.height - 0.5;
      stage.style.setProperty('--ry', `${(x * 2 * MAX_TILT_DEG).toFixed(2)}deg`);
      stage.style.setProperty('--rx', `${(-y * 2 * MAX_TILT_DEG).toFixed(2)}deg`);
    });
    hero.addEventListener('pointerleave', () => { stage.style.setProperty('--ry', '0deg'); stage.style.setProperty('--rx', '0deg'); });
  }
})();
