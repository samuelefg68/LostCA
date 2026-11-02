// ARQUIVO: DIALOGUE (dialogo, interacao E, evento do portao) + FREECAM e debug.
// ===== DIALOGUE: dialogo, interacao (E) e evento do portao =====
    const STAT_LINES = ['A estátua do cavaleiro centenário.', 'Você não quer causar nenhum dano.'];
    const DIR_LINES = ['↓ Floresta Vasta.', '↑ Cemitério.', '← A Vila Abandonada.', '→ Ruínas do Reino.'];
    const WALK_LINES = [CONFIG.story.walkText];
    const FRAME_LINES = [(CONFIG.cube && CONFIG.cube.corridor && CONFIG.cube.corridor.frame && CONFIG.cube.corridor.frame.text) || 'Retrato de uma moça sorrindo.']; // E num quadro do corredor do castelo
    let walkBusy = false; // true do fim do diálogo do corredor até o fim da espera no preto (tick bloqueia movimento/pulo/dash/ataque)
    let DLG_LINES = STAT_LINES, DLG_TEXT = STAT_LINES[0], dlgI = 0;
    let dlgOn = false, dlgN = 0, dlgAcc = 0;
    const ARW = { '↑': '', '→': ' r', '↓': ' d', '←': ' l' };
    function dlgSet(t) {
        const shake = /Ruínas do Reino/.test(DLG_TEXT);
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
    // fim do corredor: fade -> espera walkHold s no preto -> teleporta ao início -> clareia (mesmo fade do menu para o jogo)
    function walkTeleport() {
        enterBridge(); // bridge.js: esconde o mapa antigo e leva o jogador ao início da ponte (sem volta)
        corrEndDone = false;
        setTimeout(() => { walkBusy = false; }, CONFIG.story.walkHold * 1000);
    }
    function onWalkEnd() {
        if (fading) { corrEndDone = false; return; }
        walkBusy = true;
        fadeRun(walkTeleport, CONFIG.story.walkHold * 1000);
    }
    function onDlgEnd() {
        if (DLG_LINES === WALK_LINES) { onWalkEnd(); return; }
        if (bridgeDlgEnd()) return; // diálogos da ponte (bridge.js): desligam o dash / o correr
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
        if (!dlgOn) {
            if (nearKey)
                cubeKeyUse(); // cube.js: pega a chave da sala (sem diálogo)
            else if (nearD3)
                cubeDoor3Use(); // cube.js: porta trancada do fim da escada (mesmo diálogo da porta do fim do corredor)
            else if (nearD)
                coliseumDoorUse(); // coliseum.js: porta do fim do corredor do castelo
            else
                startDlg(nearF ? FRAME_LINES : nearW === 2 ? DIR_LINES : STAT_LINES);
        }
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

// ===== FREECAM: camera livre e debug =====
    const fpsEl = document.getElementById('fps');
    let fly = false, fcx = 0, fcy = 0, fcz = 0;
    const fcEl = document.createElement('div');
    fcEl.id = 'fcbox';
    fcEl.textContent = 'FREECAM (Del para sair)';
    fcEl.style.cssText = 'position:fixed;left:50%;top:8px;transform:translateX(-50%);font:12px monospace;color:#9cf0ff;text-shadow:1px 1px 0 #000;pointer-events:none;display:none';
    document.body.appendChild(fcEl);
    // ao SAIR da câmera livre o jogador fica onde a câmera parou (mesmo yaw/pitch, vy = 0): aplica os limites da área atual e assenta no chão dela. Não troca de área (para isso, painel T em teleport.js)
    function flyLand() {
        px = fcx;
        pz = fcz;
        vy = 0;
        dashT = 0;
        if (inBridge)
            bridgeClamp();
        if (inCube) {
            cubeLX = cubeLZ = NaN; // sem histórico: senão a varredura de cubeClamp() arrastaria o jogador do último ponto válido até a câmera e o barraria numa parede
            cubeClamp();
        }
        py = inCube ? cubeGround(px, pz) : inBridge ? BR_DECK_Y : H(px, pz);
        grounded = true;
    }
    function setFly(v) { const was = fly; fly = v; if (was && !v) flyLand(); if (!v)
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