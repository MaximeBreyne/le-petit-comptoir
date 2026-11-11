'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function settings(saved){const storage=new Map(saved?[['comptoir-bar-settings-v1',JSON.stringify(saved)]]:[]),context=vm.createContext({localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)}});vm.runInContext(fs.readFileSync('dist/preferences.js','utf8'),context);return JSON.parse(vm.runInContext('JSON.stringify(preferences)',context))}
test('legacy settings preserve bindings and acquire gamepad defaults plus every keyboard action',()=>{
 const value=settings({sensitivity:2,bindings:{forward:{code:'KeyI',label:'I'},pour:{code:'KeyV',label:'V'}}});
 assert.equal(value.bindings.forward.code,'KeyI');assert.equal(value.bindings.pour.code,'KeyV');assert.equal(value.bindings.interact.code,'KeyE');assert.equal(value.bindings.tablet.code,'Tab');assert.equal(value.bindings.manage.code,'KeyR');assert.equal(value.gamepad.bindings.pour,7);assert.equal(value.gamepad.deadzone,.18);
 assert.equal(new Set(Object.values(value.bindings).map(binding=>binding.code)).size,12);
});
test('invalid and duplicate gamepad bindings are repaired without dropping valid assignments',()=>{
 const value=settings({gamepad:{enabled:false,invertY:true,deadzone:5,sensitivity:-1,bindings:{interact:6,pour:6,tablet:99,pause:9,manage:'2',sprint:10}}});
 assert.equal(value.gamepad.enabled,false);assert.equal(value.gamepad.invertY,true);assert.equal(value.gamepad.bindings.interact,6);assert.equal(value.gamepad.bindings.pause,9);assert.equal(value.gamepad.deadzone,.4);assert.equal(value.gamepad.sensitivity,.2);assert.equal(new Set(Object.values(value.gamepad.bindings)).size,6);assert.ok(Object.values(value.gamepad.bindings).every(index=>Number.isInteger(index)&&index>=0&&index<=11));
});
test('remapped interaction and tablet keys survive loading without stealing another action',()=>{
 const value=settings({bindings:{forward:{code:'Tab',label:'Tab'},pour:{code:'KeyE',label:'E'},interact:{code:'KeyF',label:'F'},tablet:{code:'KeyT',label:'T'},manage:{code:'KeyG',label:'G'}}});
 assert.equal(value.bindings.forward.code,'Tab');assert.equal(value.bindings.pour.code,'KeyE');assert.equal(value.bindings.interact.code,'KeyF');assert.equal(value.bindings.tablet.code,'KeyT');assert.equal(value.bindings.manage.code,'KeyG');assert.equal(new Set(Object.values(value.bindings).map(binding=>binding.code)).size,12);
});
