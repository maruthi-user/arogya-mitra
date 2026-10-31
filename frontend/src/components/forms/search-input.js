import { Input, Select } from './field.js';
import { Button } from '../ui/button.js';
export function SearchInput({value='',label='Search',action='search',id='searchInput'}) {
  return `<div class="search-bar">${Input({id,label,value,attrs:{type:'search',maxlength:150,autocomplete:'off'}})}${Button({label,action,variant:'accent'})}</div>`;
}
export function FilterBar({controls=[],action,label='Apply'}) {
  return `<div class="filter-bar">${controls.map(Select).join('')}${Button({label,action})}</div>`;
}
