/* Native iOS notification bridge boundary; never uses Web Notifications. */
(function(root){
 'use strict';
 const statuses=['authorized','provisional','denied','not-determined','unavailable'];
 function normalizeSettings(value){
  if(!value||!statuses.includes(value.authorizationStatus))return null;
  const option=key=>['enabled','disabled','not-supported'].includes(value[key])?value[key]:'not-supported';
  return {authorizationStatus:value.authorizationStatus,alertSetting:option('alertSetting'),soundSetting:option('soundSetting'),notificationCenterSetting:option('notificationCenterSetting'),lockScreenSetting:option('lockScreenSetting')};
 }
 function createService({adapter=root.FitLensNativeNotifications,demo=null}={}){
  let inflight=null;
  const result=(status,extra={})=>({status,settings:null,requestAttempted:false,simulated:false,canOpenSettings:false,...extra});
  async function perform(allowRequest){
   if(demo){
    const scenario=typeof demo==='function'?demo():demo;
    const status=[...statuses,'error','skipped'].includes(scenario)?scenario:'unavailable';
    return result(status,{simulated:true,settings:statuses.includes(status)?normalizeSettings({authorizationStatus:status,alertSetting:status==='authorized'?'enabled':'disabled',soundSetting:status==='authorized'?'enabled':'disabled',notificationCenterSetting:['authorized','provisional'].includes(status)?'enabled':'disabled'}):null});
   }
   let requestAttempted=false;
   try{
    if(!adapter||typeof adapter.isAvailable!=='function'||typeof adapter.getSettings!=='function'||!await adapter.isAvailable())return result('unavailable');
    let settings=normalizeSettings(await adapter.getSettings());
    if(!settings)return result('error');
    if(allowRequest&&settings.authorizationStatus==='not-determined'){
     if(typeof adapter.requestAuthorization!=='function')return result('unavailable');
     requestAttempted=true;
     await adapter.requestAuthorization({options:['alert','sound']});
     settings=normalizeSettings(await adapter.getSettings());
     if(!settings)return result('error',{requestAttempted});
    }
    return result(settings.authorizationStatus,{settings,requestAttempted,canOpenSettings:settings.authorizationStatus==='denied'&&typeof adapter.openSettings==='function'});
   }catch{return result('error',{requestAttempted});}
  }
  function enable(){if(!inflight)inflight=perform(true).finally(()=>{inflight=null;});return inflight;}
  async function openSettings(){
   if(demo||typeof adapter?.openSettings!=='function')return {opened:false};
   try{return {opened:await adapter.openSettings()===true};}catch{return {opened:false};}
  }
  return {enable,inspect:()=>perform(false),openSettings,skip:()=>result('skipped',{simulated:!!demo})};
 }
 const api={normalizeSettings,createService};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FitLensNotifications=api;
})(typeof window!=='undefined'?window:globalThis);
