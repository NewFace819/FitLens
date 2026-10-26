'use strict';
// Local UI study. Only the latest expression is retained within this demo tab for Home.
const $ = selector => document.querySelector(selector);
const phone = $('.review-phone');
// The user explicitly requested full motion for this design demo.
// Keep the override local to this page; never change browser or OS preferences.
let fullMotionPreview = true;
const reducedMotion = { get matches() { return !fullMotionPreview; } };
phone.dataset.motion = 'full';
const reviewFace=FitLensFace.mount($('.review-face'),{expression:'happy',allowMotion:()=>!reducedMotion.matches});
const sessions = {
  upper: { name: 'Upper Body', minutes: 48, exercises: ['Bench Press', 'Lat Pulldown', 'Seated Row', 'Shoulder Press', 'Lateral Raise', 'Triceps Pushdown'] },
  lower: { name: 'Lower Body', minutes: 46, exercises: ['Goblet Squat', 'Romanian Deadlift', 'Leg Press', 'Leg Curl', 'Calf Raise'] },
  full: { name: 'Full Body', minutes: 56, exercises: ['Goblet Squat', 'Bench Press', 'Romanian Deadlift', 'Lat Pulldown', 'Shoulder Press', 'Seated Row', 'Lateral Raise'] }
};
const routineKey = new URLSearchParams(location.search).get('routine');
const session = sessions[routineKey] || sessions.upper;
$('#session-name').textContent = session.name;
$('#stat-duration').replaceChildren(document.createTextNode(session.minutes), Object.assign(document.createElement('span'), { textContent: ' min' }));
$('#stat-exercises').textContent = session.exercises.length;
$('#stat-sets').textContent = session.exercises.length * 3;
const effortLevels = [
  ['Almost effortless', 'Gentle movement. Breathing feels natural and easy.', '#acd0d7', '#dce9df', '#a4c9cc'],
  ['Very light', 'Comfortable and relaxed. Plenty of energy left.', '#a7ccca', '#dce8d7', '#aacbc4'],
  ['Light', 'A little effort. You could comfortably do more.', '#b5cda6', '#e1e9cb', '#b7cbaa'],
  ['Steady', 'Your breathing picked up. Still comfortably in control.', '#c9ce99', '#e7e9ce', '#d0ce8e'],
  ['Moderate', 'A steady effort. You worked, with room to keep going.', '#e3c47d', '#dce4be', '#e9cc7a'],
  ['Hard', 'Challenging, but controlled. Your muscles felt the work.', '#e8b47f', '#ece0c7', '#e7b781'],
  ['Very hard', 'Heavy breathing. Those last sets took real focus.', '#e6a07c', '#f0d5bf', '#e8a173'],
  ['Intense', 'A demanding session. You had very little left to give.', '#d7958b', '#ebc6c0', '#d99687'],
  ['Extremely hard', 'Close to your limit. Keeping going took a lot of effort.', '#df9378', '#f0c6a9', '#c18da3'],
  ['All-out', 'Your highest effort. You couldn’t have pushed any harder.', '#dc7764', '#e9b39b', '#a497c8']
];
const mouths = {
  easy: 'M65 76 C78 78 93 87 110 88 C128 88 143 79 155 75 C151 97 133 109 111 109 C89 109 70 96 65 76Z',
  happy: 'M65 76 C76 64 89 76 108 77 C129 79 145 65 155 75 C165 91 144 114 113 113 C85 113 61 94 65 76Z',
  hard: 'M79 79 C89 68 99 74 110 75 C122 76 134 69 142 80 C151 94 133 116 113 116 C93 116 70 96 79 79Z',
  intense: 'M94 84 C94 74 102 68 111 69 C121 69 131 76 131 87 C132 100 124 114 113 114 C102 114 93 99 94 84Z',
  worried: 'M76 99 C87 88 99 83 111 83 C123 83 136 89 145 100 C133 100 121 94 111 94 C100 94 88 99 76 99Z'
};
let faceAnimation = 0;
function morphPath(element, next) {
  // Same SVG command topology in every expression gives smooth, interruptible morphs.
  const previous = element.getAttribute('d');
  const from = previous.match(/-?\d+(?:\.\d+)?/g).map(Number);
  const to = next.match(/-?\d+(?:\.\d+)?/g).map(Number);
  if (reducedMotion.matches || from.length !== to.length) { element.setAttribute('d', next); return () => {}; }
  return progress => { let i = 0; element.setAttribute('d', next.replace(/-?\d+(?:\.\d+)?/g, () => { const index = i++; return (from[index] + (to[index] - from[index]) * progress).toFixed(2); })); };
}
let hasDiscomfort = false;
let selectedRegions = new Set();
let draftRegions = new Set();
const regionFeedback = new Map();
function blendPath(from, to, amount) {
  const a = from.match(/-?\d+(?:\.\d+)?/g).map(Number);
  let i = 0;
  return to.replace(/-?\d+(?:\.\d+)?/g, number => { const index = i++; return (a[index] + (Number(number) - a[index]) * amount).toFixed(2); });
}
function effortExpression(value) {
  // Intermediate expressions avoid sudden jumps at category boundaries.
  const anchors = [
    { value: 1, mouth: mouths.easy, left: 'M37 43 Q47 54 57 43', right: 'M162 47 Q172 58 182 47' },
    { value: 5, mouth: mouths.happy, left: 'M46 43 Q47 45 48 43', right: 'M171 47 Q172 49 173 47' },
    { value: 7, mouth: mouths.hard, left: 'M42 43 Q47 46 52 43', right: 'M167 47 Q172 50 177 47' },
    { value: 10, mouth: mouths.intense, left: 'M37 43 Q47 48 57 43', right: 'M162 47 Q172 52 182 47' }
  ];
  const end = anchors.findIndex(anchor => anchor.value >= value);
  const b = anchors[end], a = anchors[Math.max(0, end - 1)];
  const t = a === b ? 0 : (value - a.value) / (b.value - a.value);
  return { mouth: blendPath(a.mouth, b.mouth, t), left: blendPath(a.left, b.left, t), right: blendPath(a.right, b.right, t) };
}
function updateFace() {
  const value = Number($('#effort').value), level = effortLevels[value - 1];
  const state = value <= 3 ? 'easy' : value <= 5 ? 'happy' : value <= 7 ? 'hard' : 'intense';
  phone.dataset.effort = value <= 3 ? 'light' : value <= 5 ? 'moderate' : value <= 7 ? 'hard' : 'intense';
  phone.dataset.pain = String(hasDiscomfort);
  const painReported = hasDiscomfort && [...selectedRegions].some(id => regionFeedback.get(id)?.symptom === 'Pain');
  phone.style.setProperty('--core', hasDiscomfort ? (painReported ? '#e89487' : '#e6ae98') : level[2]);
  phone.style.setProperty('--edge', hasDiscomfort ? '#f0d0bc' : level[3]);
  phone.style.setProperty('--blush', hasDiscomfort ? '#d58d7d' : '#d99478');
  $('#effort').style.setProperty('--thumb', level[4]);
  $('.effort-control').style.setProperty('--thumb-position', `${(value - 1) / 9 * 100}%`);
  $('.effort-control').style.setProperty('--thumb-color', level[4]);
  $('#effort-name').textContent = level[0];
  $('#effort-number').value = value;
  $('#finish-context').textContent = `${level[0]} effort · ${hasDiscomfort ? 'Body notes added' : 'Your moment to reflect'}`;
  $('#effort-description').textContent = level[1];
  $('#effort').setAttribute('aria-valuetext', `${value} out of 10, ${level[0]}. ${level[1]}`);
  $('#hero-caption').textContent = hasDiscomfort ? 'Let’s give your body a little care.' : value >= 8 ? 'That took a lot. Take a breath.' : 'Take a breath. Let’s check in.';
  const mascotExpression=hasDiscomfort?'concerned':value<=3?'content':value<=5?'happy':value<=7?'energized':value<=9?'tired':'exhausted';
  reviewFace.set(mascotExpression,{animate:!reducedMotion.matches,duration:360});
  const comparison = value < 4 ? 'below' : value > 6 ? 'above' : 'within';
  $('#usual-status').textContent = `${comparison === 'below' ? 'Below' : comparison === 'above' ? 'Above' : 'Within'} usual range`;
  $('#usual-status').dataset.comparison = comparison;

}
$('#effort').addEventListener('input', updateFace);
const slider = $('#effort'), effortControl = $('.effort-control');
const trackShapes = {
  resting: 'M12 29 Q12 25 20 25 L305 25 Q315 25 315 29 L315 29 Q315 33 305 33 L20 33 Q12 33 12 29Z',
  held: 'M12 29 Q12 24 20 24 L305 5 Q315 4 315 14 L315 44 Q315 54 305 53 L20 34 Q12 34 12 29Z'
};
let trackAnimation = 0;
function setSliderHeld(held) {
  effortControl.classList.toggle('is-held', held);
  cancelAnimationFrame(trackAnimation);
  const draw = morphPath($('#effort-track'), trackShapes[held ? 'held' : 'resting']);
  if (reducedMotion.matches) return;
  const start = performance.now();
  function tick(now) { const t = Math.min(1, (now - start) / 480); draw(1 - Math.pow(1 - t, 3)); if (t < 1) trackAnimation = requestAnimationFrame(tick); }
  trackAnimation = requestAnimationFrame(tick);
}
slider.addEventListener('pointerdown', event => { if (event.button !== 0) return; slider.setPointerCapture(event.pointerId); setSliderHeld(true); });
for (const event of ['pointerup', 'pointercancel', 'lostpointercapture', 'blur']) slider.addEventListener(event, () => setSliderHeld(false));
const sliderKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'];
slider.addEventListener('keydown', event => { if (sliderKeys.includes(event.key)) setSliderHeld(true); });
slider.addEventListener('keyup', event => { if (sliderKeys.includes(event.key)) setSliderHeld(false); });
$('#as-usual').addEventListener('click', () => { slider.value = '5'; updateFace(); $('#review-announcement').textContent = 'Effort set to your demo usual level, 5 out of 10.'; });
function setDiscomfort(value) {
  hasDiscomfort = value;
  $('#has-pain').classList.toggle('has-notes', value && selectedRegions.size > 0);
  $('#discomfort-action').textContent = value && selectedRegions.size ? `${selectedRegions.size} ${selectedRegions.size === 1 ? 'area' : 'areas'} noted · Edit` : 'Add an area';
  $('#discomfort-panel').hidden = !value;
  updateFace();
}
$('#has-pain').addEventListener('click', () => { setDiscomfort(true); $('#open-body').click(); });
$('#clear-discomfort').addEventListener('click', () => {
  selectedRegions.clear(); regionFeedback.clear(); renderRegionReviews(); setDiscomfort(false);
  $('#has-pain').focus({ preventScroll: true });
  $('#review-announcement').textContent = 'Body notes cleared.';
});
function placeDialog(dialog) {
  if (dialog.id === 'help-dialog') return;
  const rect = phone.getBoundingClientRect();
  Object.assign(dialog.style, { left: `${rect.left}px`, width: `${rect.width}px`, bottom: `${Math.max(0, innerHeight - rect.bottom)}px` });
  if (dialog.id === 'saved-dialog') dialog.style.bottom = `${Math.max(16, innerHeight - rect.bottom + 24)}px`;
}
let helpOpener = null;
let helpClosing = false;
const helpInertBefore = new Map();
function openDialog(dialog) {
  if (dialog.id === 'help-dialog') {
    if (!dialog.hidden) return;
    helpOpener = document.activeElement;
    helpClosing = false;
    dialog.classList.remove('is-closing');
    $('#help-backdrop').classList.remove('is-closing');
    for (const child of phone.children) {
      if (child === dialog || child.id === 'help-backdrop') continue;
      helpInertBefore.set(child, child.inert);
      child.inert = true;
    }
    $('#help-backdrop').hidden = false;
    dialog.hidden = false;
    $('.help-sheet-scroll').scrollTop = 0;
    dialog.focus({ preventScroll: true });
    return;
  }
  placeDialog(dialog); dialog.showModal(); dialog.scrollTop = 0;
}
function closeDialog(dialog) {
  if (dialog.id !== 'help-dialog') { dialog.close(); return; }
  if (helpClosing || dialog.hidden) return;
  helpClosing = true;
  function finish() {
    dialog.hidden = true; $('#help-backdrop').hidden = true;
    dialog.classList.remove('is-closing'); $('#help-backdrop').classList.remove('is-closing');
    for (const [child, previous] of helpInertBefore) child.inert = previous;
    helpInertBefore.clear(); helpClosing = false;
    helpOpener?.focus({ preventScroll: true });
  }
  if (reducedMotion.matches) { finish(); return; }
  dialog.classList.add('is-closing'); $('#help-backdrop').classList.add('is-closing');
  const end = event => { if (event.target !== dialog || event.animationName !== 'help-lower') return; dialog.removeEventListener('animationend', end); finish(); };
  dialog.addEventListener('animationend', end);
}
window.addEventListener('resize', () => document.querySelectorAll('dialog[open]').forEach(placeDialog));
document.querySelectorAll('.close-dialog').forEach(button => button.addEventListener('click', () => closeDialog(button.closest('dialog, [role="dialog"]'))));
$('#help-backdrop').addEventListener('click', () => closeDialog($('#help-dialog')));
$('#help-dialog').addEventListener('keydown', event => {
  if (event.key === 'Escape') { event.preventDefault(); closeDialog($('#help-dialog')); }
  if (event.key !== 'Tab') return;
  const targets = [...$('#help-dialog').querySelectorAll('button, a[href], input, select, textarea, [tabindex="0"]')].filter(element => !element.disabled);
  const first = targets[0], last = targets.at(-1);
  if (event.shiftKey && (document.activeElement === first || document.activeElement === $('#help-dialog'))) { event.preventDefault(); last.focus({ preventScroll: true }); }
  else if (!event.shiftKey && (document.activeElement === last || document.activeElement === $('#help-dialog'))) { event.preventDefault(); first.focus({ preventScroll: true }); }
});
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target !== dialog) return; const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); }));
$('#effort-help').addEventListener('click', () => openDialog($('#help-dialog')));
$('#motion-toggle').addEventListener('click', () => {
  fullMotionPreview = !fullMotionPreview;
  phone.dataset.motion = fullMotionPreview ? 'full' : 'reduced';
  $('#motion-toggle').setAttribute('aria-checked', String(fullMotionPreview));
  setSliderHeld(false);
  updateFace();
});
const regionNames = {
  leftShoulder: 'Left shoulder', rightShoulder: 'Right shoulder', chest: 'Chest', abdomen: 'Abdomen',
  leftArm: 'Left arm', rightArm: 'Right arm', leftHip: 'Left hip', rightHip: 'Right hip',
  leftThigh: 'Left thigh', rightThigh: 'Right thigh', leftKnee: 'Left knee', rightKnee: 'Right knee',
  leftLowerLeg: 'Left lower leg', rightLowerLeg: 'Right lower leg', upperBack: 'Upper back', lowerBack: 'Lower back', neck: 'Neck', leftFoot: 'Left foot / ankle', rightFoot: 'Right foot / ankle'
};
const frontRegions = [
  ['rightShoulder', 94, 91, 16, 19], ['leftShoulder', 166, 91, 16, 19], ['chest', 130, 105, 24, 20], ['abdomen', 130, 151, 23, 24],
  ['rightArm', 78, 151, 13, 40], ['leftArm', 182, 151, 13, 40], ['rightHip', 112, 200, 14, 17], ['leftHip', 148, 200, 14, 17],
  ['rightThigh', 112, 242, 14, 25], ['leftThigh', 148, 242, 14, 25], ['rightKnee', 110, 280, 13, 13], ['leftKnee', 150, 280, 13, 13],
  ['rightLowerLeg', 107, 316, 12, 24], ['leftLowerLeg', 153, 316, 12, 24], ['neck', 130, 64, 12, 12], ['rightFoot', 103, 352, 16, 14], ['leftFoot', 157, 352, 16, 14]
];
let bodyView = 'front';
function renderBodyMap() {
  const regions = bodyView === 'front' ? frontRegions : frontRegions.filter(r => !['chest', 'abdomen'].includes(r[0])).map(([id, x, y, rx, ry]) => [id, 260 - x, y, rx, ry]).concat([['upperBack', 130, 108, 24, 28], ['lowerBack', 130, 158, 24, 20]]);
  $('#body-hotspots').replaceChildren(); $('#region-buttons').replaceChildren();
  for (const [id, cx, cy, rx, ry] of regions) {
    const ellipse = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    for (const [key, value] of Object.entries({ cx, cy, rx, ry, role: 'button', tabindex: '0', 'aria-label': regionNames[id], 'aria-pressed': String(draftRegions.has(id)), class: 'body-region' })) ellipse.setAttribute(key, value);
    ellipse.dataset.region = id;
    ellipse.addEventListener('click', () => toggleRegion(id));
    ellipse.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleRegion(id); } });
    $('#body-hotspots').append(ellipse);
    const button = document.createElement('button'); button.type = 'button'; button.textContent = regionNames[id]; button.dataset.region = id; button.setAttribute('aria-pressed', String(draftRegions.has(id))); button.classList.toggle('selected', draftRegions.has(id)); button.addEventListener('click', () => toggleRegion(id)); $('#region-buttons').append(button);
  }
  $('.body-orientation').firstChild.textContent = bodyView === 'front' ? 'YOUR RIGHT ' : 'YOUR LEFT ';
  $('.body-orientation span').textContent = bodyView === 'front' ? 'YOUR LEFT' : 'YOUR RIGHT';
  updateRegionSelection();
}
function toggleRegion(id) { draftRegions.has(id) ? draftRegions.delete(id) : draftRegions.add(id); updateRegionSelection(); }
function updateRegionSelection() {
  document.querySelectorAll('[data-region]').forEach(element => { const selected = draftRegions.has(element.dataset.region); element.setAttribute('aria-pressed', String(selected)); element.classList.toggle('selected', selected); });
  $('#selection-count').textContent = draftRegions.size ? `${draftRegions.size} ${draftRegions.size === 1 ? 'area' : 'areas'} selected` : 'No areas selected';
}
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => { bodyView = button.dataset.view; document.querySelectorAll('[data-view]').forEach(b => { b.classList.toggle('selected', b === button); b.setAttribute('aria-pressed', String(b === button)); }); renderBodyMap(); }));
$('#open-body').addEventListener('click', () => { draftRegions = new Set(selectedRegions); renderBodyMap(); openDialog($('#body-dialog')); });
$('#confirm-body').addEventListener('click', () => { selectedRegions = new Set(draftRegions); renderRegionReviews(); setDiscomfort(selectedRegions.size > 0); $('#body-dialog').close(); });
$('#body-dialog').addEventListener('close', () => { if (!selectedRegions.size) setDiscomfort(false); });
function renderRegionReviews() {
  $('#region-summary').textContent = selectedRegions.size ? [...selectedRegions].map(id => regionNames[id]).join(' · ') : 'Choose an area';
  $('#region-reviews').replaceChildren();
  for (const id of selectedRegions) {
    if (!regionFeedback.has(id)) regionFeedback.set(id, { symptom: '', exercise: '' });
    const data = regionFeedback.get(id), card = document.createElement('div'); card.className = 'region-card';
    const title = document.createElement('h3'); title.textContent = regionNames[id]; card.append(title);
    const choices = document.createElement('div'); choices.className = 'symptom-choices'; choices.setAttribute('role', 'group'); choices.setAttribute('aria-label', `${regionNames[id]} sensation`);
    const note = document.createElement('p'); note.className = 'pain-note'; note.textContent = 'Avoid pushing through pain. If it persists, seek professional advice.'; note.hidden = data.symptom !== 'Pain';
    for (const symptom of ['Tightness', 'Soreness', 'Pain', 'Hard to describe']) {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = symptom; b.classList.toggle('selected', data.symptom === symptom); b.setAttribute('aria-pressed', String(data.symptom === symptom));
      b.addEventListener('click', () => { data.symptom = data.symptom === symptom ? '' : symptom; [...choices.children].forEach(c => { c.classList.toggle('selected', c.textContent === data.symptom); c.setAttribute('aria-pressed', String(c.textContent === data.symptom)); }); note.hidden = data.symptom !== 'Pain'; updateFace(); }); choices.append(b);
    }
    card.append(choices);
    const label = document.createElement('label'); label.htmlFor = `related-${id}`; label.textContent = 'Related exercise · optional';
    const select = document.createElement('select'); select.id = `related-${id}`;
    for (const name of ['', ...session.exercises, 'Not sure']) select.add(new Option(name || 'Choose an exercise', name));
    select.value = data.exercise; select.addEventListener('change', () => { data.exercise = select.value; });
    card.append(label, select, note); $('#region-reviews').append(card);
  }
}
for (const [index, name] of session.exercises.entries()) {
  const row = document.createElement('div'); row.className = 'exercise-feedback-row'; const label = document.createElement('label'); label.htmlFor = `exercise-feedback-${index}`; label.textContent = name;
  const select = document.createElement('select'); select.id = label.htmlFor; select.dataset.exercise = name;
  for (const text of ['No changes', 'Hard to keep good form', 'Too demanding', 'Could use more challenge', 'Would like an alternative']) select.add(new Option(text, text));
  row.append(label, select); $('#exercise-feedback').append(row);
}
$('#save-review').addEventListener('click', () => {
  if (hasDiscomfort && !selectedRegions.size) { $('#review-announcement').textContent = 'Choose an area, or close the body map to leave it out.'; $('#open-body').click(); return; }
  const rating = effortLevels[Number($('#effort').value) - 1][0];
  const chosenEffort = Number($('#effort').value);
  try { sessionStorage.setItem('fitlens:last-check-in', JSON.stringify({ kind:'workout', routine:routineKey || 'upper', expression:hasDiscomfort?'concerned':chosenEffort===10?'exhausted':chosenEffort>=8?'tired':chosenEffort>=6?'good':'content', at:Date.now() })); } catch {}
  const areas = hasDiscomfort ? [...selectedRegions].map(id => { const feedback = regionFeedback.get(id); return `${regionNames[id]}${feedback?.symptom ? ` (${feedback.symptom.toLowerCase()})` : ''}`; }).join(', ') : 'No discomfort reported';
  const changes = [...document.querySelectorAll('[data-exercise]')].filter(select => select.value !== 'No changes').length;
  $('#saved-description').textContent = `${session.name} · ${rating} effort. ${areas}.${changes ? ` Feedback added for ${changes} ${changes === 1 ? 'exercise' : 'exercises'}.` : ''}${$('#session-note').value.trim() ? ' Your note is included.' : ''}`;
  openDialog($('#saved-dialog'));
});
$('#skip').addEventListener('click', () => { $('#saved-title').textContent = 'Your session counts.'; $('#saved-description').textContent = 'You can take a moment to reflect another time.'; openDialog($('#saved-dialog')); });
$('#saved-dialog').addEventListener('close', () => { $('#saved-title').textContent = 'A moment well spent.'; });
$('#session-note').addEventListener('input', () => {
  const note = $('#session-note').value.trim();
  $('#note-summary-title').textContent = note ? 'A thought for next time' : 'Anything worth remembering?';
  $('#note-summary-caption').textContent = note ? note.slice(0, 72) + (note.length > 72 ? '…' : '') : 'A thought for your next session';
});
updateFace();
