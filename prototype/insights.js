// FitLens Insights - Guides & Wisdom Hub Interactive Engine

const GUIDES_DATA = {
  eating: {
    name: "Healthy Eating",
    desc: "Practical ways to fuel your movement and recovery with real, whole foods.",
    badgeClass: "badge-eating",
    articles: [
      {
        id: "fats",
        title: "Why Good Fats Matter",
        icon: "assets/svg/fats.svg",
        summary: "Avocados, nuts, and olive oil provide steady, long-lasting energy while protecting your joints and balancing hormones.",
        science: "Unlike quick-burning simple sugars, healthy unsaturated fats metabolize slowly, stabilizing blood glucose and keeping you satiated for hours after meals.",
        whyMatters: "Cellular membranes, brain tissue, and joint fluid rely on essential fatty acids to cushion movements and reduce systemic inflammation after exercise.",
        practical: "Add a quarter avocado, a spoonful of chia seeds, or a drizzle of cold-pressed olive oil to your meals instead of relying on ultra-processed snack bars.",
        takeaway: "Healthy fats are essential fuel, not something to avoid. Focus on unprocessed, whole-food sources."
      },
      {
        id: "carbs",
        title: "Carbs Are Clean Fuel",
        icon: "assets/svg/carbs.svg",
        summary: "Complex carbohydrates refill your muscle glycogen reserves so tomorrow's movement feels light and effortless.",
        science: "Your muscles store glycogen for everyday walking, errands, and workouts. When glycogen runs low, physical fatigue and mental sluggishness quickly follow.",
        whyMatters: "Replenishing with slow-digesting oats, sweet potatoes, and whole grains prevents the dreaded mid-afternoon energy slump and supports training adaptation.",
        practical: "Time your complex carbs around your most active hours of the day to maximize cellular uptake and minimize blood sugar spikes.",
        takeaway: "Quality carbohydrates power your daily rhythm. Keep them colorful, fibrous, and unrefined."
      },
      {
        id: "protein",
        title: "Protein for Daily Repair",
        icon: "assets/svg/protein.svg",
        summary: "Distribute your protein evenly across meals to support muscle synthesis and cellular recovery throughout the day.",
        science: "Muscle protein synthesis peaks with roughly 20 to 30 grams of quality protein per sitting, rather than backloading your entire intake at dinner.",
        whyMatters: "Even everyday walking causes microscopic tissue turnover that requires amino acids to rebuild stronger, more resilient fibers.",
        practical: "Include a clean protein source — eggs, Greek yogurt, tofu, legumes, or fish — in your breakfast rather than eating carbs alone.",
        takeaway: "Even protein spacing across your day beats drinking one giant shake at night."
      },
      {
        id: "fuel",
        title: "Eating for Energy, Not Guilt",
        icon: "assets/svg/food-fuel.svg",
        summary: "Learn to listen to your body's authentic hunger signals instead of arbitrary restrictive calorie counters.",
        science: "Chronic dietary restriction elevates cortisol levels and impairs metabolic flexibility, leading to hormonal fatigue and rebound overeating.",
        whyMatters: "When your body feels adequately nourished and safe, your daily motivation to move and your mental focus climb naturally.",
        practical: "Eat until you feel roughly 80% full and pleasantly energized, rather than completely stuffed or uncomfortably hungry.",
        takeaway: "Food is the fuel that enables your movement. Approach your plate with gratitude and curiosity."
      },
      {
        id: "nutrients",
        title: "Eat the Colorful Rainbow",
        icon: "assets/svg/nutrients.svg",
        summary: "Phytonutrients found in deeply colored produce combat daily oxidative stress and bolster your immune defense.",
        science: "Different natural plant pigments — deep purples, vibrant greens, sunny oranges — reflect distinct antioxidants that support cellular health.",
        whyMatters: "A diverse variety of plant fibers feeds your gut microbiome, directly improving nutrient absorption and overall energy levels.",
        practical: "Aim to include at least three different natural plant colors on your plate between lunch and dinner every day.",
        takeaway: "Diversity of whole plants is the simplest formula for resilient long-term vitality."
      }
    ]
  },
  sleep: {
    name: "Sleep Hygiene",
    desc: "Science-backed evening rituals to protect deep sleep and wake up truly restored.",
    badgeClass: "badge-sleep",
    articles: [
      {
        id: "sleep-basics",
        title: "The 7-Hour Foundation",
        icon: "assets/svg/sleep-basics.svg",
        summary: "Seven to eight hours of uninterrupted sleep is your single most potent performance and recovery tool.",
        science: "During slow-wave sleep, human growth hormone (HGH) surges, repairing connective tissue and reinforcing neural pathways formed throughout the day.",
        whyMatters: "Even two consecutive nights of short sleep (under 6 hours) significantly blunts insulin sensitivity and increases perceived effort during daily tasks.",
        practical: "Set a non-negotiable bedtime alarm 45 minutes before your target sleep time to begin winding down without rushing.",
        takeaway: "Sleep is the non-negotiable foundation on which all physical adaptations occur."
      },
      {
        id: "sleep-cycles",
        title: "Deep vs. REM Sleep",
        icon: "assets/svg/sleep-cycles.svg",
        summary: "Deep sleep repairs physical tissue, while REM sleep processes emotional stress and sharpens focus.",
        science: "Sleep occurs in repeating 90-minute waves. Early night hours are dominated by deep physical restoration; late morning hours favor REM cognitive processing.",
        whyMatters: "Cutting sleep short by waking up too early often deprives you of vital REM cycles that regulate mood and mental stamina.",
        practical: "Keep your sleep environment pitch dark and cool (around 18–19°C) to prevent micro-awakenings that fracture sleep cycles.",
        takeaway: "Both sleep phases are vital. Protect complete 90-minute sleep cycles."
      },
      {
        id: "sleep-hygiene",
        title: "Evening Wind-Down Ritual",
        icon: "assets/svg/sleep-hygiene.svg",
        summary: "Dim warm lighting, cooler room temperatures, and screen boundaries cue your brain for natural melatonin release.",
        science: "Blue and cool-spectrum light stimulates melanopsin receptors in your eyes, signaling the pineal gland to delay melatonin production.",
        whyMatters: "A deliberate transition routine bridges the gap between a high-stimulation workday and restorative sleep readiness.",
        practical: "Switch overhead lights to warm lamps 1 hour before bed, and swap phone scrolling for light reading or soft stretching.",
        takeaway: "Wind down 45 minutes before sleep to allow your sympathetic nervous system to settle."
      },
      {
        id: "sleep-debt",
        title: "Can You Repay Sleep Debt?",
        icon: "assets/svg/sleep-debt.svg",
        summary: "Weekend sleep-ins can slightly reduce tiredness, but circadian consistency is what truly restores vitality.",
        science: "Sleeping late on weekends shifts your peripheral circadian clocks, creating 'social jetlag' that makes Monday mornings feel agonizing.",
        whyMatters: "Circadian regularity dictates hormone release, digestion timing, and physical alertness far better than sporadic marathon naps.",
        practical: "Keep your weekend wake-up time within 30 to 45 minutes of your weekday routine to maintain a steady internal clock.",
        takeaway: "Consistency of timing always trumps irregular weekend catch-up attempts."
      },
      {
        id: "napping",
        title: "The 20-Minute Power Nap",
        icon: "assets/svg/napping.svg",
        summary: "A brief early afternoon nap refreshes cognitive sharpness without interfering with your nightly sleep drive.",
        science: "Capping a nap at 20 minutes keeps you in lighter sleep stages, preventing sleep inertia (that groggy, disoriented feeling upon waking).",
        whyMatters: "A well-timed power nap reduces afternoon cortisol spikes and clears adenosine buildup, restoring focus for late-day movement.",
        practical: "Schedule naps between 1:00 PM and 2:30 PM. Set an alarm for 22 minutes to give yourself 2 minutes to drift off.",
        takeaway: "Keep naps short and early. A quick recharge preserves nighttime sleep quality."
      }
    ]
  },
  recovery: {
    name: "Rest & Recovery",
    desc: "How intentional downtime and light movement rebuild your body stronger.",
    badgeClass: "badge-recovery",
    articles: [
      {
        id: "rest-day",
        title: "The Art of the Rest Day",
        icon: "assets/svg/give-yourself-break.svg",
        summary: "Taking a scheduled day off is a proactive training decision that shields against overuse and mental burnout.",
        science: "Muscular adaptations, tendon remodeling, and nervous system recovery occur exclusively during periods of reduced physiological strain.",
        whyMatters: "Pushing through fatigue without rest blunts training gains and sharply elevates the risk of repetitive strain injuries.",
        practical: "Designate at least one full day each week where your only physical goal is restorative, unstructured enjoyment.",
        takeaway: "Rest is not the absence of progress — it is the exact window where progress solidifies."
      },
      {
        id: "active-recovery",
        title: "What Is Active Recovery?",
        icon: "assets/svg/active-recovery.svg",
        summary: "A leisurely 20-minute stroll or gentle swim promotes blood circulation and speeds metabolic clearance.",
        science: "Gentle muscular contraction acts as a venous pump, circulating oxygenated blood to recovering tissues and clearing metabolic byproducts.",
        whyMatters: "Light movement relieves post-exercise muscle stiffness far more effectively than staying completely sedentary on the couch.",
        practical: "Keep your heart rate strictly in conversational Zone 1 during active recovery — if you begin breathing hard, slow down.",
        takeaway: "Move easy to heal faster. Keep the effort purely conversational."
      },
      {
        id: "supercompensation",
        title: "You Grow When You Rest",
        icon: "assets/svg/resting-fitter.svg",
        summary: "Workouts provide the training stimulus, but supercompensation only happens while your muscles rest.",
        science: "Exercise creates controlled micro-trauma. Given adequate nutrition and rest, the body over-compensates, rebuilding tissues slightly stronger than before.",
        whyMatters: "Stacking hard sessions back-to-back without sufficient recovery interrupts this curve, leaving you chronically depleted.",
        practical: "Alternate challenging days with light movement or complete rest to ride the peak of your supercompensation curve.",
        takeaway: "Without recovery intervals, exercise is simply continuous breakdown."
      },
      {
        id: "burnout-signs",
        title: "Spotting Early Fatigue",
        icon: "assets/svg/burnout-signs.svg",
        summary: "Elevated resting heart rate, restless sleep, and low enthusiasm are your body's early caution flags.",
        science: "Chronic sympathetic nervous system dominance manifests as uncharacteristically high heart rates, poor recovery scores, and mood irritability.",
        whyMatters: "Recognizing early stage overreaching allows you to back off for 2 days rather than getting sidelined for 3 weeks by full burnout.",
        practical: "If your morning energy feels unusually drained and heavy two days in a row, substitute your workout with an unhurried walk.",
        takeaway: "Listen to subtle whispers from your body before they turn into forced stoppages."
      },
      {
        id: "returning-break",
        title: "Restarting After a Break",
        icon: "assets/svg/returning-after-setback.svg",
        summary: "After illness or travel, start back at 50% volume to allow connective tissues to safely readapt.",
        science: "Cardiovascular fitness rebounds quickly, but tendons and ligaments remodel at a slower metabolic rate, making them vulnerable after layoffs.",
        whyMatters: "Trying to pick up exactly where you left off is the number one cause of acute training setbacks.",
        practical: "Treat your first week back as an exploratory warm-up. Focus on rhythm and habit rather than hitting peak numbers.",
        takeaway: "Consistency beats speed when returning. Ease in gently to build lasting momentum."
      }
    ]
  },
  workout: {
    name: "Workout Essentials",
    desc: "Building sustainable movement habits that stick without causing burnout.",
    badgeClass: "badge-workout",
    articles: [
      {
        id: "consistency",
        title: "Consistency Beats Intensity",
        icon: "assets/svg/consistent-movement.svg",
        summary: "Showing up for 20 mindful minutes every day builds far greater long-term health than sporadic weekend heroics.",
        science: "Frequent low-to-moderate movement maintains continuous insulin sensitivity, metabolic rate, and joint lubrication throughout the week.",
        whyMatters: "Weekend-only warriors face substantially higher injury rates due to irregular biomechanical loading on unconditioned tissues.",
        practical: "Aim for a small, repeatable daily movement baseline that you can easily maintain even on your busiest days.",
        takeaway: "Small daily investments compound into lifelong vitality and resilience."
      },
      {
        id: "variety",
        title: "The Power of Variety",
        icon: "assets/svg/mix-workouts.svg",
        summary: "Blending brisk walking, bodyweight strength, and mobility keeps connective tissue supple and resilient.",
        science: "Varying movement planes (sagittal, frontal, rotational) prevents repetitive strain and strengthens supporting stabilizer muscles.",
        whyMatters: "Cross-training prevents boredom and ensures balanced joint health and functional posture.",
        practical: "Pair your walking sessions with 10 minutes of gentle hip opening or bodyweight squats twice a week.",
        takeaway: "Movement variety keeps both your joints and your motivation resilient."
      },
      {
        id: "pacing",
        title: "Finding Your Natural Cadence",
        icon: "assets/svg/pacing.svg",
        summary: "Pacing is about matching effort to how your body feels today, rather than chasing a fixed speedometer.",
        science: "Daily physiological readiness fluctuates with sleep, hydration, and mental stress; a rigid pace ignores this reality.",
        whyMatters: "Learning to regulate effort by breathing cadence keeps training sustainable and deeply enjoyable.",
        practical: "If you cannot speak a full sentence comfortably while walking, ease your pace back by 10% until your breath stabilizes.",
        takeaway: "Run your own tempo. Let your breath dictate your pace."
      },
      {
        id: "steps-truth",
        title: "The Truth About 10,000 Steps",
        icon: "assets/svg/10000-steps.svg",
        summary: "The 10k number was an arbitrary marketing metric; real health benefits begin accumulating around 6,000 steps.",
        science: "Large epidemiological studies show steep cardiovascular and mortality benefits between 6,000 and 8,000 daily steps, with diminishing returns beyond.",
        whyMatters: "Fixating on a generic round number can cause needless discouragement on busy workdays.",
        practical: "Find your personal baseline (e.g. 5,000 steps) and aim to add just 500 to 1,000 steps when time and energy allow.",
        takeaway: "Focus on your individual baseline rather than an arbitrary marketing slogan."
      },
      {
        id: "progressing-safely",
        title: "Progressing Safely",
        icon: "assets/svg/safe-progress.svg",
        summary: "Increase your weekly volume by no more than 10% to give tendons and joints time to adapt.",
        science: "Bones, tendons, and cartilage adapt to mechanical strain through remodeling, but their cellular turnover is much slower than muscle tissue.",
        whyMatters: "The 10% rule shields you from overuse syndromes like plantar fasciitis, shin splints, and patellar tendonitis.",
        practical: "If you walked 30 kilometers this week, keep next week under 33 kilometers to ensure smooth adaptation.",
        takeaway: "Patience in progression protects your long-term athletic momentum."
      }
    ]
  },
  body: {
    name: "Understanding Your Body",
    desc: "Demystifying heart rate zones, perceived effort, and physical fatigue signals.",
    badgeClass: "badge-body",
    articles: [
      {
        id: "zone-2",
        title: "Zone 2: The Magic Zone",
        icon: "assets/svg/heart-rate-zones.svg",
        summary: "Exercising at a conversational pace builds mitochondrial density and burns fat with minimal systemic stress.",
        science: "Zone 2 training (roughly 60–70% of max heart rate) optimizes lactate clearance and maximizes mitochondrial efficiency.",
        whyMatters: "It builds a massive aerobic engine without creating high autonomic stress or requiring long recovery periods.",
        practical: "Test your intensity with the talk test: you should be able to speak full sentences without gasping for air.",
        takeaway: "Slow down to speed up your aerobic capacity and metabolic health."
      },
      {
        id: "rpe",
        title: "Trusting Your Perceived Exertion",
        icon: "assets/svg/rpe.svg",
        summary: "The RPE scale (1–10) teaches you to calibrate training intensity by tuning into your breath and muscle sensations.",
        science: "Perceived exertion integrates autonomic feedback, breathing rate, muscle acidity, and central fatigue into a unified intuitive gauge.",
        whyMatters: "Wearable tech can glitch or misread metrics, but your internal sensory feedback is always active and real-time.",
        practical: "Rate your daily sessions from 1 (sitting) to 10 (all-out sprint). Keep most weekly movement comfortably in the 3 to 5 range.",
        takeaway: "Your internal biofeedback is often more truthful than digital screens."
      },
      {
        id: "vo2-max",
        title: "VO2 Max Made Simple",
        icon: "assets/svg/vo2-max.svg",
        summary: "VO2 max reflects your heart and lungs' ability to deliver oxygen to working muscles during sustained effort.",
        science: "Cardiorespiratory fitness is one of the strongest statistical predictors of longevity and functional independence in later decades.",
        whyMatters: "Maintaining your aerobic capacity makes everyday activities like stairs, hiking, and travel feel effortless.",
        practical: "Incorporate one brisk uphill walk or stair climb session into your week to stimulate oxygen delivery pathways.",
        takeaway: "Occasional brisk challenges preserve cardiorespiratory fitness across decades."
      },
      {
        id: "rhr",
        title: "What Your Resting Heart Rate Says",
        icon: "assets/svg/listen-to-heart.svg",
        summary: "A jump of 5+ beats in your morning resting heart rate often signals incomplete recovery or impending illness.",
        science: "Resting heart rate reflects the balance between sympathetic (fight or flight) and parasympathetic (rest and digest) tone.",
        whyMatters: "Tracking your baseline over weeks reveals subtle trends in chronic life stress, dehydration, and training readiness.",
        practical: "Check your morning resting heart rate trend. If it spikes several days in a row, prioritize sleep and dial back intensity.",
        takeaway: "Track trends over multi-week arcs rather than stressing over single-day spikes."
      },
      {
        id: "mental-health",
        title: "Movement for the Mind",
        icon: "assets/svg/mental-health.svg",
        summary: "Just 15 minutes of outdoor walking triggers brain-derived neurotrophic factor (BDNF) and clears mental fog.",
        science: "Rhythmic bilateral movement down-regulates amygdala activity while releasing dopamine, serotonin, and endorphins.",
        whyMatters: "Physical movement is often the fastest, most reliable lever for shifting your emotional and mental state.",
        practical: "When mental overwhelm or creative blocks strike, step outside for a 15-minute walk without headphones.",
        takeaway: "When the mind feels tangled, move your feet."
      }
    ]
  }
};

// UI Engine Initialization
document.addEventListener('DOMContentLoaded', () => {
  const readerSheet = document.getElementById('article-reader-sheet');
  const collectionSheet = document.getElementById('category-collection-sheet');
  const sheetBackdrop = document.getElementById('sheet-backdrop');
  
  const readerCloseBtn = document.getElementById('reader-close-btn');
  const collectionCloseBtn = document.getElementById('collection-close-btn');

  // Reader elements
  const readerIcon = document.getElementById('reader-icon');
  const readerCatBadge = document.getElementById('reader-cat-badge');
  const readerTitle = document.getElementById('reader-title');
  const readerSummary = document.getElementById('reader-summary');
  const readerScience = document.getElementById('reader-science');
  const readerWhyMatters = document.getElementById('reader-why-matters');
  const readerPractical = document.getElementById('reader-practical');
  const readerTakeaway = document.getElementById('reader-takeaway');

  // Collection elements
  const collectionTitle = document.getElementById('collection-title');
  const collectionDesc = document.getElementById('collection-desc');
  const collectionList = document.getElementById('collection-list');

  // Open Article Reader
  window.openArticle = function(catKey, articleId) {
    const cat = GUIDES_DATA[catKey];
    if (!cat) return;
    const article = cat.articles.find(a => a.id === articleId);
    if (!article) return;

    readerIcon.src = article.icon;
    readerCatBadge.textContent = cat.name.toUpperCase();
    readerCatBadge.className = 'reader-badge ' + cat.badgeClass;
    readerTitle.textContent = article.title;
    readerSummary.textContent = article.summary;
    readerScience.textContent = article.science;
    readerWhyMatters.textContent = article.whyMatters;
    readerPractical.textContent = article.practical;
    readerTakeaway.textContent = article.takeaway;

    // Show reader, hide collection if open
    collectionSheet.classList.remove('active');
    readerSheet.classList.add('active');
    sheetBackdrop.classList.add('active');
    readerSheet.scrollTop = 0;
  };

  // Open Category Collection (See all)
  window.openCategory = function(catKey) {
    const cat = GUIDES_DATA[catKey];
    if (!cat) return;

    collectionTitle.textContent = cat.name;
    collectionDesc.textContent = cat.desc;
    collectionList.innerHTML = '';

    cat.articles.forEach(article => {
      const item = document.createElement('div');
      item.className = 'collection-item ' + 'tint-' + catKey;
      item.innerHTML = `
        <div class="collection-item-icon">
          <img src="${article.icon}" alt="" aria-hidden="true">
        </div>
        <div class="collection-item-info">
          <h4>${article.title}</h4>
          <p>${article.summary}</p>
        </div>
        <div class="collection-item-arrow">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </div>
      `;
      item.addEventListener('click', () => {
        openArticle(catKey, article.id);
      });
      collectionList.appendChild(item);
    });

    readerSheet.classList.remove('active');
    collectionSheet.classList.add('active');
    sheetBackdrop.classList.add('active');
    collectionSheet.scrollTop = 0;
  };

  // Close handlers
  function closeAllSheets() {
    readerSheet.classList.remove('active');
    collectionSheet.classList.remove('active');
    sheetBackdrop.classList.remove('active');
  }

  if (readerCloseBtn) readerCloseBtn.addEventListener('click', closeAllSheets);
  if (collectionCloseBtn) collectionCloseBtn.addEventListener('click', closeAllSheets);
  if (sheetBackdrop) sheetBackdrop.addEventListener('click', closeAllSheets);

  // Keyboard close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllSheets();
  });
});