// ARQUIVO: INPUT PC (teclado e mouse).
    // ===== INPUT PC: teclado e mouse =====
    // Fade: escurece, roda a ação no pico (fadeRun), clareia. startFade = menu -> jogo. Tempos em CONFIG.fade (ms), com padrão aqui.
    const FADE = Object.assign({ out: 450, hold: 120, in: 600 }, CONFIG.fade);
    const fadeEl = document.getElementById('fade');
    let fading = false, fadeWait = null;
    // holdMs < 0 = segura o preto até alguém chamar fadeRelease() (usado pelo diálogo "Você caiu" da ponte)
    function fadeRelease() { if (fadeWait) { const f = fadeWait; fadeWait = null; f(); } }
    // instant = true: o preto entra de uma vez (sem transição) e fn roda no frame seguinte; a saída (clarear) continua com FADE.in
    function fadeRun(fn, holdMs, instant) {
        if (fading)
            return;
        fading = true;
        fadeEl.style.transition = instant ? 'none' : 'opacity ' + FADE.out + 'ms ease-in';
        fadeEl.style.opacity = '1';
        const go = () => {
            try { fn(); } catch (e) { console.warn('fade:', e); }
            const fin = () => {
                fadeEl.style.transition = 'opacity ' + FADE.in + 'ms ease-out';
                fadeEl.style.opacity = '0';
                setTimeout(() => { fading = false; }, FADE.in);
            };
            if (holdMs < 0)
                fadeWait = fin;
            else
                setTimeout(fin, holdMs === undefined ? FADE.hold : holdMs);
        };
        if (instant)
            requestAnimationFrame(() => setTimeout(go, 0));
        else
            setTimeout(go, FADE.out);
    }
    function startFade() {
        if (fading)
            return;
        if (active || !ov.classList.contains('first')) {
            start();
            return;
        }
        fadeRun(start);
    }
    document.addEventListener('click', e => {
        if (e.target.closest && e.target.closest('#go')) {
            e.stopPropagation();
            startFade();
        }
    }, true);
    addEventListener('keydown', e => {
        if (cfgOpen) {
            if (e.code === 'Escape') {
                e.preventDefault();
                window.__closeCfg();
            }
            return;
        }
        if (tpKey(e)) // teleport.js: painel de teleporte (T); consome todas as teclas enquanto aberto
            return;
        if (!active && !ov.classList.contains('off') && (e.code === 'Space' || e.key === ' ')) {
            e.preventDefault();
            if (!e.repeat)
                startFade();
            return;
        }
        if (dlgOn && (e.code === 'Space' || e.key === ' ')) {
            e.preventDefault();
            if (!e.repeat && active)
                interact();
            return;
        }
        if (e.code === 'Delete' && active && !dlgOn) {
            if (!e.repeat)
                setFly(!fly);
            e.preventDefault();
            return;
        }
        if (e.code === 'PageUp') {
            e.preventDefault();
            if (fly && !e.repeat)
                document.body.classList.toggle('noui');
            return;
        }
        keys[e.code] = 1;
        shiftOn = e.shiftKey;
        if (e.code === 'KeyQ' && !e.repeat && active)
            dashQ = true;
        if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight') && !e.repeat)
            sprint = !sprint;
        if ((e.code === 'KeyW' || e.code === 'ArrowUp') && !e.repeat) {
            const n = performance.now();
            if (n - lastW < 300)
                sprint = true;
            lastW = n;
        }
        if ((e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar') && !e.repeat)
            jumpQ = CONFIG.player.jumpBuffer;
        if (e.code === 'KeyE' && (nearK || nearF || nearD || dlgOn) && active && !e.repeat)
            interact();
        if ((e.key === "'" || e.key === '"') && !e.repeat) {
            e.preventDefault();
            dbg.style.display = dbg.style.display === 'none' ? 'block' : 'none';
        }
        if (e.code === 'Space' || e.code.startsWith('Arrow'))
            e.preventDefault();
        if (e.code === 'Escape' && active && document.pointerLockElement !== cv)
            pause();
        else if (e.code === 'Escape' && paused && !active && !e.repeat && performance.now() - pausedAt > 400) {
            e.preventDefault();
            start();
            return;
        }
        showDbg();
    });
    addEventListener('keyup', e => { keys[e.code] = 0; shiftOn = e.shiftKey; if (e.code === 'KeyW' || e.code === 'ArrowUp')
        sprint = false; showDbg(); });
    addEventListener('blur', () => { for (const k in keys)
        keys[k] = 0; shiftOn = false; sprint = false; jumpQ = 0; });
    addEventListener('mousemove', e => { if (!active || dlgOn)
        return; if (document.pointerLockElement === cv || drag) {
        yaw -= e.movementX * .0022 * sens;
        pitch = Math.max(-1.45, Math.min(1.45, pitch - e.movementY * .0022 * sens));
    } });
    cv.addEventListener('mousedown', () => { if (!active)
        return; if (document.pointerLockElement !== cv) {
        try {
            const r = cv.requestPointerLock();
            if (r && r.catch)
                r.catch(() => { });
        }
        catch (e) { }
    } drag = document.pointerLockElement !== cv; if (!dlgOn)
        atkQ = performance.now(); });
    addEventListener('mouseup', () => { drag = false; });
    function loadAudio(url, cb, tag) {
        fetch(url).then(r => { if (!r.ok) throw new Error(r.status + ' ' + url); return r.arrayBuffer(); }).then(ab => actx.decodeAudioData(ab, cb, e => console.warn(tag + ': falha ao decodificar', url, e))).catch(e => console.warn(tag + ': falha ao carregar', e));
    }
    const BGM_URL = CONFIG.paths.bgm;
    let sens = 1, volMaster = 1, master = null, cfgOpen = false;
    let fovUser = CONFIG.camera.fov;
    let volMus = 1, volSfx = 1, volUi = 1, musBus = null, sfxBus = null, uiBus = null;
    const CFG_KEY = 'cdf_cfg_v1';
    try {
        const o = JSON.parse(localStorage.getItem(CFG_KEY) || '{}');
        if (typeof o.sens === 'number')
            sens = Math.max(.2, Math.min(3, o.sens));
        if (typeof o.fov === 'number')
            fovUser = Math.max(CONFIG.camera.fovMin, Math.min(CONFIG.camera.fovMax, o.fov));
        if (typeof o.vol === 'number')
            volMaster = Math.max(0, Math.min(1, o.vol));
        if (typeof o.mus === 'number')
            volMus = Math.max(0, Math.min(1, o.mus));
        if (typeof o.sfx === 'number')
            volSfx = Math.max(0, Math.min(1, o.sfx));
        if (typeof o.ui === 'number')
            volUi = Math.max(0, Math.min(1, o.ui));
    }
    catch (e) { }