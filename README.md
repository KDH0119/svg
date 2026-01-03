# SVG Generator

Simple Node.js server that returns dynamic SVG for markdown images.

## Run

```bash
npm start
```

The server embeds the font from `fonts/Numeric.ttf` (default: Jua).
Replace the file if you want a different number style.
If `fonts/Numeric.ttf` is missing, it falls back to `fonts/ConcertOne.ttf`.
`/api/affinity` and `/api/profile` return PNG by default (1216x832). Use `format=svg` to get raw SVG.

## Endpoints

```text
/api/affinity?y1=30&y2=70&y3=95
/api/affinity.png?y1=30&y2=70&y3=95
/api/affinity/30/70/95.png
/api/profile?u=이름&u=나이&u=직업&s1=관계&s2=관계&m=관계&status=상황
/api/profile.png?u=이름&u=나이&u=직업&s1=관계&s2=관계&m=관계&status=상황
/api/profile/이름/나이/직업/관계1/관계2/관계3/상황.png
/api/status?relationship=Friends&situation=Chill
```

`/api/affinity` rules:
- 1~39: 무표정
- 40~79: 호감
- 80~100: 사랑

Affinity labels: `이서아`, `이서혜`, `이서희` (in this order).
Affinity params: `y1`, `y2`, `y3`
Non-ASCII query values should be URL-encoded.

`/api/affinity` extra params (rendered above/below the affinity image):
- `u` (3 values): name, age, job (order matters)
- `s1`: 여동생 관계 (3자 이하)
- `s2`: 누나 관계 (3자 이하)
- `m`: 엄마 관계 (3자 이하)
- `status`: 현재 상황 (20자 이하)

`/api/profile` params:
- `u` (3 values): name, age, job (order matters)
- `s1`: 여동생 관계 (3자 이하)
- `s2`: 누나 관계 (3자 이하)
- `m`: 엄마 관계 (3자 이하)
- `status`: 현재 상황 (20자 이하)

## Markdown usage

```markdown
![](http://localhost:3000/api/affinity?y1=85&y2=55&y3=100)
![](http://localhost:3000/api/affinity.png?y1=85&y2=55&y3=100)
![](http://localhost:3000/api/affinity/85/55/30.png)
![](http://localhost:3000/api/affinity/85/55/30.png?u=홍길동&u=20&u=학생&s1=나쁨&s2=친근&m=연인&status=편의점에서%20쉬는%20중)
![](http://localhost:3000/api/profile?u=홍길동&u=20&u=학생&s1=나쁨&s2=친근&m=연인&status=편의점에서%20쉬는%20중)
![](http://localhost:3000/api/profile.png?u=홍길동&u=20&u=학생&s1=나쁨&s2=친근&m=연인&status=편의점에서%20쉬는%20중)
![](http://localhost:3000/api/profile/홍길동/20/학생/나쁨/친근/연인/편의점에서%20쉬는%20중.png)
![](http://localhost:3000/api/status?relationship=Friends&situation=All%20good)
```

To get SVG output:

```markdown
![](http://localhost:3000/api/affinity?y1=85&y2=55&y3=100&format=svg)
![](http://localhost:3000/api/profile?u=홍길동&u=20&u=학생&s1=나쁨&s2=친근&m=연인&status=편의점에서%20쉬는%20중&format=svg)
```
