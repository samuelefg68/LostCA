// ARQUIVO: GRAPHICS (qualidade, menu/config), MOBILE UI e LEAF FX.
    // ===== GRAPHICS: sombras, qualidade, menu e configurações =====
    const HQ_MAP = IS_MOBILE ? CONFIG.gfx.shadowMapMobile : CONFIG.gfx.shadowMapDesktop, HQ_EXT = IS_MOBILE ? CONFIG.gfx.shadowExtMobile : CONFIG.gfx.shadowExtDesktop, SHD = HQ_EXT * 2 / HQ_MAP;
    const SR = new THREE.Vector3().crossVectors(UPV, sunDir).normalize(), SU = new THREE.Vector3().crossVectors(sunDir, SR), _sc = new THREE.Vector3();
    function sunFollow() {
        const x = cam.position.x, z = cam.position.z, y = H(x, z);
        let a = x * SR.x + y * SR.y + z * SR.z, b = x * SU.x + y * SU.y + z * SU.z;
        const d = x * sunDir.x + y * sunDir.y + z * sunDir.z;
        a = Math.round(a / SHD) * SHD;
        b = Math.round(b / SHD) * SHD;
        _sc.set(0, 0, 0).addScaledVector(SR, a).addScaledVector(SU, b).addScaledVector(sunDir, d);
        dl.target.position.copy(_sc);
        dl.position.copy(_sc).addScaledVector(sunDir, 130);
    }
    [sword, armR, armL].forEach(r => r.traverse(o => o.layers.set(1)));
    hemi.layers.enable(1);
    dl.layers.enable(1);
    let gfxCaveOn = false, gfxCave = null; // modo caverna (cubo): gfxCave(on) é definida no bloco de gráficos; chamada por enterCube() (cube.js). Só o cubo liga; os outros mapas não mudam
    function bakeFast(root, cull) {
        root.updateMatrixWorld(true);
        const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), mt = new THREE.Matrix4(), by = new Map();
        root.traverse(o => {
            if (!o.isMesh)
                return;
            const g = o.geometry.clone();
            g.applyMatrix4(mt.multiplyMatrices(inv, o.matrixWorld));
            const l = by.get(o.material);
            if (l)
                l.push(g);
            else
                by.set(o.material, [g]);
        });
        const fast = new THREE.Group();
        for (const [mat, list] of by) {
            let n = 0;
            for (const g of list)
                n += g.attributes.position.count;
            const P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2), I = [];
            let o = 0;
            for (const g of list) {
                const p = g.attributes.position, uv = g.attributes.uv;
                P.set(p.array, o * 3);
                N.set(g.attributes.normal.array, o * 3);
                if (uv)
                    U.set(uv.array, o * 2);
                if (g.index)
                    for (const k of g.index.array)
                        I.push(k + o);
                else
                    for (let k = 0; k < p.count; k++)
                        I.push(k + o);
                o += p.count;
                g.dispose();
            }
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
            geo.setAttribute('normal', new THREE.BufferAttribute(N, 3));
            geo.setAttribute('uv', new THREE.BufferAttribute(U, 2));
            geo.setIndex(I);
            const m = new THREE.Mesh(geo, mat);
            m.layers.mask = root.layers.mask;
            m.frustumCulled = !!cull;
            fast.add(m);
        }
        const orig = root.children.slice();
        fast.visible = false;
        root.add(fast);
        return { fast, orig };
    }
    {
        const cfg = document.getElementById('cfg'), sE = document.getElementById('sens'), vE = document.getElementById('vol'), sV = document.getElementById('sensV'), vV = document.getElementById('volV');
        const fovE = document.getElementById('fov'), fovV = document.getElementById('fovV');
        const mE = document.getElementById('mus'), fE = document.getElementById('sfx'), uE = document.getElementById('ui'), mV = document.getElementById('musV'), fV = document.getElementById('sfxV'), uV = document.getElementById('uiV');
        const show = () => { fovV.textContent = Math.round(fovUser) + '°'; sV.textContent = sens.toFixed(1) + 'x'; vV.textContent = Math.round(volMaster * 100) + '%'; mV.textContent = Math.round(volMus * 100) + '%'; fV.textContent = Math.round(volSfx * 100) + '%'; uV.textContent = Math.round(volUi * 100) + '%'; };
        const save = () => { try {
            localStorage.setItem(CFG_KEY, JSON.stringify({ sens, fov: fovUser, vol: volMaster, pixel: pixelOn, perf: perfOn, hq: hqOn, mus: volMus, sfx: volSfx, ui: volUi }));
        }
        catch (e) { } };
        sE.value = sens;
        fovE.min = CONFIG.camera.fovMin;
        fovE.max = CONFIG.camera.fovMax;
        fovE.value = fovUser;
        vE.value = Math.round(volMaster * 100);
        mE.value = Math.round(volMus * 100);
        fE.value = Math.round(volSfx * 100);
        uE.value = Math.round(volUi * 100);
        show();
        const pB = document.getElementById('pixBtn');
        const applyPix = () => {
            PIX = pixelOn ? PIX_BASE : (perfOn ? 2 : 1);
            cv.classList.toggle('smooth', !pixelOn);
            pixTex.forEach(t => { t.magFilter = pixelOn ? THREE.NearestFilter : THREE.LinearFilter; t.minFilter = pixelOn ? THREE.NearestMipmapNearestFilter : THREE.LinearMipmapLinearFilter; t.needsUpdate = true; });
            pB.textContent = pixelOn ? 'Ligado' : 'Desligado';
            pB.classList.toggle('off', !pixelOn);
            pB.setAttribute('aria-pressed', String(pixelOn));
            size();
        };
        pB.addEventListener('click', () => { pixelOn = !pixelOn; applyPix(); save(); });
        applyPix();
        let fastM = null;
        const fogObj = scene.fog;
        const applyPerf = init => {
            for (const e of PERF)
                e.m.count = perfOn ? e.keep + Math.ceil((e.full - e.keep) * e.f) : e.full;
            scene.fog = perfOn ? null : fogObj;
            grassWind.value = perfOn ? 0 : 1;
            sky.material.uniforms.uCl.value = perfOn ? 0 : 1;
            petals.visible = !perfOn;
            for (const s of GATE_SH)
                s.visible = !perfOn;
            document.getElementById('vig').style.display = perfOn ? 'none' : '';
            roadTex.anisotropy = perfOn ? 1 : renderer.capabilities.getMaxAnisotropy();
            if (!init && roadTex.image)
                roadTex.needsUpdate = true;
            if (perfOn && !fastM)
                fastM = [bakeFast(sword, false), bakeFast(armR, false), bakeFast(armL, false), bakeFast(K, true)];
            if (fastM)
                for (const f of fastM) {
                    f.fast.visible = perfOn;
                    for (const c of f.orig)
                        c.visible = !perfOn;
                }
            PIX = pixelOn ? PIX_BASE : (perfOn ? 2 : 1);
            size();
        };
        applyPerf(true);
        const fill = new THREE.DirectionalLight(0x7d93c8, .32);
        fill.position.set(.5, .55, 1).normalize();
        fill.visible = false;
        fill.layers.enable(1);
        scene.add(fill);
        scene.add(dl.target);
        {
            const sc = dl.shadow.camera;
            sc.left = sc.bottom = -HQ_EXT;
            sc.right = sc.top = HQ_EXT;
            sc.near = 1;
            sc.far = 300;
            sc.updateProjectionMatrix();
            dl.shadow.mapSize.set(HQ_MAP, HQ_MAP);
            dl.shadow.bias = -.0004;
            dl.shadow.normalBias = .06;
        }
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        let envRT = null;
        const ENVM = [[aL, .3], [aM, .28], [aD, .18], [goldK, .55], [bladeK, .65], [bladeM, .5], [hamonM, .6], [goldM, .55], [goldD, .4], [silverM, .5], [plate, .3], [plateD, .25], [gold, .45]];
        const envCapture = () => {
            envRT = new THREE.WebGLCubeRenderTarget(128);
            const cc = new THREE.CubeCamera(.5, 400, envRT);
            cc.position.set(K.position.x, K.position.y + 3, K.position.z);
            scene.add(cc);
            const vis = cam.children.map(o => o.visible), sp = sky.position.clone();
            K.visible = false;
            PED.visible = false;
            cam.children.forEach(o => { o.visible = false; });
            sky.position.copy(cc.position);
            cc.update(renderer, scene);
            sky.position.copy(sp);
            K.visible = true;
            PED.visible = true;
            cam.children.forEach((o, i) => { o.visible = vis[i]; });
            scene.remove(cc);
        };
        const setEnv = on => {
            if (on && !envRT)
                envCapture();
            for (const [m, r] of ENVM.concat(HQM.map(m => [m, .13]))) {
                m.envMap = on ? envRT.texture : null;
                m.combine = on ? THREE.MixOperation : THREE.MultiplyOperation;
                m.reflectivity = on ? r : 1;
                m.needsUpdate = true;
            }
        };
        const flag = (root, c) => root.traverse(o => { if (o.isMesh) {
            if (c)
                o.castShadow = hqOn;
            o.receiveShadow = hqOn;
        } });
        const applyHQ = init => {
            renderer.shadowMap.enabled = hqOn;
            dl.castShadow = hqOn;
            for (const o of [K, PED, ...HQC])
                flag(o, true);
            for (const o of HQR)
                flag(o, false);
            groundMesh.receiveShadow = hqOn;
            hemi.intensity = gfxCaveOn ? CUBL.hemiK : hqOn ? .6 : .95;
            dl.intensity = hqOn ? 1.9 : 1.1;
            fill.visible = hqOn && (!gfxCaveOn || CUBL.hqFill);
            renderer.toneMapping = hqOn ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
            renderer.toneMappingExposure = 1.25;
            if (hqOn)
                sunFollow();
            else {
                dl.target.position.set(0, 0, 0);
                dl.position.copy(sunDir).multiplyScalar(50);
            }
            if (init) {
                if (hqOn)
                    setTimeout(() => { if (hqOn)
                        setEnv(true); }, 900);
            }
            else {
                setEnv(hqOn && (!gfxCaveOn || CUBL.hqEnv));
                scene.traverse(o => { if (o.material)
                    (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.needsUpdate = true; }); });
            }
        };
        applyHQ(true);
        // modo caverna (cubo): no gráfico alto tira o reflexo (envMap do pôr do sol do mapa antigo, que deixava braço/espada cinza) e a luz de preenchimento (uma luz a menos por pixel); libera o cubemap da GPU. Só atua com hqOn.
        gfxCave = on => {
            gfxCaveOn = on;
            if (!hqOn)
                return;
            fill.visible = !on || CUBL.hqFill;
            setEnv(!on || CUBL.hqEnv);
            if (on && !CUBL.hqEnv && envRT) {
                envRT.dispose();
                envRT = null;
            }
        };
        const GFX = {
            low: 'Menos grama, flores e árvores; sem neblina rosa, nuvens, vento, pétalas, sombras de portão e vinheta. O mais leve.',
            mid: 'O visual original do jogo.',
            high: 'Sombras em tempo real, reflexos nas armaduras e metais, luz de preenchimento e tom de cinema. O mais pesado.'
        };
        const gBtns = [...cfg.querySelectorAll('[data-gfx]')], gD = document.getElementById('gfxDesc');
        const gfxShow = () => { const l = perfOn ? 'low' : hqOn ? 'high' : 'mid'; gBtns.forEach(b => { const on = b.dataset.gfx === l; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); }); gD.textContent = GFX[l]; };
        gBtns.forEach(b => b.addEventListener('click', () => {
            const l = b.dataset.gfx, wantP = l === 'low', wantH = l === 'high';
            if (hqOn && !wantH) {
                hqOn = false;
                applyHQ();
            }
            if (perfOn !== wantP) {
                perfOn = wantP;
                applyPerf();
            }
            if (wantH && !hqOn) {
                hqOn = true;
                applyHQ();
            }
            save();
            gfxShow();
        }));
        gfxShow();
        sE.addEventListener('input', () => { sens = parseFloat(sE.value); show(); save(); });
        fovE.addEventListener('input', () => { fovUser = parseInt(fovE.value, 10); show(); save(); });
        vE.addEventListener('input', () => { volMaster = parseInt(vE.value, 10) / 100; if (master)
            master.gain.setTargetAtTime(volMaster, actx.currentTime, .03); show(); save(); });
        const bind = (el, get, set, bus) => el.addEventListener('input', () => { set(parseInt(el.value, 10) / 100); const b = bus(); if (b)
            b.gain.setTargetAtTime(get(), actx.currentTime, .03); show(); save(); });
        bind(mE, () => volMus, v => { volMus = v; }, () => musBus);
        bind(fE, () => volSfx, v => { volSfx = v; }, () => sfxBus);
        bind(uE, () => volUi, v => { volUi = v; }, () => uiBus);
        const tabs = [...cfg.querySelectorAll('.tab')];
        const openTab = id => {
            tabs.forEach(t => { const on = t.dataset.tab === id; t.classList.toggle('on', on); t.setAttribute('aria-selected', String(on)); });
            cfg.querySelectorAll('.pane').forEach(p => p.classList.toggle('on', p.id === id));
        };
        tabs.forEach(t => t.addEventListener('click', () => openTab(t.dataset.tab)));
        window.__closeCfg = () => { cfgOpen = false; cfg.classList.remove('on'); };
        document.getElementById('cfgBtn').addEventListener('click', () => { cfgOpen = true; cfg.classList.add('on'); openTab('paneGeral'); tabs[0].focus({ preventScroll: true }); });
        document.getElementById('cfgBack').addEventListener('click', window.__closeCfg);
        document.getElementById('quitBtn').addEventListener('click', () => {
            try {
                if (document.pointerLockElement)
                    document.exitPointerLock();
            }
            catch (e) { }
            try {
                if (actx)
                    actx.suspend();
            }
            catch (e) { }
            try {
                window.close();
            }
            catch (e) { }
            setTimeout(() => { try {
                location.replace('about:blank');
            }
            catch (e) { } }, 250);
        });
        const TTL0 = document.getElementById('ttl').textContent, SUB0 = document.getElementById('sub').textContent, GO0 = document.getElementById('go').textContent;
        document.getElementById('menuBtn').addEventListener('click', () => fadeRun(() => {
            // "Voltar ao menu inicial": recarrega a página no pico do preto, o que reseta TUDO (portão, diálogos, flags, partículas, música, jogador). As configurações ficam no localStorage.
            location.reload();
        }));
        cfg.addEventListener('mousedown', e => { if (e.target === cfg)
            window.__closeCfg(); });
    }
    document.addEventListener('pointerlockchange', () => { if (active && document.pointerLockElement !== cv)
        pause(); });
    const mlook = document.getElementById('mlook'), mjz = document.getElementById('mjz'), mjb = document.getElementById('mjb'), mjt = document.getElementById('mjt');
    // ===== MOBILE UI: joystick e botões de toque =====
    {
        // botões de dash (#mDash) e correr (#mRun) somem com fade de .2 s (classe .off; ideal mover para style.css): dash no volume escuro do corredor e depois do 1º diálogo da ponte; correr depois do 2º
        const st = document.createElement('style');
        st.textContent = '#mDash,#mRun{transition:opacity .2s}#mDash.off,#mRun.off{opacity:0;pointer-events:none}';
        document.head.appendChild(st);
    }
    const mB = { atk: document.getElementById('mAtk'), jump: document.getElementById('mJump'), run: document.getElementById('mRun'), crouch: document.getElementById('mCrouch'), inter: document.getElementById('mInter'), pause: document.getElementById('mPause'), dash: document.getElementById('mDash') };
    let wasActive = null, jid = null, jcx = 0, jcy = 0, jR = 60;
    function joyReset() { joy.x = joy.y = joy.m = 0; jid = null; mjb.style.left = mjb.style.top = mjb.style.bottom = ''; mjb.classList.remove('hold'); mjt.style.transform = ''; }
    function mobileFrame() {
        if (active !== wasActive) {
            wasActive = active;
            document.body.classList.toggle('playing', active);
            if (!active)
                joyReset();
        }
        if (!active)
            return;
        mB.run.classList.toggle('on', !!sprint);
        mB.crouch.classList.toggle('on', !!keys.KeyC);
        mB.inter.classList.toggle('show', !!(nearK || nearF || nearD) && !dlgOn && !fly);
        mB.dash.classList.toggle('off', corrBoxT() >= 0 || brNoDash);
        mB.run.classList.toggle('off', brNoRun);
    }
    if (IS_MOBILE) {
        {
            const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
            const app = navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
            if (ios && !app)
                document.getElementById('iosTip').style.display = 'block';
        }
        const fit = () => document.documentElement.style.setProperty('--m', String(Math.max(.72, Math.min(1.2, Math.min(innerHeight / 420, innerWidth / 860)))));
        addEventListener('resize', fit);
        fit();
        addEventListener('contextmenu', e => e.preventDefault());
        hint.textContent = 'Joystick: mover. Arraste a tela: olhar. Botões: golpear, pular, correr e agachar';
        document.getElementById('sensL').textContent = 'Sensibilidade do toque';
        mjz.addEventListener('pointerdown', e => {
            if (jid !== null || !active)
                return;
            e.preventDefault();
            jid = e.pointerId;
            try {
                mjz.setPointerCapture(jid);
            }
            catch (_) { }
            const zr = mjz.getBoundingClientRect(), bs = mjb.offsetWidth;
            jR = bs / 2;
            jcx = e.clientX;
            jcy = e.clientY;
            mjb.style.left = Math.max(0, Math.min(zr.width - bs, e.clientX - zr.left - jR)) + 'px';
            mjb.style.top = Math.max(0, Math.min(zr.height - bs, e.clientY - zr.top - jR)) + 'px';
            mjb.style.bottom = 'auto';
            const br = mjb.getBoundingClientRect();
            jcx = br.left + jR;
            jcy = br.top + jR;
            mjb.classList.add('hold');
        });
        mjz.addEventListener('pointermove', e => {
            if (e.pointerId !== jid)
                return;
            let dx = e.clientX - jcx, dy = e.clientY - jcy;
            const len = Math.hypot(dx, dy);
            if (len > jR) {
                dx = dx / len * jR;
                dy = dy / len * jR;
            }
            mjt.style.transform = 'translate(calc(-50% + ' + dx + 'px),calc(-50% + ' + dy + 'px))';
            const k = Math.min(len, jR) / jR, m = Math.max(0, Math.min(1, (k - .14) / .86));
            if (m > 0 && len > 0) {
                joy.x = dx / Math.hypot(dx, dy);
                joy.y = -dy / Math.hypot(dx, dy);
                joy.m = m;
            }
            else {
                joy.x = joy.y = joy.m = 0;
            }
        });
        const jEnd = e => { if (e.pointerId !== jid)
            return; joyReset(); sprint = false; };
        mjz.addEventListener('pointerup', jEnd);
        mjz.addEventListener('pointercancel', jEnd);
        let lid = null, lx = 0, ly = 0;
        mlook.addEventListener('pointerdown', e => { if (lid !== null)
            return; e.preventDefault(); lid = e.pointerId; lx = e.clientX; ly = e.clientY; try {
            mlook.setPointerCapture(lid);
        }
        catch (_) { } });
        mlook.addEventListener('pointermove', e => {
            if (e.pointerId !== lid)
                return;
            const dx = e.clientX - lx, dy = e.clientY - ly;
            lx = e.clientX;
            ly = e.clientY;
            if (!active || dlgOn || fly)
                return;
            yaw -= dx * .0045 * sens;
            pitch = Math.max(-1.45, Math.min(1.45, pitch - dy * .0045 * sens));
        });
        const lEnd = e => { if (e.pointerId === lid)
            lid = null; };
        mlook.addEventListener('pointerup', lEnd);
        mlook.addEventListener('pointercancel', lEnd);
        const btn = (el, fn) => {
            el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); el.classList.add('press'); fn(); });
            const up = () => el.classList.remove('press');
            el.addEventListener('pointerup', up);
            el.addEventListener('pointercancel', up);
            el.addEventListener('pointerleave', up);
        };
        btn(mB.atk, () => { if (active && !dlgOn && !fly)
            atkQ = performance.now(); });
        btn(mB.jump, () => { if (active && !dlgOn && !fly)
            jumpQ = CONFIG.player.jumpBuffer; });
        btn(mB.run, () => { if (!active)
            return; if (keys.KeyC)
            keys.KeyC = 0; sprint = !sprint; });
        btn(mB.crouch, () => { if (!active)
            return; keys.KeyC = keys.KeyC ? 0 : 1; if (keys.KeyC)
            sprint = false; });
        btn(mB.inter, () => { if (active && (nearK || nearF || nearD || dlgOn))
            interact(); });
        btn(mB.pause, () => { if (active)
            pause(); });
        btn(mB.dash, () => { if (active)
            dashQ = true; });
        dlgEl.addEventListener('pointerdown', e => { e.preventDefault(); if (active)
            interact(); });
        document.addEventListener('visibilitychange', () => { if (document.hidden && active)
            pause(); });
    }
    const leaf = document.getElementById('leaf'), leafG = leaf.getContext('2d');
    // ===== LEAF FX: folhas na tela =====
    let leafD = 0, leafLv = -1, leafCell = 0, leafW = 0, leafH = 0;
    function leafDraw(lv) {
        const cell = leafCell, W = leaf.width = leafW, H = leaf.height = leafH, k = Math.min(1, .4 + .6 * lv / 6), g = leafG;
        g.fillStyle = 'rgba(4,14,8,.97)';
        g.beginPath();
        for (let y = cell / 2; y < H + cell; y += cell)
            for (let x = cell / 2; x < W + cell; x += cell) {
                const e = Math.min(1, Math.hypot((x - W / 2) / (W / 2), (y - H / 2) / (H / 2)) / 1.414);
                const r = cell * .74 * k * (.42 + .58 * Math.pow(e, 1.1));
                if (r < .6)
                    continue;
                g.moveTo(x + r, y);
                g.arc(x, y, r, 0, 6.2832);
            }
        g.fill();
    }
    function canopyDepth(cx, cy, cz) {
        let best = 0;
        for (let i = 0; i < TREE_COL.length; i++) {
            const T = TREE_COL[i], dx = cx - T.x, dz = cz - T.z, sc = T.th / 18, rmax = 4.2 * sc;
            if (dx * dx + dz * dz > rmax * rmax)
                continue;
            const d = Math.sqrt(dx * dx + dz * dz), hh = T.th * .24;
            for (let k = 0; k < 6; k++) {
                const f = k / 6, rad = (4.2 - 3.6 * f) * sc, yc = T.y + T.th * .28 + f * T.th * .68, t = (cy - (yc - hh / 2)) / hh;
                if (t < 0 || t > 1)
                    continue;
                const inner = (1 - t) * rad * .93 - d;
                if (inner > 0)
                    best = Math.max(best, Math.min(1, inner / 1.1, t * hh / .5, (1 - t) * hh / .5));
            }
        }
        return best;
    }
    function leafFx(dt) {
        const target = active && !fly ? canopyDepth(px, py + eye, pz) : 0;
        leafD += (target - leafD) * Math.min(1, dt * 9);
        if (leafD < .05) {
            if (leaf.style.display !== 'none') {
                leaf.style.display = 'none';
                leafLv = -1;
            }
            return;
        }
        if (leaf.style.display !== 'block')
            leaf.style.display = 'block';
        const cell = Math.max(10, Math.round(Math.max(2, PIX) * 5)), lv = Math.round(leafD * 12), w = Math.ceil(cv.clientWidth || innerWidth), h = Math.ceil(cv.clientHeight || innerHeight);
        if (lv !== leafLv || cell !== leafCell || w !== leafW || h !== leafH) {
            leafLv = lv;
            leafCell = cell;
            leafW = w;
            leafH = h;
            leafDraw(lv);
        }
    }
    let lastFrameT = 0;