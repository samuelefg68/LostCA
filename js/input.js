// ARQUIVO: INPUT PC (teclado e mouse).
    // ===== INPUT PC: teclado e mouse =====
    addEventListener('keydown', e => {
        if (cfgOpen) {
            if (e.code === 'Escape') {
                e.preventDefault();
                window.__closeCfg();
            }
            return;
        }
        if (!active && !ov.classList.contains('off') && (e.code === 'Space' || e.key === ' ')) {
            e.preventDefault();
            if (!e.repeat)
                start();
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
        if (e.code === 'KeyE' && (nearK || dlgOn) && active && !e.repeat)
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
    let volMus = 1, volSfx = 1, volUi = 1, musBus = null, sfxBus = null, uiBus = null;
    const CFG_KEY = 'cdf_cfg_v1';
    try {
        const o = JSON.parse(localStorage.getItem(CFG_KEY) || '{}');
        if (typeof o.sens === 'number')
            sens = Math.max(.2, Math.min(3, o.sens));
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
