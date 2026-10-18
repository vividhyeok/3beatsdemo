# THREE BEATS / SECTOR 12

4×3 전장에서 카드 세 장을 예약하고 양쪽 행동을 비트마다 동시에 해결하는 웹게임입니다. 네 명의 파이터, AI 대전, 실제 1:1 온라인 대전용 Node 서버가 있습니다.

## 실행

```sh
npm run start:online   # http://localhost:8080 — AI + 온라인 방 서버
npm test
npm run test:browser
npm run test:online-browser
npm run build
```

`npm run build`는 Vercel용 정적 `dist/`를 만듭니다. 정적 배포에 온라인 서버가 연결되지 않았다면 ONLINE 버튼은 명확히 비활성화됩니다. 현재 온라인 서버는 프로세스 메모리에 방을 저장하므로 **단일 Node 인스턴스에서만** 동작합니다. 프로세스가 재시작되면 방이 사라집니다. Vercel의 여러 Functions 인스턴스에 그대로 올려서는 일관된 대전이 되지 않습니다. 운영 온라인 모드에는 공유 영속 저장소와 서버 배포가 필요합니다.

## 플레이

- AI 대전: 파이터와 AI 난이도를 선택하고 카드 세 장을 예약합니다. 예약 카드를 탭하면 삭제하고, 각 비트 아래 화살표로 탭만으로 순서를 바꿀 수 있습니다. 드래그도 지원합니다.
- 방향이 있는 카드와 레이븐 함정은 방향 또는 타일을 선택합니다. 실행 중에는 입력이 잠깁니다. 비트별 상대 카드 공개, 이동, 실제 공격 범위, HIT/GRAZE/MISS/GUARD, HP·EN, 결과 화면을 볼 수 있습니다.
- 재대전, 파이터 변경, 메뉴 복귀, 일시정지, 건너뛰기, 2배속을 지원합니다. 필수 이미지가 실패하면 캐릭터 선택 화면에서 원인을 보여주고 다시 시도할 수 있습니다.
- 온라인 대전: `npm run start:online` 후 각자 다른 기기에서 서버 주소에 접속합니다. 한 명이 방을 만들고 초대 URL을 공유합니다. 양쪽 파이터와 준비 상태가 모이면 시작합니다. 명령은 양쪽이 제출할 때까지 서버에서 비공개이며 서버가 같은 `src/game.js`로 판정합니다. 새로고침 후 세션을 복원하고 상대 연결 상태를 표시합니다.

모바일에서는 세로 스크롤로 카드와 예약 영역에 접근합니다. 가로 스크롤 없이 360px 너비부터 동작하도록 구성했습니다. 실제 물리 기기의 메모리 및 WebKit 동작은 별도 확인이 필요합니다.

## 구조와 제한

- `src/game.js`: 결정론적 이동, 충돌, 공격, 방어, 함정, 승패 판정. AI와 온라인 서버가 공유합니다. 전진/후퇴는 비트 시작 시 상대 위치로 해석하고, 공격은 이동 후 실제 위치에서 판정합니다.
- `src/app.js`, `src/preload.js`: AI 모드 UI, Worker와 애니메이션 취소, 동시 두 장 이하 필수 이미지 확인 및 재시도.
- `src/combat-view.js`, `src/result-view.js`: 전투 연출과 결과 표시.
- `server/online-core.mjs`, `server/online-server.mjs`, `src/online-client.js`: HTTP 폴링 기반 1:1 방, 독립 토큰, 서버 검증, 비공개 명령, 재접속, 오래된 방 정리. 서버는 단일 프로세스 메모리 저장 방식입니다.
- `game_ready/`: 76개 WebP 에셋. `docs/asset-pack/asset_manifest.json`이 목록의 기준입니다.

## 광고 설정

광고는 기본적으로 꺼져 있으며 실제 광고처럼 보이는 대체 콘텐츠를 표시하지 않습니다. 승인된 AdSense 계정과 메뉴·결과 화면의 실제 광고 슬롯, 동의 관리 설정이 준비된 경우에만 빌드 환경 변수 `ADS_ENABLED=1`, `ADS_CONSENT_READY=1`, `AD_CLIENT=ca-pub-...`, `AD_MENU_SLOT`, `AD_RESULT_SLOT`을 설정할 수 있습니다. 하나라도 없거나 형식이 맞지 않으면 빌드된 광고 설정은 비활성화됩니다. 전투 화면에는 광고 슬롯이 없습니다. 광고 로딩에 실패하면 슬롯을 숨깁니다.

AdSense의 [반응형 광고 코드 안내](https://support.google.com/adsense/answer/9183460?hl=en)와 [EEA·영국·스위스 동의 관리 요구사항](https://support.google.com/adsense/answer/13554116?hl=en)을 확인하고 계정에서 승인된 코드를 사용해야 합니다. 광고 실제 송출은 계정 승인과 설정 후 별도로 확인해야 합니다.

## 검증

`npm test`는 게임 규칙, 4×3 주요 좌표 조합, AI, 온라인 두 클라이언트 HTTP 흐름을 검사합니다. `npm run test:browser`는 실제 Chromium 입력으로 메뉴부터 결과·재대전까지 검사하며 필수 이미지 실패 복구, 10회 재시작, 모바일 배치와 탭 순서 변경을 포함합니다. `npm run test:online-browser`는 분리된 브라우저 컨텍스트 두 개로 방 입장, 비공개 명령, 판정 동기화, 재연결을 검증합니다. GitHub Actions에서 모두 실행합니다.

자세한 검증 결과와 운영 배포 상태는 [릴리스 보고서](docs/RELEASE_REPORT.md)에 기록합니다.
