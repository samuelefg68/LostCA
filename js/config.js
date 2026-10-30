// ARQUIVO: CONFIG (valores ajustáveis) e preâmbulo (IS_MOBILE, DENS, PIX, flags).
    const cv = document.getElementById('cv'), ov = document.getElementById('ov'), hint = document.getElementById('hint');
    const IS_MOBILE = (() => {
        const q = location.search;
        if (/[?&]mobile=1/.test(q))
            return true;
        if (/[?&]pc=1/.test(q))
            return false;
        const coarse = matchMedia('(hover: none) and (pointer: coarse)').matches;
        const ua = /Android|iPhone|iPad|iPod|Mobile|Silk/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        return coarse || ua;
    })();
    document.body.classList.toggle('mobile', IS_MOBILE);
    // ===== CONFIG: valores ajustáveis do jogo. Edite AQUI, não a lógica. =====
    const CONFIG = {
        paths: { ground: 'assets/ground-texture.png', road: 'assets/road-texture.jpg', bgm: 'assets/music-theme.mp3', stepWalk: 'assets/footsteps-walk.mp3', stepRun: 'assets/footsteps-run.mp3', sword: ['assets/sword-1.mp3', 'assets/sword-2.mp3'], dash: 'assets/dash.mp3', woosh: 'assets/sim.wav', impact: { tree: 'assets/arvore.mp3', stone: 'assets/pedra.mp3', gate: 'assets/portao.mp3' } },
        player: { walk: 6.5, run: 11, crouch: 2.8, jumpSpeed: 8.6, gravity: 22, jumpBuffer: .25, eyeStand: 2.6, eyeCrouch: 1.5, eyeLerp: 12, bobFactor: 1.6, flySpeed: 15, flyRunSpeed: 45 },
        combat: { attackCooldownMs: 120, attackBufferMs: 300, dashTime: .18, dashSpeed: 30, dashCooldownMs: 700 },
        camera: { fov: 72, near: .05, far: 600, fogColor: 0xe0855c, fogNear: 10, fogFar: 110 },
        world: { size: 340, radius: 80, densityDesktop: 1, densityMobile: .6, flowerCount: 18000, grassCount: 18000, grassTallCount: 3000, reedCount: 4500, treeRing: 3600, treeRingMobileFactor: .65, gateOpenTime: 2.2 },
        corridor: { endMargin: 8, gap: 2.3, rows: 2, darkLen: 45, darkFogNear: 2, darkFogFar: 26, darkLight: .85, endRadius: 3 },
        story: { gateDelay: .09, gateText: 'Você nota algo se movendo à sua direita.' },
        gfx: { pixelSize: 4, pixelSizeSmallScreen: 3, shadowMapDesktop: 2048, shadowMapMobile: 1024, shadowExtDesktop: 44, shadowExtMobile: 34 },
        audio: { bgmSkipSec: 4, bgmGain: .5, stepWalkVol: .55, stepRunVol: .7, swordVol: .3, swordTiming: [{ off: .12, delay: 0 }, { off: 0, delay: .04 }], dashVol: .5, wooshVol: .7, keyVol: .12, uiVol: .05, impactVol: { tree: .6, stone: .6, gate: .6 } },
        impact: { reach: 3.6, pad: .6, shakeTime: .5, shakeAmp: .07, shakeFreq: 16, gateShakeAmp: .02,leaves: 14, leafLife: 2, leafSize: .2, leafColor: 0x5c7a2e }
    };
    const DENS = IS_MOBILE ? CONFIG.world.densityMobile : CONFIG.world.densityDesktop;
    const PIX_BASE = innerWidth < 700 ? CONFIG.gfx.pixelSizeSmallScreen : CONFIG.gfx.pixelSize;
    let hqOn = false, perfOn = false, pixelOn = true;
    try {
        const o = JSON.parse(localStorage.getItem('cdf_cfg_v1') || '{}');
        if (o.pixel === false)
            pixelOn = false;
        if (o.perf === true)
            perfOn = true;
        if (o.hq === true)
            hqOn = true;
        if (IS_MOBILE && o.perf === undefined && o.hq === undefined)
            perfOn = true;
    }
    catch (e) { }
    if (perfOn)
        hqOn = false;
    let PIX = pixelOn ? PIX_BASE : (perfOn ? 2 : 1);
    const pixTex = [];
    const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: false });
    renderer.setPixelRatio(1);
    cv.classList.toggle('smooth', !pixelOn);