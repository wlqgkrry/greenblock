# greenblock 로컬 실행 가이드

`greenblock`은 팀 협업툴 화면에 만세력 기반 커뮤니케이션 가이드를 붙이는 프로토타입입니다.

현재는 배포 전 로컬 개발 버전입니다. 프론트엔드는 브라우저에서 실행되고, 백엔드는 Spring Boot로 실행됩니다. LLM 분석은 비용이 들지 않도록 Ollama 로컬 모델을 기본으로 사용합니다.

## 폴더 구조

```text
greenblock/
frontend/  React + TypeScript + Vite
backend/   Spring Boot + Gradle + MySQL + LLM API
```

배포 관련 파일은 아직 추가하지 않았습니다.

## 문서

프로젝트 소개와 설계 내용은 아래 문서에서 확인할 수 있습니다.

```text
docs/service-introduction.md      협업툴 서비스 소개서
docs/service-introduction.pdf     협업툴 서비스 소개서 PDF
docs/functional-specification.md  기능명세서 및 설계문서
docs/functional-specification.pdf 기능명세서 및 설계문서 PDF
```

## 먼저 설치할 프로그램

아래 프로그램이 설치되어 있어야 합니다.

```text
Node.js 22 이상
Java 17 이상
MySQL 8 이상
Ollama
```

설치 확인 명령:

```powershell
node -v
npm -v
java -version
```

Ollama는 설치 후 새 PowerShell을 열고 확인합니다.

```powershell
ollama --version
```

만약 `ollama` 명령을 못 찾는다고 나와도, 이 프로젝트의 스크립트는 기본 설치 경로를 직접 찾도록 되어 있습니다.

## 1. 프로젝트 폴더로 이동

PowerShell을 열고 프로젝트 폴더로 이동합니다.

```powershell
cd <프로젝트_경로>\greenblock
```

예를 들어 현재 PowerShell 위치에 `greenblock` 폴더가 있다면:

```powershell
cd .\greenblock
```

## 2. MySQL 준비

백엔드는 기본적으로 로컬 MySQL을 사용합니다.

기본 접속 정보:

```text
host: localhost
port: 3306
database: greenblock
username: root
password: 빈 값
```

본인 MySQL 비밀번호가 있다면 백엔드를 실행하기 전에 PowerShell에서 환경변수를 지정합니다.

```powershell
$env:GREENBLOCK_DB_USERNAME="root"
$env:GREENBLOCK_DB_PASSWORD="본인_MySQL_비밀번호"
```

처음 실행하는 PC라면 `greenblock` 데이터베이스를 만들고 스키마를 적용합니다.

```powershell
mysql -u root -p
```

MySQL 콘솔에서:

```sql
CREATE DATABASE IF NOT EXISTS greenblock
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE greenblock;
SOURCE <프로젝트_경로>/greenblock/backend/src/main/resources/db/schema.sql;
```

다른 PC라면 `SOURCE` 경로만 본인 프로젝트 위치에 맞게 바꿉니다.

## 3. 로컬 LLM 모델 받기

OpenAI API 비용 없이 테스트하려면 Ollama 모델을 한 번 받아야 합니다.

```powershell
cd <프로젝트_경로>\greenblock\backend
.\scripts\pull-local-llm-model.ps1
```

기본 모델은 `llama3.2:3b`입니다. 약 2GB 정도 다운로드됩니다.

다른 모델을 쓰고 싶다면:

```powershell
.\scripts\pull-local-llm-model.ps1 -Model "gemma3:4b"
```

처음에는 기본 모델을 추천합니다.

## 4. 실행 방법 선택

greenblock은 두 가지 방식으로 실행할 수 있습니다.

```text
방법 A. 분할 실행
PowerShell 창을 2개 열고 백엔드와 프론트엔드를 따로 켭니다.

방법 B. 통합 실행
루트 스크립트 하나로 백엔드와 프론트엔드를 새 PowerShell 창에서 같이 켭니다.
```

분석 버튼이 직접 PowerShell 스크립트를 실행하는 것은 아닙니다. 브라우저 보안상 웹페이지 버튼이 사용자의 `.ps1` 파일을 직접 실행할 수 없습니다.

실제 흐름은 아래와 같습니다.

```text
브라우저에서 LLM 분석 버튼 클릭
frontend가 backend API로 요청
backend가 Ollama 로컬 LLM에 요청
backend가 결과를 frontend에 반환
frontend가 결과를 화면에 표시
```

따라서 버튼을 누르기 전에 백엔드와 프론트엔드가 미리 켜져 있어야 합니다.

## 5-A. 분할 실행 방법

### 5-A-1. 백엔드 실행

백엔드는 로컬 LLM 모드로 실행합니다.

```powershell
cd <프로젝트_경로>\greenblock\backend
.\scripts\start-local-llm-dev.ps1
```

정상 실행되면 마지막 부분에 이런 로그가 나옵니다.

```text
Started GreenblockBackendApplication
Tomcat started on port 8080
```

이 PowerShell 창은 닫지 말고 그대로 둡니다. 서버가 실행 중인 상태입니다.

백엔드 확인 주소:

```text
http://localhost:8080/api/health
```

브라우저에서 열었을 때 `ok`가 보이면 백엔드가 켜진 것입니다.

### 5-A-2. 프론트엔드 실행

새 PowerShell 창을 하나 더 엽니다.

처음 한 번만 패키지를 설치합니다.

```powershell
cd <프로젝트_경로>\greenblock\frontend
npm install
```

프론트가 백엔드 주소를 알 수 있도록 `.env` 파일을 만듭니다.

```powershell
Copy-Item .env.example .env
```

프론트를 실행합니다.

```powershell
npm run dev
```

보통 아래 주소로 접속합니다.

```text
http://localhost:5173
```

Vite가 다른 주소를 안내하면 그 주소로 접속합니다.

## 5-B. 통합 실행 방법

프론트엔드와 백엔드를 매번 따로 켜기 번거롭다면 루트 통합 스크립트를 사용합니다.

이미 greenblock 백엔드가 켜져 있으면 통합 스크립트가 그대로 재사용합니다. 다만 8080 포트를 다른 프로그램이 쓰고 있으면 백엔드를 새로 켤 수 없으므로, 해당 프로그램을 먼저 종료해야 합니다.

PowerShell을 열고 프로젝트 루트에서 실행합니다.

```powershell
cd <프로젝트_경로>\greenblock
.\scripts\start-dev.ps1
```

이 스크립트가 하는 일:

```text
frontend/node_modules가 없으면 npm install 실행
frontend/.env가 없으면 .env.example을 복사해 생성
Ollama 모델 llama3.2:3b 확인 및 다운로드
백엔드를 로컬 LLM 모드로 새 PowerShell 창에서 실행
이미 백엔드가 켜져 있으면 새로 띄우지 않고 재사용
프론트엔드를 새 PowerShell 창에서 실행
```

다른 모델을 쓰고 싶다면:

```powershell
.\scripts\start-dev.ps1 -BackendModel "gemma3:4b"
```

이미 패키지와 모델이 준비되어 있어 확인 과정을 건너뛰고 싶다면:

```powershell
.\scripts\start-dev.ps1 -SkipInstall
```

통합 실행 후 새로 열린 두 PowerShell 창은 닫지 마세요. 하나는 백엔드 서버, 하나는 프론트엔드 서버입니다.

## 6. 화면에서 분석해보기

브라우저에서 아래 순서로 진행합니다.

```text
로그인
워크스페이스 홈
팀원 선택 또는 팀원 등록
만세력 붙여넣기
만세력 원문 붙여넣기
LLM에 보내서 분석하기
```

분석 버튼을 누르면 프론트가 백엔드 `localhost:8080`으로 요청하고, 백엔드가 Ollama `localhost:11434`로 요청합니다.

따라서 아래 3개가 모두 켜져 있어야 합니다.

```text
frontend: http://localhost:5173
backend:  http://localhost:8080
ollama:   http://localhost:11434
```

## test-llm-analysis.ps1는 언제 쓰나요?

`.\scripts\test-llm-analysis.ps1`는 실제 사용자가 매번 실행하는 명령이 아닙니다.

이 스크립트는 개발자 진단용입니다.

```text
프론트 버튼으로 분석하기 = 실제 사용 방법
test-llm-analysis.ps1 = 백엔드와 Ollama 연결 확인용 테스트
```

평소에는 아래 두 개만 실행하면 됩니다.

```powershell
# PowerShell 1
cd <프로젝트_경로>\greenblock\backend
.\scripts\start-local-llm-dev.ps1
```

```powershell
# PowerShell 2
cd <프로젝트_경로>\greenblock\frontend
npm run dev
```

분석 버튼이 안 될 때만 새 PowerShell에서 테스트합니다.

```powershell
cd <프로젝트_경로>\greenblock\backend
.\scripts\test-llm-analysis.ps1
```

결과에 아래처럼 나오면 LLM 연결은 된 것입니다.

```text
provider: ollama
model: llama3.2:3b
usedFallback: False
```

## 만세력 붙여넣기 방식

현재 greenblock은 외부 만세력 사이트를 자동 호출하지 않습니다.

안전한 MVP 흐름:

```text
사용자가 직접 만세력 조회
결과 텍스트 복사
greenblock에 붙여넣기
greenblock이 연주·월주·일주·시주 재구성
LLM 분석 결과 표시
```

예를 들어 아래처럼 붙여넣으면 됩니다.

```text
양력
2025년 3월 4일
시간
02시 03분(서울)
절입기준
2025년 02월 03일 23시 10분 (입춘)
```

이 경우 greenblock은 다음처럼 보정합니다.

```text
연주 을사
월주 무인
일주 임신
시주 신축
```

대운은 현재 분석 대상에서 제외했습니다.

## 자주 생기는 문제

백엔드가 안 켜질 때:

```text
MySQL이 켜져 있는지 확인합니다.
MySQL 비밀번호가 있으면 GREENBLOCK_DB_PASSWORD를 설정합니다.
8080 포트를 다른 프로그램이 쓰고 있지 않은지 확인합니다.
```

분석 버튼을 눌러도 결과가 안 보일 때:

```text
백엔드가 켜져 있는지 http://localhost:8080/api/health 를 확인합니다.
Ollama가 설치되어 있는지 확인합니다.
모델을 받았는지 .\scripts\pull-local-llm-model.ps1 를 확인합니다.
프론트 .env에 VITE_API_BASE_URL=http://localhost:8080 이 있는지 확인합니다.
```

PowerShell에서 한글이 깨져 보일 때:

```powershell
chcp 65001
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
```

프론트 브라우저 화면은 PowerShell보다 한글 표시가 안정적입니다.

## OpenAI API로 바꾸고 싶을 때

기본은 비용 없는 Ollama 로컬 LLM입니다.

OpenAI API를 쓰고 싶다면 백엔드를 아래처럼 실행합니다.

```powershell
cd <프로젝트_경로>\greenblock\backend
.\scripts\start-llm-dev.ps1
```

스크립트가 API key를 물어보면 OpenAI Platform에서 발급받은 key를 입력합니다.

OpenAI API는 ChatGPT 구독과 별도 과금입니다.

## 현재 구현 상태

```text
로그인 화면
워크스페이스 홈
팀원 등록
팀원 상세
만세력 붙여넣기
로컬 LLM 분석
메시지 작성
캘린더 등록/삭제
```

현재 프론트 데이터는 브라우저 localStorage에 저장됩니다. 실제 운영 배포 전에는 인증, DB 저장 정책, 개인정보 보관/삭제 정책을 확정해야 합니다.

## 실제 배포 전 바꿔야 할 설정

단순히 데모 화면을 배포하는 정도라면 설정이 많지 않습니다. 하지만 다른 사람이 실제로 가입하고 팀원 정보를 저장하게 만들려면 운영 설정을 반드시 분리해야 합니다.

필수로 바꿔야 할 것:

```text
API 주소
localhost 대신 실제 백엔드 도메인을 사용하도록 VITE_API_BASE_URL 설정

CORS
백엔드에서 허용할 프론트엔드 도메인만 등록

DB
로컬 MySQL 대신 운영 MySQL 또는 관리형 DB 사용
DB 계정, 비밀번호, URL은 코드가 아니라 환경변수로 관리

인증
소셜 로그인 OAuth client id, client secret, redirect URI를 운영 도메인 기준으로 재설정

LLM
개발용 Ollama를 계속 쓸지, 서버 Ollama나 OpenAI API로 바꿀지 결정
API key나 모델 설정은 환경변수로 관리

개인정보 정책
이름, 성별, 생년월일, 태어난 시간, 태어난 장소, 만세력 원문, 분석 결과를 저장할지 결정
저장한다면 삭제 기능, 보관 기간, 접근 권한, 암호화 정책 필요

배포 방식
frontend는 정적 빌드 또는 CDN/호스팅에 배포
backend는 jar 또는 Docker로 배포
HTTPS, 로그, 백업, 장애 대응 설정 필요
```

정리하면, “기능 데모” 배포는 비교적 가볍지만 “실제 사용자용 서비스” 배포는 인증, DB, 개인정보, LLM 비용/보안 설정 때문에 꽤 신중하게 준비해야 합니다.
