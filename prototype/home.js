(() => {
  'use strict';
  const phone = document.querySelector('.fl-home-phone');
  if (!phone) return;
  const face = document.querySelector('#home-face');
  const svg = face.querySelector('svg');
  const faceController = FitLensFace.mount(svg,{expression:'happy',themeTarget:phone.querySelector('.fl-hero')});
  let baseExpression='happy';
  const eyes = [...svg.querySelectorAll('.fl-eye-shape')];
  const mouth = svg.querySelector('.fl-mouth-shape');
  const mask = svg.querySelector('clipPath path');
  const halo = phone.querySelector('.fl-halo');
  const toggle = document.querySelector('#home-motion');
  const announcement = document.querySelector('#home-announcement');
  const happy = mouth.getAttribute('d');
  const delighted = FitLensFace.faces.energized.mouth;
  const expressions = Object.fromEntries(Object.entries(FitLensFace.faces).map(([name,face])=>[name,face.mouth]));
  let baseMouth = happy, paused = false, visible = !document.hidden;
  let blinkTimer = 0, resetTimer = 0, mouthFrame = 0;
  let reacting = false, reactionCount = 0, activeAnimations = [];
  const gaze = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  eyes[0].before(gaze);
  eyes.forEach(eye => gaze.append(eye));

  // This preview opts into motion as requested. The on-screen switch pauses it
  // locally without touching the browser's or operating system's preferences.
  try { paused = sessionStorage.getItem('fitlens:home-motion') === 'paused'; } catch {}

  function animate(element, frames, options) {
    const animation = element.animate(frames, options);
    activeAnimations.push(animation);
    animation.finished.then(() => {
      activeAnimations = activeAnimations.filter(item => item !== animation);
    }).catch(() => {});
    return animation;
  }

  function setMouth(path) { mouth.setAttribute('d', path); mask.setAttribute('d', path); }
  function morphMouth(to, duration = 250) {
    cancelAnimationFrame(mouthFrame);
    if (paused || !visible) { setMouth(to); return; }
    const numbers = /-?\d+(?:\.\d+)?/g;
    const from = mouth.getAttribute('d').match(numbers).map(Number);
    const start = performance.now();
    function frame(now) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      let i = 0;
      setMouth(to.replace(numbers, n => {
        const index = i++;
        return (from[index] + (Number(n) - from[index]) * eased).toFixed(2);
      }));
      if (progress < 1) mouthFrame = requestAnimationFrame(frame);
    }
    mouthFrame = requestAnimationFrame(frame);
  }

  function blink(wink = false) {
    if (paused || !visible) return;
    (wink ? [eyes[1]] : eyes).forEach(eye => animate(eye, [
      { transform: 'scaleY(1)', offset: 0 },
      { transform: 'scaleY(.08)', offset: .38 },
      { transform: 'scaleY(.08)', offset: .55 },
      { transform: 'scaleY(1)', offset: 1 }
    ], { duration: wink ? 380 : 180, easing: 'ease-in-out' }));
  }

  function scheduleBlink() {
    clearTimeout(blinkTimer);
    if (paused || !visible) return;
    blinkTimer = setTimeout(() => {
      if (!reacting) blink();
      scheduleBlink();
    }, 4200 + Math.random() * 4600);
  }

  function settle() {
    clearTimeout(resetTimer);
    cancelAnimationFrame(mouthFrame);
    activeAnimations.forEach(animation => animation.cancel());
    activeAnimations = [];
    reacting = false;
    gaze.setAttribute('transform', 'translate(0 0)');
    setMouth(baseMouth);
    faceController.set(baseExpression,{animate:false});
  }

  function syncMotion() {
    phone.dataset.motion = paused ? 'paused' : 'full';
    phone.dataset.running = String(visible);
    toggle.setAttribute('aria-pressed', String(paused));
    const label = paused ? 'Resume ambient motion' : 'Pause ambient motion';
    toggle.setAttribute('aria-label', label);
    toggle.title = label;
    if (paused || !visible) settle();
    scheduleBlink();
  }

  function react() {
    clearTimeout(resetTimer);
    clearTimeout(blinkTimer);
    activeAnimations.forEach(animation => animation.cancel());
    activeAnimations = [];
    reacting = true;
    reactionCount++;
    const gentle = ['tired','concerned'].includes(phone.querySelector('.fl-hero').dataset.mood);
    gaze.setAttribute('transform', 'translate(0 0)');
    announcement.textContent = gentle ? 'Right here with you.' : reactionCount % 2 ? 'A little hello from FitLens.' : 'Right here with you.';
    faceController.set(gentle ? 'calm' : 'energized',{animate:false});
    // Always acknowledge a deliberate tap, even with ambient motion paused.
    morphMouth(gentle ? expressions.calm : delighted, 190);
    if (!paused && visible) {
      blink(!gentle && reactionCount % 2 === 0);
      animate(face, [
        { transform: 'rotate(-4deg) scale(1)' },
        { transform: 'rotate(5deg) scale(1.045)', offset: .38 },
        { transform: 'rotate(-7deg) scale(.99)', offset: .75 },
        { transform: 'rotate(-4deg) scale(1)' }
      ], { duration: 680, easing: 'cubic-bezier(.2,.7,.3,1)' });
      animate(halo, [{ opacity: .74 }, { opacity: .94, offset: .35 }, { opacity: .74 }], { duration: 950 });
      if (!gentle) face.querySelectorAll('.fl-face-spark').forEach((spark, index) => animate(spark, [
        { opacity: 0, transform: 'translateY(8px) scale(.5) rotate(-15deg)' },
        { opacity: .95, transform: 'translateY(-3px) scale(1) rotate(0)', offset: .35 },
        { opacity: 0, transform: 'translateY(-18px) scale(.85) rotate(12deg)' }
      ], { duration: 800, delay: index * 90, fill: 'none', easing: 'ease-out' }));
    }
    resetTimer = setTimeout(() => {
      faceController.set(baseExpression,{animate:!paused,duration:420});
      reacting = false;
      scheduleBlink();
    }, paused ? 500 : 950);
  }
  face.addEventListener('click', react);
  face.addEventListener('pointermove', event => {
    if (paused || reacting || event.pointerType === 'touch') return;
    const rect = face.getBoundingClientRect();
    const x = Math.max(-3, Math.min(3, (event.clientX - rect.left - rect.width / 2) / 22));
    const y = Math.max(-2, Math.min(2, (event.clientY - rect.top - rect.height / 2) / 22));
    gaze.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
  });
  face.addEventListener('pointerleave', () => gaze.setAttribute('transform', 'translate(0 0)'));
  face.addEventListener('blur', () => gaze.setAttribute('transform', 'translate(0 0)'));
  toggle.addEventListener('click', () => {
    paused = !paused;
    try { sessionStorage.setItem('fitlens:home-motion', paused ? 'paused' : 'full'); } catch {}
    syncMotion();
    announcement.textContent = paused ? 'Ambient motion paused.' : 'Ambient motion resumed.';
  });

  // Carry only the chosen expression and activity type across pages in this
  // demo tab. Free-text reflections and body-area details stay on their page.
  function applyLatestCheckIn() {
    let checkin;
    try { checkin = JSON.parse(sessionStorage.getItem('fitlens:last-check-in')); } catch { return; }
    if (!checkin || !['walk', 'workout'].includes(checkin.kind) ||
      new Date(checkin.at).toDateString() !== new Date().toDateString()) return;
    const moods = {
      content: ['content', 'A little movement.', 'A moment well spent.', 'Content'],
      calm: ['calm', 'Your own pace.', 'Room to recharge.', 'Calm'],
      waiting: ['waiting', 'A fresh start.', 'One step at a time.', 'Getting started'],
      exhausted: ['exhausted', 'That took a lot.', 'Time to recover.', 'Spent'],
      tired: ['tired', 'A little movement.', 'Time to unwind.', 'Tired'],
      okay: ['content', 'Your own pace.', 'Your own day.', 'Okay'],
      good: ['happy', 'Good steps.', 'A brighter day.', 'Good'],
      energized: ['happy', 'A little movement.', 'A little more spark.', 'Energized'],
      concerned: ['concerned', 'A moment to pause.', 'We’re listening.', 'Body note added']
    };
    const mood = moods[checkin.expression];
    if (!Array.isArray(mood)) return;
    phone.querySelector('.fl-hero').dataset.mood = mood[0];
    phone.dataset.checkinKind = checkin.kind;
    baseExpression=mood[0];
    baseMouth = expressions[baseExpression];
    setMouth(baseMouth);
    faceController.set(baseExpression,{animate:false});
    svg.querySelector('title').textContent = `FitLens reflects your latest check-in: ${mood[3]}`;
    const headline = document.querySelector('#home-headline');
    headline.replaceChildren(document.createTextNode(checkin.kind === 'workout' && checkin.expression !== 'concerned' ? 'A little movement.' : mood[1]), document.createElement('br'));
    const accent = document.createElement('span');
    accent.textContent = mood[2];
    headline.append(accent);
    const link = document.querySelector('#home-last-checkin');
    const routine = ['upper','lower','full'].includes(checkin.routine) ? checkin.routine : 'upper';
    link.href = checkin.kind === 'walk' ? 'post-walk-restored.html?v=home-motion-5' : `workout-review.html?routine=${routine}&v=home-motion-5`;
    document.querySelector('#home-checkin-label').textContent = checkin.kind === 'walk' ? `${mood[3]} · Latest walk check-in` : 'Latest workout check-in';
    link.hidden = false;
  }
  const content = document.querySelector('#home-scroll');
  content.addEventListener('scroll', () => { phone.dataset.scrolled = String(content.scrollTop > 8); }, {passive:true});
  applyLatestCheckIn();
  syncMotion();
  document.addEventListener('visibilitychange', () => {
    visible = !document.hidden;
    syncMotion();
  });
  // Stop hidden-page work and restore cleanly when navigating back with bfcache.
  window.addEventListener('pagehide', () => { visible = false; syncMotion(); });
  window.addEventListener('pageshow', () => {
    visible = !document.hidden;
    applyLatestCheckIn();
    syncMotion();
  });
})();
