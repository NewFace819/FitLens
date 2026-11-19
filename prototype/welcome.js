/* Shared onboarding controller. Health integrations stay in health-integration.js. */
(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const root = $('.onboarding'), input = $('#preferred-name'), form = $('#name-form');
  const back = $('#onboarding-back'), confirm = $('.confirm-button');
  const scenes = {welcome:$('#welcome-scene'),'name-entry':$('#name-scene'),'name-greeting':$('#greeting-scene'),'health-intro':$('#health-scene'),'health-requesting':$('#health-scene'),'health-response':$('#health-response-scene'),'notifications-intro':$('#notifications-scene'),'notifications-requesting':$('#notifications-scene'),'notifications-response':$('#notifications-response-scene')};
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const viewport = window.visualViewport;
  const store = FitLensProfile.createStore(localStorage, sessionStorage);
  const replay = new URLSearchParams(location.search).get('replay') === '1';
  function returnToToday() {
    if (!replay && FitLensProfile.createStore(localStorage, sessionStorage).read().onboarding) {
      location.replace('home.html');
      return true;
    }
    return false;
  }
  if (returnToToday()) return;
  addEventListener('pageshow', returnToToday);
  const localPreview = ['localhost','127.0.0.1','[::1]'].includes(location.hostname) || location.protocol === 'file:';
  const demoEnabled = localPreview && new URLSearchParams(location.search).get('healthDemo') === '1';
  const health = FitLensHealth.createService({demo:demoEnabled ? () => $('#health-demo-scenario').value : null});
  const notificationDemo = localPreview && new URLSearchParams(location.search).get('notificationsDemo') === '1';
  const notifications = FitLensNotifications.createService({demo:notificationDemo ? () => $('#notification-demo-scenario').value : null});
  let notificationResult=null,settingsOpened=false;
  if(notificationDemo){$('#notification-demo-controls').hidden=false;root.dataset.notificationSimulation='true';}
  const stepsPreview = FitLensHealthStepsPreview.mount({sun:$('#health-steps-sun'),chart:$('#health-steps-chart')});
  let healthResult = null;
  if (demoEnabled) { $('#health-demo-controls').hidden = false; root.dataset.simulation = 'true'; }
  document.querySelectorAll('[data-health-source]').forEach(node => node.textContent = health.source.label);
  $('#connect-health').textContent = 'Connect '+health.source.label;
  // A brief surprise uses the existing face's dot eyes and open-mouth path.
  FitLensFace.faces['onboarding-surprised'] = {...FitLensFace.faces.waiting, mouth:FitLensFace.faces.tired.mouth, description:'Curious eyes and a small, surprised smile.'};
  FitLensFace.faces['onboarding-neutral'] = {...FitLensFace.faces.waiting, mouth:'M94 91 C104 102 123 102 133 91', lineMouth:true, description:'Attentive dot eyes and a small, gentle smile.'};
  const face = FitLensFace.mount($('#welcome-face'), {expression:'calm'});
  function mood(expression, duration = 250, palette = expression) {
    face.set(expression, {duration});
    for (const key of ['core','edge','soft']) root.style.setProperty('--mood-'+key, FitLensFace.faces[palette][key]);
  }
  const FLIGHT_DURATION = 900, FLIGHT_EASING = 'cubic-bezier(.4,0,.2,1)';
  let state = 'welcome', revision = 0, flight = null, activeAnimations = new Set();
  let closedHeight = viewport?.height || innerHeight;
  let flightWidth = innerWidth, destinationDirty = false;
  let greetedName = store.read().name, composing = false;
  const healthContent=$('.health-content'),healthContentWrap=$('.health-content-wrap');
  function updateHealthOverflow(){
    healthContentWrap.dataset.moreBelow=String(healthContent.clientHeight>0&&healthContent.scrollHeight-healthContent.clientHeight-healthContent.scrollTop>2);
  }
  healthContent.addEventListener('scroll',updateHealthOverflow,{passive:true});
  const healthResize=new ResizeObserver(updateHealthOverflow);
  [healthContent,$('.health-heading'),$('.health-preview'),$('.health-details')].forEach(node=>healthResize.observe(node));
  $('.health-details').addEventListener('toggle',updateHealthOverflow);
  const notificationContent=$('.notifications-content'),notificationContentWrap=$('.notifications-content-wrap');
  function updateNotificationOverflow(){
    notificationContentWrap.dataset.moreBelow=String(notificationContent.clientHeight>0&&notificationContent.scrollHeight-notificationContent.clientHeight-notificationContent.scrollTop>2);
  }
  notificationContent.addEventListener('scroll',updateNotificationOverflow,{passive:true});
  const notificationResize=new ResizeObserver(updateNotificationOverflow);
  [notificationContent,$('.notifications-heading'),$('.notification-example')].forEach(node=>notificationResize.observe(node));
  input.value = greetedName;
  function viewportLayout() {
    // Keyboard resize/scroll must not mutate measured geometry mid-flight. The
    // expanded layout is prepared once; the visible name stays on its own layer.
    if (state === 'name-transition') {
      if (innerWidth !== flightWidth) {
        flightWidth = innerWidth;
        closedHeight = innerHeight;
        applyViewport(closedHeight, 0);
        destinationDirty = true;
      }
      return;
    }
    const height = viewport?.height || innerHeight;
    if (document.activeElement !== input && state !== 'name-transition') closedHeight = height;
    applyViewport(height, viewport?.offsetTop || 0);
    if (state === 'name-entry') fitInput();
  }
  function applyViewport(height, offset) {
    root.style.setProperty('--viewport-height', height + 'px');
    const contentHeight = root.getBoundingClientRect().height;
    root.classList.toggle('compact', contentHeight < 580);
    root.classList.toggle('short', contentHeight < 440);
    // Keep the available visual viewport in view when Safari pans to the caret.
    root.style.transform = 'translateY(' + offset + 'px)';
  }
  function fitInput() {
    const canvas = document.createElement('canvas'), context = canvas.getContext('2d');
    const style = getComputedStyle(input);
    context.font = '800 40px ' + style.fontFamily;
    const width = context.measureText(input.value || input.placeholder).width;
    input.style.fontSize = Math.max(28, Math.min(40, 40 * (input.clientWidth - 4) / Math.max(1,width))) + 'px';
  }
  function updateInput() {
    confirm.disabled = composing || !input.value.trim();
    fitInput();
    if (state === 'name-entry') mood('onboarding-neutral', 220);
  }
  function cancelMotion() {
    revision++;
    stepsPreview.deactivate();
    for (const animation of activeAnimations) animation.cancel();
    activeAnimations.clear();
    flight?.remove(); flight = null;
    delete root.dataset.flight;
    input.style.visibility = '';
    Object.values(scenes).forEach(scene => {
      scene.style.visibility = '';
      scene.querySelectorAll('[style]').forEach(node => node.style.removeProperty('visibility'));
    });
  }
  async function animate(node, frames, duration, token = revision, options = {}) {
    if (reduced.matches || token !== revision) return;
    const animation = node.animate(frames, {duration, easing:'cubic-bezier(.22,.8,.25,1)', fill:'both', ...options});
    activeAnimations.add(animation);
    try { await animation.finished; } catch { /* Back / resize may cancel a transition. */ }
    finally { activeAnimations.delete(animation); animation.cancel(); }
  }
  function show(next, {focus = true, push = true, motion = true} = {}) {
    const sameScene=scenes[state]===scenes[next],healthScroll=healthContent.scrollTop,notificationScroll=notificationContent.scrollTop;
    cancelMotion();
    state = next; root.dataset.state = next;
    root.dataset.stage = next === 'health-intro' || next === 'health-requesting' ? 'health' : next === 'notifications-intro' || next === 'notifications-requesting' ? 'notifications' : '';
    if (next !== 'health-response') delete root.dataset.outcome;
    if (next !== 'notifications-response') delete root.dataset.notificationOutcome;
    root.classList.toggle('health-requesting',next === 'health-requesting');
    $('#greeting-scene .scene-actions').inert = false;
    for (const scene of new Set(Object.values(scenes))) scene.hidden = scene !== scenes[next];
    if(!sameScene){$('.onboarding-scenes').scrollTop=0;if(scenes[next]===$('#health-scene'))healthContent.scrollTop=0;}
    back.hidden = next === 'welcome'; back.disabled = false;
    if (next === 'name-entry') updateInput();
    else if (next === 'health-intro' || next === 'health-requesting') mood('onboarding-neutral',300,'calm');
    else if (next === 'health-response') renderHealthResponse();
    else if (next === 'notifications-intro' || next === 'notifications-requesting') {
      FitLensNotificationPreview.render($('.notification-card'),FitLensNotificationPreview.example(store.read().name));
      mood('onboarding-neutral',300,'calm');
    }
    else if(next === 'notifications-response')renderNotificationResponse();
    else mood(next === 'welcome' ? 'happy' : 'content');
    $('#connect-health').disabled = next === 'health-requesting';
    $('#connect-health').textContent = next === 'health-requesting' ? 'Requesting access…' : 'Connect '+health.source.label;
    $('#health-request-status').hidden = next !== 'health-requesting';
    $('#enable-notifications').disabled=next==='notifications-requesting';
    $('#enable-notifications').textContent=next==='notifications-requesting'?'Requesting access…':'Enable gentle reminders';
    $('#notification-request-status').hidden=next!=='notifications-requesting';
    if(!sameScene&&scenes[next]===$('#notifications-scene'))$('.notifications-content').scrollTop=0;
    if (push) history.pushState({fitlensIntroduction:next}, '');
    viewportLayout();
    if(sameScene&&scenes[next]===$('#health-scene'))healthContent.scrollTop=healthScroll;
    if(sameScene&&scenes[next]===$('#notifications-scene'))notificationContent.scrollTop=notificationScroll;
    updateHealthOverflow();
    updateNotificationOverflow();
    const scene = scenes[next];
    if (motion) animate(scene, [{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],420);
    if (next === 'health-intro' && motion) stepsPreview.activate({animate:!reduced.matches});
    if (focus) scene.querySelector('h1').focus({preventScroll:true});
  }
  function renderHealthResponse() {
    const result = healthResult || {status:'unavailable'};
    const name = store.read().name;
    const withName = (text,ending='!') => text+(name?', '+name:'')+ending;
    const responses = {
      readable:{title:withName('Thanks for sharing'),caption:"Let's make every step count.",expression:'happy',palette:'calm'},
      skipped:{title:withName('No worries'),caption:'You can always connect later.',expression:'content',palette:'content'},
      'no-data':{title:withName('All good'),caption:'We can keep going.',detail:"Your activity data isn't available here yet.",expression:'onboarding-neutral',palette:'calm'},
      unavailable:{title:withName('We can set this up later','.'),caption:"Let's keep exploring FitLens.",detail:window.FitLensNativeHealth?'Health connection is not available here right now.':"Health connection isn't available in this preview. You can still explore FitLens.",expression:'onboarding-neutral',palette:'calm'},
      error:{title:"Something didn't go as planned.",caption:'You can try again later.',expression:'concerned',palette:'calm'}
    };
    const response = responses[result.status] || responses.unavailable;
    root.dataset.outcome = result.status;
    $('#health-response-title').textContent = response.title;
    $('#health-response-caption').textContent = response.caption;
    $('#health-response-detail').textContent = response.detail || '';
    $('#health-response-detail').hidden = !response.detail;
    $('#retry-health').hidden = result.status !== 'error';
    $('#health-options').hidden = result.status === 'skipped';
    $('.health-demo-badge').hidden = !result.simulated;
    mood(response.expression,300,response.palette);
  }
  let stageTransition = false;
  async function transitionTo(next, {push=true}={}) {
    if (stageTransition) return;
    stageTransition = true;
    const previous = scenes[state], previousMascot = $('.mascot').getBoundingClientRect();
    const previousFace = $('#welcome-face').getBoundingClientRect();
    const before = revision;
    try {
      await animate(previous,[{opacity:1},{opacity:0}],200,before);
      if (before !== revision) return;
      show(next,{push,motion:false,focus:false});
      const token = revision, mascot = $('.mascot').getBoundingClientRect(), currentFace = $('#welcome-face').getBoundingClientRect();
      const move = previousMascot.top+previousMascot.height/2-mascot.top-mascot.height/2;
      animate($('.mascot'),[{transform:'translateY('+move+'px)'},{transform:'translateY(0)'}],450,token);
      animate($('#welcome-face'),[{transform:'rotate(-4deg) scale('+(previousFace.width/currentFace.width)+')'},{transform:'rotate(-4deg) scale(1)'}],450,token);
      if (next === 'health-intro') {
        animate($('.health-heading'),[{opacity:0,transform:'translateY(7px)'},{opacity:1,transform:'translateY(0)'}],350,token,{delay:60});
        animate($('.health-preview'),[{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],320,token,{delay:90});
        stepsPreview.activate({animate:!reduced.matches});
        animate($('.health-supporting-metrics'),[{opacity:0},{opacity:1}],300,token,{delay:420});
        animate($('.health-actions'),[{opacity:0},{opacity:1}],250,token,{delay:240});
      } else if(next==='notifications-intro'){
        animate($('.notifications-heading'),[{opacity:0,transform:'translateY(7px)'},{opacity:1,transform:'translateY(0)'}],350,token,{delay:40});
        animate($('.notification-example figcaption'),[{opacity:0},{opacity:1}],300,token,{delay:140});
        animate($('.notification-card'),[{opacity:0,transform:'translateY(-16px)'},{opacity:1,transform:'translateY(0)'}],640,token,{delay:150,easing:'cubic-bezier(.2,.7,.25,1)'}).then(()=>{
          if(token===revision&&state==='notifications-intro')mood('content',250,'calm');
        });
        animate($('.notifications-actions'),[{opacity:0},{opacity:1}],260,token,{delay:230});
      } else {
        animate(scenes[next].querySelector('.scene-copy'),[{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],420,token,{delay:60});
        animate(scenes[next].querySelector('.scene-actions'),[{opacity:0},{opacity:1}],280,token,{delay:220});
      }
      scenes[next].querySelector('h1').focus({preventScroll:true});
    } finally { stageTransition = false; }
  }
  async function connectHealth() {
    if (stageTransition || !['health-intro','health-response'].includes(state)) return;
    const retry = state === 'health-response';
    show('health-requesting',{push:false,focus:false,motion:false});
    const token = revision;
    const result = await health.connect();
    if (token !== revision || state !== 'health-requesting') return;
    healthResult = result;
    transitionTo('health-response',{push:!retry});
  }
  function renderNotificationResponse(){
    const result=notificationResult||{status:'unavailable'},name=store.read().name;
    const title=(text,ending='!')=>text+(name?', '+name:'')+ending;
    const responses={
      authorized:{title:title("You're all set"),caption:"We'll send thoughtful reminders when they're useful.",face:'happy',palette:'calm'},
      skipped:{title:title('No worries'),caption:'You can always turn on reminders later.',face:'content',palette:'content'},
      denied:{title:title("That's okay"),caption:'You can change notification preferences later.',face:'content',palette:'content'},
      unavailable:{title:title('We can set this up later','.'),caption:"Notifications aren't available in this preview.",face:'onboarding-neutral',palette:'calm'},
      error:{title:"Something didn't go as planned.",caption:'You can try again later.',face:'concerned',palette:'calm'},
      provisional:{title:title('A quieter nudge','.'),caption:'Reminders may arrive quietly in Notification Center.',face:'content',palette:'calm'},
      'not-determined':{title:title('We can set this up later','.'),caption:"Reminders aren't enabled yet. You can keep exploring.",face:'onboarding-neutral',palette:'calm'}
    };
    const response=responses[result.status]||responses.unavailable;
    root.dataset.notificationOutcome=result.status;
    $('#notification-response-title').textContent=response.title;
    $('#notification-response-caption').textContent=result.status==='authorized'&&result.settings?.alertSetting!=='enabled'?'Reminders are allowed. Delivery follows your notification settings.':response.caption;
    $('#notification-settings-status').textContent='';
    $('#retry-notifications').hidden=!['error','not-determined'].includes(result.status);
    $('#notification-settings').hidden=!result.canOpenSettings;
    $('#notification-settings').disabled=false;
    $('.notification-demo-badge').hidden=!result.simulated;
    mood(response.face,280,response.palette);
  }
  async function enableNotifications(){
    if(stageTransition||!['notifications-intro','notifications-response'].includes(state))return;
    const retry=state==='notifications-response';
    show('notifications-requesting',{push:false,focus:false,motion:false});
    const token=revision,result=await notifications.enable();
    if(token!==revision||state!=='notifications-requesting')return;
    notificationResult=result;transitionTo('notifications-response',{push:!retry});
  }
  function sourceText(name) {
    const bounds = input.getBoundingClientRect(), style = getComputedStyle(input);
    const overlay = document.createElement('span');
    overlay.className = 'name-flight'; overlay.setAttribute('aria-hidden','true'); overlay.textContent = input.value;
    Object.assign(overlay.style, {
      left:bounds.left - input.scrollLeft + 'px',
      top:bounds.top + parseFloat(style.paddingTop) + 'px',
      fontSize:style.fontSize, lineHeight:style.lineHeight,
      letterSpacing:style.letterSpacing, whiteSpace:'pre', width:'max-content'
    });
    document.body.append(overlay);
    // Leading spaces and the input's native horizontal scroll both affect the
    // actual glyph position. Measure the trimmed substring before lifting it.
    const leading = input.value.length - input.value.trimStart().length;
    const sourceRange = document.createRange();
    sourceRange.setStart(overlay.firstChild, leading);
    sourceRange.setEnd(overlay.firstChild, leading + name.length);
    overlay.style.left = sourceRange.getBoundingClientRect().left + 'px';
    overlay.textContent = name;
    const natural = overlay.getBoundingClientRect();
    const leftClip = Math.max(0,bounds.left-natural.left);
    overlay.style.width = natural.width + 1 + 'px';
    overlay.style.whiteSpace = 'pre-wrap';
    overlay.style.clipPath = 'inset(0px ' + Math.max(0,natural.width - bounds.width - leftClip) + 'px 0px ' + leftClip + 'px)';
    return {overlay, bounds:natural, style};
  }
  function destinationFrame(capture) {
    const destination = $('#greeting-name');
    const target = destination.getBoundingClientRect(), style = getComputedStyle(destination);
    // Match the real inline glyph baseline, not just the block's top edge.
    const probe = flight.cloneNode(true);
    Object.assign(probe.style, {visibility:'hidden',transform:'none',left:'0px',top:'0px',width:target.width+1+'px',fontSize:style.fontSize,lineHeight:style.lineHeight,letterSpacing:style.letterSpacing,fontWeight:style.fontWeight});
    document.body.append(probe);
    const range = document.createRange();range.selectNodeContents(probe);
    const top = target.top - (range.getBoundingClientRect().top - probe.getBoundingClientRect().top);
    probe.remove();
    return {transform:'translate('+(target.left-capture.bounds.left)+'px,'+(top-capture.bounds.top)+'px)',width:target.width+1+'px',fontSize:style.fontSize,lineHeight:style.lineHeight,letterSpacing:style.letterSpacing,fontWeight:style.fontWeight,clipPath:'inset(0px 0px 0px 0px)'};
  }
  async function flyName(capture, token) {
    const keys = ['transform','width','fontSize','lineHeight','letterSpacing','fontWeight','clipPath'];
    const first = {transform:'translate(0,0)',width:capture.bounds.width+1+'px',fontSize:capture.style.fontSize,lineHeight:capture.style.lineHeight,letterSpacing:capture.style.letterSpacing,fontWeight:capture.style.fontWeight,clipPath:flight.style.clipPath};
    const animation = flight.animate([first,destinationFrame(capture)], {duration:FLIGHT_DURATION,easing:FLIGHT_EASING,fill:'both'});
    activeAnimations.add(animation);
    let trackingFrame;
    const started = performance.now();
    function trackDestination() {
      if (token !== revision || !flight || animation.playState !== 'running') return;
      if (destinationDirty) {
        destinationDirty = false;
        const computed = getComputedStyle(flight);
        const current = Object.fromEntries(keys.map(key => [key,computed[key]]));
        // A genuine width/orientation change retargets from the current rendered
        // frame. Keyboard-only events do not touch or cancel the animation.
        animation.effect.setKeyframes([current,destinationFrame(capture)]);
        animation.effect.updateTiming({duration:Math.max(200,FLIGHT_DURATION-(performance.now()-started))});
        animation.currentTime = 0;
      }
      trackingFrame = requestAnimationFrame(trackDestination);
    }
    trackingFrame = requestAnimationFrame(trackDestination);
    try { await animation.finished; } catch { /* Only explicit Back cancels. */ }
    finally { cancelAnimationFrame(trackingFrame); activeAnimations.delete(animation); animation.cancel(); }
  }
  async function greet() {
    if (state !== 'name-entry' || composing) return;
    const name = input.value.trim();
    if (!name) return;
    $('#name-error').textContent = '';
    if (!store.save('name', name)) {
      $('#name-error').textContent = 'Your name could not be saved. Please try again.';
      return;
    }
    // Settle any entrance animation before measuring the native input.
    for (const animation of activeAnimations) animation.cancel();
    activeAnimations.clear();
    greetedName = name;
    const oldMascot = $('.mascot').getBoundingClientRect();
    const oldFace = $('#welcome-face').getBoundingClientRect();
    const capture = !reduced.matches ? sourceText(name) : null;
    input.value = name;
    flight = capture?.overlay || null;
    state = 'name-transition'; root.dataset.state = state;
    const token = ++revision;
    flightWidth = innerWidth; destinationDirty = false;
    confirm.disabled = true;
    input.style.visibility = 'hidden';
    input.blur();
    $('#greeting-name').textContent = name;
    $('#name-scene').hidden = true;
    const greeting = $('#greeting-scene');
    greeting.hidden = false;
    $('.onboarding-scenes').scrollTop = 0;
    const prefix = $('#greeting-prefix'), namePart = $('.greeting-name');
    const caption = $('#greeting-caption'), actions = greeting.querySelector('.scene-actions');
    [prefix,namePart,caption,actions].forEach(node => node.style.visibility = 'hidden');
    actions.inert = true;
    // Prepare the expanded destination immediately. No keyboard-height guess or
    // stabilization timeout: the lifted text already owns its source geometry.
    applyViewport(closedHeight, 0);
    const newMascot = $('.mascot').getBoundingClientRect();
    const newFace = $('#welcome-face').getBoundingClientRect();
    if (capture) {
      const move = oldMascot.top+oldMascot.height/2-newMascot.top-newMascot.height/2;
      animate($('.mascot'),[{transform:'translateY('+move+'px)'},{transform:'translateY(0)'}],FLIGHT_DURATION,token,{easing:FLIGHT_EASING});
      animate($('#welcome-face'),[{transform:'rotate(-4deg) scale('+(oldFace.width/newFace.width)+')'},{transform:'rotate(-4deg) scale(1)'}],FLIGHT_DURATION,token,{easing:FLIGHT_EASING});
      root.dataset.flight = 'moving';
      mood('onboarding-surprised',180,'content');
      prefix.style.visibility = '';
      // One prefix fade, synchronized to the flight rather than replayed at landing.
      animate(prefix,[{opacity:0,offset:0},{opacity:0,offset:.35},{opacity:1,offset:.85},{opacity:1,offset:1}],FLIGHT_DURATION,token,{easing:'linear'});
      await flyName(capture,token);
    }
    if (token !== revision) return;
    flight?.remove(); flight = null;
    input.style.visibility = '';
    namePart.style.visibility = ''; prefix.style.visibility = '';
    delete root.dataset.flight;
    state = 'name-greeting'; root.dataset.state = state;
    mood('content',220);
    history.pushState({fitlensIntroduction:state}, '');
    $('#greeting-title').focus({preventScroll:true});
    animate($('#welcome-face'),[{transform:'rotate(-4deg) scale(1)'},{transform:'rotate(-2deg) scale(1.035)',offset:.45},{transform:'rotate(-4deg) scale(1)'}],360,token);
    caption.style.visibility = ''; actions.style.visibility = '';
    animate(caption,[{opacity:0,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],280,token);
    await animate(actions,[{opacity:0},{opacity:1}],300,token,{delay:70});
    if (token !== revision) return;
    actions.inert = false;
    viewportLayout();
  }
  $('#get-started').onclick = () => { if(state === 'welcome') show('name-entry'); };
  input.oninput = updateInput;
  input.addEventListener('compositionstart', () => {composing = true;confirm.disabled = true;});
  input.addEventListener('compositionend', () => {composing = false;updateInput();});
  form.onsubmit = event => {event.preventDefault();greet();};
  confirm.addEventListener('pointerdown', event => {
    if (document.activeElement === input) event.preventDefault();
  });
  back.onclick = () => {
    if (state === 'name-transition') show('name-entry', {push:false});
    else if (history.state?.fitlensIntroduction && state !== 'welcome') history.back();
  };
  addEventListener('popstate', event => {
    if (returnToToday()) return;
    const next = event.state?.fitlensIntroduction;
    show(Object.hasOwn(scenes,next) ? next : 'welcome', {push:false});
  });
  $('#continue-onboarding').onclick = () => {
    if (state !== 'name-greeting') return;
    const event = new CustomEvent('fitlens:onboarding-next', {cancelable:true,detail:{step:'health',name:greetedName}});
    if (root.dispatchEvent(event)) transitionTo('health-intro');
  };
  $('#connect-health').onclick = connectHealth;
  $('#retry-health').onclick = connectHealth;
  $('#skip-health').onclick = () => {
    if (stageTransition || !['health-intro','health-requesting'].includes(state)) return;
    // Invalidate late native responses without claiming to dismiss a native sheet.
    cancelMotion(); healthResult = health.skip();
    transitionTo('health-response');
  };
  $('#health-options').onclick = () => show('health-intro');
  $('#continue-health').onclick = () => {
    if (state !== 'health-response' || stageTransition) return;
    const event = new CustomEvent('fitlens:onboarding-next',{cancelable:true,detail:{step:'notifications',healthStatus:healthResult?.status}});
    if (root.dispatchEvent(event)) transitionTo('notifications-intro');
  };
  $('#enable-notifications').onclick=enableNotifications;
  $('#retry-notifications').onclick=enableNotifications;
  $('#skip-notifications').onclick=()=>{
    if(stageTransition||!['notifications-intro','notifications-requesting'].includes(state))return;
    cancelMotion();notificationResult=notifications.skip();transitionTo('notifications-response');
  };
  $('#notification-settings').onclick=async()=>{
    if(state!=='notifications-response'||!notificationResult?.canOpenSettings)return;
    const token=revision,button=$('#notification-settings');button.disabled=true;
    const result=await notifications.openSettings();
    if(token!==revision)return;
    button.disabled=false;settingsOpened=result.opened;
    $('#notification-settings-status').textContent=result.opened?'You can update notification preferences in Settings.':'Settings could not be opened. You can try again later.';
  };
  addEventListener('visibilitychange',async()=>{
    if(document.hidden||!settingsOpened||state!=='notifications-response')return;
    const token=revision;settingsOpened=false;const result=await notifications.inspect();
    if(token===revision&&state==='notifications-response'){notificationResult=result;renderNotificationResponse();}
  });
  $('#continue-notifications').onclick=()=>{
    if(state!=='notifications-response'||stageTransition)return;
    const event=new CustomEvent('fitlens:onboarding-next',{cancelable:true,detail:{step:'home',notificationStatus:notificationResult?.status}});
    if (!root.dispatchEvent(event)) return;
    if (!store.save('onboarding', true)) {
      $('#notification-settings-status').textContent='Your setup could not be saved. Please try again.';
      return;
    }
    $('#continue-notifications').disabled=true;
    location.replace('home.html');
  };
  viewport?.addEventListener('resize', viewportLayout);
  viewport?.addEventListener('scroll', viewportLayout);
  addEventListener('resize', viewportLayout);
  addEventListener('pagehide', cancelMotion);
  history.replaceState({fitlensIntroduction:'welcome'}, '');
  viewportLayout(); updateInput();
  document.fonts.ready.then(fitInput);
  if (!reduced.matches) {
    animate($('.mascot'),[{opacity:0,transform:'scale(.94)'},{opacity:1,transform:'scale(1)'}],800);
    animate($('#welcome-scene'),[{opacity:0,transform:'translateY(14px)'},{opacity:1,transform:'translateY(0)'}],900);
  }
  mood('happy',600);
})();
