/* Read-only health integration boundary. No persistence or native-dialog imitation. */
(function(root){
  'use strict';
  const sources={
    ios:{id:'apple-health',label:'Apple Health',readTypes:['stepCount','distanceWalkingRunning','walkingWorkouts','activeEnergyBurned','heartRate']},
    android:{id:'health-connect',label:'Health Connect',readTypes:['steps','distance','walkingExerciseSessions','activeCaloriesBurned','heartRate']}
  };
  const units={steps:'count',distanceKm:'km',walkingMinutes:'min',activeCalories:'kcal',heartRate:'bpm'};
  function normalizeData(raw){
    const data={};
    for(const [key,unit] of Object.entries(units)){
      const sample=raw?.[key];
      if(!sample||sample.unit!==unit||typeof sample.value!=='number'||!Number.isFinite(sample.value)||sample.value<0)continue;
      if(key==='heartRate'&&sample.value===0)continue;
      if(key==='walkingMinutes'&&sample.source!=='walking-workout')continue;
      data[key]={value:sample.value,unit};
      if(key==='walkingMinutes')data[key].source='walking-workout';
    }
    return data;
  }
  function createService({adapter=root.FitLensNativeHealth,demo=null}={}){
    const source=sources[adapter?.platform==='android'?'android':'ios'];
    let inflight=null;
    const result=(status,extra={})=>({status,source:source.id,requestAttempted:false,requestCompleted:false,simulated:false,data:{},...extra});
    async function perform(){
      if(demo){
        const scenario=typeof demo==='function'?demo():demo;
        const statuses=['readable','no-data','unavailable','error','skipped'];
        const status=statuses.includes(scenario)?scenario:'unavailable';
        // Only explicitly gated development previews can return these sample records.
        const data=status==='readable'?normalizeData({steps:{value:6240,unit:'count'},distanceKm:{value:4.2,unit:'km'},walkingMinutes:{value:32,unit:'min',source:'walking-workout'},activeCalories:{value:185,unit:'kcal'}}):{};
        return result(status,{simulated:true,requestAttempted:['readable','no-data','error'].includes(status),requestCompleted:['readable','no-data'].includes(status),data});
      }
      let attempted=false,completed=false;
      try{
        if(!adapter||typeof adapter.isAvailable!=='function'||typeof adapter.requestReadAuthorization!=='function'||typeof adapter.readAvailableData!=='function'||!await adapter.isAvailable())return result('unavailable');
        attempted=true;
        const request={readTypes:[...source.readTypes],writeTypes:[]};
        const authorization=await adapter.requestReadAuthorization(request);
        if(authorization===false||authorization?.completed===false)return result('error',{requestAttempted:true});
        completed=true;
        // Request completion is NOT proof of read authorization. Only returned,
        // valid samples determine readable vs no-data, without inferring denial.
        const data=normalizeData(await adapter.readAvailableData({...request,period:'today',walkingTimeSource:'walking-workout'}));
        return result(Object.keys(data).length?'readable':'no-data',{requestAttempted:true,requestCompleted:true,data});
      }catch{
        // Native error details and health records are never logged or persisted.
        return result('error',{requestAttempted:attempted,requestCompleted:completed});
      }
    }
    function connect(){
      if(!inflight)inflight=perform().finally(()=>{inflight=null;});
      return inflight;
    }
    return {source:{...source,readTypes:[...source.readTypes]},connect,skip:()=>result('skipped',{simulated:!!demo})};
  }
  const api={sources,normalizeData,createService};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.FitLensHealth=api;
})(typeof window!=='undefined'?window:globalThis);
