/* Fictional training-year data for the design prototype.
   No personal history, routes, cardio estimates or daily steps are read. */
(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const phone = $('.year-phone');
  const stage = $('#stage');
  const scenes = [...document.querySelectorAll('.scene')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const themes = [
    ['#ed7853','#243f38','#fff0cb'], ['#e5e9d8','#29483b','#a56549'],
    ['#214f48','#fff0cb','#e8cf83'], ['#f0ddc9','#29483b','#8c5b49'],
    ['#dcd6e8','#293b42','#766085'], ['#a9bdc9','#243f38','#f7f1de'],
    ['#e6e5d6','#29483b','#b77455'], ['#214f48','#fff0cb','#e8cf83']
  ];
  const monthly = [4,5,6,4,7,6,5,7,8,7,6,7]; // 72 completed workouts
  const weeksWithTraining = new Set(Array.from({length:32},(_,i)=>Math.floor(i*51/31)));
  for(let i=0;i<52;i++){const dot=document.createElement('i');dot.className=weeksWithTraining.has(i)?'has-training':'';dot.style.setProperty('--i',i);document.querySelector('.year-week-grid').append(dot);}
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  monthly.forEach((value, i) => {
    const bar = document.createElement('div');
    bar.className = `month-bar${value === 8 ? ' peak' : ''}`;
    bar.style.cssText = `--value:${value};--i:${i}`;
    bar.title = `${months[i]}: ${value} activities`;
    bar.innerHTML = `<span>${months[i][0]}</span>`;
    $('.month-bars').append(bar);
  });
  $('.month-bars').setAttribute('aria-label', monthly.map((n, i) => `${months[i]}: ${n}`).join('; ') + ' workouts');
  let page = 0, elapsed = 0, lastTime = null, manualPause = false;
  let holding = false, pointer = null, holdTimer = 0, holdFired = false;
  let touchMoved = false, hasFocus = false;
  let bridgeAnimation = null, hasShown = false;
  const dialog = $('#data-dialog');
  const bars = scenes.map((scene, i) => {
    scene.setAttribute('role', 'group');
    scene.setAttribute('aria-roledescription', 'slide');
    scene.setAttribute('aria-label', `${i + 1} of ${scenes.length}: ${scene.dataset.title}`);
    scene.querySelectorAll('.enter').forEach((element, j) => element.style.setProperty('--order', Math.min(j, 5)));
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', `Chapter ${i + 1}: ${scene.dataset.title}`);
    button.innerHTML = '<i></i>';
    button.addEventListener('click', () => show(i));
    $('.progress').append(button);
    return button;
  });

  function isPaused() {
    return manualPause || holding || hasFocus || dialog.open || document.hidden;
  }
  function syncPause() {
    phone.classList.toggle('is-paused', isPaused());
    if (bridgeAnimation && bridgeAnimation.playState !== 'finished') {
      if (isPaused()) bridgeAnimation.pause(); else bridgeAnimation.play();
    }
    lastTime = null;
  }
  function show(next) {
    if (next < 0 || next >= scenes.length) return;
    if (bridgeAnimation) { bridgeAnimation.cancel(); bridgeAnimation = null; }
    stage.querySelectorAll('[data-ghost]').forEach(el => el.remove());
    const previous = page;
    let ghost = null;
    if (hasShown && next !== previous && !reduced.matches) {
      ghost = scenes[previous].cloneNode(true);
      ghost.removeAttribute('id');
      ghost.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
      ghost.classList.add('scene-ghost');
      ghost.dataset.ghost = '';
      ghost.setAttribute('aria-hidden', 'true');
      ghost.inert = true;
      themes[previous].forEach((color, i) => ghost.style.setProperty(['--bg', '--ink', '--accent'][i], color));
      stage.append(ghost);
    }
    const direction = next < page ? -1 : 1;
    page = next;
    elapsed = 0;
    lastTime = null;
    scenes.forEach((scene, i) => {
      scene.hidden = i !== page;
      scene.classList.remove('is-active', 'is-entering', 'reverse');
      scene.inert = i !== page;
    });
    const scene = scenes[page];
    void scene.offsetWidth;
    scene.classList.add('is-active', 'is-entering');
    if (direction < 0) scene.classList.add('reverse');
    if (ghost) {
      scene.style.zIndex = '5';
      const origin = direction > 0 ? '100%' : '0%';
      bridgeAnimation = scene.animate([
        { clipPath: `ellipse(140% 0% at 50% ${origin})` },
        { clipPath: `ellipse(140% 160% at 50% ${origin})` }
      ], { duration: 720, easing: 'cubic-bezier(.65,0,.2,1)' });
      bridgeAnimation.finished.then(() => { ghost.remove(); scene.style.zIndex = ''; }).catch(() => { ghost.remove(); scene.style.zIndex = ''; });
    }
    hasShown = true;
    themes[page].forEach((color, i) => phone.style.setProperty(['--bg', '--ink', '--accent'][i], color));
    document.querySelector('meta[name="theme-color"]').content = themes[page][0];
    bars.forEach((button, i) => {
      button.classList.toggle('is-current', i === page);
      button.classList.toggle('is-done', i < page);
      if (i === page) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
      button.firstElementChild.style.width = i < page || i === page ? '100%' : '0%';
    });
    $('#prev').disabled = page === 0;
    $('#next').disabled = page === scenes.length - 1;
    $('#page-number').textContent = `${String(page + 1).padStart(2, '0')} / ${String(scenes.length).padStart(2,'0')}`;
    $('#announcement').textContent = `Chapter ${page + 1} of ${scenes.length}. ${scene.dataset.title}.`;
    renderCounters(reduced.matches ? 1 : 0);
    syncPause();
  }
  function renderCounters(progress) {
    const amount = 1 - (1 - Math.max(0, Math.min(1, progress))) ** 3;
    scenes[page].querySelectorAll('[data-count]').forEach(el => {
      el.textContent = Math.round(Number(el.dataset.count) * amount).toLocaleString('en-US');
    });
  }
  function tick(now) {
    if (!isPaused()) {
      if (lastTime !== null) elapsed += Math.min(now - lastTime, 80);
      lastTime = now;
      if (elapsed <= 1800) renderCounters(reduced.matches ? 1 : (elapsed - 180) / 1450);
    } else lastTime = null;
    requestAnimationFrame(tick);
  }
  $('#prev').addEventListener('click', () => show(page - 1));
  $('#next').addEventListener('click', () => show(page + 1));
  $('[data-next]').addEventListener('click', () => show(page + 1));
  $('#restart').addEventListener('click', () => show(0));

  // Tap left/right, swipe horizontally, or hold to pause. Controls never trigger navigation.
  const interactive = target => Boolean(target.closest('button,a,input,dialog'));
  stage.addEventListener('pointerdown', event => {
    if (interactive(event.target) || (event.pointerType === 'mouse' && event.button !== 0)) return;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, time: performance.now() };
    touchMoved = false; holdFired = false;
    stage.setPointerCapture(event.pointerId);
    holdTimer = setTimeout(() => { holding = true; holdFired = true; syncPause(); }, 220);
  });
  stage.addEventListener('pointermove', event => {
    if (!pointer || event.pointerId !== pointer.id) return;
    if (Math.abs(event.clientX - pointer.x) > 12 || Math.abs(event.clientY - pointer.y) > 12) {
      clearTimeout(holdTimer);
      touchMoved = true;
    }
  });
  function releasePointer(event, cancelled = false) {
    if (!pointer || event.pointerId !== pointer.id) return;
    const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
    clearTimeout(holdTimer);
    holding = false;
    syncPause();
    const wasHold = holdFired;
    pointer = null;
    if (cancelled) return;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) show(page + (dx < 0 ? 1 : -1));
    else if (!wasHold && !touchMoved) {
      const bounds = stage.getBoundingClientRect();
      show(page + (event.clientX - bounds.left < bounds.width * .32 ? -1 : 1));
    }
  }
  stage.addEventListener('pointerup', event => releasePointer(event));
  stage.addEventListener('pointercancel', event => releasePointer(event, true));
  stage.addEventListener('lostpointercapture', () => {
    clearTimeout(holdTimer); pointer = null; holding = false; syncPause();
  });
  document.addEventListener('keydown', event => {
    if (dialog.open) return;
    if (event.key === 'Escape') { location.href = 'insights.html'; return; }
    if (event.target.closest('input,textarea,select')) return;
    if (event.key === 'ArrowLeft') { event.preventDefault(); show(page - 1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); show(page + 1); }
    if (event.code === 'Space' && !interactive(event.target)) { event.preventDefault(); manualPause = !manualPause; syncPause(); }
  });
  phone.addEventListener('focusin', event => {
    // Stop automatic navigation while a keyboard user is inspecting a control.
    hasFocus = event.target.matches(':focus-visible'); syncPause();
  });
  phone.addEventListener('focusout', () => { hasFocus = false; syncPause(); });
  document.addEventListener('visibilitychange', syncPause);
  reduced.addEventListener('change', () => { phone.classList.toggle('motion-reduced', reduced.matches); renderCounters(1); });
  $('#about').addEventListener('click', () => { dialog.showModal(); syncPause(); });
  dialog.querySelectorAll('.dialog-close,.dialog-done').forEach(button => button.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('close', syncPause);
  dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });

  const comparison = {
    bus: { number: '14', label: 'CITY BUSES', asset: 'city-bus', joke: 'No parking space required.', basis: 'Approx. 6,000 kg per bus · Volume = weight × reps.' },
    bear: { number: '468', label: 'BEARS', asset: 'bear', joke: 'A rather impressive bear hug.', basis: 'Approx. 180 kg per bear · Volume = weight × reps.' }
  };
  document.querySelectorAll('[data-unit]').forEach(button => button.addEventListener('click', () => {
    const unit = button.dataset.unit, item = comparison[unit];
    const scene = $('.strength-scene');
    if (scene.dataset.unit === unit) return;
    scene.dataset.unit = unit;
    document.querySelectorAll('.comparison-tabs button').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    $('#comparison-number').textContent = item.number;
    $('#comparison-label').textContent = item.label;
    $('#comparison-joke').textContent = item.joke;
    $('#comparison-basis').textContent = item.basis;
    const img = $('.weight-object');
    img.src = `assets/recap-year/${item.asset}.svg`;
    if (!reduced.matches) {
      img.style.animation = 'none'; void img.offsetWidth;
      img.style.animation = 'object-land .65s cubic-bezier(.16,1,.3,1) both';
    }
    $('#announcement').textContent = `84,200 kilograms of lifting volume. Approximately ${item.number} ${unit === 'bus' ? 'city buses' : 'bears'}. ${item.joke}`;
  }));

  // Export a composed, high-resolution PNG rather than a screenshot of the controls.
  async function loadIllustration(name) {
    const response = await fetch(`assets/recap-year/${name}.svg`);
    if (!response.ok) throw new Error('Illustration unavailable');
    const svg = await response.text();
    const img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    await img.decode();
    return img;
  }
  $('#save-poster').addEventListener('click', async () => {
    const button = $('#save-poster');
    button.disabled = true;
    button.textContent = 'Making your poster…';
    try {
      await document.fonts.ready;
      const [bus, bear, ticket] = await Promise.all(['city-bus', 'bear', 'cinema-ticket'].map(loadIllustration));
      const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1440;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#f7f1de'; ctx.fillRect(0, 0, 1080, 1440);
      ctx.fillStyle = '#29483b'; ctx.font = '900 28px Nunito'; ctx.fillText('F I T L E N S', 80, 100);
      ctx.font = '800 22px Nunito'; ctx.textAlign = 'right'; ctx.fillText('THONG’S YEAR', 1000, 100); ctx.textAlign = 'left';
      ctx.font = '1000 270px Nunito'; ctx.fillText('2025', 65, 375);
      const fit = (img, x, y, w, h) => { const r = Math.min(w / img.naturalWidth, h / img.naturalHeight); const iw = img.naturalWidth * r, ih = img.naturalHeight * r; ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih); };
      fit(bus, 360, 450, 650, 270);
      ctx.save(); ctx.translate(280, 595); ctx.rotate(-.18); fit(bear, -180, -150, 360, 300); ctx.restore();
      ctx.save(); ctx.translate(700, 445); ctx.rotate(.18); fit(ticket, -110, -80, 220, 160); ctx.restore();
      ctx.strokeStyle = '#29483b66'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(80, 810); ctx.lineTo(1000, 810); ctx.stroke();
      const stats = [['72', 'workouts'], ['54 h', 'in training'], ['864', 'working sets'], ['84,200 kg', 'lifting volume']];
      stats.forEach(([value, label], i) => {
        const x = 80 + (i % 2) * 490, y = 920 + Math.floor(i / 2) * 155;
        ctx.fillStyle = '#29483b'; ctx.font = '950 74px Nunito'; ctx.fillText(value, x, y);
        ctx.font = '600 29px Nunito'; ctx.fillText(label, x, y + 43);
      });
      ctx.beginPath(); ctx.moveTo(80, 1200); ctx.lineTo(1000, 1200); ctx.stroke();
      ctx.font = '850 34px Nunito'; ctx.fillText('Built one little day at a time.', 80, 1273);
      ctx.globalAlpha = .65; ctx.font = '700 19px Nunito'; ctx.fillText('ILLUSTRATIVE DEMO YEAR · FITLENS', 80, 1342);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Could not create image');
      const url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url; link.download = 'FitLens-2025-demo-poster.png'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      button.innerHTML = 'Poster saved <span>✓</span>';
      $('#announcement').textContent = 'Your demo recap poster has been downloaded as a PNG.';
    } catch {
      button.textContent = 'Couldn’t save — tap to retry';
      $('#announcement').textContent = 'Poster could not be saved. Please try again from the local preview server.';
    } finally { button.disabled = false; }
  });
  phone.classList.toggle('motion-reduced', reduced.matches);
  show(0);
  requestAnimationFrame(tick);
})();
