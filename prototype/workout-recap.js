'use strict';
// Illustrative completed sets for the recap preview, shared across all three routines.
const recapExerciseData = {
  'Bench Press': { reps: 10, weight: 40, main: ['chest'], support: ['shoulders', 'triceps'] },
  'Lat Pulldown': { reps: 10, weight: 30, main: ['back'], support: ['biceps'] },
  'Seated Row': { reps: 10, weight: 20, main: ['back'], support: ['biceps', 'shoulders'] },
  'Shoulder Press': { reps: 10, weight: 8, main: ['shoulders'], support: ['triceps'] },
  'Lateral Raise': { reps: 10, weight: 4, main: ['shoulders'], support: [] },
  'Triceps Pushdown': { reps: 12, weight: 5, main: ['triceps'], support: [] },
  'Goblet Squat': { reps: 10, weight: 16, main: ['quads', 'glutes'], support: ['core'] },
  'Romanian Deadlift': { reps: 10, weight: 40, main: ['hamstrings', 'glutes'], support: ['back', 'core'] },
  'Leg Press': { reps: 12, weight: 80, main: ['quads', 'glutes'], support: [] },
  'Leg Curl': { reps: 12, weight: 25, main: ['hamstrings'], support: [] },
  'Calf Raise': { reps: 15, weight: 30, main: ['calves'], support: [] }
};
const muscleLabels = { chest: 'Chest', back: 'Back', shoulders: 'Shoulders', biceps: 'Biceps', triceps: 'Triceps', core: 'Core', quads: 'Quads', hamstrings: 'Hamstrings', glutes: 'Glutes', calves: 'Calves' };
const muscleScores = Object.fromEntries(Object.keys(muscleLabels).map(id => [id, { score: 0, direct: 0, supporting: 0, exercises: [] }]));
let recapVolume = 0;
for (const name of session.exercises) {
  const exercise = recapExerciseData[name];
  if (!exercise) continue;
  recapVolume += exercise.weight * exercise.reps * 3;
  for (const [muscles, isMain] of [[exercise.main, true], [exercise.support, false]]) {
    for (const id of muscles) {
      const muscle = muscleScores[id];
      muscle.score += isMain ? 3 : 1.5;
      muscle[isMain ? 'direct' : 'supporting'] += 3;
      muscle.exercises.push({ name, isMain });
    }
  }
}
$('#volume-total').textContent = recapVolume.toLocaleString('en-US');
$('#bear-comparison').replaceChildren(document.createTextNode(`About ${Math.round(recapVolume / 180)} bears’ worth.`), document.createElement('br'), document.createTextNode('One rep at a time.'));
$('#time-comparison').replaceChildren(document.createTextNode(`≈ ${Math.round(session.minutes / 15)} quick matches.`), document.createElement('br'), document.createTextNode('Real-life level up.'));
for (let i = 0; i < session.exercises.length * 3; i++) $('#set-mosaic').append(document.createElement('i'));
const activeMuscles = Object.keys(muscleScores).filter(id => muscleScores[id].score > 0).sort((a, b) => muscleScores[b].score - muscleScores[a].score);
const leading = activeMuscles.slice(0, 3).map(id => muscleLabels[id].toLowerCase());
$('#muscle-intro').textContent = `${leading[0][0].toUpperCase() + leading[0].slice(1)}, ${leading[1]} & ${leading[2]} led the way.`;
const maxMuscleScore = Math.max(...Object.values(muscleScores).map(muscle => muscle.score));
const ns = 'http://www.w3.org/2000/svg';
function svgElement(tag, attributes = {}) {
  const element = document.createElementNS(ns, tag);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  return element;
}
// Carefully shaped vector anatomy, mirrored for visual symmetry. Muscles remain
// separate selectable paths; neutral parts provide landmarks without competing.
const anatomy = {
  chest: 'M88 83 C78 77 66 78 59 88 L58 106 C66 115 78 116 87 110Z',
  shoulders: 'M60 70 C46 70 40 84 40 103 L54 103 C54 88 59 83 65 81Z',
  biceps: 'M42 108 C36 121 34 138 34 151 L43 153 C50 137 53 121 51 108Z',
  triceps: 'M43 108 C35 116 33 136 33 149 L43 154 C48 143 53 121 52 108Z',
  core: 'M86 119 L74 116 Q73 143 80 162 L87 169Z',
  quads: 'M65 211 C60 234 65 260 69 279 Q77 286 82 277 L85 224 L78 214Z',
  hamstrings: 'M65 218 C61 235 66 263 70 282 L81 279 L85 231Z',
  glutes: 'M64 181 C57 195 59 210 65 218 C74 223 86 220 89 211 L89 184Z',
  calves: 'M68 300 C65 316 68 335 74 347 L79 348 C85 330 84 312 80 301Z',
  backUpper: 'M80 64 L89 70 L89 115 C76 114 66 98 60 83 L65 74Z',
  backLower: 'M59 105 C63 136 70 155 79 169 L88 179 L88 120 C77 122 69 116 59 105Z'
};
function renderMuscleFigure(view) {
  const figure = document.createElement('figure');
  const svg = svgElement('svg', { viewBox: '0 0 180 410', role: 'group', 'aria-label': `${view === 'front' ? 'Front' : 'Back'} muscle heatmap` });
  const defs = svgElement('defs');
  const gradient = svgElement('linearGradient', { id: `body-shade-${view}`, x1: '0', x2: '1', y1: '0', y2: '0' });
  for (const [offset, color] of [['0%', '#c9c7c0'], ['45%', '#e7e4db'], ['100%', '#d0cec5']]) gradient.append(svgElement('stop', { offset, 'stop-color': color }));
  defs.append(gradient); svg.append(defs);
  const base = svgElement('g', { fill: `url(#body-shade-${view})`, stroke: '#bdbcb4', 'stroke-width': '.65', 'stroke-linejoin': 'round' });
  base.append(svgElement('ellipse', { cx: '90', cy: '29', rx: '17', ry: '22' }));
  base.append(svgElement('path', { d: 'M81 48L80 61Q74 65 61 67L57 104L63 160L61 182Q90 193 119 182L117 160L123 104L119 67Q106 65 100 61L99 48Q90 54 81 48Z' }));
  base.append(svgElement('path', { d: 'M61 177Q90 188 119 177L121 209L107 231L90 224L73 231L59 209Z' }));
  const limbs = [
    'M60 68C45 66 39 80 36 101L30 145L20 193C16 201 15 214 20 217Q26 221 30 212L35 196L44 165L53 133L61 104Z',
    'M60 205C56 226 61 259 65 280L64 298L68 358L63 379Q57 390 64 394L79 394Q86 390 81 381L80 360L84 310L86 285L90 232L81 214Z'
  ];
  for (const d of limbs) for (const transform of ['', 'translate(180 0) scale(-1 1)']) base.append(svgElement('path', { d, transform }));
  svg.append(base);
  const contour = svgElement('g', { fill: 'none', stroke: '#b1b1aa', 'stroke-width': '.8', 'stroke-linecap': 'round', opacity: '.65' });
  for (const d of ['M78 58Q90 65 102 58', 'M65 289Q73 294 82 289', 'M98 289Q107 294 115 289', 'M29 164L38 168', 'M142 168L151 164']) contour.append(svgElement('path', { d }));
  svg.append(contour);
  const paths = view === 'front' ? [['chest', anatomy.chest], ['shoulders', anatomy.shoulders], ['biceps', anatomy.biceps], ['core', anatomy.core], ['quads', anatomy.quads]] : [['back', anatomy.backUpper], ['back', anatomy.backLower], ['shoulders', anatomy.shoulders], ['triceps', anatomy.triceps], ['glutes', anatomy.glutes], ['hamstrings', anatomy.hamstrings], ['calves', anatomy.calves]];
  for (const [id, d] of paths) {
    const score = muscleScores[id].score;
    const level = score ? Math.max(1, Math.ceil(score / maxMuscleScore * 4)) : 0;
    const group = svgElement('g', { class: `muscle-shape level-${level}`, 'data-muscle': id });
    if (score) {
      group.setAttribute('role', 'button'); group.setAttribute('tabindex', '0'); group.setAttribute('aria-label', `${muscleLabels[id]}, ${muscleScores[id].direct} direct sets, ${muscleScores[id].supporting} supporting sets`); group.setAttribute('aria-pressed', 'false');
      group.addEventListener('click', () => selectMuscle(id));
      group.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectMuscle(id); } });
    }
    for (const transform of ['', 'translate(180 0) scale(-1 1)']) group.append(svgElement('path', { d, transform }));
    svg.append(group);
  }
  // Subtle centerline and anatomical striations, kept behind the information hierarchy.
  const lines = svgElement('g', { fill: 'none', stroke: '#faf8f1', 'stroke-width': '1', opacity: '.65', 'pointer-events': 'none' });
  const linePaths = view === 'front' ? ['M90 83V170', 'M77 129H87M78 141H87M80 153H87', 'M93 129H103M93 141H102M93 153H100', 'M66 93L82 100M98 100L114 93', 'M71 225L77 265M109 225L103 265'] : ['M90 70V177', 'M74 84L86 102M106 84L94 102', 'M69 125L85 143M111 125L95 143', 'M90 188V214'];
  for (const d of linePaths) lines.append(svgElement('path', { d }));
  svg.append(lines);
  const caption = document.createElement('figcaption'); caption.textContent = view === 'front' ? 'FRONT' : 'BACK'; figure.append(svg, caption); return figure;
}
$('#muscle-figures').append(renderMuscleFigure('front'), renderMuscleFigure('back'));
for (const id of activeMuscles) {
  const button = document.createElement('button'); button.type = 'button'; button.textContent = muscleLabels[id]; button.dataset.muscle = id; button.setAttribute('aria-pressed', 'false'); button.addEventListener('click', () => selectMuscle(id)); $('#muscle-chips').append(button);
}
function selectMuscle(id) {
  const muscle = muscleScores[id];
  document.querySelectorAll('[data-muscle]').forEach(element => { const selected = element.dataset.muscle === id; element.classList.toggle('selected', selected); if (element.hasAttribute('aria-pressed')) element.setAttribute('aria-pressed', String(selected)); });
  $('#muscle-detail-title').textContent = muscleLabels[id];
  $('#muscle-detail-count').textContent = muscle.direct && muscle.supporting ? `${muscle.direct} direct · ${muscle.supporting} supporting sets` : muscle.direct ? `${muscle.direct} direct sets` : `${muscle.supporting} supporting sets`;
  $('#muscle-detail-exercises').replaceChildren();
  for (const exercise of muscle.exercises) {
    const item = document.createElement('li'), name = document.createElement('span'), role = document.createElement('span'); name.textContent = exercise.name; role.textContent = exercise.isMain ? 'Main · 3 sets' : 'Supporting · 3 sets'; item.append(name, role); $('#muscle-detail-exercises').append(item);
  }
}
selectMuscle(activeMuscles[0]);
