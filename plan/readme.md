# Plan — app-storytelling

> 4 trang scrollytelling demo (vanilla HTML/CSS/JS) + shared engine.

## Kết quả Review (audit đợt 1)

| # | Severity | Vị trí | Vấn đề | Fix |
|---|----------|--------|--------|-----|
| 1 | MAJOR | flourish_clone.html | Copy verbatim trang production Flourish: Snowplow collector (canva.com), FullStory org ID, OneTrust consent, GTM | Strip toàn bộ tracker/config |
| 2 | MAJOR | Memory.html:595-597 | `updateProgress` querySelectorAll + N×getBoundingClientRect mỗi scroll frame | Cache scenes + IntersectionObserver set current |
| 3 | MAJOR | RAG.html:671-704 | Particles O(n²) (80² checks/frame) chạy vĩnh viễn cả khi off-screen/tab ẩn | IntersectionObserver pause + prefers-reduced-motion guard |
| 4 | MAJOR | RAG.html:695 | Dòng fillStyle build chuỗi rác (3 replace) — dead code | Xóa |
| 5 | MAJOR | RAG.html:726-727, 940-941, 1013-1014, 1116 | Set `canvas.width/height` mỗi frame → realloc + clear mỗi frame | `fitCanvas()` chỉ resize khi đổi kích thước |
| 6 | MAJOR | RAG.html:704 | Resize không debounce → thrash | Debounce 150ms |
| 7 | MAJOR | flourish_clone.html | 5 block inline script FAQ trùng lặp | Gộp 1 block generic |
| 8 | MAJOR | scrolly-engine.js:7 | STEPS capture khi IIFE load — vỡ nếu script chạy trước DOM | Guard readyState |
| 9 | MAJOR | scrolly-engine.js:114-122 | getBoundingClientRect mỗi scroll + 2 scroll listeners riêng | Cache top/height + gộp 1 handler rAF |
| 10 | MINOR | RAG.html:820,1001,1105 | Animation phụ thuộc frame-rate (120Hz chạy nhanh gấp đôi) | Delta-time |
| 11 | MINOR | RAG.html:822 | `pipelineAnim` không gán id lần đầu → cancel stale | Gán rAF id đầy đủ |
| 12 | MINOR | RAG.html:415-422 | Side dots thiếu aria-label | Thêm |
| 13 | MINOR | Memory.html:482-483 | Fade-up observer không unobserve → giữ reference vĩnh viễn | unobserve sau trigger |
| 14 | MINOR | scrolly-engine.js | parseInt không radix, dot click không bounds-check | Fix |
| 15 | MINOR | Cả repo | Không có README | Thêm |

## Trạng thái

- [x] Plan
- [x] Fix #1–#15
- [x] Commit + self-review

## Review Log

### Vòng 1
- Self-review: syntax check pass cho toàn bộ inline script trong 4 trang + scrolly-engine.js. FAQ handler giữ fallback `nextElementSibling` nên không vỡ markup cũ. flourish_clone: đã xác nhận không còn reference tới onetrust/googletagmanager/snowplow/fullstory.
