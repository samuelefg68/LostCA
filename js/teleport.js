// ARQUIVO: TELEPORT (painel de teleporte da tecla T, só PC, só teclado; boot direto numa área).
// ===== TELEPORT: painel (T) e entrada direta nas áreas =====
// Fluxo: T abre/fecha o painel (desativado no menu, em diálogo, fade, evento do jogo ou configurações). Escolher um destino grava o id em localStorage (CONFIG.teleport.key),
// recarrega a página dentro de fadeRun e, no boot (fim deste arquivo), pula o menu inicial e entra na área (tpEnter). Sempre recarrega, mesmo quando poderia ir direto: um único caminho,
// e o estado de cada área nasce limpo. Carrega DEPOIS de impact.js e ANTES de main.js; input.js (tpKey) e graphics.js (tpEsc) só chamam estas funções em tempo de execução.
    const TP = CONFIG.teleport;
    let tpOpen = false, tpSel = 0;
    const tpEl = document.createElement('div');
    tpEl.id = 'tp';
    document.body.appendChild(tpEl);
    // área atual (índice em TP.list), só para o destaque inicial do painel
    function tpCur() {
        if (typeof inColiseum !== 'undefined' && inColiseum)
            return 5;
        if (inCube)
            return px >= CUBE_ROOM.xl ? 4 : 3;
        if (inBridge)
            return 2;
        return pz < CZ0 && Math.abs(px - CX) < ROAD.hw + 6 ? 1 : 0;
    }
    function tpRender() {
        tpEl.innerHTML = '<h2>Teleporte</h2>' + TP.list.map((d, i) => '<div class="tpi' + (i === tpSel ? ' on' : '') + '"><b>' + (i + 1) + '</b>' + d.name + '</div>').join('') + '<small>Setas ou W/S: escolher. Enter: ir. T ou Esc: fechar. Números: ir direto.</small>';
    }
    // desativado: menu inicial/pausa (active), diálogo, fade, evento do jogo (walkBusy) e configurações
    function tpCanOpen() { return active && !dlgOn && !fading && !walkBusy && !cfgOpen; }
    function tpOpenPanel() {
        tpOpen = true;
        tpSel = tpCur();
        for (const k in keys)
            keys[k] = 0;
        sprint = false;
        walkBusy = true; // trava movimento/pulo/dash/ataque e os eventos do jogo (todos já checam walkBusy) enquanto o painel está aberto
        hint.classList.remove('on');
        tpRender();
        tpEl.classList.add('on');
    }
    function tpClose() {
        tpOpen = false;
        walkBusy = false;
        tpEl.classList.remove('on');
    }
    // Esc que soltou o ponteiro com o painel aberto (graphics.js): fecha o painel e devolve true para não pausar
    function tpEsc() {
        if (!tpOpen)
            return false;
        tpClose();
        return true;
    }
    function tpChoose(i) {
        const d = TP.list[i];
        if (!d)
            return;
        try { localStorage.setItem(TP.key, d.id); }
        catch (e) { tpClose(); return; } // sem localStorage não dá para teleportar
        tpOpen = false;
        tpEl.classList.remove('on'); // walkBusy continua true até a página recarregar
        fadeRun(() => { location.reload(); });
    }
    // chamada pelo keydown (input.js); devolve true se a tecla foi consumida
    function tpKey(e) {
        if (tpOpen) {
            if (!active) { // pausou com o painel aberto: fecha sem consumir
                tpClose();
                return false;
            }
            e.preventDefault();
            const c = e.code, n = TP.list.length;
            if (c === 'KeyT' || c === 'Escape') {
                if (!e.repeat)
                    tpClose();
            }
            else if (c === 'ArrowUp' || c === 'KeyW') {
                tpSel = (tpSel + n - 1) % n;
                tpRender();
            }
            else if (c === 'ArrowDown' || c === 'KeyS') {
                tpSel = (tpSel + 1) % n;
                tpRender();
            }
            else if ((c === 'Enter' || c === 'NumpadEnter' || c === 'Space' || c === 'KeyE') && !e.repeat)
                tpChoose(tpSel);
            else if (/^(Digit|Numpad)[1-9]$/.test(c) && !e.repeat && +c.slice(-1) <= n)
                tpChoose(+c.slice(-1) - 1);
            return true;
        }
        if (e.code === 'KeyT' && !e.repeat && tpCanOpen()) {
            e.preventDefault();
            tpOpenPanel();
            return true;
        }
        return false;
    }
    // entra na área `id` num boot limpo (chamada já com o jogo iniciado, no pico do preto)
    function tpEnter(id) {
        const eyeStand = CONFIG.player.eyeStand;
        const put = (x, z, y) => { px = x; pz = z; py = y; vy = 0; grounded = true; yaw = 0; pitch = 0; eye = eyeStand; dashT = 0; dashK = 0; };
        if (id === 'start') {
            put(TP.start.x, TP.start.z, H(TP.start.x, TP.start.z));
            yaw = TP.start.yaw;
        }
        else if (id === 'corridor') {
            // portão de trás já aberto (gateT quase 1: o tick termina a animação e troca as colisões num frame, sem woosh) e os diálogos da estátua e da placa dados como vistos
            seenStat = seenDir = gateDone = true;
            gateOpening = true;
            gateT = .999;
            put(CX, CZ0 - TP.corridor.inset, H(CX, CZ0 - TP.corridor.inset));
        }
        else if (id === 'bridge')
            enterBridge(); // bridge.js: esconde o mapa antigo, posiciona o jogador no início e liga a música da ponte
        else {
            enterCube(); // cube.js: descarta mapa antigo e ponte, luz de caverna, spawn na sala menor e música do cubo (cubeBgmPlay)
            if (id === 'cubeCorridor') {
                // chave pega e porta do túnel já aberta (mesmo estado final da animação em cubeClamp)
                cubeHasKey = true;
                CUBE_KEY.visible = false;
                cubeDoor3State = 2;
                if (CUBE_DOOR3.lock)
                    CUBE_DOOR3.lock.visible = false;
                CUBE_DOOR3.pv[0].rotation.y = -CUBG.corridor.door3.openAngle;
                CUBE_DOOR3.pv[1].rotation.y = CUBG.corridor.door3.openAngle;
                const i = CUBE_ROOM.boxes.findIndex(b => b.door);
                if (i >= 0)
                    CUBE_ROOM.boxes.splice(i, 1);
                put(CUBE_X, CUBE_COR_Z0 - TP.cubeCorridor.inset, CUBE_Y);
                cubeLX = cubeLZ = NaN;
                cubeLights();
            }
            else if (id === 'coliseum') {
                enterColiseum(); // coliseum.js: descarta o CUBE e abre o diálogo de entrada, que aqui é fechado na hora
                closeDlg();
            }
        }
    }
    // BOOT: se há um destino gravado, apaga a chave (um F5 normal não teleporta de novo), pula o menu inicial e entra na área com o preto instantâneo + fade de saída
    (function () {
        let id = null;
        try {
            id = localStorage.getItem(TP.key);
            localStorage.removeItem(TP.key);
        }
        catch (e) { }
        if (!id || !TP.list.some(d => d.id === id))
            return;
        fadeRun(() => {
            start(); // audio.js: tira o menu e liga o jogo (o ponteiro só trava com um clique; o áudio retoma no 1º clique/tecla)
            tpEnter(id);
            hint.classList.add('on');
            hintT = 6;
            const h0 = hint.textContent;
            hint.textContent = TP.hint;
            setTimeout(() => { hint.textContent = h0; }, 6500);
        }, undefined, true);
    })();
