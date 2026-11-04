// ARQUIVO: AUDIO (música, passos, espada, dash, woosh, UI).
    // ===== AUDIO: música, passos, espada, dash, sons de UI =====
    const BGM_SKIP = CONFIG.audio.bgmSkipSec;
    let actx = null, bgmGain = null, bgmBuf = null, bgmSrc = null, bgmWant = false;
    let bgmOff = false, brBgmGain = null, brBgmBuf = null, brBgmSrc = null, brBgmWant = false; // bgmOff = música do jogo desligada para sempre (depois de entrar na ponte); br* = música da ponte
    function bgmStart() { if (!bgmWant || bgmOff || !bgmBuf || bgmSrc || !actx)
        return; bgmSrc = actx.createBufferSource(); bgmSrc.buffer = bgmBuf; bgmSrc.loop = true; bgmSrc.loopStart = BGM_SKIP; bgmSrc.loopEnd = bgmBuf.duration; bgmSrc.connect(bgmGain); bgmSrc.start(0, BGM_SKIP); }
    function bgmInit() {
        if (actx)
            return;
        try {
            const AC = window.AudioContext || window.webkitAudioContext;
            actx = new AC();
            master = actx.createGain();
            master.gain.value = volMaster;
            muteG = actx.createGain(); // mudo geral: master -> muteG -> saída; vai a 0 enquanto o caiu.mp3 toca (ver fallPlay). Fica separado dos volumes do menu (master/mus/sfx/ui) para não brigar com as configurações
            pauseF = actx.createBiquadFilter(); // abafamento da pausa: muteG -> pauseF (passa-baixa) -> pauseG (volume) -> saída; fora da pausa fica aberto (22 kHz, ganho 1)
            pauseF.type = 'lowpass';
            pauseF.frequency.value = 22000;
            pauseG = actx.createGain();
            muteG.connect(pauseF);
            pauseF.connect(pauseG);
            pauseG.connect(actx.destination);
            master.connect(muteG);
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
            brBgmGain = actx.createGain();
            brBgmGain.connect(musBus);
            brBgmGain.gain.value = CONFIG.audio.bridgeBgmGain;
            cubBgmGain = actx.createGain();
            cubBgmGain.connect(musBus);
            cubBgmGain.gain.value = CONFIG.audio.cubeBgmGain;
            lutGain = actx.createGain();
            lutGain.connect(musBus);
            lutGain.gain.value = CONFIG.audio.lutaBgmGain;
            stepLoad();
            swordLoad();
            impactLoad();
            loadAudio(CONFIG.paths.dash, b => { dashBuf = b; }, 'dash');
            loadAudio(CONFIG.paths.fall,b => { fallBuf = b; }, 'som da queda');
            loadAudio(CONFIG.paths.knockdown, b => { knockdownBuf = b; }, 'som da derrubada');
            loadAudio(BGM_URL, b => { bgmBuf = b; bgmStart(); }, 'música');
            loadAudio(CONFIG.paths.bridgeBgm, b => { brBgmBuf = b; if (brBgmWant) bridgeBgmStart(); }, 'música da ponte');
            loadAudio(CONFIG.paths.cubeBgm, b => { cubBgmBuf = b; if (cubBgmWant) cubeBgmStart(); }, 'música do cubo');
            loadAudio(CONFIG.paths.comemora, b => { comBuf = b; }, 'som da plateia');
            loadAudio(CONFIG.paths.luta, b => { lutBuf = b; if (lutWant) lutaBgmStart(); }, 'música da luta');
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
    // ponte (chamada por enterBridge, bridge.js): a música do jogo some com fade de audio.bgmFadeOut s e DEPOIS começa ponte.mp3 em loop (do início); bgmOff impede que bgmStart/bgmRestart/cliques a religuem
    function bridgeBgmStart() {
        if (!actx || !brBgmBuf || !brBgmGain || brBgmSrc)
            return;
        try {
            brBgmSrc = actx.createBufferSource();
            brBgmSrc.buffer = brBgmBuf;
            brBgmSrc.loop = true;
            brBgmSrc.connect(brBgmGain);
            brBgmSrc.start(Math.max(actx.currentTime, brBgmAt));
        }
        catch (e) { brBgmSrc = null; }
    }
    let brBgmAt = 0;
    function bridgeBgmPlay() {
        if (brBgmWant)
            return;
        brBgmWant = true;
        bgmOff = true;
        const fd = CONFIG.audio.bgmFadeOut;
        if (actx) {
            const t = actx.currentTime;
            brBgmAt = t + fd;
            if (bgmSrc && bgmGain) {
                try {
                    bgmGain.gain.cancelScheduledValues(t);
                    bgmGain.gain.setValueAtTime(bgmGain.gain.value, t);
                    bgmGain.gain.linearRampToValueAtTime(0, t + fd);
                    bgmSrc.stop(t + fd + .05);
                }
                catch (e) { }
                bgmSrc = null;
            }
            bridgeBgmStart();
        }
    }
    // cubo (chamada por enterCube, cube.js): a música da ponte (ou a do jogo, se vier direto, p.ex. pelo teleporte) some com fade de audio.cubeFadeOut s e DEPOIS começa castelo.mp3 em loop (volume audio.cubeBgmGain, pelo musBus)
    let cubBgmGain = null, cubBgmBuf = null, cubBgmSrc = null, cubBgmWant = false, cubBgmAt = 0;
    // castelo.mp3 só começa DEPOIS do caiu.mp3 (queda da ponte): fallState 0 = sem queda (ex.: teleporte), 1 = derrubou.mp3 tocado (queda em andamento), 2 = caiu.mp3 tocando, 3 = caiu.mp3 terminou. cubBgmHold = castelo.mp3 pedido por cubeBgmPlay() mas segurado até o fim do caiu.mp3
    let cubBgmHold = false, fallState = 0, muteG = null, knockBusy = false;
    // libera o castelo.mp3 segurado: só quando derrubou.mp3 E caiu.mp3 já terminaram (chamada no fim de cada um)
    function cubeBgmRelease() { if (cubBgmHold && fallState === 3 && !knockBusy) { cubBgmHold = false; cubeBgmStart(); } }
    function fallDlgMute() { if (fallState === 1) muteAll(true); } // chamada por startDlg (dialogue.js): fallState 1 = derrubou.mp3 já tocou, então o diálogo que abre agora é o "Você caiu."; o mudo vai até o fim do caiu.mp3 (fallPlay)
    // PAUSA: todos os sons (passam por master -> muteG) ficam abafados (passa-baixa em audio.pauseCutoff Hz) e mais baixos (ganho audio.pauseGain) em audio.pauseTime s; ao continuar voltam ao normal. O caiu.mp3 liga direto na saída e não é afetado
    let pauseF = null, pauseG = null;
    function pauseMuffle(on) {
        if (!actx || !pauseF || !pauseG)
            return;
        try {
            const A = CONFIG.audio, t = actx.currentTime, d = A.pauseTime != null ? A.pauseTime : .15;
            pauseF.frequency.cancelScheduledValues(t);
            pauseF.frequency.setValueAtTime(pauseF.frequency.value, t);
            pauseF.frequency.linearRampToValueAtTime(on ? (A.pauseCutoff || 600) : 22000, t + d);
            pauseG.gain.cancelScheduledValues(t);
            pauseG.gain.setValueAtTime(pauseG.gain.value, t);
            pauseG.gain.linearRampToValueAtTime(on ? (A.pauseGain != null ? A.pauseGain : .35) : 1, t + d);
        }
        catch (e) { }
    }
    function muteAll(on) { // silencia TODOS os sons do jogo (música, passos, espada, UI...) com uma rampa curta; o caiu.mp3 liga direto na saída e não passa por aqui
        if (!actx || !muteG) return;
        try {
            const t = actx.currentTime, g = muteG.gain;
            g.cancelScheduledValues(t);
            g.setValueAtTime(g.value, t);
            g.linearRampToValueAtTime(on ? 0 : 1, t + .03);
        }
        catch (e) { }
    }
    function cubeBgmStart() {
        if (!actx || !cubBgmBuf || !cubBgmGain || cubBgmSrc || cubBgmHold)
            return;
        try {
            cubBgmSrc = actx.createBufferSource();
            cubBgmSrc.buffer = cubBgmBuf;
            cubBgmSrc.loop = true;
            cubBgmSrc.connect(cubBgmGain);
            cubBgmSrc.start(Math.max(actx.currentTime, cubBgmAt));
        }
        catch (e) { cubBgmSrc = null; }
    }
    function cubeBgmPlay() {
        if (cubBgmWant)
            return;
        cubBgmWant = true;
        // queda em andamento: espera o fim do derrubou.mp3 e do caiu.mp3 (ver cubeBgmRelease). fallState 0 com a música da ponte tocando = veio da ponte (enterCube roda no preto, possivelmente ANTES do derrubou.mp3 começar), então também espera; teleporte direto ao cubo (sem música da ponte) toca na hora
        cubBgmHold = fallState === 1 || fallState === 2 || (fallState === 0 && !!brBgmSrc);
        bgmOff = true;
        brBgmWant = false; // a música da ponte não pode mais (re)começar
        const fd = CONFIG.audio.cubeFadeOut;
        if (actx) {
            const t = actx.currentTime;
            cubBgmAt = t + fd;
            for (const [g, src] of [[bgmGain, bgmSrc], [brBgmGain, brBgmSrc]])
                if (g && src) {
                    try {
                        g.gain.cancelScheduledValues(t);
                        g.gain.setValueAtTime(g.gain.value, t);
                        g.gain.linearRampToValueAtTime(0, t + fd);
                        src.stop(t + fd + .05);
                    }
                    catch (e) { }
                }
            bgmSrc = null;
            brBgmSrc = null;
            cubeBgmStart();
        }
    }
    // coliseu: (1) arenaMusicStop(fade) (chamada por enterColiseum, coliseum.js, ao ENTRAR no mapa): TODAS as músicas (jogo, ponte, cubo) somem com fade de `fade` s (audio.arenaFadeOut) e não religam mais; (2) arenaMusicPlay() (chamada por cubeClamp do coliseu quando as LUZES começam a acender): comemora.mp3 (plateia, pelo sfxBus, volume audio.comemoraVol) toca na hora e, quando ACABA, luta.mp3 começa em LOOP (musBus, volume audio.lutaBgmGain). Cada uma roda uma vez só (arenaStopped / arenaOn)
    let lutGain = null, lutBuf = null, lutSrc = null, lutWant = false, comBuf = null, arenaOn = false, arenaStopped = false;
    function lutaBgmStart() {
        if (!actx || !lutBuf || !lutGain || lutSrc || !lutWant)
            return;
        try {
            lutSrc = actx.createBufferSource();
            lutSrc.buffer = lutBuf;
            lutSrc.loop = true;
            lutSrc.connect(lutGain);
            lutSrc.start();
            coliseumTitleShow(); // titulo "A Fossa" nos 30 s iniciais da musica (coliseum.js)
            coliseumCubesStart(); // cubos verdes: 1a leva `cubes.delay` s depois (coliseum.js)
        }
        catch (e) { lutSrc = null; }
    }
    function arenaMusicStop(fade) {
        if (arenaStopped)
            return;
        arenaStopped = true;
        bgmOff = true;
        brBgmWant = false;
        cubBgmHold = true; // castelo.mp3 não pode mais (re)começar
        if (!actx)
            return;
        const t = actx.currentTime, fd = fade || 0;
        for (const [g, src] of [[bgmGain, bgmSrc], [brBgmGain, brBgmSrc], [cubBgmGain, cubBgmSrc]])
            if (g && src) {
                try {
                    g.gain.cancelScheduledValues(t);
                    g.gain.setValueAtTime(g.gain.value, t);
                    g.gain.linearRampToValueAtTime(0, t + fd);
                    src.stop(t + fd + .05);
                }
                catch (e) { }
            }
        bgmSrc = null;
        brBgmSrc = null;
        cubBgmSrc = null;
    }
    function arenaMusicPlay() {
        if (arenaOn)
            return;
        arenaOn = true;
        arenaMusicStop(0); // garantia (se por algum motivo ainda não parou)
        // fade in e fade out da plateia: o som passa por um ganho próprio que sobe de 0 a 1 em audio.comemoraFadeIn s no início e desce a 0 em audio.comemoraFadeOut s no fim
        let dest = sfxBus || master || (actx && actx.destination);
        if (actx && comBuf) {
            try {
                const cg = actx.createGain(), t = actx.currentTime, d = comBuf.duration;
                const fi = Math.min(CONFIG.audio.comemoraFadeIn, d / 2), fo = Math.min(CONFIG.audio.comemoraFadeOut, d / 2); // cada fade no máximo metade do som
                cg.gain.setValueAtTime(0, t);
                cg.gain.linearRampToValueAtTime(1, t + fi);
                cg.gain.setValueAtTime(1, t + d - fo); // fade out: termina junto com o som, e só então a luta começa
                cg.gain.linearRampToValueAtTime(0, t + d);
                cg.connect(dest);
                dest = cg;
            }
            catch (e) { }
        }
        playOnce(comBuf, CONFIG.audio.comemoraVol, () => { lutWant = true; lutaBgmStart(); }, dest); // sem buffer, playOnce chama o cb na hora: a luta começa direto
    }
    // VITORIA (chamada por coliseumCubesUpdate, coliseum.js, quando o ULTIMO goblin da ULTIMA leva morre; 1 vez so): a luta.mp3 faz fade out (audio.victoryFade, padrao = audio.arenaFadeOut, 1,5 s) e para de vez (lutWant = false: nao reinicia) e a plateia (comemora.mp3) toca de novo, com o mesmo fade in/out de arenaMusicPlay, mas SEM começar a luta no fim (a arena fica em silencio)
    let victoryOn = false;
    function arenaVictory() {
        if (victoryOn)
            return;
        victoryOn = true;
        lutWant = false;
        if (actx && lutGain && lutSrc) {
            try {
                const t = actx.currentTime, fd = CONFIG.audio.victoryFade !== undefined ? CONFIG.audio.victoryFade : (CONFIG.audio.arenaFadeOut || 1.5);
                lutGain.gain.cancelScheduledValues(t);
                lutGain.gain.setValueAtTime(lutGain.gain.value, t);
                lutGain.gain.linearRampToValueAtTime(0, t + fd);
                lutSrc.stop(t + fd + .05);
            }
            catch (e) { }
        }
        let dest = sfxBus || master || (actx && actx.destination);
        if (actx && comBuf) {
            try {
                const cg = actx.createGain(), t = actx.currentTime, d = comBuf.duration;
                const fi = Math.min(CONFIG.audio.comemoraFadeIn, d / 2), fo = Math.min(CONFIG.audio.comemoraFadeOut, d / 2);
                cg.gain.setValueAtTime(0, t);
                cg.gain.linearRampToValueAtTime(1, t + fi);
                cg.gain.setValueAtTime(1, t + d - fo);
                cg.gain.linearRampToValueAtTime(0, t + d);
                cg.connect(dest);
                dest = cg;
            }
            catch (e) { }
        }
        playOnce(comBuf, CONFIG.audio.comemoraVol, () => { try { coliseumVictoryEnd(); } catch (e) { } }, dest); // quando a plateia acaba: fade para preto + recarrega a pagina (volta ao menu, do zero; coliseum.js)
    }
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
    // sons da queda dos 200 m da ponte (bridge.js): knockdownPlay = derrubou.mp3, tocado assim que a tela fica preta, ANTES do diálogo "Você caiu."; fallPlay = caiu.mp3, tocado DEPOIS do diálogo, antes de clarear.
    // cb roda ao terminar o som (ou na hora, se o som não puder tocar), uma única vez
    let fallBuf = null, knockdownBuf = null;
    function playOnce(buf, vol, cb, dest) { // dest = nó de saída (padrão: sfxBus)
        let done = false;
        const fin = () => { if (done) return; done = true; cb(); };
        if (!actx || !buf) { fin(); return; }
        try {
            const s = actx.createBufferSource(), g = actx.createGain();
            s.buffer = buf;
            g.gain.value = vol;
            s.connect(g);
            g.connect(dest || sfxBus || master || actx.destination);
            s.onended = fin;
            s.start();
            // segurança: se onended não disparar, não deixa a tela presa no preto. Só conta enquanto o contexto roda (na pausa o áudio é suspenso; um setTimeout comum dispararia durante a pausa e adiantaria, p.ex., a luta.mp3)
            let left = buf.duration * 1000 + 400;
            const iv = setInterval(() => { if (done) { clearInterval(iv); return; } if (actx.state === 'running') { left -= 250; if (left <= 0) { clearInterval(iv); fin(); } } }, 250);
        }
        catch (e) { fin(); }
    }
    function fallPlay(cb) {
        fallState = 2;
        // todos os outros sons ficam mudos enquanto o caiu.mp3 toca; ele sai direto na saída (fora do master) com o volume do menu aplicado à mão
        const fv = CONFIG.audio.fallVol * (master ? master.gain.value : 1) * (sfxBus ? sfxBus.gain.value : 1);
        if (fallBuf) muteAll(true);
        playOnce(fallBuf, fv, () => {
            muteAll(false); // volta tudo quando acaba (ou se o som falhar)
            fallState = 3;
            cubeBgmRelease(); // caiu.mp3 terminou: toca castelo.mp3 (o fade out da música anterior já passou, então começa na hora)
            cb();
        }, actx && actx.destination);
    }
    function knockdownPlay(cb) { fallState = 1; knockBusy = true; playOnce(knockdownBuf, CONFIG.audio.knockdownVol, () => { knockBusy = false; cubeBgmRelease(); cb(); }); }
    function knockdownSolo() { // GAME OVER do coliseu (coliseum.js): mesmo efeito da PAUSA no áudio (pauseMuffle(true): tudo abafado e mais baixo) e o derrubou.mp3 toca por cima, direto na saída (fora de master/muteG/pauseF, como o caiu.mp3) com knockdownVol x volume master x volume sfx do menu calculados na hora; NÃO mexe em fallState/knockBusy (da queda da ponte); sem buffer não toca
        pauseMuffle(true);
        playOnce(knockdownBuf, CONFIG.audio.knockdownVol * (master ? master.gain.value : 1) * (sfxBus ? sfxBus.gain.value : 1), () => { }, actx && actx.destination);
    }
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
// Web Audio (buffer pré-decodificado em bgmInit, pelo sfxBus), como espada/impacto: o antigo <audio> com pause()/currentTime/play() a cada dash custava 5-10 fps no celular
let dashBuf = null, dashG = null;
function dashPlay() {
    if (!actx || !dashBuf)
        return;
    try {
        if (!dashG) {
            dashG = actx.createGain();
            dashG.gain.value = CONFIG.audio.dashVol;
            dashG.connect(sfxBus || master || actx.destination);
        }
        const s = actx.createBufferSource();
        s.buffer = dashBuf;
        s.connect(dashG);
        s.start();
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
    ['pointerdown', 'keydown', 'touchstart'].forEach(ev => addEventListener(ev, () => { if (paused)
        return; // pausado: só o botão Continuar (start) religa o áudio
    if (!bgmWant)
        bgmPlay();
    else if (actx && actx.state === 'suspended')
        actx.resume(); }, { passive: true }));
    document.addEventListener('visibilitychange', () => { if (!actx || !bgmWant)
        return; if (document.hidden)
        actx.suspend();
    else if (!paused)
        actx.resume(); });
    // PC: tela cheia + Keyboard Lock (Chrome/Edge): com as teclas de jogo travadas, atalhos do navegador como Ctrl+W (agachar + andar) chegam ao jogo em vez de fechar a aba. Precisa de gesto do usuário (clique/tecla) e de tela cheia; sem suporte (Firefox/Safari) ou sem gesto, falha em silêncio. Teclas em CONFIG.input.lockKeys (Escape fica de fora de propósito)
    function kbLock() {
        const I = CONFIG.input;
        if (IS_MOBILE || !I || !I.keyboardLock)
            return;
        try {
            const lock = () => { if (navigator.keyboard && navigator.keyboard.lock) {
                const p = navigator.keyboard.lock(I.lockKeys);
                if (p && p.catch)
                    p.catch(() => { });
            } };
            if (document.fullscreenElement) {
                lock();
                return;
            }
            if (!I.autoFullscreen)
                return; // padrão: NÃO força tela cheia (jogar em janela deve funcionar; o Esc que sai da tela cheia/solta o mouse virava um laço de pausa). O lock só vale se o jogador já estiver em tela cheia (ver fullscreenchange abaixo)
            const de = document.documentElement;
            if (de.requestFullscreen) {
                const r = de.requestFullscreen({ navigationUI: 'hide' });
                if (r && r.then)
                    r.then(lock).catch(() => { });
            }
        }
        catch (e) { }
    }
    document.addEventListener('fullscreenchange', () => { if (document.fullscreenElement && typeof active !== 'undefined' && active)
        kbLock(); }); // jogador entrou em tela cheia por conta própria (F11 não conta; só a API): liga o Keyboard Lock
    let paused = false, pausedAt = 0;
    function start() {
        paused = false;
        if (actx && actx.state === 'suspended') { const r = actx.resume(); if (r && r.catch) r.catch(() => { }); } // religa o áudio suspenso na pausa ANTES do pauseMuffle (a rampa usa o relógio do contexto, parado enquanto suspenso)
        pauseMuffle(coliGameOver); // game over (coliseum.js): continuar depois de pausar NÃO tira o abafado
        bgmPlay();
        active = true;
        if (dlgOn)
            dlgEl.classList.add('on');
        ov.classList.add('off');
        ov.classList.remove('first');
        hint.classList.add('on');
        hintT = 6;
        if (!IS_MOBILE) {
            kbLock();
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
        pauseMuffle(true);
        // depois do abafado (pauseTime s) SUSPENDE o contexto: música, plateia, passos e demais sons Web Audio congelam e continuam do mesmo ponto, mantendo o beat com os cubos (que usam o dt do jogo)
        setTimeout(() => { if (paused && actx && actx.state === 'running') actx.suspend().catch(() => { }); }, ((CONFIG.audio.pauseTime != null ? CONFIG.audio.pauseTime : .15) * 1000) + 30);
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