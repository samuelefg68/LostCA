// ARQUIVO: AUDIO (música, passos, espada, dash, woosh, UI).
    // ===== AUDIO: música, passos, espada, dash, sons de UI =====
    const BGM_SKIP = CONFIG.audio.bgmSkipSec;
    let actx = null, bgmGain = null, bgmBuf = null, bgmSrc = null, bgmWant = false;
    function bgmStart() { if (!bgmWant || !bgmBuf || bgmSrc || !actx)
        return; bgmSrc = actx.createBufferSource(); bgmSrc.buffer = bgmBuf; bgmSrc.loop = true; bgmSrc.loopStart = BGM_SKIP; bgmSrc.loopEnd = bgmBuf.duration; bgmSrc.connect(bgmGain); bgmSrc.start(0, BGM_SKIP); }
    function bgmInit() {
        if (actx)
            return;
        try {
            const AC = window.AudioContext || window.webkitAudioContext;
            actx = new AC();
            master = actx.createGain();
            master.gain.value = volMaster;
            master.connect(actx.destination);
            musBus = actx.createGain();
            musBus.gain.value = volMus;
            musBus.connect(master);
            sfxBus = actx.createGain();
            sfxBus.gain.value = volSfx;
            sfxBus.connect(master);
            uiBus = actx.createGain();
            uiBus.gain.value = volUi;
            uiBus.connect(master);
            bgmGain = actx.createGain();
            bgmGain.connect(musBus);
            bgmGain.gain.value = CONFIG.audio.bgmGain;
            stepLoad();
            swordLoad();
            impactLoad();
            loadAudio(BGM_URL, b => { bgmBuf = b; bgmStart(); }, 'música');
        }
        catch (e) {
            console.warn('música indisponível', e);
        }
    }
    function bgmPlay() { bgmWant = true; bgmInit(); if (!actx)
        return; const r = actx.resume(); if (r && r.catch)
        r.catch(() => { }); bgmStart(); }
    function bgmRestart() { try {
        if (bgmSrc) {
            bgmSrc.onended = null;
            bgmSrc.stop();
            bgmSrc.disconnect();
        }
    }
    catch (e) { } bgmSrc = null; bgmStart(); }
    const STEP_URL = { walk: CONFIG.paths.stepWalk, run: CONFIG.paths.stepRun };
    const STEP_VOL = { walk: CONFIG.audio.stepWalkVol, run: CONFIG.audio.stepRunVol };
    let stepG = {}, stepCur = null;
    function stepLoad() {
        for (const k in STEP_URL) {
            const g = actx.createGain();
            g.gain.value = 0;
            g.connect(sfxBus || master || actx.destination);
            stepG[k] = g;
            const ok = buf => { const src = actx.createBufferSource(); src.buffer = buf; src.loop = true; src.connect(g); src.start(0); };
            loadAudio(STEP_URL[k], ok, 'passos ' + k);
        }
    }
    const SWORD_URL = CONFIG.paths.sword, SWORD_VOL = CONFIG.audio.swordVol, SWORD_T = CONFIG.audio.swordTiming;
    let swordBuf = [null, null], swordG = null;
    function swordLoad() {
        swordG = actx.createGain();
        swordG.gain.value = SWORD_VOL;
        swordG.connect(sfxBus || master || actx.destination);
        SWORD_URL.forEach((u, i) => loadAudio(u, buf => { swordBuf[i] = buf; }, 'espada ' + i));
    }
    function swordPlay(i) { if (!actx || !swordG || !swordBuf[i])
        return; try {
        const s = actx.createBufferSource(), T = SWORD_T[i];
        s.buffer = swordBuf[i];
        s.connect(swordG);
        s.start(actx.currentTime + T.delay, T.off);
    }
    catch (e) { } }
    const IMPACT_KINDS = ['tree', 'stone', 'gate'];
    let impactBuf = {}, impactG = null;
    function impactLoad() {
        impactG = actx.createGain();
        impactG.gain.value = 1;
        impactG.connect(sfxBus || master || actx.destination);
        IMPACT_KINDS.forEach(k => loadAudio(CONFIG.paths.impact[k], buf => { impactBuf[k] = buf; }, 'impacto ' + k));
    }
    function impactPlay(kind) { if (!actx || !impactG || !impactBuf[kind])
        return; try {
        const s = actx.createBufferSource(), g = actx.createGain();
        s.buffer = impactBuf[kind];
        g.gain.value = CONFIG.audio.impactVol[kind];
        s.connect(g);
        g.connect(impactG);
        s.start();
    }
    catch (e) { } }
// SOM DO DASH
const dashAudio = new Audio(CONFIG.paths.dash);
dashAudio.preload = 'auto';

function dashPlay() {
    try {
        dashAudio.pause();
        dashAudio.currentTime = 0;

        dashAudio.volume = Math.max(
            0,
            Math.min(1, volMaster * volSfx * CONFIG.audio.dashVol)
        );

        const playback = dashAudio.play();

        if (playback && playback.catch) {
            playback.catch(() => {});
        }
    } catch (e) {}
}
const wooshAudio = new Audio(CONFIG.paths.woosh);
wooshAudio.preload = 'auto';
function wooshPlay() {
    try {
        wooshAudio.pause();
        wooshAudio.currentTime = 0;
        wooshAudio.volume = Math.max(0, Math.min(1, volMaster * volSfx * CONFIG.audio.wooshVol));
        const playback = wooshAudio.play();
        if (playback && playback.catch)
            playback.catch(() => {});
    } catch (e) {}
}
    const KEY_VOL = CONFIG.audio.keyVol;
    let keyNoise = null;
    function keyClick(ch) {
        if (!actx || !master || actx.state !== 'running' || ch === ' ')
            return;
        try {
            const t = actx.currentTime, v = .65 + Math.random() * .35;
            if (!keyNoise) {
                const n = Math.floor(actx.sampleRate * .03), b = actx.createBuffer(1, n, actx.sampleRate), d = b.getChannelData(0);
                for (let i = 0; i < n; i++)
                    d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
                keyNoise = b;
            }
            const s = actx.createBufferSource();
            s.buffer = keyNoise;
            const f = actx.createBiquadFilter();
            f.type = 'bandpass';
            f.frequency.value = 2200 + Math.random() * 1600;
            f.Q.value = 1.2;
            const g = actx.createGain();
            g.gain.value = KEY_VOL * v;
            s.connect(f);
            f.connect(g);
            g.connect(sfxBus || master);
            s.start(t);
            const o = actx.createOscillator(), og = actx.createGain();
            o.type = 'sine';
            o.frequency.setValueAtTime(190 + Math.random() * 50, t);
            o.frequency.exponentialRampToValueAtTime(90, t + .05);
            og.gain.setValueAtTime(KEY_VOL * .55 * v, t);
            og.gain.exponentialRampToValueAtTime(.0001, t + .06);
            o.connect(og);
            og.connect(sfxBus || master);
            o.start(t);
            o.stop(t + .07);
        }
        catch (e) { }
    }
    const UI_VOL = CONFIG.audio.uiVol;
    let uiShaper = null, uiNoise = null;
    function uiSound(kind) {
        if (!actx || !master || actx.state !== 'running')
            return;
        try {
            const t = actx.currentTime, hov = kind === 'hover';
            if (!uiShaper) {
                const n = 1024, c = new Float32Array(n);
                for (let i = 0; i < n; i++) {
                    const x = i / (n - 1) * 2 - 1;
                    c[i] = Math.tanh(x * 7);
                }
                uiShaper = actx.createWaveShaper();
                uiShaper.curve = c;
                uiShaper.oversample = '2x';
                uiShaper.connect(uiBus || master);
            }
            if (!uiNoise) {
                const n = Math.floor(actx.sampleRate * .12), b = actx.createBuffer(1, n, actx.sampleRate), d = b.getChannelData(0);
                for (let i = 0; i < n; i++)
                    d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
                uiNoise = b;
            }
            const out = actx.createGain();
            out.gain.value = UI_VOL * (hov ? .45 : 1);
            out.connect(uiShaper);
            const s = actx.createBufferSource();
            s.buffer = uiNoise;
            const bf = actx.createBiquadFilter();
            bf.type = 'highpass';
            bf.frequency.value = hov ? 3500 : 1800;
            const sg = actx.createGain();
            sg.gain.setValueAtTime(hov ? .5 : .9, t);
            sg.gain.exponentialRampToValueAtTime(.0001, t + (hov ? .035 : .09));
            s.connect(bf);
            bf.connect(sg);
            sg.connect(out);
            s.start(t);
            s.stop(t + .1);
            [hov ? [1250, 1810] : [310, 447]].forEach(fr => fr.forEach((fq, i) => {
                const o = actx.createOscillator(), g = actx.createGain();
                o.type = i ? 'sawtooth' : 'square';
                o.frequency.setValueAtTime(fq, t);
                o.frequency.exponentialRampToValueAtTime(fq * (hov ? .8 : .55), t + .07);
                g.gain.setValueAtTime(hov ? .18 : .34, t);
                g.gain.exponentialRampToValueAtTime(.0001, t + (hov ? .04 : .12));
                o.connect(g);
                g.connect(out);
                o.start(t);
                o.stop(t + .13);
            }));
            if (!hov) {
                const o = actx.createOscillator(), g = actx.createGain();
                o.type = 'sine';
                o.frequency.setValueAtTime(150, t);
                o.frequency.exponentialRampToValueAtTime(38, t + .11);
                g.gain.setValueAtTime(.9, t);
                g.gain.exponentialRampToValueAtTime(.0001, t + .14);
                o.connect(g);
                g.connect(out);
                o.start(t);
                o.stop(t + .15);
            }
        }
        catch (e) { }
    }
    {
        let hovEl = null;
        document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('#ov button,#cfg button'); if (b)
            uiSound('click'); }, true);
        document.addEventListener('mouseover', e => { const b = e.target.closest && e.target.closest('#ov button,#cfg button'); if (b && b !== hovEl)
            uiSound('hover'); hovEl = b || null; }, true);
    }
    function stepSet(kind) { if (kind === stepCur || !actx)
        return; stepCur = kind; const t = actx.currentTime; for (const k in stepG)
        stepG[k].gain.setTargetAtTime(k === kind ? STEP_VOL[k] : 0, t, .08); }
    ['pointerdown', 'keydown', 'touchstart'].forEach(ev => addEventListener(ev, () => { if (!bgmWant)
        bgmPlay();
    else if (actx && actx.state === 'suspended')
        actx.resume(); }, { passive: true }));
    document.addEventListener('visibilitychange', () => { if (!actx || !bgmWant)
        return; if (document.hidden)
        actx.suspend();
    else
        actx.resume(); });
    let paused = false, pausedAt = 0;
    function start() {
        paused = false;
        bgmPlay();
        active = true;
        if (dlgOn)
            dlgEl.classList.add('on');
        ov.classList.add('off');
        ov.classList.remove('first');
        hint.classList.add('on');
        hintT = 6;
        if (!IS_MOBILE) {
            try {
                const r = cv.requestPointerLock();
                if (r && r.catch)
                    r.catch(() => { });
            }
            catch (e) { }
        }
        else
            try {
                const de = document.documentElement;
                if (!document.fullscreenElement && de.requestFullscreen) {
                    const r = de.requestFullscreen({ navigationUI: 'hide' });
                    if (r && r.then)
                        r.then(() => { try {
                            const o = screen.orientation.lock('landscape');
                            if (o && o.catch)
                                o.catch(() => { });
                        }
                        catch (e) { } }).catch(() => { });
                }
            }
            catch (e) { }
    }
    function pause() {
        paused = true;
        pausedAt = performance.now();
        dlgEl.classList.remove('on');
        active = false;
        hint.classList.remove('on');
        document.getElementById('ttl').textContent = 'Pausado';
        document.getElementById('sub').textContent = 'O vento continua soprando as pétalas.';
        document.getElementById('go').textContent = 'Continuar';
        ov.classList.remove('off');
    }
    document.getElementById('go').addEventListener('click', start);