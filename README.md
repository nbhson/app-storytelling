# Storytelling Demos

[![CI](https://github.com/nbhson/app-storytelling/actions/workflows/ci.yml/badge.svg)](https://github.com/nbhson/app-storytelling/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Bộ 4 trang scrollytelling demo (vanilla HTML/CSS/JS, không build step):

| File | Mô tả |
|------|-------|
| `basic.html` | Demo scrollytelling gốc — 6 scenes với canvas animation |
| `RAG.html` | "RAG Explained" — visual deep dive về Retrieval-Augmented Generation (particles + D3 force + canvas pipeline) |
| `Memory.html` | "Memory Engineering" — scrollytelling presentation về AI memory |
| `flourish_clone.html` | Bản clone trang Flourish.studio (đã strip toàn bộ analytics/tracker của trang gốc) |
| `scrolly-engine.js` | Engine dùng chung: scene transition, progress bar, side dots, FAQ accordion, counters |

## Chạy local

```bash
python3 -m http.server 8080
# mở http://localhost:8080/basic.html (hoặc RAG.html, Memory.html, flourish_clone.html)
```

## Kiến trúc engine (scrolly-engine.js)

- **Scene transition**: `IntersectionObserver` trên `.step` cards → `transitionToScene(hooks, idx)` với cinematic fade (280ms). Trang cung cấp `hooks = { resetScene, activateScene, beforeSceneChange? }`.
- **Progress bar**: rAF-throttled scroll handler, cache vị trí scrolly (không `getBoundingClientRect` mỗi lần scroll).
- **Side dots**: điều hướng nhanh tới scene, `aria-label` cho accessibility.
- **FAQ accordion**: ưu tiên `.faq-item .faq-a`, fallback `nextElementSibling`.
- **Counters**: animation số đếm với easing, có reset khi quay lại scene 0.

## Ghi chú hiệu năng

- Canvas animation chỉ chạy khi visible (IntersectionObserver pause) và tôn trọng `prefers-reduced-motion`.
- Animation dùng delta-time — tốc độ đồng nhất trên màn hình 60Hz/120Hz.
- Canvas không bị realloc kích thước mỗi frame (chỉ resize khi parent đổi size).
