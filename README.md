# auto-fetch-icons

### install

```bash
npm install -g auto-fetch-icons
```

### usage

```bash
fetch-icons -f [fileId] -t [token] -o [outputDir] -r [rule]
```

### options

- `-f, --fileId`: 피그마 파일 ID (required)
- `-t, --token`: 피그마 API 토큰 (required)
- `-o, --output`: 아이콘이 저장될 디렉토리 경로 (default: ./icons)
- `-r, --rule`: 컴포넌트 이름 규칙 (예: 'icon/_', 'NAME=_') (default: 'Name=')

### example

```bash
fetch-icons -f abcdefghijklmnop -t 123_456_789_abc -o ./icons -r icon/
```

### how to get fileId and token

- fileId: `https://www.figma.com/design/${fileId}/* . . .` url에서 추출합니다.
- token: 이 주소에서 발급 받습니다.  
  https://www.figma.com/developers/api#authentication

## Prerequisites

1. 피그마 파일에 아이콘이 컴포넌트로 정의되어 있어야 합니다.
2. 아이콘 컴포넌트 이름은 아래 형식과 같이 컨벤션이 필요합니다.

```
icon/clover.svg
NAME=clover
```
