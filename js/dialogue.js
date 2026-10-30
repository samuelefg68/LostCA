// ARQUIVO: DIALOGUE (diálogo, interação, evento do portão).
    // ===== DIALOGUE: diálogo e interação (E) =====
    const STAT_LINES = ['A estátua do cavaleiro centenário.', 'Você não quer causar nenhum dano.'];
    const DIR_LINES = ['↓ Floresta Vasta.', '↑ Cemitério.', '← A Vila Abandonada.', '→ Reino Perdido.'];
    let DLG_LINES = STAT_LINES, DLG_TEXT = STAT_LINES[0], dlgI = 0;
    let dlgOn = false, dlgN = 0, dlgAcc = 0;
    const ARW = { '↑': '', '→': ' r', '↓': ' d', '←': ' l' };
    function dlgSet(t) {
        const shake = /Reino Perdido/.test(DLG_TEXT);
        let h = '';
        for (const ch of t) {
            if (ARW[ch] !== undefined)
                h += '<i class="ar' + ARW[ch] + '"></i>';
            else {
                const e = ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : ch;
                h += (shake && ch !== ' ') ? '<b class="sh" style="animation-delay:-' + (Math.random() * .2).toFixed(3) + 's">' + e + '</b>' : e;
            }
        }
        dlgTx.innerHTML = h;
    }
    function closeDlg() { dlgOn = false; dlgEl.classList.remove('on', 'done'); }
    function startDlg(lines) {
        DLG_LINES = lines;
        dlgI = 0;
        DLG_TEXT = DLG_LINES[0];
        dlgOn = true;
        dlgN = 0;
        dlgAcc = 0;
        dlgSet('');
        dlgEl.classList.remove('done');
        dlgEl.classList.add('on');
        hint.classList.remove('on');
    }
    let seenStat = false, seenDir = false, gateDone = false;
    function openGate() { gateOpening = true; wooshPlay(); }
    function onDlgEnd() {
        if (DLG_LINES === STAT_LINES)
            seenStat = true;
        else if (DLG_LINES === DIR_LINES)
            seenDir = true;
        if (gateDone || !(seenStat && seenDir))
            return;
        gateDone = true;
        setTimeout(() => { openGate(); startDlg([CONFIG.story.gateText]); }, CONFIG.story.gateDelay * 1000);
    }
    function interact() {
        if (!dlgOn)
            startDlg(nearW === 2 ? DIR_LINES : STAT_LINES);
        else if (dlgN < DLG_TEXT.length) {
            dlgN = DLG_TEXT.length;
            dlgSet(DLG_TEXT);
            dlgEl.classList.add('done');
        }
        else if (dlgI < DLG_LINES.length - 1) {
            dlgI++;
            DLG_TEXT = DLG_LINES[dlgI];
            dlgN = 0;
            dlgAcc = 0;
            dlgSet('');
            dlgEl.classList.remove('done');
        }
        else {
            closeDlg();
            onDlgEnd();
        }
    }
    const fpsEl = document.getElementById('fps');
    let fly = false, fcx = 0, fcy = 0, fcz = 0;
    const fcEl = document.createElement('div');
    fcEl.id = 'fcbox';
    fcEl.textContent = 'FREECAM (Del para sair)';
    fcEl.style.cssText = 'position:fixed;left:50%;top:8px;transform:translateX(-50%);font:12px monospace;color:#9cf0ff;text-shadow:1px 1px 0 #000;pointer-events:none;display:none';
    document.body.appendChild(fcEl);
    function setFly(v) { fly = v; if (!v)
        document.body.classList.remove('noui'); fcEl.style.display = v ? 'block' : 'none'; cam.children.forEach(o => { o.visible = !v; }); if (v) {
        fcx = cam.position.x;
        fcy = cam.position.y;
        fcz = cam.position.z;
        sprint = false;
    } }
    const dbg = document.createElement('div');
    dbg.id = 'dbgbox';
    dbg.style.cssText = 'position:fixed;left:8px;top:8px;font:12px monospace;color:#f1f8ee;text-shadow:1px 1px 0 #000;pointer-events:none;display:none;white-space:pre';
    document.body.appendChild(dbg);
    const showDbg = () => { dbg.textContent = 'teclas: ' + Object.keys(keys).filter(k => keys[k]).join(' + '); };
