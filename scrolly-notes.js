// ====================================================
// Reader notes + copy-link — Round 2 feature
// Gắn vào mỗi step card (.step-card, [data-step], .scrolly-step):
//  - "Copy link" : copy URL với #scene-N (deep-link tới scene)
//  - "Notes"     : ghi chú người đọc per scene, lưu localStorage
//  - In/PDF      : ghi chú được render lại trong @media print
// XSS-safe: nội dung user chỉ đi qua textContent/value,
// không bao giờ được gán vào innerHTML.
// Bắn custom event 'scrolly:notes-saved' sau khi lưu.
// ====================================================
(function() {
    'use strict';

    var pageKey = (location.pathname.split('/').pop() || 'index').replace(/[^\w.-]/g, '');

    function readStorage() {
        try { return window.localStorage; } catch (err) { return null; }
    }
    function loadNote(key) {
        var ls = readStorage();
        if (!ls) return '';
        try { return ls.getItem('scrolly-notes:' + pageKey + ':' + key) || ''; }
        catch (err) { return ''; }
    }
    function saveNote(key, text) {
        var ls = readStorage();
        if (!ls) return;
        try { ls.setItem('scrolly-notes:' + pageKey + ':' + key, text); } catch (err) { /* private mode / quota */ }
        try {
            document.dispatchEvent(new CustomEvent('scrolly:notes-saved', { detail: { scene: key } }));
        } catch (err) { /* CustomEvent không khả dụng — bỏ qua */ }
    }

    function sceneNumber(sceneKey) {
        var n = parseInt(sceneKey, 10);
        return isNaN(n) ? 1 : n + 1;
    }

    function flash(btn, text) {
        var old = btn.textContent;
        btn.textContent = text;
        btn.classList.add('copied');
        setTimeout(function() { btn.textContent = old; btn.classList.remove('copied'); }, 1400);
    }

    function init() {
        // Ưu tiên .step-card (basic/RAG: .step[data-step] là container chứa
        // .step-card — chọn cả hai sẽ inject 2 lần). Fallback: .scrolly-step (Memory).
        var cards = document.querySelectorAll('.step-card');
        if (!cards.length) cards = document.querySelectorAll('.scrolly-step');
        if (!cards.length) return;

        Array.prototype.forEach.call(cards, function(card, cardIdx) {
            if (card.querySelector('.step-actions')) return; // idempotent

            var sceneKey = card.dataset.step || card.dataset.vs || String(cardIdx);
            var sceneNo = sceneNumber(sceneKey);

            // ─── Copy-link button ───
            var linkBtn = document.createElement('button');
            linkBtn.type = 'button';
            linkBtn.className = 'step-link';
            linkBtn.textContent = '🔗 Copy link';
            linkBtn.addEventListener('click', function() {
                var url = location.origin === 'null'
                    ? location.href.split('#')[0] + '#scene-' + sceneNo
                    : location.origin + location.pathname + '#scene-' + sceneNo;
                var copied = function() { flash(linkBtn, '✓ Link copied'); };
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(url).then(copied, function() { legacyCopy(url, copied, linkBtn); });
                } else {
                    legacyCopy(url, copied, linkBtn);
                }
            });

            // ─── Notes toggle ───
            var noteBtn = document.createElement('button');
            noteBtn.type = 'button';
            noteBtn.className = 'note-toggle';
            noteBtn.setAttribute('aria-expanded', 'false');
            noteBtn.setAttribute('aria-controls', 'note-panel-' + sceneNo);
            noteBtn.appendChild(document.createTextNode('📝 Notes'));
            var dot = document.createElement('span');
            dot.className = 'note-dot';
            dot.setAttribute('aria-hidden', 'true');
            noteBtn.appendChild(dot);

            // ─── Notes panel ───
            var panel = document.createElement('div');
            panel.className = 'note-panel';
            panel.id = 'note-panel-' + sceneNo;

            var ta = document.createElement('textarea');
            ta.setAttribute('aria-label', 'Your notes for this scene');
            ta.placeholder = 'Write your thoughts about this scene… (saved locally)';

            var footer = document.createElement('div');
            footer.className = 'note-panel-footer';
            var hint = document.createElement('span');
            hint.className = 'note-panel-hint';
            var save = document.createElement('button');
            save.type = 'button';
            save.className = 'note-save';
            save.textContent = 'Save note';
            footer.appendChild(hint);
            footer.appendChild(save);
            panel.appendChild(ta);
            panel.appendChild(footer);

            // ─── Print-only node (XSS-safe: textContent only) ───
            var printEl = document.createElement('div');
            printEl.className = 'note-print';
            printEl.dataset.noteKey = sceneKey;

            function hasNote() { return loadNote(sceneKey).trim().length > 0; }
            function syncPrintNode() {
                var note = loadNote(sceneKey).trim();
                printEl.textContent = note ? ('Reader note — scene ' + sceneNo + ': ' + note) : '';
            }
            function syncHasNote() {
                hint.textContent = hasNote() ? 'Saved' : 'No note yet';
                noteBtn.classList.toggle('has-note', hasNote());
            }
            syncHasNote();
            syncPrintNode(printEl);
            card.appendChild(printEl);

            noteBtn.addEventListener('click', function() {
                var open = panel.classList.toggle('open');
                noteBtn.setAttribute('aria-expanded', String(open));
                if (open) { ta.value = loadNote(sceneKey); ta.focus(); }
                syncHasNote();
            });

            save.addEventListener('click', function() {
                saveNote(sceneKey, ta.value);
                syncPrintNode(printEl);
                hint.textContent = 'Saved ✓';
                hint.classList.add('note-saved-flash');
                setTimeout(function() {
                    hint.classList.remove('note-saved-flash');
                    syncHasNote();
                }, 1200);
            });

            var actions = document.createElement('div');
            actions.className = 'step-actions';
            actions.appendChild(linkBtn);
            actions.appendChild(noteBtn);

            var printAnchor = card.querySelector('.note-print');
            card.insertBefore(actions, printAnchor);
            card.appendChild(panel);
        });
    }

    function legacyCopy(url, done, btn) {
        var ta = document.createElement('textarea');
        ta.value = url;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
            if (document.execCommand('copy')) { done(); }
            else { flash(btn, '#scene'); }
        } catch (err) { flash(btn, '#scene'); }
        document.body.removeChild(ta);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
