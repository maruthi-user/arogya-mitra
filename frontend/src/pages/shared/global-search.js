import {RecordTable} from '../../components/data-display/record-tables.js';
import { LANG, lbl } from '../../i18n/index.js';
import { MEDICINES } from '../../services/reference-catalog.js';
import { providerName } from '../../data/provider-names.js';
import { SearchInput } from '../../components/forms/search-input.js';
import { Button } from '../../components/ui/button.js';
import { Card } from '../../components/data-display/card.js';
import { EmptyState } from '../../components/feedback/states.js';
export function createGlobalSearchPage({S,page,providerCard}) {
  return (params={})=>{
    const l=(te,en)=>LANG==='te'?te:en;
    const query=(params.query||'').trim().toLocaleLowerCase();
    const providers=query?S.providers.filter(p=>`${providerName(p)} ${p.name} ${p.services||''}`.toLocaleLowerCase().includes(query)):[];
    const medicines=query?MEDICINES.filter(m=>`${m.te} ${m.en} ${m.kw.join(' ')}`.toLocaleLowerCase().includes(query)):[];
    const results=RecordTable({id:'global-search-results',showSearch:false,caption:l('శోధన ఫలితాలు','Search results'),emptyMessage:l('ఫలితాలు లేవు','No matches'),rows:[...providers.map(p=>({id:p.id,type:l('సేవాదారు','Provider'),name:providerName(p),record:p})),...medicines.map(m=>({id:m.id,type:l('మందు','Medicine'),name:lbl(m),record:m}))],columns:[{key:'name',label:l('పేరు','Name')},{key:'type',label:l('రకం','Type')}],details:r=>r.type===l('సేవాదారు','Provider')?providerCard(r.record):Card({title:r.name,actions:Button({label:l('మందుల దుకాణాలు','Find pharmacies'),action:'searchMedicine',attrs:{'data-id':r.id}})})});
    return {voice:null,html:page(l('శోధన','Search care'),SearchInput({id:'globalSearch',value:params.query,label:l('శోధించండి','Search'),action:'globalSearch'})+(query?(results||EmptyState(l('ఫలితాలు లేవు','No matches'))):`<p>${l('డాక్టర్ లేదా మందు పేరు టైప్ చేయండి.','Search public provider profiles or medicine names. Private appointments are not included.')}</p>`))};
  };
}
