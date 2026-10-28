// ====================================================
// Shared scrollytelling engine
// Used by basic.html and RAG.html (identical framework logic).
// Each page supplies its story-specific scene hooks.
// Guard: nếu script được load trước DOM sẵn sàng, đợi DOMContentLoaded.
// Round 2: keyboard nav, deep-linking (#scene-N), resume chip, aria-current,
//          divide-by-zero guards, hook isolation (try/catch).
// ====================================================
(function() {
    var STORAGE_KEY = 'scrolly:resume';

    function init() {
        var STEPS = document.querySelectorAll('.step');
        var PROGRESS = document.getElementById('progressBar');
        var SCROLLY = document.getElementById('scrolly');
        var DOTS = document.querySelectorAll('.side-dot');
        var SIDE_DOTS = document.getElementById('sideDots');
        var HEADER = document.getElementById('siteHeader');

        if (!SCROLLY || !PROGRESS || STEPS.length === 0) return;

        var currentScene = 0;
        var transitionTimer = null;
        var scrollScheduled = false;

        // Cache vị trí scrolly để không getBoundingClientRect mỗi lần scroll
        var scrollyTop = 0;
        var scrollyHeight = 0;
        function measureScrolly() {
            var rect = SCROLLY.getBoundingClientRect();
            scrollyTop = rect.top + window.scrollY;
            scrollyHeight = rect.height;
        }
        measureScrolly();
        window.addEventListener('resize', measureScrolly, { passive: true });

        // ─── Progress bar (guarded: tránh NaN% khi trang ngắn hơn viewport) ───
        function updateProgressBar() {
            var scrolled = window.scrollY - scrollyTop;
            var total = scrollyHeight - window.innerHeight;
            var pct = total > 0 ? (scrolled / total) * 100 : (window.scrollY > 0 ? 100 : 0);
            PROGRESS.style.width = Math.max(0, Math.min(100, pct)) + '%';
            document.documentElement.style.setProperty('--read-progress', Math.round(Math.max(0, Math.min(100, pct))) + '%');
        }

        // ─── Single rAF-throttled scroll handler (header shadow + progress) ───
        window.addEventListener('scroll', function() {
            if (scrollScheduled) return;
            scrollScheduled = true;
            requestAnimationFrame(function() {
                scrollScheduled = false;
                if (HEADER) HEADER.classList.toggle('scrolled', window.scrollY > 20);
                updateProgressBar();
            });
        }, { passive: true });
        updateProgressBar();

        // ─── Scene announcer (screen readers) ───
        var announcer = document.createElement('div');
        announcer.className = 'sr-only';
        announcer.setAttribute('aria-live', 'polite');
        announcer.setAttribute('role', 'status');
        document.body.appendChild(announcer);
        function announce(text) { announcer.textContent = text; }

        // ─── Show/hide side dots ───
        if (SIDE_DOTS) {
            var scrollyObs = new IntersectionObserver(function(entries) {
                entries.forEach(function(e) {
                    SIDE_DOTS.classList.toggle('visible', e.isIntersecting);
                });
            }, { threshold: 0.05 });
            scrollyObs.observe(SCROLLY);
        }

        // ─── FAQ ───
        document.querySelectorAll('.faq-q').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var exp = btn.getAttribute('aria-expanded') === 'true';
                btn.setAttribute('aria-expanded', String(!exp));
                // Ưu tiên .faq-a trong .faq-item; fallback sang node liền kề
                var item = btn.closest('.faq-item');
                var answer = (item && item.querySelector('.faq-a')) || btn.nextElementSibling;
                if (answer) answer.classList.toggle('open');
            });
        });

        // ─── Counters ───
        var countersAnimated = false;
        function animateCounters() {
            if (countersAnimated) return;
            countersAnimated = true;
            document.querySelectorAll('.counter-num').forEach(function(el) {
                var target = parseInt(el.dataset.target, 10) || 0;
                var start = performance.now();
                var dur = 2200;
                (function tick(now) {
                    var p = Math.min((now - start) / dur, 1);
                    el.textContent = Math.round(target * (1 - Math.pow(1 - p, 4))).toLocaleString();
                    if (p < 1) requestAnimationFrame(tick);
                })(start);
            });
        }

        // ─── Reset animated counters (called when scene 0 re-activates) ───
        function resetCounters() {
            countersAnimated = false;
            document.querySelectorAll('.counter-num').forEach(function(el) { el.textContent = '0'; });
        }

        // ─── Smooth cinematic scene transition ───
        // hooks = { resetScene, activateScene, beforeSceneChange? }
        function transitionToScene(hooks, newIdx) {
            if (newIdx === currentScene || newIdx < 0 || newIdx >= STEPS.length) return;
            if (transitionTimer) clearTimeout(transitionTimer);

            var oldEl = document.getElementById('scene' + currentScene);
            var newEl = document.getElementById('scene' + newIdx);

            // Isolate story hooks: một hook throw không được phá điều hướng
            try { hooks.resetScene(newIdx); } catch (err) { console.error('[scrolly] resetScene(' + newIdx + ') failed:', err); }

            // Exit old scene with cinematic effect
            if (oldEl) {
                oldEl.classList.remove('visible');
                oldEl.classList.add('exit');
            }

            if (hooks.beforeSceneChange) {
                try { hooks.beforeSceneChange(newIdx); } catch (err) { console.error(err); }
            }

            // After old scene fades out, bring in new scene
            transitionTimer = setTimeout(function() {
                if (oldEl) oldEl.classList.remove('exit');
                if (newEl) {
                    newEl.classList.add('visible');
                    try { hooks.activateScene(newIdx); } catch (err) { console.error(err); }
                }
                currentScene = newIdx;

                // Round 2: aria-current + deep-link hash + resume position
                DOTS.forEach(function(d, i) {
                    if (i === newIdx) d.setAttribute('aria-current', 'true');
                    else d.removeAttribute('aria-current');
                });
                var heading = newEl ? newEl.querySelector('h3') : null;
                announce('Scene ' + (newIdx + 1) + ' of ' + STEPS.length + (heading ? ': ' + heading.textContent : ''));
                try { history.replaceState(null, '', '#scene-' + (newIdx + 1)); } catch (err) { /* file:// hoặc sandbox — bỏ qua */ }
                saveResume(newIdx);
            }, 280);
        }

        // ─── IntersectionObserver for step cards ───
        function observeSteps(hooks) {
            var stepObs = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        var idx = parseInt(entry.target.dataset.step, 10);

                        STEPS.forEach(function(s) { s.classList.remove('is-active'); });
                        entry.target.classList.add('is-active');

                        DOTS.forEach(function(d) { d.classList.remove('active'); });
                        if (DOTS[idx]) DOTS[idx].classList.add('active');

                        transitionToScene(hooks, idx);
                    }
                });
            }, { rootMargin: '-35% 0px -35% 0px', threshold: 0.15 });

            STEPS.forEach(function(step) { stepObs.observe(step); });
        }

        // ─── Side dots click ───
        DOTS.forEach(function(dot) {
            dot.addEventListener('click', function() {
                var idx = parseInt(dot.dataset.idx, 10);
                var target = STEPS[idx];
                if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
        });

        // ─── Round 2: Keyboard navigation giữa scenes (←/→, j/k) ───
        document.addEventListener('keydown', function(e) {
            if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
            var tag = (e.target.tagName || '').toLowerCase();
            if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
            var next = null;
            if (e.key === 'ArrowRight' || e.key === 'j') next = currentScene + 1;
            if (e.key === 'ArrowLeft' || e.key === 'k') next = currentScene - 1;
            if (next === null || next < 0 || next >= STEPS.length) return;
            var target = STEPS[next];
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });

        // ─── Round 2: Reading progress persistence + resume chip ───
        function readStorage() {
            try { return window.localStorage; } catch (err) { return null; }
        }
        function saveResume(idx) {
            var ls = readStorage();
            if (!ls) return;
            try {
                ls.setItem(STORAGE_KEY, JSON.stringify({ scene: idx, page: location.pathname.split('/').pop() || 'index', t: Date.now() }));
            } catch (err) { /* private mode / quota — bỏ qua */ }
        }
        function getResume() {
            var ls = readStorage();
            if (!ls) return null;
            try {
                var data = JSON.parse(ls.getItem(STORAGE_KEY) || 'null');
                if (!data || typeof data.scene !== 'number') return null;
                return data;
            } catch (err) { return null; }
        }

        var resumeChip = null;
        function showResumeChip(hooks) {
            var saved = getResume();
            if (!saved || saved.scene < 1 || saved.scene >= STEPS.length) return;
            if (document.getElementById('scrolly-resume')) return;
            var chip = document.createElement('button');
            chip.id = 'scrolly-resume';
            chip.className = 'scrolly-resume';
            chip.type = 'button';
            chip.textContent = 'Resume scene ' + (saved.scene + 1) + ' \u2192';
            chip.addEventListener('click', function() {
                var target = STEPS[Math.max(0, Math.min(STEPS.length - 1, saved.scene))];
                if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                chip.remove();
            });
            document.body.appendChild(chip);
            resumeChip = chip;
            setTimeout(function() { if (chip.isConnected) chip.classList.add('shown'); }, 900);
            // Tự ẩn sau 9s nếu user không click
            setTimeout(function() {
                if (chip.isConnected) {
                    chip.classList.remove('shown');
                    setTimeout(function() { if (chip.isConnected) chip.remove(); }, 400);
                }
            }, 9000);
        }

        // ─── Deep-linking: hỗ trợ mở trang với #scene-N ───
        function jumpToHashScene(hooks) {
            var m = /^#scene-(\d+)$/.exec(location.hash || '');
            if (!m) return;
            var idx = parseInt(m[1], 10) - 1;
            if (isNaN(idx) || idx < 0 || idx >= STEPS.length) return;
            var target = STEPS[idx];
            if (!target) return;
            setTimeout(function() {
                target.scrollIntoView({ behavior: 'auto', block: 'center' });
            }, 300);
        }

        window.ScrollyEngine = {
            STEPS: STEPS, PROGRESS: PROGRESS, SCROLLY: SCROLLY, DOTS: DOTS, SIDE_DOTS: SIDE_DOTS, HEADER: HEADER,
            animateCounters: animateCounters, resetCounters: resetCounters, observeSteps: observeSteps,
            jumpToHashScene: jumpToHashScene, showResumeChip: showResumeChip, announce: announce
        };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
