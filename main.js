(() => {
  const root = document.documentElement;
  root.classList.add('js');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const bar = document.getElementById('bar');

  /* arriving from the Seminar page: jump straight to the requested section before the slide-in */
  try {
    const goto = sessionStorage.getItem('goto');
    if (goto) {
      sessionStorage.removeItem('goto');
      const t = document.getElementById(goto);
      if (t) {
        root.style.scrollBehavior = 'auto';
        scrollTo(0, t.getBoundingClientRect().top + scrollY - bar.offsetHeight);
        root.style.scrollBehavior = '';
        history.replaceState(null, '', '#' + goto);
      }
    }
  } catch (_) {}
  const barH = () => bar.offsetHeight;

  /* smooth scroll to a section, landing just under the sticky bar */
  function go(el, hash, extra = 0) {
    const y = el.getBoundingClientRect().top + scrollY - (el.id === 'top' ? 0 : barH() + extra);
    scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
    if (hash) history.pushState(null, '', hash);
  }

  /* ---- the three doors (and any in-page link to a section) ---- */
  document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href').slice(1);
    const el = document.getElementById(id);
    if (!el || a.classList.contains('skip')) return;
    e.preventDefault();
    if (a.classList.contains('door')) {
      document.querySelectorAll('.door').forEach(d => d.classList.toggle('is-chosen', d === a));
    }
    go(el, '#' + id);
  }));

  /* ---- apply: college vs. summer program ---- */
  const tabs = [...document.querySelectorAll('.fork-opt')];
  /* both panels start closed; choosing one expands it downward (like the President's letter).
     choosing the open one again folds it away. */
  /* one smooth motion: the panel's height eases open (or closed) on its own,
     its contents fade in with it, and the page only scrolls if the cards are off-screen */
  const EASE = 'cubic-bezier(.45,0,.2,1)';
  function animatePanel(panel, open) {
    const inner = panel.firstElementChild;
    const from = panel.getBoundingClientRect().height;
    const to = open ? inner.scrollHeight : 0;
    panel.getAnimations().forEach(a => a.cancel());
    panel.style.height = from + 'px';
    const dur = reduce ? 0 : Math.min(900, 420 + Math.abs(to - from) * 0.12);
    const anim = panel.animate(
      [{ height: from + 'px', opacity: open ? 0.0 : 1 }, { height: to + 'px', opacity: open ? 1 : 0 }],
      { duration: dur, easing: EASE, fill: 'forwards' });
    anim.onfinish = () => { anim.cancel(); panel.style.height = open ? 'auto' : '0px'; panel.style.opacity = open ? 1 : 0; };
  }
  function select(track, scroll) {
    const current = tabs.find(t => t.getAttribute('aria-selected') === 'true');
    const closing = current && current.dataset.track === track;
    tabs.forEach(t => {
      const on = !closing && t.dataset.track === track;
      const panel = document.getElementById(t.getAttribute('aria-controls'));
      const wasOpen = panel.classList.contains('is-open');
      t.setAttribute('aria-selected', on);
      t.setAttribute('aria-expanded', on);
      panel.classList.toggle('is-open', on);
      panel.inert = !on;
      if (on) panel.querySelectorAll('.reveal:not(.in)').forEach(el => el.classList.add('in'));
      if (on !== wasOpen) animatePanel(panel, on);
    });
    if (scroll && !closing) {
      const fork = document.querySelector('.fork');
      const top = fork.getBoundingClientRect().top;
      if (top < barH() || top > innerHeight * 0.6) go(fork, '#apply-' + track);
      else history.pushState(null, '', '#apply-' + track);
    }
  }
  tabs.forEach(t => {
    t.addEventListener('click', () => select(t.dataset.track, true));
    t.addEventListener('keydown', e => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const next = tabs[(tabs.indexOf(t) + 1) % tabs.length];
      next.focus();
    });
  });

  /* deep links: #apply-college, #apply-summer, #apply, #visit, #give */
  function fromHash() {
    const h = location.hash.slice(1);
    if (h === 'apply-summer' || h === 'apply-college') {
      const t = h.replace('apply-', '');
      if (!document.getElementById(h).classList.contains('is-open')) select(t, false);
      requestAnimationFrame(() => go(document.querySelector('.fork')));
    }
  }
  addEventListener('popstate', fromHash);

  /* ---- sticky bar: appears once the chooser is behind you ---- */
  const chooser = document.getElementById('top');
  new IntersectionObserver(([e]) => bar.classList.toggle('is-on', !e.isIntersecting), { threshold: 0, rootMargin: `-${bar.offsetHeight + 40}px 0px 0px 0px` }).observe(chooser);

  /* active section in the bar */
  const links = Object.fromEntries([...document.querySelectorAll('[data-nav]')].map(a => [a.dataset.nav, a]));
  const spy = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) Object.entries(links).forEach(([k, a]) => a.classList.toggle('is-active', k === e.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  ['apply', 'visit', 'give'].forEach(id => spy.observe(document.getElementById(id)));

  /* ---- reveal on scroll ---- */
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px' });
  function reveal(scope) { scope.querySelectorAll('.reveal:not(.in)').forEach(el => io.observe(el)); }
  reveal(document);

  /* ---- president's letter: the wide bar expands the letter downward ---- */
  const letter = document.getElementById('president-letter');
  const letterBtn = document.querySelector('.btn-letter');
  if (letter && letterBtn) {
    const label = letterBtn.firstChild;
    const setLetter = (open, returnToBtn) => {
      letter.classList.toggle('is-open', open);
      letter.inert = !open;
      letterBtn.setAttribute('aria-expanded', open);
      label.textContent = open ? 'Close the letter ' : 'A letter from our President ';
      if (!open && returnToBtn) go(letterBtn, null, 24);
    };
    letterBtn.addEventListener('click', () => setLetter(!letter.classList.contains('is-open')));
    letter.querySelector('.letter-hide').addEventListener('click', () => setLetter(false, true));
    if (location.hash === '#president-letter') setLetter(true);
  }

  /* ---- slide to the seminar page: this view exits left, the new page enters from the right ---- */
  document.querySelectorAll('a[data-slide]').forEach(a => a.addEventListener('click', e => {
    if (reduce || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    if ('onpagereveal' in window) return;   // browser animates both pages together (see @view-transition in styles.css)
    e.preventDefault();
    try { sessionStorage.setItem('slideIn', '1'); } catch (_) {}
    root.classList.add('slide-out');
    setTimeout(() => { location.href = a.href; }, 620);
  }));
  addEventListener('pageshow', () => root.classList.remove('slide-out'));

  /* ---- landing doors: smooth hover expansion with a short grace period on leave ---- */
  const doorsEl = document.querySelector('.doors');
  if (doorsEl) {
    let leaveTimer;
    const setHot = d => {
      clearTimeout(leaveTimer);
      doorsEl.classList.toggle('has-hot', !!d);
      doorsEl.querySelectorAll('.door').forEach(x => x.classList.toggle('is-hot', x === d));
    };
    doorsEl.querySelectorAll('.door').forEach(d => {
      d.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') setHot(d); });
      d.addEventListener('focus', () => setHot(d));
      d.addEventListener('blur', () => setHot(null));
    });
    doorsEl.addEventListener('pointerleave', () => { leaveTimer = setTimeout(() => setHot(null), 180); });
  }

  fromHash();
})();
