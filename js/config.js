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
        paths: { ground: 'assets/ground-texture.png', road: 'assets/road-texture.jpg', bgm: 'assets/music-theme.mp3', stepWalk: 'assets/footsteps-walk.mp3', stepRun: 'assets/footsteps-run.mp3', sword: ['assets/sword-1.mp3', 'assets/sword-2.mp3'], dash: 'assets/dash.mp3', woosh: 'assets/sim.wav', bridge: 'assets/ponte.png', water: 'assets/agua.png', bridgeBgm: 'assets/ponte.mp3', bricks: 'assets/tijolos.png', cubeBgm: 'assets/castelo.mp3', carpet: 'assets/tapete.png', frame: 'assets/quadro.png', wood: 'assets/wood.png', crate: 'assets/caixa.png', fall: 'assets/caiu.mp3', knockdown: 'assets/derrubou.mp3', comemora: 'assets/comemora.mp3', luta: 'assets/luta.mp3', impact: { tree: 'assets/arvore.mp3', stone: 'assets/pedra.mp3', gate: 'assets/portao.mp3' } },
        player: { walk: 6.5, run: 11, crouch: 2.8, jumpSpeed: 8.6, gravity: 22, jumpBuffer: .25, eyeStand: 2.6, eyeCrouch: 1.5, eyeLerp: 12, bobFactor: 1.6, flySpeed: 15, flyRunSpeed: 45 },
        combat: { attackCooldownMs: 120, attackBufferMs: 300, dashTime: .18, dashSpeed: 30, dashCooldownMs: 700 },
        camera: { fov: 72, fovMin: 60, fovMax: 110, near: .05, far: 600, fogColor: 0xe0855c, fogNear: 10, fogFar: 110 },
        world: { size: 340, radius: 80, densityDesktop: 1, densityMobile: .6, flowerCount: 18000, grassCount: 18000, grassTallCount: 3000, reedCount: 4500, treeRing: 3600, treeRingMobileFactor: .65, gateOpenTime: 2.2, edgePines: { width: 12, count: 700, mobileFactor: .6, inset: 1, rowGap: 2, chunk: 90 }, veg: { enabled: true, chunk: 48, distMobile: 70, distDesktop: 0 } },
        corridor: { endMargin: 8, scatterWidth: 30, scatterCount: 220, scatterMobileFactor: .5, boxW: 20, boxH: 15, boxAlpha: .3, boxColor: '#000000', darkLen: 22, darkFogNear: 2, darkFogFar: 26, darkLight: .85, slowStart: 6.5, slowEnd: 5, touchMargin: .15, edgeMargin: 1.5, wallHalf: 4.4, wallLen: 35 },
        story: { gateDelay: .09, gateText: 'Você nota algo se movendo à sua direita.', walkText: 'Você caminhou por algumas horas.', walkHold: 2 },
        bridge: { x: 1000, z: 0, height: 7, archW: 3.5, archH: 3.5, archTopW: 2.1, archStepH: .7, tile: 3.5, length: 238, railH: 1.5, railW: .5, fogNear: 3, fogFar: 55, fogColor: 0x2c4474, waterW: 80, endPad: 16, waterTile: 5, water: { deep: 0x0b1f4a, shallow: 0x2f6fb0, glint: 0xcfe6ff, foam: 0xdcecff, cell: .6, steps: 7, speed: 1, normalK: 1.4, glintPow: 70, glintK: 1.2, foamW: 1.8, texK: .35, underK: .5 }, events: { tiredAt: 119, tiredText: 'Você está cansado, procure um lugar para descansar.', exhaustedAt: 178.5, exhaustedText: 'Você está exausto, precisa descansar.', loopAt: 200, fallText: 'Você caiu.', repeat: true }, wallMargin: .4, spawnInset: 2, figAt: 230, figH: 3.4, fallbackBridge: 0x800000, fallbackWater: 0x1ab4e8, pines: { rowGap: 1.5, inset: 1, stripWidth: 20, stripCount: 700, mobileFactor: .6, endRows: 3, endSpacing: 3.5, endGap: 2.5, endSide: 8 } },
        cube: { x: 2000, z: 0, size: 85, tile: 3.5, fogNear: 10, fogFar: 110, fogColor: 0xc8c8c8, wallMargin: .4, spawnInset: 0, inner: { div: 4, roomH: 7.8, topAbove: 3.2, wall: .5, door: { w: .9, h: 1.95 }, woodTile: 3.5, fallbackWood: 0x6b4a2b, key: { inset: 1.2, y: .04, size: 1, angle: .6, color: 0xd4a73a, talkDist: 3, lookDot: .85 }, crates: { count: 8, min: 1.6, max: 3.2, cornerZone: 6, margin: 1, gap: 1.2, maxYaw: .35, spawnClear: 3, keyClear: 2.5, pathHalf: 1.5, seed: 23, fallback: 0x8a5a2b }, stairs: { drop: 24, width: 2, stepH: .7, stepD: .7, entry: 1, landing: .6, smooth: 30 } }, corridor: { length: 80, width: 8.8, heightK: 3, carpetTile: 3.5, fallbackCarpet: 0x5a1a1a, frame: { w: 1.8, h: 2.4, y: 2.6, start: 10, gap: 10, endMargin: 5, inset: .05, fallback: 0x8a6a3a, text: 'Retrato de uma moça sorrindo.', talkDist: 5, lookDot: .88, border: { t: .12, depth: .1, gap: .04, wood: 0x3b2412, gold: 0xd4a73a } }, door: { w: 3.4, h: 4.4, depth: .25, frameT: .3, wood: 0x2a170a, frame: 0x1a0e06, gold: 0xd4a73a, text: ['Quem diria...', 'Está trancada.'], talkDist: 5, lookDot: .85 }, door2: { text: ['Quem diria...', 'Está trancada.'], talkDist: 5, lookDot: .85 }, door3: { depth: .25, talkDist: 4, lookDot: .85, openTime: 1.2, openAngle: 1.55 }, chandelier: { start: 5, gap: 10, endMargin: 2, drop: 1, radius: .55, metal: 0x2a2118, bulbColor: 0xffd9a0, lights: 3, lightColor: 0xffc880, lightK: 1, lightDist: 24, lightDecay: 1.2 } }, fallbackBricks: 0x7a3b2e, light: { hemiSky: 0x7a8088, hemiGround: 0x1a1a20, hemiK: .55, torchColor: 0xffb36b, torchK: .5, torchDist: 28, torchDecay: 1.6, hqEnv: false, hqFill: false } },
        teleport: { key: 'cdf_tp_v1', hint: 'Clique na tela para continuar', list: [{ id: 'start', name: 'Mapa inicial' }, { id: 'corridor', name: 'Corredor escuro' }, { id: 'bridge', name: 'Ponte' }, { id: 'cubeRoom', name: 'Cubo (sala menor)' }, { id: 'cubeCorridor', name: 'Cubo (corredor)' }, { id: 'coliseum', name: 'Coliseu' }], start: { x: 0, z: 0, yaw: 0 }, corridor: { inset: 1 }, cubeCorridor: { inset: 3 } },
        gateBlock: { dist: 4, depth: 12, half: 20, rearm: 2, text: 'O herói ainda não está pronto para sair daqui.' },
        input: { keyboardLock: true, lockKeys: ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'KeyF', 'KeyC', 'KeyT', 'ShiftLeft', 'ShiftRight', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Delete', 'PageUp'] },
        gfx: { maxFps: 60, pixelSize: 4, pixelSizeSmallScreen: 3, shadowMapDesktop: 2048, shadowMapMobile: 1024, shadowExtDesktop: 44, shadowExtMobile: 34 },
        audio: { bgmSkipSec: 4, bgmGain: .5, bridgeBgmGain: .5, bgmFadeOut: 1.75, cubeBgmGain: .5, cubeFadeOut: 1.75, stepWalkVol: .55, stepRunVol: .7, swordVol: .3, swordTiming: [{ off: .12, delay: 0 }, { off: 0, delay: .04 }], dashVol: .5, wooshVol: .7, keyVol: .12, uiVol: .05, impactVol: { tree: .6, stone: .6, gate: .6 }, fallVol: .75, knockdownVol: .6, comemoraVol: .8, lutaBgmGain: .5, arenaFadeOut: 1.5, comemoraFadeIn: 4, comemoraFadeOut: 4 },
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
    const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: false, stencil: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(1);
    cv.classList.toggle('smooth', !pixelOn);