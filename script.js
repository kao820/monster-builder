const ENTRY_TYPES=["traits","actions","bonus","reactions","legendary","lair"];
const abilityOrder=["str","dex","con","int","wis","cha"];
const entryState=Object.fromEntries(ENTRY_TYPES.map(t=>[t,[]]));
let skillEntries=[];
let uploadedArtData="";
let modalDraft=null;

const SECTION_LABELS={traits:"Особенность",actions:"Действие",bonus:"Бонусное действие",reactions:"Реакция",legendary:"Легендарное действие",lair:"Действие логова"};
const ENTRY_ROOTS={traits:"traitsEditor",actions:"actionsEditor",bonus:"bonusEditor",reactions:"reactionsEditor",legendary:"legendaryEditor",lair:"lairEditor"};

function sortRu(arr, keyFn=(x)=>x){ return [...arr].sort((a,b)=>keyFn(a).localeCompare(keyFn(b),'ru')); }
function uid(){ return crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random()); }
function escapeHtml(str){return String(str??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"','&quot;');}
function escapeAttr(str){return escapeHtml(str);} 
function text(id){const el=document.getElementById(id);return String((el&&el.value)||"").trim();}
function num(id){const el=document.getElementById(id);return Number((el&&el.value)||0);} 
function mod(score){return Math.floor((score-10)/2);} 
function fmtSigned(n){return `${n>=0?'+':''}${n}`;}
function getCRRow(cr){return DATA.crTable.find(x=>x.cr===cr)||DATA.crTable[0];}
function getCurrentPB(){return getCRRow(text('cr')).pb;}
function abilityLabelGen(id){return DATA.saveAbilities.find(x=>x.id===id)?.label||id;}
function slugify(str){return String(str).trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu,"-").replace(/^-+|-+$/g,"");}
function deepClone(x){return JSON.parse(JSON.stringify(x));}
function capitalize(str){ str=String(str||''); return str?str[0].toUpperCase()+str.slice(1):str; }

function defaultFreeEntry(section){
  // По умолчанию свободные записи не имеют заполненного текста, чтобы
  // пользователю показывались только подсказки (placeholder) в полях модального окна.
  // Текст примеров задаётся в модальном окне через атрибут placeholder.
  return {id:uid(), kind:'free', section, title:'', text:''};
}
function defaultAttackEntry(section){
  return {
    id:uid(), kind:'attack', section, title:'',
    usage:{mode:'none', custom:''},
    attack:{mode:'melee', category:'weapon', ability:'str', proficient:true, manualToHit:false, toHit:0, reach:5, target:'одна цель', otherLabel:''},
    damage:{average:5, manualDice:false, dice:'1к6 + 2', type:'колющий'},
    extraHit:{enabled:false, mode:'other', saveAbility:'wis', manualDc:false, dc:13, text:''},
    miss:{enabled:false, text:''}
  };
}
function defaultMultiattackEntry(section){
  const firstAttack=(entryState.actions||[]).find(x=>x.kind==='attack')?.id||'';
  return {
    id:uid(), kind:'multiattack', section, title:'Мультиатака',
    items:[{id:uid(), attackId:firstAttack, count:2}],
    text:''
  };
}
function makeEntry(section, kind){
  if(kind==='attack') return defaultAttackEntry(section);
  if(kind==='multiattack') return defaultMultiattackEntry(section);
  return defaultFreeEntry(section);
}
function ensureAttackShape(entry){
  if(!entry || entry.kind!=='attack') return entry;
  const base=defaultAttackEntry(entry.section||'actions');
  entry.usage={...base.usage,...(entry.usage||{})};
  entry.attack={...base.attack,...(entry.attack||{})};
  entry.damage={...base.damage,...(entry.damage||{})};
  entry.extraHit={...base.extraHit,...(entry.extraHit||{})};
  entry.miss={...base.miss,...(entry.miss||{})};
  if(typeof entry.title!=='string') entry.title='';
  return entry;
}
function ensureMultiattackShape(entry){
  if(!entry || entry.kind!=='multiattack') return entry;
  const base=defaultMultiattackEntry(entry.section||'actions');
  entry.items=Array.isArray(entry.items)&&entry.items.length?entry.items:deepClone(base.items);
  entry.items=entry.items.map(item=>({id:item.id||uid(), attackId:item.attackId||'', count:Math.max(1, Number(item.count)||1)}));
  if(typeof entry.title!=='string' || !entry.title.trim()) entry.title='Мультиатака';
  if(typeof entry.text!=='string') entry.text='';
  return entry;
}
function syncEntryShape(entry){
  if(!entry) return entry;
  if(entry.kind==='attack') return ensureAttackShape(entry);
  if(entry.kind==='multiattack') return ensureMultiattackShape(entry);
  return entry;
}

function attachAutoGrow(el){
  if(!el) return;
  const resize=()=>{el.style.height='auto'; el.style.height=Math.max(el.scrollHeight,120)+'px';};
  el.addEventListener('input',resize);
  setTimeout(resize,0);
}

function populateSelect(id, values){
  const el=document.getElementById(id); el.innerHTML='';
  values.forEach(v=>{const o=document.createElement('option'); o.value=v; o.textContent=v; el.appendChild(o);});
}
function populateCR(){
  const el=document.getElementById('cr'); el.innerHTML='';
  DATA.crTable.forEach(r=>{const o=document.createElement('option'); o.value=r.cr; o.textContent=`${r.cr} (${r.xp.toLocaleString('ru-RU')} XP)`; el.appendChild(o);});
  el.value='1/2';
}
function buildTags(id, items){
  const root=document.getElementById(id); root.innerHTML='';
  items.forEach(item=>{
    const label=document.createElement('label'); label.className='tag';
    label.innerHTML=`<input type="checkbox" value="${item}"><span>${item}</span>`;
    const input=label.querySelector('input');
    input.addEventListener('change',()=>{label.classList.toggle('active',input.checked); updateAll();});
    root.appendChild(label);
  });
}
function checkedValues(rootId){ return Array.from(document.querySelectorAll(`#${rootId} input[type="checkbox"]:checked`)).map(el=>el.value); }

function initStaticUI(){
  populateSelect('size', DATA.sizes);
  populateSelect('type', sortRu(DATA.types));
  populateSelect('alignment', sortRu(DATA.alignments));
  populateCR();
  buildTags('resistances', DATA.damageTypes);
  buildTags('immunities', DATA.damageTypes);
  buildTags('vulnerabilities', DATA.damageTypes);
  buildTags('conditionImmunities', DATA.conditions);
}

function addSkill(defaults={}){
  const firstSkill=sortRu(DATA.skills, x=>x.label)[0];
  skillEntries.push({id:uid(), skillId:defaults.skillId||firstSkill.id, prof:defaults.prof||1});
  renderSkills(); updateAll();
}
function removeSkill(id){ skillEntries=skillEntries.filter(x=>x.id!==id); renderSkills(); updateAll(); }
function renderSkills(){
  const root=document.getElementById('skillEntries'); root.innerHTML='';
  const skills=sortRu(DATA.skills, x=>x.label);
  skillEntries.forEach(item=>{
    const card=document.createElement('div'); card.className='entry-card';
    const options=skills.map(skill=>`<option value="${skill.id}" ${skill.id===item.skillId?'selected':''}>${skill.label}</option>`).join('');
    card.innerHTML=`<div class="skill-entry-title">Навык</div><div class="skill-entry-top"><select>${options}</select><select><option value="1" ${item.prof===1?'selected':''}>проф.</option><option value="2" ${item.prof===2?'selected':''}>эксп.</option></select><button type="button" class="secondary">Удалить</button></div>`;
    const selects=card.querySelectorAll('select');
    selects[0].addEventListener('change',e=>{item.skillId=e.target.value; updateAll();});
    selects[1].addEventListener('change',e=>{item.prof=Number(e.target.value); updateAll();});
    card.querySelector('button').addEventListener('click',()=>removeSkill(item.id));
    root.appendChild(card);
  });
}

function getScores(){ return {str:num('str'),dex:num('dex'),con:num('con'),int:num('int'),wis:num('wis'),cha:num('cha')}; }
function buildTypeLine(){ const size=text('size'), type=text('type'), subtype=text('subtype'), alignment=text('alignment'); const core=subtype?`${size}, ${type} (${subtype})`:`${size}, ${type}`; return `${core}, ${alignment}`; }
function buildSpeedLine(){ const parts=[]; [["speedWalk",""] ,["speedBurrow","рытьё"],["speedClimb","лазание"],["speedFly","полёт"],["speedSwim","плавание"]].forEach(([id,label])=>{const v=num(id); if(v>0) parts.push(label?`${label} ${v} фт.`:`${v} фт.`);}); const special=text('speedSpecial'); if(special) parts.push(special); return parts.length?parts.join(', '):'—'; }
function autoHitDiceExpression(size,hp,conScore){ const die=DATA.hitDieBySize[size]||8; const avgDie={4:2.5,6:3.5,8:4.5,10:5.5,12:6.5,20:10.5}[die]||4.5; const conMod=mod(conScore); const perDie=Math.max(1,avgDie+conMod); const diceCount=Math.max(1,Math.floor(hp/perDie)); const bonus=diceCount*conMod; return bonus===0?`${diceCount}к${die}`:`${diceCount}к${die} ${bonus>0?'+':'-'} ${Math.abs(bonus)}`; }
function buildSaves(scores,pb){ const labels={saveStr:'Сил',saveDex:'Лов',saveCon:'Тел',saveInt:'Инт',saveWis:'Мдр',saveCha:'Хар'}; const map={saveStr:'str',saveDex:'dex',saveCon:'con',saveInt:'int',saveWis:'wis',saveCha:'cha'}; const out=[]; Object.keys(labels).forEach(id=>{if(document.getElementById(id).checked) out.push(`${labels[id]} ${fmtSigned(mod(scores[map[id]])+pb)}`);}); return out; }
function buildSkillsLine(scores,pb){ return skillEntries.map(entry=>{const skill=DATA.skills.find(s=>s.id===entry.skillId); const bonus=mod(scores[skill.ability])+pb*Number(entry.prof); return `${skill.label} ${fmtSigned(bonus)}`;}); }
function buildSensesLine(){ const parts=[]; [["senseBlindsight","слепое зрение"],["senseDarkvision","тёмное зрение"],["senseTremorsense","чувство вибрации"],["senseTruesight","истинное зрение"]].forEach(([id,label])=>{const v=num(id); if(v>0) parts.push(`${label} ${v} фт.`);}); parts.push(`пассивное Восприятие ${num('passivePerception')}`); return parts.join(', '); }
function renderFact(id,label,values){ const el=document.getElementById(id); if(!values||(Array.isArray(values)&&values.length===0)){ el.textContent=''; return; } const content=Array.isArray(values)?values.join(', '):values; el.innerHTML=`<strong>${label}</strong> ${escapeHtml(content)}`; }

function estimateCRByHP(hp){return DATA.crTable.find(r=>hp>=r.hpMin&&hp<=r.hpMax)||(hp>850?DATA.crTable.at(-1):DATA.crTable[0]);}
function estimateCRByDPR(dpr){return DATA.crTable.find(r=>dpr>=r.dprMin&&dpr<=r.dprMax)||(dpr>320?DATA.crTable.at(-1):DATA.crTable[0]);}
function crToIndex(cr){return DATA.crTable.findIndex(r=>r.cr===cr);} 
function indexToCR(idx){return DATA.crTable[Math.max(0,Math.min(DATA.crTable.length-1,idx))];}
function estimateBalancedCR(){ const hp=num('hp'), ac=num('ac'), dpr=num('dpr'), atk=num('attackBonus'), dc=num('saveDc'); let def=estimateCRByHP(hp); def=indexToCR(crToIndex(def.cr)+Math.round((ac-def.ac)/2)); let off=estimateCRByDPR(dpr); off=indexToCR(crToIndex(off.cr)+Math.round(Math.max(atk-off.atk,dc-off.dc)/2)); return {defensive:def, offensive:off, final:indexToCR(Math.round((crToIndex(def.cr)+crToIndex(off.cr))/2))}; }
function validate(scores,pb,estimated){
  const warnings=[]; const selectedCR=getCRRow(text('cr')); const ac=num('ac'), hp=num('hp'), dpr=num('dpr'), atk=num('attackBonus'), dc=num('saveDc');
  const passiveExpected=10+mod(scores.wis)+skillEntries.filter(x=>x.skillId==='perception').reduce((acc,x)=>acc+pb*Number(x.prof),0);
  if(num('passivePerception')!==passiveExpected) warnings.push({level:'warn', text:`Пассивное Восприятие сейчас ${num('passivePerception')}, а по выбранным параметрам ожидается ${passiveExpected}.`});
  const gap=Math.abs(crToIndex(selectedCR.cr)-crToIndex(estimated.final.cr));
  if(gap>=4) warnings.push({level:'bad', text:`Выбранный CR (${selectedCR.cr}) сильно расходится с грубой оценкой по DMG (${estimated.final.cr}).`});
  else if(gap>=2) warnings.push({level:'warn', text:`Выбранный CR (${selectedCR.cr}) отличается от грубой оценки (${estimated.final.cr}).`});
  else warnings.push({level:'good', text:`CR выглядит близким к черновой оценке баланса (${estimated.final.cr}).`});
  if(ac-selectedCR.ac>=3) warnings.push({level:'warn', text:`КД заметно выше типичного для CR ${selectedCR.cr}.`});
  if(hp>selectedCR.hpMax+30) warnings.push({level:'warn', text:`Хитов больше типичного диапазона для CR ${selectedCR.cr}.`});
  if(dpr>selectedCR.dprMax+10) warnings.push({level:'warn', text:`Средний урон за раунд выше типичного для CR ${selectedCR.cr}.`});
  if(atk>selectedCR.atk+3) warnings.push({level:'warn', text:`Бонус атаки заметно выше типичного для CR ${selectedCR.cr}.`});
  if(dc>selectedCR.dc+2) warnings.push({level:'warn', text:`Сложность спасброска заметно выше типичной для CR ${selectedCR.cr}.`});
  if(text('balanceNote')) warnings.push({level:'good', text:`Учтено примечние: ${text('balanceNote')}`});
  return warnings;
}
function renderWarnings(items){ const root=document.getElementById('warnings'); root.innerHTML=''; items.forEach(item=>{const div=document.createElement('div'); div.className=`warning ${item.level}`; div.textContent=item.text; root.appendChild(div);}); }

function inferDamageDice(avg, abilityMod){
  const target=Math.max(1, Number(avg)||1);
  const dice=[4,6,8,10,12];
  let best={diff:Infinity, text:`1к6 ${abilityMod>=0?'+':'-'} ${Math.abs(abilityMod)}`};
  for(const die of dice){
    for(let count=1; count<=12; count++){
      const base=count*((die+1)/2)+abilityMod;
      const diff=Math.abs(base-target);
      if(diff<best.diff){
        best={diff, text: abilityMod===0?`${count}к${die}`:`${count}к${die} ${abilityMod>=0?'+':'-'} ${Math.abs(abilityMod)}`};
      }
    }
  }
  return best.text;
}
function computeAttackToHit(entry){ return mod(getScores()[entry.attack.ability])+ (entry.attack.proficient?getCurrentPB():0); }
function calcAutoSaveDC(ability){ return 8 + getCurrentPB() + mod(getScores()[ability]||10); }
function calcAutoDpr(){
  const actionAttacks=entryState.actions.filter(item=>item.kind==='attack');
  const bonusAttacks=entryState.bonus.filter(item=>item.kind==='attack');
  const singlesTotal=actionAttacks.reduce((sum,item)=>sum + (Number(item.damage?.average)||0), 0);
  const bestSingle=actionAttacks.length?Math.max(...actionAttacks.map(item=>Number(item.damage?.average)||0)):0;
  const multiTotals=entryState.actions.filter(item=>item.kind==='multiattack').map(calcMultiattackDamage);
  const actionTotal=multiTotals.length?Math.max(bestSingle, ...multiTotals):singlesTotal;
  const bonusTotal=bonusAttacks.reduce((sum,item)=>sum + (Number(item.damage?.average)||0), 0);
  return actionTotal + bonusTotal;
}
function syncAttackDerived(entry){
  if(entry.kind!=='attack') return entry;
  ensureAttackShape(entry);
  if(!entry.attack.manualToHit) entry.attack.toHit=computeAttackToHit(entry);
  if(!entry.damage.manualDice) entry.damage.dice=inferDamageDice(entry.damage.average, mod(getScores()[entry.attack.ability]));
  if(entry.extraHit.enabled && entry.extraHit.mode==='save' && !entry.extraHit.manualDc) entry.extraHit.dc=calcAutoSaveDC(entry.extraHit.saveAbility);
  return entry;
}
function formatUsagePrefix(usage){
  const mode=usage?.mode||'none'; if(mode==='none') return '';
  if(mode==='custom') return usage.custom?.trim()||'';
  return DATA.usageOptions.find(x=>x.id===mode)?.label||'';
}
function targetSaveLead(target){ return target==='несколько целей' ? 'Цели должны совершить' : 'Цель должна совершить'; }
function formatAttackBody(entry){
  syncAttackDerived(entry);
  const modeMap={melee:'Рукопашная', ranged:'Дальнобойная', other:capitalize(entry.attack.otherLabel?.trim()||'Другая')};
  const categoryMap={weapon:'атака оружием', spell:'атака заклинанием'};
  const brText=(s)=>escapeHtml(String(s||'').trim()).replace(/\n/g,'<br>');
  const lines=[];
  if(entry.attack.mode==='other'){
    const lead=(entry.attack.otherLabel||'').trim() || 'Особая атака';
    lines.push(escapeHtml(lead)+'.');
  } else {
    lines.push(`${modeMap[entry.attack.mode]||'Атака'} ${categoryMap[entry.attack.category]||'атакой'}: ${fmtSigned(Number(entry.attack.toHit)||0)} к попаданию, досягаемость ${Number(entry.attack.reach)||0} фт., ${entry.attack.target}.`);
    lines.push(`Попадание: ${capitalize(entry.damage.type)} урон ${Number(entry.damage.average)||0}${entry.damage.dice?` (${escapeHtml(entry.damage.dice)})`:''}.`);
  }
  if(entry.extraHit.enabled){
    if(entry.extraHit.mode==='save'){
      lines.push(`${targetSaveLead(entry.attack.target)} спасбросок ${abilityLabelGen(entry.extraHit.saveAbility)} со Сл ${entry.extraHit.dc}.`);
      if((entry.extraHit.text||'').trim()) lines.push(brText(entry.extraHit.text));
    } else if((entry.extraHit.text||'').trim()){
      lines.push(brText(entry.extraHit.text));
    }
  }
  if(entry.miss.enabled && (entry.miss.text||'').trim()) lines.push(`Промах: ${brText(entry.miss.text)}`);
  return lines.join('<br>');
}
function formatEntryTitle(item){
  const title=(item.title||'').trim() || (item.kind==='attack'?'Атака':'Без названия');
  if(item.kind==='attack'){
    const usage=formatUsagePrefix(item.usage);
    return usage ? `${title} (${usage})` : title;
  }
  return title;
}

function getAttackEntryById(id){
  return ENTRY_TYPES.flatMap(section=>entryState[section]).find(item=>item.id===id && item.kind==='attack') || null;
}
function formatMultiattackBody(entry){
  ensureMultiattackShape(entry);
  const parts=entry.items.map(item=>{
    const attack=getAttackEntryById(item.attackId);
    if(!attack) return null;
    const count=Math.max(1, Number(item.count)||1);
    const title=formatEntryTitle(attack);
    return `${count} × ${escapeHtml(title)}`;
  }).filter(Boolean);
  const total=entry.items.reduce((sum,item)=>sum + Math.max(1, Number(item.count)||1), 0);
  const lines=[];
  lines.push(parts.length ? `Монстр совершает ${total} ${declineAttacks(total)}: ${parts.join(', ')}.` : 'Монстр совершает несколько атак.');
  if((entry.text||'').trim()) lines.push(escapeHtml(entry.text.trim()).replace(/\n/g,'<br>'));
  return lines.join('<br>');
}
function declineAttacks(n){
  const mod10=n%10, mod100=n%100;
  if(mod10===1 && mod100!==11) return 'атаку';
  if(mod10>=2 && mod10<=4 && !(mod100>=12 && mod100<=14)) return 'атаки';
  return 'атак';
}
function calcMultiattackDamage(entry){
  ensureMultiattackShape(entry);
  return entry.items.reduce((sum,item)=>{
    const attack=getAttackEntryById(item.attackId);
    if(!attack) return sum;
    syncAttackDerived(attack);
    return sum + (Math.max(1, Number(item.count)||1) * (Number(attack.damage?.average)||0));
  },0);
}

function entryDisplayTitle(item){ return formatEntryTitle(item); }
function getOrderedEntriesForSection(section){
  const list=[...(entryState[section]||[])];
  if(section==='actions'){
    list.sort((a,b)=>{
      const av=a.kind==='multiattack'?0:1;
      const bv=b.kind==='multiattack'?0:1;
      return av-bv;
    });
  }
  return list;
}

function renderEntryList(section){
  const root=document.getElementById(ENTRY_ROOTS[section]); root.innerHTML='';
  getOrderedEntriesForSection(section).forEach(item=>{
    syncEntryShape(item); if(item.kind==='attack') syncAttackDerived(item);
    const row=document.createElement('div'); row.className='list-row';
    row.innerHTML=`<div class="list-row-title">${escapeHtml(entryDisplayTitle(item))}</div><div class="list-row-actions"><button type="button" class="secondary" data-action="edit">Изменить</button><button type="button" class="secondary" data-action="delete">Удалить</button></div>`;
    row.querySelector('[data-action="edit"]').addEventListener('click',()=>openEntryModal(section,item.id));
    row.querySelector('[data-action="delete"]').addEventListener('click',()=>{entryState[section]=entryState[section].filter(x=>x.id!==item.id); renderEntryList(section); updateAll();});
    root.appendChild(row);
  });
}
function renderAllEntryLists(){ ENTRY_TYPES.forEach(renderEntryList); }

function sectionKinds(section){ return section==='actions'?[{id:'free',label:'Особенность'},{id:'attack',label:'Атака'},{id:'multiattack',label:'Мультиатака'}]:(section==='bonus'?[{id:'free',label:'Особенность'},{id:'attack',label:'Атака'}]:[{id:'free',label:SECTION_LABELS[section]}]); }

function openEntryModal(section, entryId=null){
  const existing=entryId?entryState[section].find(x=>x.id===entryId):null;
  modalDraft={section, entryId, entry: existing?deepClone(existing):makeEntry(section, sectionKinds(section)[0].id)};
  renderEntryModal();
  document.getElementById('entryModal').hidden=false;
}
function closeEntryModal(){ modalDraft=null; document.getElementById('entryModal').hidden=true; }
function getModalRef(path){ const parts=path.split('.'); let ref=modalDraft.entry; while(parts.length>1){ ref=ref[parts.shift()]; } return {ref,key:parts[0]}; }
function setModalPath(path, value, rerender=false){ const {ref,key}=getModalRef(path); ref[key]=value; if(path==='kind' && value==='attack') ensureAttackShape(modalDraft.entry); if(path==='kind' && value==='multiattack') ensureMultiattackShape(modalDraft.entry); syncEntryShape(modalDraft.entry); if(modalDraft.entry.kind==='attack') syncAttackDerived(modalDraft.entry); if(rerender) renderEntryModal(false); else updateModalPreview(); }
function modalSelectOptions(items, valueKey='id', labelKey='label', selected=''){ return items.map(item=>`<option value="${escapeAttr(item[valueKey])}" ${item[valueKey]===selected?'selected':''}>${escapeHtml(item[labelKey])}</option>`).join(''); }
function updateModalPreview(){
  if(!modalDraft) return;
  syncEntryShape(modalDraft.entry);
  if(modalDraft.entry.kind==='attack') syncAttackDerived(modalDraft.entry);
  const note=document.getElementById('modalAttackPreview');
  if(note){
    let body='';
    if(modalDraft.entry.kind==='attack') body=formatAttackBody(modalDraft.entry);
    else if(modalDraft.entry.kind==='multiattack') body=formatMultiattackBody(modalDraft.entry);
    else body=escapeHtml((modalDraft.entry.text||'').trim()).replace(/\n/g,'<br>');
    note.innerHTML=`<em>${escapeHtml(formatEntryTitle(modalDraft.entry))}.</em> ${body}`;
  }
  const titlePreview=document.getElementById('modalTextPreviewTitle');
  const textPreview=document.getElementById('modalTextPreview');
  if(titlePreview && textPreview){
    const title=(modalDraft.entry.title||'').trim() || 'Без названия';
    const body=(modalDraft.entry.text||'').trim() || 'Тут появится превью текста.';
    titlePreview.textContent=title;
    textPreview.innerHTML=escapeHtml(body).replace(/\n/g,'<br>');
  }
}

function renderEntryModal(resetScroll=true){
  if(!modalDraft) return;
  const {section, entry}=modalDraft;
  syncEntryShape(entry);
  if(entry.kind==='attack') syncAttackDerived(entry);
  document.getElementById('entryModalTitle').textContent=modalDraft.entryId?`Изменить: ${SECTION_LABELS[section]}`:`Новая запись: ${SECTION_LABELS[section]}`;
  const body=document.getElementById('entryModalBody');
  const kindChoices=sectionKinds(section);
  const kindBlock=kindChoices.length>1?`<label class="field"><span>Тип записи</span><select data-path="kind" data-rerender="1">${modalSelectOptions(kindChoices,'id','label',entry.kind)}</select></label>`:'';
  let html=`<div class="grid cols-2 modal-grid">${kindBlock}`;
  if(entry.kind==='attack'){
    html+=`
      <label class="field ${kindChoices.length>1?'':'span-2'}"><span>Название</span><input data-path="title" type="text" value="${escapeAttr(entry.title)}" placeholder="Укус"></label>
      <label class="field span-2"><span>Кол-во использований</span><select data-path="usage.mode" data-rerender="1">${modalSelectOptions(DATA.usageOptions,'id','label',entry.usage.mode)}</select></label>
      ${entry.usage.mode==='custom'?`<label class="field span-2"><span>Свой текст ограничения</span><input data-path="usage.custom" type="text" value="${escapeAttr(entry.usage.custom)}" placeholder="например, только в ярости"></label>`:''}
      <label class="field"><span>Тип атаки</span><select data-path="attack.mode" data-rerender="1">${modalSelectOptions(DATA.attackModes,'id','label',entry.attack.mode)}</select></label>
      ${entry.attack.mode!=='other'?`<label class="field"><span>Вид атаки</span><select data-path="attack.category">${modalSelectOptions(DATA.attackCategories,'id','label',entry.attack.category)}</select></label>`:''}
      ${entry.attack.mode==='other'?`<label class="field span-2"><span>Свой текст типа атаки</span><input data-path="attack.otherLabel" type="text" value="${escapeAttr(entry.attack.otherLabel)}" placeholder="Особое действие, рык, луч и т.д."></label>`:''}
      ${entry.attack.mode!=='other'?`<div class="inline-four span-2 attack-line">
        <label class="field"><span>Характеристика</span><select data-path="attack.ability">${modalSelectOptions(DATA.saveAbilities,'id','label',entry.attack.ability)}</select></label>
        <label class="field"><span>Бонус попадания</span><input data-path="attack.toHit" type="number" value="${entry.attack.toHit}" ${entry.attack.manualToHit?'':'disabled'}></label>
        <label class="checkline inline-check-box"><input data-path="attack.proficient" type="checkbox" ${entry.attack.proficient?'checked':''}> Владение</label>
        <label class="checkline inline-check-box"><input data-path="attack.manualToHit" data-rerender="1" type="checkbox" ${entry.attack.manualToHit?'checked':''}> Вписать вручную</label>
      </div>
      <div class="inline-three span-2">
        <label class="field"><span>Досягаемость, фт</span><input data-path="attack.reach" type="number" min="0" value="${entry.attack.reach}"></label>
        <label class="field"><span>Цель</span><select data-path="attack.target">${DATA.targetOptions.map(v=>`<option value="${v}" ${v===entry.attack.target?'selected':''}>${v}</option>`).join('')}</select></label>
        <div></div>
      </div>
      <div class="inline-four span-2 damage-line">
        <label class="field"><span>Средний урон</span><input data-path="damage.average" type="number" min="0" value="${entry.damage.average}"></label>
        <label class="field grow"><span>Кости урона</span><input data-path="damage.dice" type="text" value="${escapeAttr(entry.damage.dice)}" ${entry.damage.manualDice?'':'disabled'}></label>
        <label class="field"><span>Тип урона</span><select data-path="damage.type">${DATA.damageTypes.map(v=>`<option value="${v}" ${v===entry.damage.type?'selected':''}>${v}</option>`).join('')}</select></label>
        <label class="checkline inline-check-box"><input data-path="damage.manualDice" data-rerender="1" type="checkbox" ${entry.damage.manualDice?'checked':''}> Указать руками кости</label>
      </div>`:''}
      <div class="feature-toggle span-2"><label class="checkline"><input data-path="extraHit.enabled" data-rerender="1" type="checkbox" ${entry.extraHit.enabled?'checked':''}> Дополнительный эффект при попадании</label></div>
      ${entry.extraHit.enabled?`
        <div class="inline-three span-2">
          <label class="field"><span>Тип эффекта</span><select data-path="extraHit.mode" data-rerender="1"><option value="save" ${entry.extraHit.mode==='save'?'selected':''}>Спасбросок</option><option value="other" ${entry.extraHit.mode==='other'?'selected':''}>Другое</option></select></label>
          ${entry.extraHit.mode==='save'?`<label class="field"><span>Характеристика</span><select data-path="extraHit.saveAbility" data-rerender="1">${modalSelectOptions(DATA.saveAbilities,'id','label',entry.extraHit.saveAbility)}</select></label>`:`<div></div>`}
          ${entry.extraHit.mode==='save'?`<div class="dc-inline"><label class="field"><span>Сл</span><input data-path="extraHit.dc" type="number" value="${entry.extraHit.dc}" ${entry.extraHit.manualDc?'':'disabled'}></label><label class="checkline inline-check-box"><input data-path="extraHit.manualDc" data-rerender="1" type="checkbox" ${entry.extraHit.manualDc?'checked':''}> Указать вручную</label></div>`:`<div></div>`}
        </div>
        <label class="field span-2"><span>Описание эффекта</span><textarea data-path="extraHit.text" rows="4" class="auto-grow">${escapeHtml(entry.extraHit.text)}</textarea></label>
      `:''}
      <div class="feature-toggle span-2"><label class="checkline"><input data-path="miss.enabled" data-rerender="1" type="checkbox" ${entry.miss.enabled?'checked':''}> Есть эффект промаха</label></div>
      ${entry.miss.enabled?`<label class="field span-2"><span>Эффект промаха</span><textarea data-path="miss.text" rows="3" class="auto-grow">${escapeHtml(entry.miss.text)}</textarea></label>`:''}
      <div class="preview-note span-2"><strong>Черновик:</strong><div id="modalAttackPreview" class="attack-preview-inline"><em>${escapeHtml(formatEntryTitle(entry))}.</em> ${formatAttackBody(entry)}</div></div>
    `;
  } else if(entry.kind==='multiattack') {
    const attackChoices=(entryState.actions||[]).filter(item=>item.kind==='attack' && item.id!==entry.id);
    const attackOptions=attackChoices.map(item=>`<option value="${escapeAttr(item.id)}">${escapeHtml(formatEntryTitle(item)||'Атака')}</option>`).join('');
    html+=`
      <label class="field span-2"><span>Название</span><input data-path="title" type="text" value="${escapeAttr(entry.title)}" placeholder="Мультиатака"></label>
      <div class="span-2 multiattack-box">
        <div class="multiattack-head"><strong>Удары в мультиатаке</strong><button type="button" class="secondary" data-ma-add>+ добавить удар</button></div>
        ${entry.items.map((item, idx)=>`<div class="multiattack-row" data-ma-row="${idx}">
          <label class="field grow"><span>Атака</span><select data-path="items.${idx}.attackId">${attackChoices.length?`<option value="">— выбери атаку —</option>${attackChoices.map(att=>`<option value="${escapeAttr(att.id)}" ${att.id===item.attackId?'selected':''}>${escapeHtml(formatEntryTitle(att)||'Атака')}</option>`).join('')}`:`<option value="">Сначала создай обычную атаку</option>`}</select></label>
          <label class="field count"><span>Кол-во ударов</span><input data-path="items.${idx}.count" type="number" min="1" max="10" value="${Number(item.count)||1}"></label>
          <button type="button" class="secondary" data-ma-remove="${idx}">Удалить</button>
        </div>`).join('')}
      </div>
      <label class="field span-2"><span>Доп. текст</span><textarea data-path="text" rows="4" class="auto-grow" placeholder="Например: при необходимости он может заменить одну атаку Укусом на Плевок ядом.">${escapeHtml(entry.text||'')}</textarea></label>
      <div class="preview-note span-2"><strong>Черновик:</strong><div id="modalAttackPreview" class="attack-preview-inline"><em>${escapeHtml(formatEntryTitle(entry))}.</em> ${formatMultiattackBody(entry)}</div></div>
    `;
  } else {
    // placeholders for free-form entries (traits, bonus, reactions, legendary, lair, actions)
    const freePlaceholders={
      traits:{title:'Острый слух и нюх', text:'Монстр совершает проверки Мудрости (Восприятие), основанные на слухе и нюхе, с преимуществом.'},
      bonus:{title:'Телепортация', text:'Монстр телепортируется до 30 фт. к видимой точке.'},
      reactions:{title:'Парирование', text:'Монстр добавляет +2 к КД против одной атаки, если видит атакующего.'},
      legendary:{title:'Атака хвостом', text:'Монстр совершает одну атаку хвостом.'},
      lair:{title:'Сотрясение земли', text:'Монстр вызывает землетрясение в радиусе 20 фт. вокруг себя.'},
      actions:{title:'Удар когтями', text:'Монстр наносит быстрый удар когтями, нанося колющий урон.'}
    };
    const ph=freePlaceholders[section] || {title: SECTION_LABELS[section], text:''};
    html+=`
      <label class="field span-2"><span>Название</span><input data-path="title" type="text" value="${escapeAttr(entry.title)}" placeholder="${escapeAttr(ph.title)}"></label>
      <div class="editor-split span-2">
        <label class="field">
          <span>Текстовый редактор</span>
          <textarea data-path="text" rows="10" class="auto-grow entry-editor-text" placeholder="${escapeHtml(ph.text)}">${escapeHtml(entry.text||'')}</textarea>
        </label>
        <div class="text-preview-card">
          <div class="text-preview-head">Предпросмотр</div>
          <div class="text-preview-title" id="modalTextPreviewTitle">${escapeHtml((entry.title||'').trim()||'Без названия')}</div>
          <div class="text-preview-body" id="modalTextPreview">${escapeHtml((entry.text||'').trim()||'Тут появится превью текста.').replace(/\n/g,'<br>')}</div>
        </div>
      </div>
    `;
  }
  html+='</div>';
  body.innerHTML=html;
  body.querySelectorAll('textarea').forEach(attachAutoGrow);
  body.querySelectorAll('[data-path]').forEach(el=>{
    const path=el.dataset.path; const rerender=el.dataset.rerender==='1';
    if(el.type==='checkbox') el.addEventListener('change',e=>setModalPath(path,e.target.checked,rerender));
    else if(el.tagName==='SELECT') el.addEventListener('change',e=>setModalPath(path,e.target.value,rerender));
    else el.addEventListener('input',e=>setModalPath(path, e.target.type==='number'?Number(e.target.value):e.target.value, false));
  });
  body.querySelector('[data-ma-add]')?.addEventListener('click',()=>{
    ensureMultiattackShape(modalDraft.entry);
    modalDraft.entry.items.push({id:uid(), attackId:(entryState.actions||[]).find(x=>x.kind==='attack')?.id||'', count:1});
    renderEntryModal(false);
  });
  body.querySelectorAll('[data-ma-remove]').forEach(btn=>btn.addEventListener('click',()=>{
    ensureMultiattackShape(modalDraft.entry);
    const idx=Number(btn.dataset.maRemove);
    modalDraft.entry.items.splice(idx,1);
    if(!modalDraft.entry.items.length) modalDraft.entry.items.push({id:uid(), attackId:'', count:1});
    renderEntryModal(false);
  }));
  if(resetScroll) body.scrollTop=0;
}

function saveEntryModal(){
  if(!modalDraft) return;
  syncAttackDerived(modalDraft.entry);
  const section=modalDraft.section;
  const entry=deepClone(modalDraft.entry);
  if(modalDraft.entryId){
    const idx=entryState[section].findIndex(x=>x.id===modalDraft.entryId);
    if(idx>=0) entryState[section][idx]=entry;
  } else entryState[section].push(entry);
  renderEntryList(section); updateAll(); closeEntryModal();
}

function renderEntriesOut(outId, section){
  const root=document.getElementById(outId); root.innerHTML='';
  const filled=getOrderedEntriesForSection(section).filter(item=> item.kind==='attack' ? (item.title||'').trim() : item.kind==='multiattack' ? true : (item.title||'').trim() || (item.text||'').trim() );
  filled.forEach(item=>{
    const p=document.createElement('p'); p.className='entry-render';
    const displayTitle=formatEntryTitle(item);
    const name=displayTitle?`<em>${escapeHtml(displayTitle)}.</em> `:'';
    p.innerHTML=item.kind==='attack'?`${name}${formatAttackBody(item)}`:item.kind==='multiattack'?`${name}${formatMultiattackBody(item)}`:`${name}${escapeHtml((item.text||'').trim()).replace(/\n/g,'<br>')}`;
    root.appendChild(p);
  });
  root.parentElement.style.display=filled.length?'':'none';
}

function updateShowcase(){
  document.getElementById('showcaseTitle').textContent=text('name')||'Описание';
  document.getElementById('showcaseDescription').innerHTML=(text('description')||'Добавь описание сущности, её повадки, происхождение или заметки для мастера.').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
  const callout=text('calloutText');
  document.getElementById('showcaseCallout').innerHTML=escapeHtml(callout).replace(/\n/g,'<br>');
  document.getElementById('calloutBox').style.display=callout?'':'none';
}
function updateLayoutMode(){
  const mode=text('layoutMode');
  const root=document.getElementById('previewCanvas');
  // remove previous classes
  root.classList.remove('mode-showcase','mode-statblock');
  // determine primary mode classes
  if(mode==='showcase'){
    root.classList.add('mode-showcase');
  } else {
    root.classList.add('mode-statblock');
  }
  document.getElementById('showcaseTop').style.display=mode==='showcase'?'grid':'none';
  const img=document.getElementById('monsterArt');
  if(uploadedArtData) img.src=uploadedArtData; else img.removeAttribute('src');
  document.querySelector('.showcase-art').style.display=(uploadedArtData||mode==='showcase')?'block':'none';
  // toggle two-column class on statblock for statblockTwo mode
  const statblock=document.querySelector('.statblock');
  if(statblock){ statblock.classList.toggle('two-columns', mode==='statblockTwo'); }
}

function updateAll(){
  const scores=getScores(), pb=getCurrentPB();
  // Auto-calculate hit dice
  if(document.getElementById('autoHitDice').checked) document.getElementById('hitDice').value=autoHitDiceExpression(text('size'), num('hp'), scores.con);
  // Auto-calculate modifiers
  ['str','dex','con','int','wis','cha'].forEach(key=>document.getElementById(`${key}Mod`).textContent=fmtSigned(mod(scores[key])));
  // Auto AC: if checkbox is checked, compute natural armor as 10 + PB + max(0, Dex mod)
  const acInput=document.getElementById('ac');
  const autoAC=document.getElementById('autoAC');
  if(autoAC){
    if(autoAC.checked){
      const dexMod=Math.max(0, mod(scores.dex));
      const newAc=10 + pb + dexMod;
      acInput.value=newAc;
      acInput.disabled=true;
    } else {
      acInput.disabled=false;
    }
  }
  const autoPassive=document.getElementById('autoPassivePerception');
  const passiveInput=document.getElementById('passivePerception');
  if(autoPassive && passiveInput){
    if(autoPassive.checked){
      const passiveExpected=10+mod(scores.wis)+skillEntries.filter(x=>x.skillId==='perception').reduce((acc,x)=>acc+pb*Number(x.prof),0);
      passiveInput.value=passiveExpected;
      passiveInput.disabled=true;
    } else {
      passiveInput.disabled=false;
    }
  }
  document.getElementById('outName').textContent=text('name')||'Монстр';
  document.getElementById('outTypeLine').textContent=buildTypeLine();
  document.getElementById('outAC').textContent=num('ac');
  document.getElementById('outHP').textContent=text('hitDice')?`${num('hp')} (${text('hitDice')})`:`${num('hp')}`;
  document.getElementById('outSpeed').textContent=buildSpeedLine();
  document.getElementById('abilityRow').innerHTML=abilityOrder.map(key=>`<td>${num(key)} (${fmtSigned(mod(scores[key]))})</td>`).join('');
  renderFact('outSaves','Спасброски',buildSaves(scores,pb));
  renderFact('outSkills','Навыки',buildSkillsLine(scores,pb));
  renderFact('outVuln','Уязвимости к урону',checkedValues('vulnerabilities'));
  renderFact('outRes','Сопротивления урону',checkedValues('resistances'));
  renderFact('outImm','Иммунитеты к урону',checkedValues('immunities'));
  renderFact('outCondImm','Иммунитеты к состояниям',checkedValues('conditionImmunities'));
  renderFact('outSenses','Чувства',buildSensesLine());
  renderFact('outLanguages','Языки',text('languages')||'—');
  const crRow=getCRRow(text('cr')); renderFact('outCR','Опасность',`${crRow.cr} (${crRow.xp.toLocaleString('ru-RU')} XP), бонус мастерства ${fmtSigned(crRow.pb)}`);
  ENTRY_TYPES.forEach(section=>entryState[section].forEach(item=>{ syncEntryShape(item); if(item.kind==='attack') syncAttackDerived(item); }));
  const allAttacks=ENTRY_TYPES.flatMap(section=>entryState[section]).filter(item=>item.kind==='attack');
  const attackBonusEl=document.getElementById('attackBonus');
  if(allAttacks.length){
    const bestToHit=Math.max(...allAttacks.map(item=>Number(item.attack?.toHit)||0));
    if(attackBonusEl) attackBonusEl.value=bestToHit;
    const dprEl=document.getElementById('dpr');
    if(dprEl) dprEl.value=calcAutoDpr();
    const saveAttacks=allAttacks.filter(item=>item.extraHit?.enabled && item.extraHit?.mode==='save');
    if(saveAttacks.length){
      const bestDc=Math.max(...saveAttacks.map(item=>Number(item.extraHit?.dc)||0));
      const saveDcEl=document.getElementById('saveDc');
      if(saveDcEl) saveDcEl.value=bestDc;
    }
  } else {
    if(attackBonusEl) attackBonusEl.value=0;
    const dprEl=document.getElementById('dpr');
    if(dprEl) dprEl.value=0;
  }
  renderEntriesOut('outTraits','traits');
  renderEntriesOut('outActions','actions');
  renderEntriesOut('outBonus','bonus');
  renderEntriesOut('outReactions','reactions');
  renderEntriesOut('outLegendary','legendary');
  renderEntriesOut('outLair','lair');
  const legendaryDescription=text('legendaryDescription');
  const lairDescription=text('lairDescription');
  document.getElementById('outLegendaryDescription').innerHTML=escapeHtml(legendaryDescription).replace(/\n/g,'<br>');
  document.getElementById('outLairDescription').innerHTML=escapeHtml(lairDescription).replace(/\n/g,'<br>');
  document.getElementById('legendarySection').style.display=(entryState.legendary.some(x=>(x.title||'').trim()||(x.text||'').trim())||legendaryDescription)?'':'none';
  document.getElementById('lairSection').style.display=(entryState.lair.some(x=>(x.title||'').trim()||(x.text||'').trim())||lairDescription)?'':'none';
  const estimated=estimateBalancedCR(); document.getElementById('balanceChip').textContent=`CR ≈ ${estimated.final.cr}`;
  renderWarnings(validate(scores,pb,estimated)); updateShowcase(); updateLayoutMode();
}

function parseTiffIFD(buffer){
  const dv = new DataView(buffer);
  const le = dv.getUint16(0, false) === 0x4949;
  const order = String.fromCharCode(dv.getUint8(0)) + String.fromCharCode(dv.getUint8(1));
  if(order !== 'II' && order !== 'MM') throw new Error('Not a TIFF file');
  const read16 = (o)=>dv.getUint16(o, le);
  const read32 = (o)=>dv.getUint32(o, le);
  if(read16(2) !== 42) throw new Error('Invalid TIFF header');
  const ifdOffset = read32(4);
  const count = read16(ifdOffset);
  const tags = {};
  const typeSizes = {1:1,2:1,3:2,4:4,5:8,6:1,7:1,8:2,9:4,10:8,11:4,12:8,13:4};
  function readValues(type, count, valueOffset){
    const size = typeSizes[type] || 1;
    const total = size * count;
    const ptr = total <= 4 ? valueOffset : read32(valueOffset);
    const vals = [];
    for(let i=0;i<count;i++){
      const o = ptr + i*size;
      if(type===3) vals.push(read16(o));
      else if(type===4 || type===13) vals.push(read32(o));
      else if(type===1 || type===7) vals.push(dv.getUint8(o));
      else vals.push(read32(o));
    }
    return count===1 ? vals[0] : vals;
  }
  for(let i=0;i<count;i++){
    const o = ifdOffset + 2 + i*12;
    const tag = read16(o);
    const type = read16(o+2);
    const n = read32(o+4);
    tags[tag] = readValues(type, n, o+8);
  }
  return {tags, le};
}

function decodeRawTiffToDataUrl(buffer){
  const {tags} = parseTiffIFD(buffer);
  const width = Number(tags[256]);
  const height = Number(tags[257]);
  const bits = Array.isArray(tags[258]) ? tags[258] : [Number(tags[258]||8)];
  const compression = Number(tags[259] || 1);
  const photo = Number(tags[262] || 2);
  const stripOffsets = Array.isArray(tags[273]) ? tags[273] : [Number(tags[273])];
  const samplesPerPixel = Number(tags[277] || bits.length || 1);
  const rowsPerStrip = Number(tags[278] || height);
  const stripByteCounts = Array.isArray(tags[279]) ? tags[279] : [Number(tags[279])];
  const planar = Number(tags[284] || 1);

  if(!width || !height) throw new Error('TIFF size missing');
  if(compression !== 1) throw new Error('Unsupported TIFF compression');
  if(planar !== 1) throw new Error('Unsupported TIFF planar config');
  if(bits.some(v => Number(v) !== 8)) throw new Error('Only 8-bit TIFF supported');

  const src = new Uint8Array(buffer);
  const rgba = new Uint8ClampedArray(width * height * 4);
  let pixelIndex = 0;

  for(let s=0; s<stripOffsets.length; s++){
    const off = Number(stripOffsets[s]);
    const count = Number(stripByteCounts[s]);
    const strip = src.subarray(off, off + count);
    const rows = Math.min(rowsPerStrip, height - s * rowsPerStrip);
    const expectedPixels = rows * width;
    for(let p=0; p<expectedPixels; p++){
      const base = p * samplesPerPixel;
      const out = pixelIndex * 4;
      if(photo === 2){ // RGB
        rgba[out] = strip[base] ?? 0;
        rgba[out+1] = strip[base+1] ?? rgba[out];
        rgba[out+2] = strip[base+2] ?? rgba[out];
        rgba[out+3] = samplesPerPixel >= 4 ? (strip[base+3] ?? 255) : 255;
      } else { // grayscale fallback
        const g = strip[base] ?? 0;
        rgba[out] = g; rgba[out+1] = g; rgba[out+2] = g; rgba[out+3] = 255;
      }
      pixelIndex++;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(width, height);
  imageData.data.set(rgba);
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

async function tiffFileToDataUrl(file){
  const buffer = await file.arrayBuffer();
  // First try a manual decoder for uncompressed 8-bit TIFFs (works for Photoshop-style sketches).
  try {
    return decodeRawTiffToDataUrl(buffer);
  } catch (manualErr) {
    console.warn('Manual TIFF decode failed, falling back to UTIF', manualErr);
  }

  if(!window.UTIF) throw new Error('UTIF not loaded');
  const ifds = UTIF.decode(buffer);
  if(!ifds || !ifds.length) throw new Error('TIFF decode failed');
  const page = ifds[0];
  if(typeof UTIF.decodeImage === 'function'){
    UTIF.decodeImage(buffer, page, ifds);
  } else if(typeof UTIF.decodeImages === 'function'){
    UTIF.decodeImages(buffer, ifds);
  }
  const width = page.width || page.t256 || (page['t256']&&page['t256'][0]);
  const height = page.height || page.t257 || (page['t257']&&page['t257'][0]);
  if(!width || !height) throw new Error('TIFF size missing');
  const rgba = UTIF.toRGBA8(page);
  if(!(rgba && rgba.length)) throw new Error('TIFF rgba decode failed');

  const canvas=document.createElement('canvas');
  canvas.width=width; canvas.height=height;
  const ctx=canvas.getContext('2d');
  const imageData=ctx.createImageData(width, height);
  imageData.data.set(new Uint8ClampedArray(rgba));
  ctx.putImageData(imageData,0,0);
  return canvas.toDataURL('image/png');
}

async function handleImageUpload(event){
  const file=event.target.files[0];
  if(!file) return;
  const isTiff=/\.(tif|tiff)$/i.test(file.name) || /tiff?/i.test(file.type||'');
  try{
    if(isTiff){
      uploadedArtData=await tiffFileToDataUrl(file);
    } else {
      uploadedArtData=await new Promise((resolve,reject)=>{
        const reader=new FileReader();
        reader.onload=e=>resolve(e.target.result);
        reader.onerror=()=>reject(reader.error||new Error('read failed'));
        reader.readAsDataURL(file);
      });
    }
    await new Promise((resolve)=>{
      const probe = new Image();
      probe.onload = ()=>resolve();
      probe.onerror = ()=>resolve();
      probe.src = uploadedArtData;
    });
    updateAll();
  }catch(err){
    console.error(err);
    alert(isTiff ? 'Не удалось открыть TIFF. Проверь, что декодер TIFF загрузился, или временно конвертируй файл в PNG/WebP.' : 'Не удалось прочитать изображение.');
  }finally{
    event.target.value='';
  }
}
function collectState(){
  const ids=['name','size','type','subtype','alignment','cr','ac','hp','hitDice','autoHitDice','autoAC','speedWalk','speedClimb','speedSwim','speedFly','speedBurrow','speedSpecial','str','dex','con','int','wis','cha','saveStr','saveDex','saveCon','saveInt','saveWis','saveCha','senseBlindsight','senseDarkvision','senseTremorsense','senseTruesight','passivePerception','autoPassivePerception','languages','dpr','attackBonus','saveDc','balanceNote','legendaryDescription','lairDescription','layoutMode','description','calloutText'];
  const state={fields:{}, tags:{}, entries:deepClone(entryState), skillEntries:deepClone(skillEntries), art:uploadedArtData};
  ids.forEach(id=>{const el=document.getElementById(id); if(el) state.fields[id]=el.type==='checkbox'?el.checked:el.value;});
  ['resistances','immunities','vulnerabilities','conditionImmunities'].forEach(key=>state.tags[key]=checkedValues(key));
  return state;
}
function applyState(state){
  Object.entries(state.fields||{}).forEach(([id,value])=>{const el=document.getElementById(id); if(!el) return; if(el.type==='checkbox') el.checked=Boolean(value); else el.value=value;});
  uploadedArtData=state.art||'';
  ['resistances','immunities','vulnerabilities','conditionImmunities'].forEach(key=>{ Array.from(document.querySelectorAll(`#${key} input[type="checkbox"]`)).forEach(input=>{ input.checked=(state.tags?.[key]||[]).includes(input.value); input.parentElement.classList.toggle('active',input.checked); }); });
  skillEntries=Array.isArray(state.skillEntries)?state.skillEntries:[]; renderSkills();
  ENTRY_TYPES.forEach(type=>{ entryState[type]=Array.isArray(state.entries?.[type])?state.entries[type]:[]; entryState[type].forEach(item=>syncEntryShape(item)); renderEntryList(type); });
  updateAll();
}
function downloadJSON(){ const blob=new Blob([JSON.stringify(collectState(),null,2)],{type:'application/json;charset=utf-8'}); triggerDownload(blob,`${slugify(text('name')||'monster')}.json`); }
function loadJSON(){ document.getElementById('jsonLoader').click(); }
function handleJSONLoad(event){ const file=event.target.files[0]; if(!file) return; const reader=new FileReader(); reader.onload=e=>{ try{ applyState(JSON.parse(e.target.result)); }catch(err){ alert('Не удалось прочитать JSON. Проверь файл.'); console.error(err); } }; reader.readAsText(file,'utf-8'); event.target.value=''; }
function triggerDownload(blob, filename){ const link=document.createElement('a'); link.href=URL.createObjectURL(blob); link.download=filename; document.body.appendChild(link); link.click(); setTimeout(()=>{URL.revokeObjectURL(link.href); link.remove();},700); }
function applyContainExportStyles(root){
  const art = root.querySelector('.showcase-art');
  const img = root.querySelector('#monsterArt');
  if(!art || !img) return;
  const srcImg = document.getElementById('monsterArt');
  const naturalW = (srcImg && srcImg.naturalWidth) || img.naturalWidth || 0;
  const naturalH = (srcImg && srcImg.naturalHeight) || img.naturalHeight || 0;
  if(!naturalW || !naturalH) return;

  const rectW = art.clientWidth || art.offsetWidth || parseFloat(getComputedStyle(art).width) || 0;
  const rectH = art.clientHeight || art.offsetHeight || parseFloat(getComputedStyle(art).height) || 0;
  if(!rectW || !rectH) return;

  const imgRatio = naturalW / naturalH;
  const boxRatio = rectW / rectH;
  let drawW, drawH;
  if(imgRatio > boxRatio){
    drawW = rectW;
    drawH = rectW / imgRatio;
  } else {
    drawH = rectH;
    drawW = rectH * imgRatio;
  }
  const left = (rectW - drawW) / 2;
  const top = rectH - drawH;

  art.style.position = 'relative';
  art.style.overflow = 'hidden';
  img.style.position = 'absolute';
  img.style.inset = 'auto';
  img.style.width = `${drawW}px`;
  img.style.height = `${drawH}px`;
  img.style.maxWidth = 'none';
  img.style.maxHeight = 'none';
  img.style.left = `${left}px`;
  img.style.top = `${top}px`;
  img.style.objectFit = 'fill';
}

async function downloadPNG() {
  updateAll();
  const node=document.getElementById('previewCanvas');
  const filename=`${slugify(text('name')||'monster')}.png`;
  const liveImg = document.getElementById('monsterArt');
  const savedImgStyle = liveImg ? liveImg.getAttribute('style') || '' : null;
  if(liveImg) applyContainExportStyles(document);

  if(window.html2canvas){
    try{
      const canvas=await window.html2canvas(node, {
        backgroundColor: '#0d1220',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        imageTimeout: 0
      });
      if(liveImg){
        if(savedImgStyle) liveImg.setAttribute('style', savedImgStyle); else liveImg.removeAttribute('style');
      }
      canvas.toBlob(blob=>{
        if(blob) triggerDownload(blob, filename);
        else alert('PNG не удалось собрать.');
      }, 'image/png');
      return;
    }catch(err){
      console.error('html2canvas export failed, fallback to SVG', err);
      if(liveImg){
        if(savedImgStyle) liveImg.setAttribute('style', savedImgStyle); else liveImg.removeAttribute('style');
      }
    }
  }

  const clone=node.cloneNode(true);
  applyContainExportStyles(clone);
  const wrapper=document.createElement('div');
  wrapper.setAttribute('xmlns','http://www.w3.org/1999/xhtml');
  wrapper.appendChild(clone);
  const styleText=Array.from(document.styleSheets).map(sheet=>{ try{return Array.from(sheet.cssRules).map(rule=>rule.cssText).join('\n');}catch(e){return ''; } }).join('\n');
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${node.offsetWidth}" height="${node.offsetHeight}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml"><style>${styleText}</style>${wrapper.innerHTML}</div></foreignObject></svg>`;
  const img=new Image();
  const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
  img.onload=()=>{
    const canvas=document.createElement('canvas');
    canvas.width=node.offsetWidth*2;
    canvas.height=node.offsetHeight*2;
    const ctx=canvas.getContext('2d');
    ctx.scale(2,2);
    ctx.fillStyle='#0d1220';
    ctx.fillRect(0,0,node.offsetWidth,node.offsetHeight);
    ctx.drawImage(img,0,0);
    if(liveImg){
      if(savedImgStyle) liveImg.setAttribute('style', savedImgStyle); else liveImg.removeAttribute('style');
    }
    canvas.toBlob(blob=>{
      if(blob) triggerDownload(blob, filename);
      else alert('PNG не собрался в этом браузере.');
      URL.revokeObjectURL(url);
    },'image/png');
  };
  img.onerror=()=>{
    if(liveImg){
      if(savedImgStyle) liveImg.setAttribute('style', savedImgStyle); else liveImg.removeAttribute('style');
    }
    alert('PNG-экспорт не сработал.');
    URL.revokeObjectURL(url);
  };
  img.src=url;
}

function openHelp(title,text,image){ document.getElementById('helpTitle').textContent=title; document.getElementById('helpText').textContent=text; const img=document.getElementById('helpImage'); if(image){ img.src=image; img.hidden=false; } else { img.hidden=true; img.removeAttribute('src'); } document.getElementById('helpModal').hidden=false; }
function closeHelp(){ document.getElementById('helpModal').hidden=true; }

function bindGlobalUI(){
  document.querySelectorAll('input,select,textarea').forEach(el=>{ el.addEventListener('input',updateAll); el.addEventListener('change',updateAll); if(el.tagName==='TEXTAREA') attachAutoGrow(el); });
  document.getElementById('jsonLoader').addEventListener('change',handleJSONLoad);
  document.getElementById('imageUpload').addEventListener('change',handleImageUpload);
  document.querySelectorAll('.help-btn').forEach(btn=>btn.addEventListener('click',()=>openHelp(btn.dataset.helpTitle||'Подсказка',btn.dataset.helpText||'',btn.dataset.helpImage||'')));
  document.getElementById('helpModal').addEventListener('click',e=>{if(e.target.id==='helpModal') closeHelp();});
  document.getElementById('entryModal').addEventListener('click',e=>{if(e.target.id==='entryModal') closeEntryModal();});
  document.querySelectorAll('.entry-add').forEach(btn=>btn.addEventListener('click',()=>openEntryModal(btn.dataset.section)));
  document.querySelectorAll('.summary-tools .help-btn').forEach(btn=>{ btn.addEventListener('click',e=>{e.preventDefault(); e.stopPropagation();}); btn.addEventListener('mousedown',e=>{e.preventDefault(); e.stopPropagation();}); });
  document.addEventListener('click',e=>{ const btn=e.target.closest('.help-btn'); if(btn && btn.closest('summary')){ e.preventDefault(); e.stopPropagation(); openHelp(btn.dataset.helpTitle||'Подсказка',btn.dataset.helpText||'',btn.dataset.helpImage||''); } });
  document.addEventListener('mousedown',e=>{ const btn=e.target.closest('.help-btn'); if(btn && btn.closest('summary')){ e.preventDefault(); e.stopPropagation(); } });
}

document.addEventListener('DOMContentLoaded',()=>{
  initStaticUI(); bindGlobalUI();
  entryState.traits.push({id:uid(),kind:'free',section:'traits',title:'Острое зрение',text:'Монстр совершает проверки Мудрости (Восприятие), основанные на зрении, с преимуществом.'});
  entryState.actions.push({
    id:uid(), kind:'attack', section:'actions', title:'Укус', usage:{mode:'none',custom:''},
    attack:{mode:'melee',category:'weapon',ability:'str',proficient:true,manualToHit:false,toHit:0,reach:5,target:'одна цель',otherLabel:''},
    damage:{average:5,manualDice:false,dice:'',type:'колющий'}, extraHit:{enabled:false,mode:'other',saveAbility:'wis',manualDc:false,dc:13,text:''}, miss:{enabled:false,text:''}
  });
  addSkill({skillId:'perception', prof:1});
  renderAllEntryLists();
  updateAll();
  // обработчик сворачивания боковой панели
  const collapseBtn=document.getElementById('collapseBtn');
  if(collapseBtn){
    collapseBtn.addEventListener('click',()=>{
      const app=document.querySelector('.app');
      if(app){
        app.classList.toggle('sidebar-collapsed');
      }
    });
  }
});
