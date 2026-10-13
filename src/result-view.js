import {asset,portrait} from './assets.js';
import {CHARACTERS} from './game.js';
export function renderResult(match){
 const $=s=>document.querySelector(s),draw=match.winner===-1,winner=draw?0:match.winner,loser=1-winner,label=draw?'draw':winner===0?'win':'defeat';
 $('#result-logo').src=asset('ui/logos/'+label);$('#result-logo').alt=label.toUpperCase();$('#result-title').textContent=draw?'무승부':winner===0?'섹터를 제압했습니다.':'다음 비트를 다시 읽어라.';$('#result-detail').textContent='ROUND '+match.round+' / HP '+match.fighters[0].hp+' : '+match.fighters[1].hp+' / 중앙 점령 '+match.score.join(' : ');
 $('#result-winner').src=portrait(match.fighters[winner].character,draw?'lose':'win');$('#result-winner').alt=CHARACTERS[match.fighters[winner].character].name+(draw?' / 무승부':' / 승리');$('#result-loser').src=portrait(match.fighters[loser].character,'lose');$('#result-loser').alt=CHARACTERS[match.fighters[loser].character].name+(draw?' / 무승부':' / 패배');
}
