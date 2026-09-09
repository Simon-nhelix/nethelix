# nethelix

고전 게임 한글 패치 / 레트로 게이밍 블로그. Hugo + PaperMod, Cloudflare Pages 배포.

- 사이트: https://nethelix.pages.dev
- 빌드/서빙: GitHub push → Cloudflare Pages 자동 빌드 (로컬 서버 없음)
- 패치 파일: 이 저장소의 GitHub Releases

## 글 쓰기 (로컬 Hugo 없이도 가능)

```bash
git clone --recurse-submodules https://github.com/Simon-nhelix/nethelix
cd nethelix
# 일반 글
cp archetypes/default.md content/posts/my-post.md   # 또는 hugo new posts/my-post.md
# 패치 글
cp archetypes/patches.md content/patches/game-name.md
git add -A && git commit -m "post: ..." && git push
```

push하면 1~2분 내 반영. `draft: true`인 글은 배포되지 않음.

로컬 미리보기가 필요하면 `brew install hugo` 후 `hugo server -D` → http://localhost:1313

## 패치 배포 절차

1. 패치 차분 파일(IPS/BPS/xdelta)을 zip으로 묶음. 원본 롬 절대 포함 금지.
2. 릴리스 생성 (태그는 `게임약칭-v버전` 형식):
   ```bash
   gh release create GAME-v1.0 ./GAME_ko_v1.0.zip --title "GAME 한글패치 v1.0" --notes "최초 공개"
   ```
3. 글에서 숏코드로 연결:
   ```
   {{</* patch tag="GAME-v1.0" file="GAME_ko_v1.0.zip" */>}}
   ```
   다운로드 URL은 `https://github.com/Simon-nhelix/nethelix/releases/download/GAME-v1.0/GAME_ko_v1.0.zip`

## 후원 링크 설정

`hugo.yaml`의 `params.support`에 URL을 채우면 후원 페이지와 각 글 하단에 버튼이 자동으로 뜸. 비워두면 숨김.

```yaml
support:
  toss: "https://toss.me/아이디"
  kakaopay: "https://qr.kakaopay.com/xxxx"
  kofi: "https://ko-fi.com/아이디"
```

## Cloudflare Pages 빌드 설정

- Framework preset: Hugo
- Build command: `hugo --gc --minify`
- Output directory: `public`
- 환경변수: `HUGO_VERSION=0.165.0`

## 방명록 / 댓글 (Pages Functions + D1)

- 저장: D1 `nethelix-comments` (스키마 `db/schema.sql`), Pages 바인딩 이름 `DB`
- 공개 API `functions/api/comments.js`: GET `?page=` 승인된 글, POST 새 글(pending)
- 관리 API `functions/api/admin/comments.js`: `Authorization: Bearer $ADMIN_TOKEN`
- 관리 화면: https://nethelix.pages.dev/admin/ (토큰 입력 → 승인/거절/삭제)
- 스팸: Turnstile(`TURNSTILE_SECRET` 환경변수 + `hugo.yaml` `params.turnstileSiteKey`) + IP당 10분 5개
- Pages 환경변수: `ADMIN_TOKEN`(필수), `TURNSTILE_SECRET`(권장), `IP_SALT`(선택), `AUTO_APPROVE=1`(승인 없이 즉시 공개하고 싶을 때)
- 글에서 댓글 끄기: front matter `comments: false`
- 방명록 페이지: `/guestbook/` (`{{</* comments page="guestbook" */>}}`)
