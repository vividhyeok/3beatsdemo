from pathlib import Path
import json

root=Path(__file__).resolve().parents[1]
out=root/'docs'/'balance'
before=json.loads((out/'baseline.json').read_text(encoding='utf-8'))
after=json.loads((out/'current.json').read_text(encoding='utf-8'))
metrics=json.loads((out/'skill-metrics.json').read_text(encoding='utf-8')) if (out/'skill-metrics.json').exists() else {}
changes={
 'jack_dash':'20 / 40 / 20 → 25 / 25 / 15',
 'jack_spin':'25 / 40 / 20 → 30 / 35 / 20',
 'raven_trap':'20 / 40 / 20 → 15 / 45 / 25; 설치 거리 2 → 3',
 'raven_push':'25 / 40 / 20 → 20 / 40 / 20; 전방 3칸 스침 추가',
 'raven_ult':'55 / 60 / 30 → 45 / 65 / 30',
 'zeta_slide':'20 / 40 / 20 → 15 / 40 / 20; 측면 이동 → 전방 대각 이동',
 'zeta_long':'15 / 0 / 0 → 10 / 0 / 0',
 'zeta_brake':'20 / 0 / 0 → 10 / 0 / 0; 방어 15 → 30; 공격 회피 시 EN +15',
 'zeta_ult':'55 / 60 / 30 → 45 / 60 / 30',
 'eve_pierce':'20 / 40 / 20 유지; 1칸 직격 → 스침'}
names=['jack','eve','raven','zeta']
def table(data):
 rows=['| 플레이어 / CPU | JACK | EVE | RAVEN | ZETA |','|---|---:|---:|---:|---:|']
 for a in names:
  rows.append('| '+a.upper()+' | '+' | '.join(f"{data['matchups'][a+'-vs-'+b]['scoreRate']:.1%}" for b in names)+' |')
 return '\n'.join(rows)
intro='''고정 시드 20261016. 각 방향별 캐릭터 대결 36경기, 총 576경기. 9개 휴리스틱 전략을 섞었다. 승률은 무승부를 0.5승으로 계산했다. 각 셀의 95% 정규 근사 반폭은 약 13~16%p로, 작은 차이를 우열로 판정할 수 없다. 전략 선택과 표본이 제한적이며 탐색 기반 최적 전략의 결과는 아니다.\n\n132개 서로 다른 위치, 16개 캐릭터 조합의 정적 단일 비트 행동 후보를 열거했다. 전체 후보 쌍 수는 369,480개다. 이 수는 엔진 `resolveRound`로 모두 실행한 수가 아니며, 방향, 사거리, 합법적인 목표 칸을 열거한 결과다. 3비트 조합 전체와 전체 경기 상태공간의 완전탐색은 수행하지 않았다.\n'''
single='''\n패치 후에는 `npm run balance:exhaustive`로 4×3의 순서 있는 132개 위치와 16개 캐릭터 조합에서 충분한 EN을 둔 첫 비트 후보 406,344쌍을 검사했다. 두 RAVEN이 동시에 궁극기를 사용하려는 132쌍은 한 개만 존재할 수 있는 함정 소유권 때문에 제외하고, 406,212쌍을 실제 엔진에서 실행했다. 각 결과는 `one-beat-cases.ndjson.gz`에 기록했다. 이 전수검사는 EN 부족, 여러 함정 이력, 선행 비트에 따른 위치와 자원 상태 전체를 포함하지 않는다.\n'''
(out/'baseline.md').write_text('# 패치 전 기준값\n\n'+intro+'\n'+table(before)+'\n',encoding='utf-8')
(out/'matchup-matrix.md').write_text('# 캐릭터 상성\n\n'+intro+single+'\n## 패치 전\n\n'+table(before)+'\n\n## 패치 후\n\n'+table(after)+'\n',encoding='utf-8')
rows=['# 카드별 단일 비트 분석','',intro,single,'아래 비율과 평균은 엔진을 실행한 첫 비트 상태를 동일하게 가중한 값이다. 실제 경기 출현 빈도나 카드의 승률 기여도가 아니다. 위치 변경에는 상대 넉백도 포함될 수 있다. 피해 감소는 이 카드 사용자가 받은 공격의 원피해와 실제 HP 손실의 차이다.','', '| 카드 | EN 전→후 | 직격 % | 스침 % | 평균 실제 피해 | 위치 변경 % | 충돌 % | 평균 피해 감소 | 변경 |','|---|---:|---:|---:|---:|---:|---:|---:|---|']
for c in before['cards']:
 id=c['id'];new=next(x for x in after['cards'] if x['id']==id)
 m=metrics.get(id,{})
 rows.append(f"| {id} | {c['cost']} → {new['cost']} | {m.get('directRate',0):.1%} | {m.get('grazeRate',0):.1%} | {m.get('meanActualDamage',0):.1f} | {m.get('positionChangeRate',0):.1%} | {m.get('blockRate',0):.1%} | {m.get('meanDamageReduction',0):.1f} | {changes.get(id,'유지')} |")
(out/'skill-analysis.md').write_text('\n'.join(rows)+'\n',encoding='utf-8')
report=['# 최종 밸런스 리포트','',intro,single,'## 기준값과 패치 후 결과','',table(before),'',table(after),'','## 변경 내역','']
for id,change in changes.items():report.append(f'- `{id}`: {change}')
report+=['','그 외 카드는 수치를 유지했다. 4×3 전장의 빠른 교전을 유지하면서 ZETA의 대각 진입과 RAVEN의 설치 사거리를 먼저 시험했다. 일반 이동은 여전히 고유 이동 공격에 비해 기회비용이 크며 후속 패치에서 검증해야 한다.','', '## 관찰','',
f"- JACK → ZETA: {before['matchups']['jack-vs-zeta']['scoreRate']:.1%} → {after['matchups']['jack-vs-zeta']['scoreRate']:.1%}.",
f"- ZETA → EVE: {before['matchups']['zeta-vs-eve']['scoreRate']:.1%} → {after['matchups']['zeta-vs-eve']['scoreRate']:.1%}.",
f"- RAVEN → EVE: {before['matchups']['raven-vs-eve']['scoreRate']:.1%} → {after['matchups']['raven-vs-eve']['scoreRate']:.1%}. 여전히 취약하다.",
'','## 남은 위험','',
'- 이 시뮬레이터의 전략은 휴리스틱이며 JACK 돌진 연계의 최적 대응, 3비트 전수탐색, 모든 EN 및 함정 경계 상태를 검증하지 못했다.',
'- 정적 사거리 수치는 실제 피해나 카드별 승률 기여도를 나타내지 않는다.',
'- 아트 에셋은 새로 생성했으나 컨택트 시트에서 선화가 단순하게 보여 상용 일러스트 품질 목표에는 추가 작업이 필요하다.',
'- 다음 패치에서는 RAVEN 대 EVE, 위치별 편향, 회피 환급의 악용 가능성, 일반 이동 사용률을 더 많은 시드와 대응형 정책으로 검증해야 한다.','']
(out/'FINAL_BALANCE_REPORT.md').write_text('\n'.join(report),encoding='utf-8')
print('Wrote balance reports')
