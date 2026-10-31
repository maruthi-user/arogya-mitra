const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {moduleLoader}=require('./helpers/module-loader.cjs');
test('table cells, form values and avatars escape user-controlled content',async()=>{
  const load=moduleLoader(vm.createContext({}));
  const {Table}=await load('components/data-display/table.js');
  const html=Table({caption:'Sample',columns:[{key:'name',label:'Name'}],rows:[{name:'<img src=x onerror=alert(1)>'}]});
  assert.doesNotMatch(html,/<img/);assert.match(html,/&lt;img/);
  const {Input}=await load('components/forms/field.js');
  assert.match(Input({id:'sample',label:'Name',value:'" autofocus onfocus="bad'}),/value="&quot; autofocus onfocus=&quot;bad"/);
  const {Avatar}=await load('components/ui/avatar.js');assert.doesNotMatch(Avatar('< >'),/< >/);
});
test('collection query filters before paging and clamps an out-of-range page',async()=>{
  const load=moduleLoader(vm.createContext({}));const {queryCollection}=await load('utils/collection.js');
  const result=queryCollection([{name:'Care C'},{name:'Other'},{name:'Care A'},{name:'Care B'}],{query:'care',searchText:r=>r.name,compare:(a,b)=>a.name.localeCompare(b.name),page:99,pageSize:2});
  assert.equal(result.total,3);assert.equal(result.page,2);assert.equal(result.rows[0].name,'Care C');
});
