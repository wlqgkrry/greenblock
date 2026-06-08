# greenblock 설계 문서

## 서비스 소개

greenblock은 팀원의 성향과 협업 맥락을 바탕으로 메시지, 일정, 협업 요청 방식을 정리해 보여주는 협업 서비스다.

```mermaid
flowchart LR
    U["사용자"] --> H["워크스페이스 홈"]
    H --> T["팀원 등록"]
    T --> M["만세력 입력"]
    M --> A["협업 가이드 생성"]
    A --> MSG["메시지 작성"]
    A --> CAL["일정 조율"]
```

```mermaid
flowchart TD
    S["서비스 구성"] --> C1["팀원 정보 관리"]
    S --> C2["만세력 입력과 구조화"]
    S --> C3["협업 가이드 생성"]
    S --> C4["메시지와 캘린더 활용"]

    C1 --> D1["이름, 역할, 출생 정보"]
    C2 --> D2["텍스트, HTML, 이미지 입력"]
    C3 --> D3["성향 해석, 일 스타일, 대화 방식"]
    C4 --> D4["메시지 작성, 일정 등록과 삭제"]
```

## 문서 목록

- [00-service-overview.md](C:/Users/82109/Desktop/greenblock/docs/software-engineering/00-service-overview.md)
- [01-use-case-model.md](C:/Users/82109/Desktop/greenblock/docs/software-engineering/01-use-case-model.md)
- [02-api-specification.md](C:/Users/82109/Desktop/greenblock/docs/software-engineering/02-api-specification.md)
- [03-functional-specification.md](C:/Users/82109/Desktop/greenblock/docs/software-engineering/03-functional-specification.md)
- [04-test-cases.md](C:/Users/82109/Desktop/greenblock/docs/software-engineering/04-test-cases.md)
- [05-architecture-and-nfr.md](C:/Users/82109/Desktop/greenblock/docs/software-engineering/05-architecture-and-nfr.md)
