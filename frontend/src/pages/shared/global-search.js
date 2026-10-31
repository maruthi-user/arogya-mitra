import { LANG, lbl } from '../../i18n/index.js';
import { MEDICINES } from '../../data/reference-data.js';
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
    const results=providers.map(providerCard).join('')+medicines.map(m=>Card({title:lbl(m),actions:Button({label:l('మందుల దుకాణాలు','Find pharmacies'),action:'searchMedicine',attrs:{'data-id':m.id}})})).join('');
    return {voice:null,html:page(l('శోధన','Search care'),SearchInput({id:'globalSearch',value:params.query,label:l('శోధించండి','Search'),action:'globalSearch'})+(query?(results||EmptyState(l('ఫలితాలు లేవు','No matches'))):`<p>${l('డాక్టర్ లేదా మందు పేరు టైప్ చేయండి.','Search public provider profiles or medicine names. Private appointments are not included.')}</p>`))};
  };
}
