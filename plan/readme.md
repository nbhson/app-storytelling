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

## Round 2 (2026-10-29) — enterprise upgrade

### Findings (deep review đợt 2)

| # | Severity | Vị trí | Vấn đề | Fix |
|---|----------|--------|--------|-----|
| R2-1 | MAJOR | flourish_clone.html:962,965 | Còn 2 script tracker của Flourish (`/js/script.js`, `/js/store-inbound-fields.js`) — 404 khi chạy standalone, đúng bản chất analytics | Remove |
| R2-2 | MAJOR | Memory.html | `updateProgress` đăng ký 2 lần (2 scroll listener) → progress chạy gấp đôi cần thiết | Gộp 1 listener |
| R2-3 | MAJOR | RAG.html | `drawPipelineSummary` dùng setTimeout không cancel → overdraw khi re-activate scene | Lưu timer ids, clear khi reset |
| R2-4 | MAJOR | RAG.html | Nếu CDN d3 fail → `d3 is not defined` crash toàn bộ scene 2 + script | Guard `typeof d3` + thông báo fallback |
| R2-5 | MINOR | engine + Memory.html | Progress chia cho 0 khi trang ngắn hơn viewport → NaN% | Guard `total > 0` |
| R2-6 | MINOR | basic/RAG | `<a><button>` nested interactive — HTML invalid, a11y broke | Đổi thành `<a class="hero-cta">` |
| R2-7 | MINOR | basic/RAG | Mobile toggle button không làm gì (no-op) | Implement mobile menu disclosure |
| R2-8 | MINOR | Memory.html | `[id^='s']` selector brittle; thiếu reduced-motion cho pulse/spin/float | Scope selector + media query |
| R2-9 | MINOR | flourish_clone | FAQ accordion toggle bằng inline style, không aria-expanded | Thêm aria-expanded |
| R2-10 | MINOR | engine | hooks.resetScene/activateScene throw → vỡ scroll; dot active không aria-current | try/catch + aria-current |

### Plan

1. **Engine nâng cấp** (scrolly-engine.js): guard chia 0, try/catch hooks, `aria-current` cho dots, keyboard navigation (←/→/j/k giữa scenes), scene deep-linking (`#scene-N`, hỗ trợ load với hash), "Resume reading" chip (localStorage), announcer `aria-live`.
2. **Features domain storytelling**:
   - F1: Scene deep-link + nút "Copy link" trên từng step card.
   - F2: Keyboard navigation giữa scenes.
   - F3: Reading progress persistence + "Resume reading" chip.
   - F4: Reader notes per scene (localStorage, textContent-only — XSS-safe) + print stylesheet để export PDF (kèm notes).
3. **UI/UX**: design tokens (CSS variables spacing/color/type), focus-visible thống nhất, skip-link, scroll-margin cho anchor, prefers-reduced-motion đầy đủ, print styles.
4. **Bug fixes**: R2-1…R2-10.
5. **Verify**: node --check toàn bộ inline JS + engine; không có build step.

### Trạng thái Round 2

- [x] Deep review
- [x] Plan
- [x] Implement + features
- [x] Verify
- [x] Commit + self-review

### Round 2 — kết quả thực hiện (2026-10-29)

> Ghi chú: phiên Round 2 trước bị gián đoạn giữa chừng — để lại 2 file
> untracked (`scrolly-notes.js`, `scrolly-shared.css`) chưa wire vào trang nào,
> trong đó `scrolly-notes.js` còn 2 bug thật (khai báo `syncHasNote` trùng —
> định nghĩa sau đè định nghĩa trước làm mất update hint; và `JSON.parse`
> trên giá trị lưu dạng raw nên note không bao giờ load lại). Đã sửa, hoàn thiện
> và commit như một phần của Round 2.

**Commits (local, branch main):**

| Hash | Nội dung |
|------|----------|
| `3292e90` | feat(ui): wire notes/copy-link/shared design layer/skip-links + activate resume & deep-link |
| `d48656d` | security+fix(flourish): strip 2 tracker scripts còn sót, aria-expanded FAQ (R2-1, R2-9) |
| `acada70` | fix: R2-2…R2-8 (scroll listener đôi, timer leak, d3 guard, hero CTA, mobile nav, Memory selectors + reduced-motion) |
| `1649498` | fix(notes): chống double injection, anchor scroll offsets |

**Verify:** `node --check` pass cho scrolly-engine.js, scrolly-notes.js và toàn bộ
inline script trong 4 trang (JSON-LD được loại trừ). Smoke test headless (jsdom +
polyfill IntersectionObserver) trên cả 3 trang engine: widgets inject đúng số
lượng (6/6, 6/6, 9/9), note save/load round-trip qua localStorage OK, print node
chỉ render qua textContent (payload `<img onerror>` không xuất hiện trong DOM),
mobile nav open/close, resume chip inject, không runtime error. Không có build
step / test suite cấu hình sẵn.

**Tính năng Round 2 đã ship:**
1. Scene deep-linking (`#scene-N`) + nút "Copy link" trên từng scene card.
2. Reader notes per scene (localStorage, XSS-safe textContent-only).
3. Reading-progress persistence + "Resume scene N" chip.
4. Keyboard navigation (←/→/j/k) + announcer `aria-live`.
5. Export PDF/print kèm ghi chú (@media print trong scrolly-shared.css).
6. Mobile nav disclosure hoạt động thật (trước là no-op).

**Rủi ro còn lại:** Memory.html dùng framework riêng (không qua scrolly-engine)
nên chưa có resume chip/keyboard nav — chỉ có notes + shared CSS. Print styles
chỉ verify được cấu trúc DOM (không in thử thật). flourish_clone không gắn notes
(vì giữ nguyên bản chất "clone trang marketing").

## Review Log

### Vòng 1
- Self-review: syntax check pass cho toàn bộ inline script trong 4 trang + scrolly-engine.js. FAQ handler giữ fallback `nextElementSibling` nên không vỡ markup cũ. flourish_clone: đã xác nhận không còn reference tới onetrust/googletagmanager/snowplow/fullstory.
