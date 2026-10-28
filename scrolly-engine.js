// ====================================================
// Shared scrollytelling engine
// Used by basic.html and RAG.html (identical framework logic).
// Each page supplies its story-specific scene hooks.
// Guard: nếu script được load trước DOM sẵn sàng, đợi DOMContentLoaded.
// ====================================================
(function() {
    function init() {
        const STEPS = document.querySelectorAll('.step');
        const PROGRESS = document.getElementById('progressBar');
        const SCROLLY = document.getElementById('scrolly');
        const DOTS = document.querySelectorAll('.side-dot');
        const SIDE_DOTS = document.getElementById('sideDots');
        const HEADER = document.getElementById('siteHeader');

        if (!SCROLLY || !PROGRESS) return;

        let currentScene = 0;
        let transitionTimer = null;
        let scrollScheduled = false;

        // Cache vị trí scrolly để không getBoundingClientRect mỗi lần scroll
        let scrollyTop = 0;
        let scrollyHeight = 0;
        function measureScrolly() {
            const rect = SCROLLY.getBoundingClientRect();
            scrollyTop = rect.top + window.scrollY;
            scrollyHeight = rect.height;
        }
        measureScrolly();
        window.addEventListener('resize', measureScrolly, { passive: true });

        // ─── Single rAF-throttled scroll handler (header shadow + progress) ───
        window.addEventListener('scroll', () => {
            if (scrollScheduled) return;
            scrollScheduled = true;
            requestAnimationFrame(() => {
                scrollScheduled = false;
                if (HEADER) HEADER.classList.toggle('scrolled', window.scrollY > 20);
                const scrolled = window.scrollY - scrollyTop;
                const total = scrollyHeight - window.innerHeight;
                PROGRESS.style.width = Math.max(0, Math.min(100, (scrolled / total) * 100)) + '%';
            });
        }, { passive: true });

        // ─── Show/hide side dots ───
        if (SIDE_DOTS) {
            const scrollyObs = new IntersectionObserver((entries) => {
                entries.forEach(e => {
                    SIDE_DOTS.classList.toggle('visible', e.isIntersecting);
                });
            }, { threshold: 0.05 });
            scrollyObs.observe(SCROLLY);
        }

        // ─── FAQ ───
        document.querySelectorAll('.faq-q').forEach(btn => {
            btn.addEventListener('click', () => {
                const exp = btn.getAttribute('aria-expanded') === 'true';
                btn.setAttribute('aria-expanded', String(!exp));
                // Ưu tiên .faq-a trong .faq-item; fallback sang node liền kề
                const item = btn.closest('.faq-item');
                const answer = (item && item.querySelector('.faq-a')) || btn.nextElementSibling;
                if (answer) answer.classList.toggle('open');
            });
        });

        // ─── Counters ───
        let countersAnimated = false;
        function animateCounters() {
            if (countersAnimated) return;
            countersAnimated = true;
            document.querySelectorAll('.counter-num').forEach(el => {
                const target = parseInt(el.dataset.target, 10) || 0;
                const start = performance.now();
                const dur = 2200;
                (function tick(now) {
                    const p = Math.min((now - start) / dur, 1);
                    el.textContent = Math.round(target * (1 - Math.pow(1 - p, 4))).toLocaleString();
                    if (p < 1) requestAnimationFrame(tick);
                })(start);
            });
        }

        // ─── Reset animated counters (called when scene 0 re-activates) ───
        function resetCounters() {
            countersAnimated = false;
            document.querySelectorAll('.counter-num').forEach(el => el.textContent = '0');
        }

        // ─── Smooth cinematic scene transition ───
        // hooks = { resetScene, activateScene, beforeSceneChange? }
        function transitionToScene(hooks, newIdx) {
            if (newIdx === currentScene) return;
            if (transitionTimer) clearTimeout(transitionTimer);

            const oldEl = document.getElementById('scene' + currentScene);
            const newEl = document.getElementById('scene' + newIdx);

            // Reset new scene elements before showing
            hooks.resetScene(newIdx);

            // Exit old scene with cinematic effect
            if (oldEl) {
                oldEl.classList.remove('visible');
                oldEl.classList.add('exit');
            }

            // Optional per-story background effect (e.g. background crossfade)
            if (hooks.beforeSceneChange) hooks.beforeSceneChange(newIdx);

            // After old scene fades out, bring in new scene
            transitionTimer = setTimeout(() => {
                if (oldEl) oldEl.classList.remove('exit');
                if (newEl) {
                    newEl.classList.add('visible');
                    hooks.activateScene(newIdx);
                }
                currentScene = newIdx;
            }, 280);
        }

        // ─── IntersectionObserver for step cards ───
        function observeSteps(hooks) {
            const stepObs = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const idx = parseInt(entry.target.dataset.step, 10);

                        STEPS.forEach(s => s.classList.remove('is-active'));
                        entry.target.classList.add('is-active');

                        DOTS.forEach(d => d.classList.remove('active'));
                        if (DOTS[idx]) DOTS[idx].classList.add('active');

                        transitionToScene(hooks, idx);
                    }
                });
            }, { rootMargin: '-35% 0px -35% 0px', threshold: 0.15 });

            STEPS.forEach(step => stepObs.observe(step));
        }

        // ─── Side dots click ───
        DOTS.forEach(dot => {
            dot.addEventListener('click', () => {
                const idx = parseInt(dot.dataset.idx, 10);
                const target = STEPS[idx];
                if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
        });

        window.ScrollyEngine = {
            STEPS, PROGRESS, SCROLLY, DOTS, SIDE_DOTS, HEADER,
            animateCounters, resetCounters, observeSteps
        };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
