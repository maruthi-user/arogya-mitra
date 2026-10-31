import { LANG } from '../../i18n/index.js';
import { providerName } from '../../data/provider-names.js';
import { queryCollection } from '../../utils/collection.js';
export function providerResults(providers,view={},allowedTypes,distTo) {
  return queryCollection(providers,{query:view.query,page:view.page,pageSize:6,
    searchText:p=>`${providerName(p)} ${p.name} ${p.type} ${p.services||''}`,
    predicate:p=>(!allowedTypes||allowedTypes.includes(p.type))&&(!view.type||view.type===p.type)&&(!view.open||p.open),
    compare:view.sort==='distance'?(a,b)=>distTo(a.village)-distTo(b.village):view.sort==='name'?(a,b)=>providerName(a).localeCompare(providerName(b),LANG):
      (a,b)=>(Number(b.open)-Number(a.open))||(distTo(a.village)-distTo(b.village))});
}
