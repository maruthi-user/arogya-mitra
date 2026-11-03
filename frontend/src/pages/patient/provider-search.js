import {providerRecords} from '../../components/data-display/record-tables.js';
import { T, LANG, lbl } from '../../i18n/index.js';
import { SYMPTOMS } from '../../services/reference-catalog.js';

import { providerResults } from '../../features/providers/catalog-view.js';
import { SearchInput, FilterBar } from '../../components/forms/search-input.js';
import { Pagination } from '../../components/data-display/pagination.js';
import { EmptyState } from '../../components/feedback/states.js';

export function createProviderSearchPage(ctx) {
  return function (p) {
    const { S, page, distTo, providerCard } = ctx;

    const sym = SYMPTOMS.find(s => s.id === p.symptom);
    const result=providerResults(S.providers,{...p,page:1,pageSize:Math.max(1,S.providers.length)},sym?.types,distTo);
    const l=(te,en)=>LANG==='te'?te:en;
    return {
      voice: 'providers',
      html: page(sym ? `${sym.icon} ${lbl(sym)}` : T.nearbyDoctors, `
        <h2 class="sub">${T.nearbyDoctors}</h2>
        ${SearchInput({value:p.query,label:l('శోధించండి','Search'),action:'filterProviders',id:'providerSearch'})}
        ${FilterBar({action:'filterProviders',label:l('వర్తింపజేయండి','Apply'),controls:[
          {id:'providerType',label:l('రకం','Category'),value:p.type,options:[{value:'',label:l('అన్నీ','All')},{value:'mbbs',label:'MBBS'},{value:'rmp',label:'RMP'},{value:'ayush',label:'AYUSH'}]},
          {id:'providerOpen',label:l('లభ్యత','Availability'),value:p.open?'open':'',options:[{value:'',label:l('అన్నీ','All')},{value:'open',label:T.open}]},
          {id:'providerSort',label:l('క్రమం','Sort'),value:p.sort||'recommended',options:[{value:'recommended',label:l('లభ్యత, దూరం','Availability, distance')},{value:'distance',label:l('దూరం','Distance')},{value:'name',label:l('పేరు','Name')}]}
        ]})}
        ${providerRecords(result.rows,providerCard,{showSearch:false})}

        <p class="fine">${LANG==='te'?'గ్రామం ఆధారంగా ఫలితాలు చూపబడతాయి. ప్రయాణ దూరం కాదు.':'Results use village proximity, not measured travel distance.'}</p>`)
    };

  };
}
