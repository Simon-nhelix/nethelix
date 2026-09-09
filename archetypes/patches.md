---
title: "{{ replace .File.ContentBaseName "-" " " | title }}"
date: {{ .Date }}
draft: true
tags: ["한글패치"]
platform: ""        # 예: PS1, SFC, GBA
version: "v1.0"
---

## 소개

## 적용 방법

1. 원본 롬 준비 (직접 소유한 것)
2. 아래 패치 파일 다운로드
3. 패처(Floating IPS / xdelta)로 적용

{{</* patch tag="GAME-v1.0" file="GAME_ko_v1.0.zip" */>}}

## 변경 이력

- v1.0: 최초 공개
