(() => {
 'use strict';
 // Shared design fixtures. Historical readings are cumulative counts at 19:00
 // on the previous four matching weekdays, not real Health data or daily goals.
 const days={
  19:{name:'Monday',steps:4920,history:[3900,4300,4400,4200],distance:3.7,minutes:103,periods:[['08:10–08:40','Morning movement',1420],['12:20–12:45','Midday movement',1100],['17:30–18:18','Evening movement',2400]]},
  20:{name:'Tuesday',steps:5410,history:[4600,5000,4700,4900],distance:4.1,minutes:117,periods:[['08:00–08:35','Morning movement',1650],['12:30–13:00','Midday movement',1300],['17:10–18:02','Evening movement',2460]]},
  21:{name:'Wednesday',steps:2800,history:[3800,4200,3900,4100],distance:2.1,minutes:62,periods:[['08:20–08:40','Morning movement',850],['12:35–12:55','Midday movement',900],['17:25–17:47','Evening movement',1050]]},
  22:{name:'Thursday',steps:4650,history:[4000,4500,4400,4300],distance:3.5,minutes:101,periods:[['08:10–08:40','Morning movement',1300],['12:15–12:40','Midday movement',1050],['17:20–18:06','Evening movement',2300]]},
  23:{name:'Friday',steps:3150,history:[4200,4800,4400,4600],distance:2.4,minutes:70,periods:[['08:15–08:35','Morning movement',990],['12:40–13:00','Midday movement',680],['17:15–17:45','Evening movement',1480]]}
 };
 for(const day of Object.values(days)){day.baseline=Math.round(day.history.reduce((a,b)=>a+b,0)/day.history.length);day.referenceTime='19:00';}
 window.FitLensStepsData={today:23,days};
})();
