(function () {
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
        paths: { ground: 'assets/ground-texture.png', road: 'assets/road-texture.jpg', bgm: 'assets/music-theme.mp3', stepWalk: 'assets/footsteps-walk.mp3', stepRun: 'assets/footsteps-run.mp3', sword: ['assets/sword-1.mp3', 'assets/sword-2.mp3'], dash: 'assets/dash.mp3', woosh: 'assets/sim.wav' },
        player: { walk: 6.5, run: 11, crouch: 2.8, jumpSpeed: 8.6, gravity: 22, jumpBuffer: .25, eyeStand: 2.6, eyeCrouch: 1.5, eyeLerp: 12, bobFactor: 1.6, flySpeed: 15, flyRunSpeed: 45 },
        combat: { attackCooldownMs: 120, attackBufferMs: 300, dashTime: .18, dashSpeed: 30, dashCooldownMs: 700 },
        camera: { fov: 72, near: .05, far: 600, fogColor: 0xe0855c, fogNear: 10, fogFar: 110 },
        world: { size: 340, radius: 80, densityDesktop: 1, densityMobile: .6, flowerCount: 18000, grassCount: 18000, grassTallCount: 3000, reedCount: 4500, treeRing: 3600, treeRingMobileFactor: .65, gateOpenTime: 2.2 },
        corridor: { endMargin: 8, gap: 2.3, rows: 2, darkLen: 45, darkFogNear: 2, darkFogFar: 26, darkLight: .85, endRadius: 3 },
        story: { gateDelay: .09, gateText: 'Você nota algo se movendo à sua direita.' },
        gfx: { pixelSize: 4, pixelSizeSmallScreen: 3, shadowMapDesktop: 2048, shadowMapMobile: 1024, shadowExtDesktop: 44, shadowExtMobile: 34 },
        audio: { bgmSkipSec: 4, bgmGain: .5, stepWalkVol: .55, stepRunVol: .7, swordVol: .3, swordTiming: [{ off: .12, delay: 0 }, { off: 0, delay: .04 }], dashVol: .5, wooshVol: .7, keyVol: .12, uiVol: .05 }
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
    // ===== SCENE: renderer, câmera, névoa =====
    const FOG = CONFIG.camera.fogColor;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(FOG);
    scene.fog = new THREE.Fog(FOG, CONFIG.camera.fogNear, CONFIG.camera.fogFar);
    const FOG_OBJ = scene.fog;
    const cam = new THREE.PerspectiveCamera(CONFIG.camera.fov, 1, CONFIG.camera.near, CONFIG.camera.far);
    cam.rotation.order = 'YXZ';
    scene.add(cam);
    let lastCW = 0, lastCH = 0;
    function size() { lastCW = cv.clientWidth || innerWidth; lastCH = cv.clientHeight || innerHeight; const w = Math.ceil(lastCW / PIX), h = Math.ceil(lastCH / PIX); renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
    addEventListener('resize', size);
    size();
    addEventListener('orientationchange', () => { size(); setTimeout(size, 300); setTimeout(size, 1000); });
    if (window.visualViewport)
        visualViewport.addEventListener('resize', size);
    setTimeout(size, 400);
    setTimeout(size, 1500);
    const sunDir = new THREE.Vector3(-.2, .34, -1).normalize();
    const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 24, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
        uniforms: { sd: { value: sunDir.clone() }, t: { value: 0 }, uCl: { value: 1 }, uDk: { value: 0 } },
        vertexShader: `varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader: `varying vec3 v;uniform vec3 sd;uniform float t;uniform float uCl;uniform float uDk;
float hs(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float nz(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hs(i),hs(i+vec2(1,0)),f.x),mix(hs(i+vec2(0,1)),hs(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*nz(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}
void main(){
 vec3 d=normalize(v);float h=max(d.y,0.);
 vec3 lo=vec3(.88,.52,.36),mid=vec3(.78,.32,.30),hi=vec3(.17,.09,.2);
 vec3 c=mix(lo,mid,smoothstep(0.,.28,h));c=mix(c,hi,smoothstep(.2,.95,h));
 float sun=max(dot(d,sd),0.);
 c+=vec3(1.,.55,.2)*pow(sun,5.)*.55+vec3(1.,.8,.4)*pow(sun,60.)*.9;
 c=mix(c,vec3(1.,.94,.72),smoothstep(.9930,.9940,sun));
 if(uCl>.5){vec2 uv=d.xz/(h+.2)*1.5+vec2(t*.012,0.);
 float n=fbm(uv*1.1+fbm(uv*.55)*.9);
 float cl=smoothstep(.40,.74,n)*smoothstep(0.,.1,h);
 cl*=1.-.55*smoothstep(.96,.995,sun);
 float lit=clamp(pow(sun,2.5)*1.1+(1.-n)*.55,0.,1.);
 vec3 cc=mix(vec3(.24,.11,.19),vec3(1.,.6,.4),lit);
 cc=mix(cc,vec3(1.,.82,.56),pow(sun,10.)*.8*(1.-n));
 c=mix(c,cc,cl*.93);}
 c*=1.-uDk;c=floor(c*7.+.5)/7.;
 gl_FragColor=vec4(c,1.);}` }));
    scene.add(sky);
    const hemi = new THREE.HemisphereLight(0xffc7a0, 0x4a2a30, .95);
    scene.add(hemi);
    const dl = new THREE.DirectionalLight(0xffb27a, 1.1);
    dl.position.copy(sunDir).multiplyScalar(50);
    scene.add(dl);
    // ===== WORLD: terreno, estrada, grama, flores =====
    const WS = CONFIG.world.size, WH = WS / 2;
    const H = (x, z) => (Math.sin(x * .05) * 1.1 + Math.cos(z * .043) * 1.1 + Math.sin((x + z) * .12) * .35) * .3;
    const GROUND_URI = CONFIG.paths.ground;
    function groundTex() {
        const t = new THREE.TextureLoader().load(GROUND_URI);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.magFilter = pixelOn ? THREE.NearestFilter : THREE.LinearFilter;
        t.minFilter = pixelOn ? THREE.NearestMipmapNearestFilter : THREE.LinearMipmapLinearFilter;
        pixTex.push(t);
        t.repeat.set(WS / 5, WS / 5);
        return t;
    }
    const gg = new THREE.PlaneGeometry(WS, WS, WS / 2, WS / 2);
    gg.rotateX(-Math.PI / 2);
    const gp = gg.attributes.position, gc = [];
    for (let i = 0; i < gp.count; i++) {
        gp.setY(i, H(gp.getX(i), gp.getZ(i)));
        const v = .92 + Math.random() * .12;
        gc.push(v, v, v);
    }
    gg.setAttribute('color', new THREE.Float32BufferAttribute(gc, 3));
    gg.computeVertexNormals();
    const ROAD = { x: -2.5, z: -11, R: 0, hw: 4.4 };
    const MAP_R = CONFIG.world.radius, AK = Math.PI * (MAP_R - 1) * (MAP_R - 1) / 15376 * .85;
    const rpos = () => { const a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * (MAP_R - 1); return [ROAD.x + Math.cos(a) * r, ROAD.z + Math.sin(a) * r]; };
    const TRAILS = [], END_TREES = [], TREE_COL = [], GATE_COL = [], GATE_SH = [], PERF = [], HQC = [], HQR = [], HQM = [];
    const perfReg = (m, f, keep) => { PERF.push({ m, full: m.count, f, keep: keep || 0 }); };
    {
        for (let k = 0; k < 4; k++) {
            const dx = Math.round(Math.cos(k * Math.PI / 2)), dz = Math.round(Math.sin(k * Math.PI / 2)), pts = [];
            for (let s = 0; s <= MAP_R; s++)
                pts.push([ROAD.x + dx * s, ROAD.z + dz * s]);
            const e = pts[pts.length - 1];
            TRAILS.push({ pts, end: e, dir: Math.atan2(dz, dx) });
        }
    }
    const GATE_BEHIND = TRAILS[3], GATE_DOOR_COL = [], GATE_LEAVES = [], GATE_LEAF_COL = [];
    let GATE_INFO = null, gateT = 0, gateOpening = false;
    const CZ_END = -(WH - CONFIG.corridor.endMargin);
    const inCorridor = (x, z, m) => z < GATE_BEHIND.end[1] + .5 + m && z > CZ_END - m && Math.abs(x - ROAD.x) < ROAD.hw + 6 + m;
    const nearEnd = (x, z, d) => TRAILS.some(T => Math.hypot(x - T.end[0], z - T.end[1]) < d);
    const RG_N = 1024, RG_S = WS, RG_K = RG_N / RG_S, RG = new Float32Array(RG_N * RG_N);
    {
        const dmin = new Float32Array(RG_N * RG_N).fill(99), pad = ROAD.hw + 5;
        const lo = v => Math.max(0, Math.floor((v + WH) * RG_K)), hi = v => Math.min(RG_N - 1, Math.ceil((v + WH) * RG_K));
        for (const T of TRAILS)
            for (let q = 0; q < T.pts.length - 1; q++) {
                const ax = T.pts[q][0], az = T.pts[q][1], bx = T.pts[q + 1][0], bz = T.pts[q + 1][1], ex = bx - ax, ez = bz - az, l2 = ex * ex + ez * ez || 1;
                const i0 = lo(Math.min(ax, bx) - pad), i1 = hi(Math.max(ax, bx) + pad), j0 = lo(Math.min(az, bz) - pad), j1 = hi(Math.max(az, bz) + pad);
                for (let jj = j0; jj <= j1; jj++) {
                    const z = (jj + .5) / RG_K - WH;
                    for (let ii = i0; ii <= i1; ii++) {
                        const x = (ii + .5) / RG_K - WH;
                        let t = ((x - ax) * ex + (z - az) * ez) / l2;
                        t = t < 0 ? 0 : t > 1 ? 1 : t;
                        const ddx = x - (ax + ex * t), ddz = z - (az + ez * t), d = Math.sqrt(ddx * ddx + ddz * ddz), id = jj * RG_N + ii;
                        if (d < dmin[id])
                            dmin[id] = d;
                    }
                }
            }
        for (let jj = 0; jj < RG_N; jj++) {
            const z = (jj + .5) / RG_K - WH;
            for (let ii = 0; ii < RG_N; ii++) {
                const x = (ii + .5) / RG_K - WH, id = jj * RG_N + ii;
                RG[id] = Math.max(ROAD.R - Math.hypot(x - ROAD.x, z - ROAD.z), ROAD.hw - dmin[id]);
            }
        }
    }
    const onRoad = (x, z, m = 0) => { const ii = Math.floor((x + WH) * RG_K), jj = Math.floor((z + WH) * RG_K); return ii >= 0 && jj >= 0 && ii < RG_N && jj < RG_N && RG[jj * RG_N + ii] > -m; };
    const CS = ROAD.hw, CELL = [];
    const NC = Math.ceil(MAP_R / CS) + 1;
    for (let j = -NC; j < NC; j++)
        for (let i = -NC; i < NC; i++) {
            const ox = (i + .5) * CS, oz = (j + .5) * CS;
            if (Math.hypot(ox, oz) > MAP_R - CS * .5 || Math.abs(ox) < ROAD.hw || Math.abs(oz) < ROAD.hw)
                continue;
            const r = Math.random(), perto = Math.min(Math.abs(ox), Math.abs(oz)) < ROAD.hw + 7;
            CELL.push({ x0: ROAD.x + i * CS, z0: ROAD.z + j * CS, t: r < .11 ? 1 : (r < .24 && !perto) ? 2 : 0 });
        }
    const ROAD_URI = CONFIG.paths.road;
    const roadTex = new THREE.TextureLoader().load(ROAD_URI);
    roadTex.wrapS = roadTex.wrapT = THREE.MirroredRepeatWrapping;
    roadTex.anisotropy = perfOn ? 1 : renderer.capabilities.getMaxAnisotropy();
    const roadMask = (() => {
        const d = new Uint8Array(RG_N * RG_N * 4);
        for (let n = 0; n < RG.length; n++) {
            d[n * 4] = Math.round((Math.max(-1, Math.min(1, RG[n])) * .5 + .5) * 255);
            d[n * 4 + 3] = 255;
        }
        const t = new THREE.DataTexture(d, RG_N, RG_N, THREE.RGBAFormat);
        t.magFilter = t.minFilter = THREE.LinearFilter;
        t.needsUpdate = true;
        return t;
    })();
    const gmat = new THREE.MeshLambertMaterial({ map: groundTex(), vertexColors: true, flatShading: true });
    gmat.onBeforeCompile = sh => {
        sh.uniforms.roadMap = { value: roadTex };
        sh.uniforms.roadMask = { value: roadMask };
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vRW;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvRW=position.xz;');
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vRW;uniform sampler2D roadMap;uniform sampler2D roadMask;').replace('#include <color_fragment>', `#include <color_fragment>
  {
    float rm_=texture2D(roadMask,(vRW+${WH}.)/${WS}.).r*2.-1.;
    float rk=smoothstep(0.,.2,rm_);
    vec3 st=texture2D(roadMap,vRW/vec2(7.5,5.03)).rgb*mix(.55,1.,smoothstep(0.,.5,rm_));
    diffuseColor.rgb=mix(diffuseColor.rgb,st,rk);
  }`);
    };
    const groundMesh = new THREE.Mesh(gg, gmat);
    scene.add(groundMesh);
    const dm = new THREE.Object3D(), tc = new THREE.Color(), rnd = () => (Math.random() - .5) * 124;
    const NF = Math.round(CONFIG.world.flowerCount * DENS * AK);
    const FAM = [[0xe0508a, 0xf27a9c, 0xd9363e, 0xf5a3b8, 0xc72f5c], [0xf7d63c, 0xffe566, 0xf2b92c, 0xffd23f], [0xffffff, 0xf4f1e6, 0xe9eef2, 0xf1dfe0]].map(f => f.map(c => new THREE.Color(c)));
    const flowerColor = (fam, out) => { const f = FAM[fam]; return out.copy(f[Math.floor(Math.random() * f.length)]).multiplyScalar(.82 + Math.random() * .22); };
    function mergeGeos(gs) {
        let n = 0;
        for (const g of gs)
            n += g.attributes.position.count;
        const P = new Float32Array(n * 3), N = new Float32Array(n * 3), I = [];
        let o = 0;
        for (const g of gs) {
            const p = g.attributes.position;
            P.set(p.array, o * 3);
            N.set(g.attributes.normal.array, o * 3);
            if (g.index)
                for (const k of g.index.array)
                    I.push(k + o);
            else
                for (let k = 0; k < p.count; k++)
                    I.push(k + o);
            o += p.count;
        }
        const r = new THREE.BufferGeometry();
        r.setAttribute('position', new THREE.BufferAttribute(P, 3));
        r.setAttribute('normal', new THREE.BufferAttribute(N, 3));
        r.setIndex(I);
        return r;
    }
    const FGEO = (() => {
        const stem = new THREE.CylinderGeometry(.022, .032, .8, 3, 1, true);
        stem.translate(0, .4, 0);
        const leaf = (y, ang, sz) => {
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, .07 * sz, .05 * sz, .04 * sz, .22 * sz, .11 * sz, 0, .07 * sz, .05 * sz, -.04 * sz], 3));
            g.setIndex([0, 1, 2, 0, 2, 3]);
            g.computeVertexNormals();
            g.rotateY(ang);
            g.translate(0, y, 0);
            return g;
        };
        const stemG = mergeGeos([stem, leaf(.26, .6, 1), leaf(.45, 3.7, .85)]);
        const K = 5, P = [0, -.03, 0], I = [];
        for (let p = 0; p < K; p++) {
            const a = p / K * Math.PI * 2, st = Math.PI * 2 / K;
            for (const [ang, r, y] of [[a, .1, 0], [a + st * .2, .2, .02], [a + st * .5, .28, .055], [a + st * .8, .2, .02]])
                P.push(Math.cos(ang) * r, y, Math.sin(ang) * r);
        }
        const nv = K * 4;
        for (let i = 0; i < nv; i++)
            I.push(0, 1 + i, 1 + (i + 1) % nv);
        const head = new THREE.BufferGeometry();
        head.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
        head.setIndex(I);
        head.computeVertexNormals();
        const center = new THREE.OctahedronGeometry(.075, 0);
        center.scale(1, .7, 1);
        center.translate(0, .03, 0);
        return { stem: stemG, head, center };
    })();
    const FMAT = { stem: new THREE.MeshLambertMaterial({ flatShading: true, side: THREE.DoubleSide }), head: new THREE.MeshLambertMaterial({ flatShading: true, side: THREE.DoubleSide }), center: new THREE.MeshLambertMaterial({ flatShading: true }) };
    const flowerSet = n => { const mk = (g, m) => { const im = new THREE.InstancedMesh(g, m, n); im.frustumCulled = false; return im; }; return { stems: mk(FGEO.stem, FMAT.stem), heads: mk(FGEO.head, FMAT.head), centers: mk(FGEO.center, FMAT.center) }; };
    const GREENS = [0x3b5a25, 0x47692c, 0x35511f, 0x4d6b2a].map(c => new THREE.Color(c));
    const CENTER = [[0xf2c12e, 0xf7d63c], [0xb5651d, 0xc2751f], [0xf2c12e, 0xe8912d]].map(f => f.map(c => new THREE.Color(c)));
    function plantFlower(S, i, x, z, fam) {
        const h = H(x, z), sh = .55 + Math.random() * .4;
        dm.scale.set(1, sh / .8, 1);
        dm.position.set(x, h, z);
        dm.rotation.set(0, Math.random() * 6.283, 0);
        dm.updateMatrix();
        S.stems.setMatrixAt(i, dm.matrix);
        S.stems.setColorAt(i, GREENS[Math.floor(Math.random() * GREENS.length)]);
        const sc = .8 + Math.random() * .55;
        dm.scale.set(sc, sc, sc);
        dm.position.set(x, h + sh, z);
        dm.rotation.set((Math.random() - .5) * .5, Math.random() * 6.283, (Math.random() - .5) * .5);
        dm.updateMatrix();
        S.heads.setMatrixAt(i, dm.matrix);
        S.centers.setMatrixAt(i, dm.matrix);
        flowerColor(fam, tc);
        S.heads.setColorAt(i, tc);
        const cc = CENTER[fam];
        S.centers.setColorAt(i, cc[Math.floor(Math.random() * cc.length)]);
    }
    const FS = flowerSet(NF);
    for (let i = 0; i < NF; i++) {
        let [x, z] = rpos();
        while (onRoad(x, z, .45))
            [x, z] = rpos();
        const nz = Math.sin(x * .19 + 1.3) + Math.sin(z * .16 - .7) + Math.sin((x + z) * .1 + 2.1);
        plantFlower(FS, i, x, z, Math.random() < .3 ? Math.floor(Math.random() * 3) : (nz < -.5 ? 0 : nz < .5 ? 1 : 2));
    }
    scene.add(FS.stems, FS.heads, FS.centers);
    for (const k of [FS.stems, FS.heads, FS.centers]) {
        perfReg(k, .4);
        HQR.push(k);
    }
    {
        const pk = CELL.filter(c => c.t === 1), per = Math.max(30, Math.round(110 * DENS)), PS = flowerSet(Math.max(1, pk.length * per));
        let n = 0;
        for (let q = 0; q < per; q++)
            for (const c of pk) {
                const x = c.x0 + Math.random() * CS, z = c.z0 + Math.random() * CS;
                plantFlower(PS, n++, x, z, Math.random() < .85 ? 0 : Math.floor(Math.random() * 3));
            }
        PS.stems.count = PS.heads.count = PS.centers.count = n;
        scene.add(PS.stems, PS.heads, PS.centers);
        for (const k of [PS.stems, PS.heads, PS.centers]) {
            perfReg(k, .5);
            HQR.push(k);
        }
    }
    const grassTime = { value: 0 }, grassWind = { value: 1 };
    function grassMat(vc) {
        const m = new THREE.MeshLambertMaterial({ flatShading: true, side: THREE.DoubleSide, vertexColors: !!vc });
        m.onBeforeCompile = sh => {
            sh.uniforms.uTime = grassTime;
            sh.uniforms.uWind = grassWind;
            sh.vertexShader = 'uniform float uTime;uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
      if(uWind>.5){float ph=uTime*1.7+instanceMatrix[3].x*.45+instanceMatrix[3].z*.31;
      float sw=(sin(ph)+.5*sin(ph*2.3+1.7))*.14*position.y*position.y;
      transformed.x+=sw;transformed.z+=sw*.6;}
      #endif`);
        };
        return m;
    }
    function grassGeo(nb, spread, wBase, bendMax) {
        const P = [], C = [], I = [];
        for (let b = 0; b < nb; b++) {
            const a = Math.random() * 6.283, r0 = Math.random() * spread, ox = Math.cos(a) * r0, oz = Math.sin(a) * r0;
            const dir = Math.random() * 6.283, hh = .7 + Math.random() * .4, bend = (.15 + Math.random() * bendMax) * hh;
            const dx = Math.cos(dir), dz = Math.sin(dir), sx = -dz, sz = dx, base = P.length / 3;
            for (let k = 0; k < 3; k++) {
                const t = k * .35, w = wBase * (1 - t * .8) * .5, off = bend * t * t, cx = ox + dx * off, cz = oz + dz * off, cy = hh * t, c = .42 + .45 * t;
                P.push(cx - sx * w, cy, cz - sz * w, cx + sx * w, cy, cz + sz * w);
                C.push(c, c, c, c, c, c);
            }
            P.push(ox + dx * bend, hh, oz + dz * bend);
            C.push(1, 1, 1);
            I.push(base, base + 1, base + 2, base + 1, base + 3, base + 2, base + 2, base + 3, base + 4, base + 3, base + 5, base + 4, base + 4, base + 5, base + 6);
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
        g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
        g.setIndex(I);
        g.computeVertexNormals();
        return g;
    }
    function scatter(geo, n, cols, fn, mat) {
        const m = new THREE.InstancedMesh(geo, mat || new THREE.MeshLambertMaterial({ flatShading: true }), n), C = cols.map(c => new THREE.Color(c));
        for (let i = 0; i < n; i++) {
            let [x, z] = rpos();
            while (onRoad(x, z, .6))
                [x, z] = rpos();
            dm.scale.set(1, 1, 1);
            dm.rotation.set(0, Math.random() * 6.28, 0);
            dm.position.set(x, H(x, z), z);
            fn(dm);
            dm.updateMatrix();
            m.setMatrixAt(i, dm.matrix);
            tc.copy(C[Math.floor(Math.random() * C.length)]).multiplyScalar(.8 + Math.random() * .4);
            m.setColorAt(i, tc);
        }
        m.frustumCulled = false;
        scene.add(m);
        perfReg(m, .45);
        HQR.push(m);
    }
    const GM = grassMat(true);
    for (let v = 0; v < 2; v++)
        scatter(grassGeo(2, .05, .09, .7), Math.round(CONFIG.world.grassCount * DENS * AK), [0x4c5c2a, 0x66722f, 0x3b4a22, 0x7d7a35], o => { o.scale.set(1, .6 + Math.random() * .8, 1); }, GM);
    for (let v = 0; v < 3; v++)
        scatter(grassGeo(6 + v, .14, .08, .6), Math.round(CONFIG.world.grassTallCount * DENS * AK), [0x3f7a2c, 0x54902f, 0x2e6a28, 0x7aa83a], o => { const w = .8 + Math.random() * .7; o.scale.set(w, .6 + Math.random() * .7, w); }, GM);
    scatter(new THREE.CylinderGeometry(.05, .02, 1, 4).translate(0, .5, 0), Math.round(CONFIG.world.reedCount * DENS * AK), [0xb8a35a, 0x9c8a4a, 0xc9a85c, 0x8a6a3a], o => { o.scale.y = 1.3 + Math.random() * .9; o.rotation.x = (Math.random() - .5) * .35; o.rotation.z = (Math.random() - .5) * .35; }, grassMat(false));
    const bx = (w, h, d, m, x, y, z, p, rx, rz) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); if (rx)
        o.rotation.x = rx; if (rz)
        o.rotation.z = rz; p.add(o); return o; };
    const K = new THREE.Group();
    const LM = c => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
    const aL = LM(0xcfd4d9), aM = LM(0xa3a9b0), aD = LM(0x62676d), mailK = LM(0x4b4f55), cloth = LM(0x2b2a2e), capeM = LM(0xe8e1ce), capeD = LM(0xcbc1a8), goldK = LM(0xc9a24a), bladeK = LM(0xdadce1), plumeM = LM(0xf1ebdb);
    const UP0 = new THREE.Vector3(0, 1, 0);
    function seg(a, b, w, d, m, p) {
        const A = new THREE.Vector3(a[0], a[1], a[2]), B = new THREE.Vector3(b[0], b[1], b[2]), dir = B.clone().sub(A), len = dir.length();
        const o = new THREE.Mesh(new THREE.BoxGeometry(w, len, d), m);
        o.position.copy(A).add(B).multiplyScalar(.5);
        o.quaternion.setFromUnitVectors(UP0, dir.normalize());
        (p || K).add(o);
        return o;
    }
    const SZ = .46;
    bx(.075, 1.4, .022, bladeK, 0, .7, SZ, K);
    bx(.022, 1.36, .034, aM, 0, .72, SZ, K);
    bx(.05, .1, .022, bladeK, 0, .03, SZ, K);
    bx(.52, .06, .06, aM, 0, 1.43, SZ, K);
    bx(.1, .05, .05, aM, .28, 1.41, SZ, K, 0, -.35);
    bx(.1, .05, .05, aM, -.28, 1.41, SZ, K, 0, .35);
    bx(.1, .1, .08, goldK, 0, 1.43, SZ, K);
    bx(.05, .36, .05, cloth, 0, 1.65, SZ, K);
    bx(.13, .13, .13, goldK, 0, 1.86, SZ, K, .785, .785);
    for (const sg of [1, -1]) {
        bx(.3, .15, .5, aD, sg * .34, .08, .2, K);
        bx(.2, .1, .3, aM, sg * .34, .07, .55, K);
        bx(.3, .04, .18, goldK, sg * .34, .19, .06, K);
        seg([sg * .34, .18, .0], [sg * .33, 1.0, -.02], .3, .3, aL);
        bx(.09, .7, .06, aM, sg * .33, .6, .16, K);
        bx(.34, .04, .34, goldK, sg * .33, .34, .0, K);
        bx(.34, .04, .34, goldK, sg * .33, .92, .0, K);
        bx(.36, .26, .34, aM, sg * .32, 1.08, .04, K);
        bx(.1, .2, .2, aM, sg * .52, 1.08, .03, K, 0, sg * .25);
        bx(.38, .04, .36, goldK, sg * .32, 1.22, .04, K);
        seg([sg * .3, 1.2, 0], [sg * .3, 1.6, 0], .34, .34, aL);
        seg([sg * .54, 2.34, .0], [sg * .62, 1.98, .06], .25, .25, aL);
        bx(.3, .26, .3, aM, sg * .62, 1.94, .06, K);
        bx(.1, .2, .2, aM, sg * .76, 1.94, .04, K, 0, -sg * .2);
        bx(.3, .04, .3, goldK, sg * .62, 2.08, .06, K);
        seg([sg * .62, 1.9, .1], [sg * .1, 1.86, .42], .22, .22, aL);
        bx(.24, .05, .24, goldK, sg * .3, 1.88, .28, K);
        bx(.2, .2, .18, aM, sg * .09, 1.87, .47, K);
        bx(.5, .18, .5, aL, sg * .5, 2.45, 0, K, 0, -sg * .35);
        bx(.52, .14, .52, aM, sg * .57, 2.33, 0, K, 0, -sg * .4);
        bx(.5, .04, .52, goldK, sg * .5, 2.55, 0, K, 0, -sg * .35);
        bx(.36, .3, .1, aL, sg * .36, 2.4, .25, K, 0, -sg * .5);
        bx(.3, .03, .1, goldK, sg * .36, 2.55, .26, K, 0, -sg * .5);
        bx(.05, .2, .05, goldK, sg * .19, 2.66, -.02, K, 0, sg * .3);
    }
    bx(.95, .16, .6, aL, 0, 1.34, 0, K);
    bx(.88, .16, .56, aM, 0, 1.49, 0, K);
    bx(.8, .16, .52, aL, 0, 1.64, 0, K);
    for (const sg of [1, -1]) {
        bx(.07, .07, .04, goldK, sg * .3, 1.34, .31, K);
        bx(.07, .07, .04, goldK, sg * .12, 1.5, .29, K);
        bx(.07, .07, .04, goldK, sg * .3, 1.64, .27, K);
    }
    bx(.76, .1, .5, goldK, 0, 1.78, 0, K);
    bx(.1, .12, .06, goldK, 0, 1.78, .26, K);
    bx(.66, .3, .46, aL, 0, 1.96, 0, K);
    bx(.84, .4, .5, aL, 0, 2.28, .02, K);
    bx(.72, .36, .1, aM, 0, 2.3, .26, K);
    bx(.1, .7, .06, aL, 0, 2.15, .3, K);
    bx(.66, .03, .1, goldK, 0, 2.1, .31, K);
    bx(.4, .14, .3, mailK, 0, 1.76, .12, K);
    bx(.34, .12, .34, mailK, 0, 2.52, 0, K);
    bx(.36, .1, .34, aM, 0, 2.6, 0, K);
    bx(.82, .7, .1, aM, 0, 2.2, -.25, K);
    const Hm = new THREE.Group();
    Hm.position.set(0, 2.84, 0);
    K.add(Hm);
    bx(.4, .46, .42, aL, 0, 0, 0, Hm);
    bx(.34, .12, .38, aM, 0, .28, 0, Hm);
    bx(.05, .5, .05, goldK, 0, .03, .22, Hm);
    bx(.42, .05, .44, goldK, 0, .12, 0, Hm);
    bx(.36, .26, .1, aM, 0, -.06, .24, Hm);
    for (let i = 0; i < 4; i++)
        bx(.26, .025, .02, cloth, 0, -.15 + i * .055, .3, Hm);
    bx(.02, .1, .02, cloth, 0, .05, .3, Hm);
    bx(.34, .14, .3, aM, 0, -.26, .12, Hm);
    bx(.38, .1, .3, aM, 0, -.25, -.08, Hm);
    // ===== PEDESTAL: pedestal do cavaleiro, placas =====
    const PED_H = 4.6;
    K.position.set(-2.5, H(-2.5, -11) - .02 + PED_H, -11);
    K.rotation.y = 0;
    K.scale.setScalar(2.2);
    scene.add(K);
    const PED = new THREE.Group();
    PED.position.set(-2.5, H(-2.5, -11) - .02, -11);
    PED.rotation.y = 0;
    scene.add(PED);
    const stoneTex = treeTex(64, 64, [1, 1], (g, w, h) => {
        g.fillStyle = '#9c9b96';
        g.fillRect(0, 0, w, h);
        for (let i = 0; i < 260; i++) {
            const v = Math.random();
            g.fillStyle = v < .4 ? '#a6a59f' : v < .8 ? '#92918c' : '#b0afa9';
            g.fillRect(Math.random() * w | 0, Math.random() * h | 0, 1 + (Math.random() < .2), 1);
        }
        for (let i = 0; i < 7; i++) {
            g.fillStyle = '#6f6e69';
            g.fillRect(Math.random() * w | 0, Math.random() * h | 0, 1, 1);
        }
        g.fillStyle = '#8a8984';
        g.fillRect(0, 0, w, 1);
    });
    const stoneM = new THREE.MeshLambertMaterial({ map: stoneTex, flatShading: true });
    const stoneD = new THREE.MeshLambertMaterial({ color: 0x7d7c77, flatShading: true });
    function stoneBox(w, h, d, x, y, z, p, m) {
        const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv, n = uv.count;
        for (let i = 0; i < n; i++) {
            const f = Math.floor(i / 4);
            let a, b;
            if (f < 2) {
                a = d;
                b = h;
            }
            else if (f < 4) {
                a = w;
                b = d;
            }
            else {
                a = w;
                b = h;
            }
            uv.setXY(i, uv.getX(i) * a / 2, uv.getY(i) * b / 2);
        }
        const o = new THREE.Mesh(g, m || stoneM);
        o.position.set(x, y, z);
        p.add(o);
        return o;
    }
    const PBW = 6.0, PZ0B = -2.9, PZ1B = 3.3, PTW = 4.0, PZ0T = -1.6, PZ1T = 2.2, PBY = -.3, PTY = PED_H - .2;
    {
        const g = new THREE.BoxGeometry(1, 1, 1), pos = g.attributes.position, uv = g.attributes.uv;
        for (let i = 0; i < pos.count; i++) {
            const top = pos.getY(i) > 0;
            const z0 = top ? PZ0T : PZ0B, z1 = top ? PZ1T : PZ1B, w = top ? PTW : PBW;
            pos.setXYZ(i, pos.getX(i) * w, top ? PTY : PBY, pos.getZ(i) < 0 ? z0 : z1);
            const f = Math.floor(i / 4);
            uv.setXY(i, uv.getX(i) * (f < 2 ? 8 : 6) / 2, uv.getY(i) * (PTY - PBY) / 2);
        }
        g.computeVertexNormals();
        const o = new THREE.Mesh(g, stoneM);
        PED.add(o);
        stoneBox(PTW + .4, .2, PZ1T - PZ0T + .4, 0, PTY + .1, (PZ0T + PZ1T) / 2, PED, stoneD);
    }
    const PLZ = 4.25;
    const plqTex = (() => {
        const c = document.createElement('canvas');
        c.width = 128;
        c.height = 80;
        const g = c.getContext('2d');
        g.fillStyle = '#5b4526';
        g.fillRect(0, 0, 128, 80);
        g.fillStyle = '#7a5d33';
        g.fillRect(3, 3, 122, 74);
        g.fillStyle = '#8f7040';
        g.fillRect(6, 6, 116, 68);
        g.fillStyle = '#d9b865';
        g.fillRect(6, 6, 116, 2);
        g.fillRect(6, 72, 116, 2);
        g.textAlign = 'center';
        g.fillStyle = '#2a1c0a';
        g.font = "700 14px 'Silkscreen',monospace";
        g.fillText('LOST', 64, 28);
        g.fillText('CAVALIER', 64, 46);
        g.fillStyle = '#4a3515';
        g.font = "400 8px 'Silkscreen',monospace";
        g.fillText('aperte  E', 64, 64);
        const t = new THREE.CanvasTexture(c);
        t.magFilter = pixelOn ? THREE.NearestFilter : THREE.LinearFilter;
        t.minFilter = pixelOn ? THREE.NearestMipmapNearestFilter : THREE.LinearMipmapLinearFilter;
        pixTex.push(t);
        if (document.fonts && document.fonts.load) {
            document.fonts.load("700 14px 'Silkscreen'").then(() => { const g2 = c.getContext('2d'); g2.fillStyle = '#8f7040'; g2.fillRect(8, 10, 112, 60); g2.textAlign = 'center'; g2.fillStyle = '#2a1c0a'; g2.font = "700 14px 'Silkscreen',monospace"; g2.fillText('LOST', 64, 28); g2.fillText('CAVALIER', 64, 46); g2.fillStyle = '#4a3515'; g2.font = "400 8px 'Silkscreen',monospace"; g2.fillText('aperte  E', 64, 64); t.needsUpdate = true; }).catch(() => { });
        }
        return t;
    })();
    const PLQ = new THREE.Group();
    PED.add(PLQ);
    PLQ.position.set(0, -.3, PLZ);
    stoneBox(1.5, .25, .9, 0, .125, 0, PLQ);
    stoneBox(.8, .7, .5, 0, .25 + .35, -.1, PLQ);
    const TLT = new THREE.Group();
    TLT.position.set(0, 1.05, -.02);
    TLT.rotation.x = -.55;
    PLQ.add(TLT);
    stoneBox(1.4, .9, .22, 0, 0, 0, TLT, stoneD);
    const plqPlate = new THREE.Mesh(new THREE.PlaneGeometry(1.25, .78), new THREE.MeshLambertMaterial({ map: plqTex, flatShading: true }));
    plqPlate.position.set(0, 0, .113);
    TLT.add(plqPlate);
    const DIRX = 2.57, DIRY = 1.8, DIRZ = 2.05;
    const dirTex = (() => {
        const c = document.createElement('canvas');
        c.width = c.height = 512;
        const g = c.getContext('2d');
        g.fillStyle = '#6b4a2b';
        g.fillRect(0, 0, 512, 512);
        const PARAS = ["Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc gravida efficitur justo sit amet volutpat. Suspendisse volutpat enim sit amet justo iaculis, et tincidunt dolor iaculis. Nulla facilisi. Integer non tellus ac nibh ornare rhoncus at a ipsum. Vivamus commodo ultricies quam. Phasellus elit mi, interdum sed dignissim a, pharetra sit amet orci. Duis lacinia, urna eu scelerisque dignissim, quam quam sollicitudin sem, sed placerat magna sapien at lorem. Morbi eleifend dui quam, nec rutrum leo accumsan sed. Ut a blandit sem. Aliquam erat volutpat. Cras vitae ante enim. Proin porttitor velit et elit rutrum rutrum. Vestibulum sit amet eros iaculis, pretium sapien non, tincidunt justo.", "Morbi commodo enim nec gravida tincidunt. In rhoncus porttitor nisl eu bibendum. Donec tellus elit, cursus sed magna ut, condimentum sollicitudin massa. Suspendisse pulvinar ac magna id faucibus. Donec a arcu ante. Nulla porttitor lorem eu elit iaculis dictum. Nam sem tortor, rutrum et blandit vitae, accumsan nec odio. Vivamus mollis lacus ac felis sagittis, a luctus eros molestie. Cras nunc ex, hendrerit vitae turpis eu, sagittis consectetur erat. Etiam molestie semper tempor. Praesent eget vestibulum nibh. Suspendisse sed viverra lorem. Pellentesque maximus eu nisi eget ultrices. Nam blandit placerat orci, et vehicula dolor fermentum ut. Nunc nec dui eget sapien porttitor malesuada. Ut mattis mauris a sem tempor lacinia vel in arcu."];
        g.save();
        g.textAlign = 'left';
        g.textBaseline = 'top';
        g.font = "600 12px monospace";
        g.fillStyle = 'rgba(255,255,255,.8)';
        g.shadowColor = '#fff';
        g.shadowBlur = 4;
        if ('filter' in g)
            g.filter = 'blur(2.2px)';
        const X0 = 34, MAXW = 444;
        let y = 38;
        for (const par of PARAS) {
            let line = '';
            for (const w of par.split(' ')) {
                const tst = line ? line + ' ' + w : w;
                if (g.measureText(tst).width > MAXW && line) {
                    g.fillText(line, X0, y);
                    y += 19;
                    line = w;
                }
                else
                    line = tst;
            }
            if (line) {
                g.fillText(line, X0, y);
                y += 19;
            }
            y += 15;
        }
        g.restore();
        const t = new THREE.CanvasTexture(c);
        t.magFilter = pixelOn ? THREE.NearestFilter : THREE.LinearFilter;
        t.minFilter = pixelOn ? THREE.NearestMipmapNearestFilter : THREE.LinearMipmapLinearFilter;
        pixTex.push(t);
        return t;
    })();
    {
        const th = Math.atan(1 / 4.7);
        const grp = new THREE.Group();
        grp.position.set(DIRX + .03, DIRY, DIRZ);
        grp.rotation.z = th;
        PED.add(grp);
        const face = new THREE.Group();
        face.rotation.y = Math.PI / 2;
        grp.add(face);
        const back = new THREE.Mesh(new THREE.BoxGeometry(.95, .95, .06), stoneD);
        back.position.z = -.03;
        face.add(back);
        const pl = new THREE.Mesh(new THREE.PlaneGeometry(.9, .9), new THREE.MeshLambertMaterial({ map: dirTex, flatShading: true }));
        pl.position.z = .005;
        face.add(pl);
        for (const [bx_, by_] of [[-.4, -.4], [.4, -.4], [-.4, .4], [.4, .4]]) {
            const bolt = new THREE.Mesh(new THREE.BoxGeometry(.07, .07, .05), goldK);
            bolt.position.set(bx_, by_, .03);
            face.add(bolt);
        }
    }
    // ===== COLLISION: colisão com estátua/árvores =====
    const KC = { x: -2.5, z: -11, c: 1, s: 0, hx: PBW / 2, z0: PZ0B, z1: PZ1B, r: .5, bx: .75, bz0: PLZ - .45 - .3, bz1: PLZ + .5 };
    let nearK = false, nearW = 0;
    function collideTrees() {
        for (let i = 0; i < TREE_COL.length; i++) {
            const T = TREE_COL[i], dx = px - T.x, dz = pz - T.z, rr = T.r + .4, d2 = dx * dx + dz * dz;
            if (d2 < rr * rr) {
                const d = Math.sqrt(d2) || .001;
                px = T.x + dx / d * rr;
                pz = T.z + dz / d * rr;
            }
        }
        for (let i = 0; i < GATE_COL.length; i++) {
            const T = GATE_COL[i], dx = px - T.x, dz = pz - T.z, rr = T.r + .4, d2 = dx * dx + dz * dz;
            if (d2 < rr * rr) {
                const d = Math.sqrt(d2) || .001;
                px = T.x + dx / d * rr;
                pz = T.z + dz / d * rr;
            }
        }
    }
    function collideStatue() {
        const dx = px - KC.x, dz = pz - KC.z;
        let lx = dx * KC.c - dz * KC.s, lz = dx * KC.s + dz * KC.c;
        const cx = Math.max(-KC.hx, Math.min(KC.hx, lx)), cz = Math.max(KC.z0, Math.min(KC.z1, lz));
        let ox = lx - cx, oz = lz - cz, d = Math.hypot(ox, oz);
        if (d === 0) {
            const e = [KC.hx - lx, lx + KC.hx, KC.z1 - lz, lz - KC.z0], m = Math.min(...e);
            if (m === e[0]) {
                ox = 1;
                oz = 0;
            }
            else if (m === e[1]) {
                ox = -1;
                oz = 0;
            }
            else if (m === e[2]) {
                ox = 0;
                oz = 1;
            }
            else {
                ox = 0;
                oz = -1;
            }
            lx = cx + ox * (m + KC.r);
            lz = cz + oz * (m + KC.r);
            d = KC.r;
        }
        else if (d < KC.r) {
            lx = cx + ox / d * KC.r;
            lz = cz + oz / d * KC.r;
            d = KC.r;
        }
        px = KC.x + lx * KC.c + lz * KC.s;
        pz = KC.z - lx * KC.s + lz * KC.c;
        {
            const dx2 = px - KC.x, dz2 = pz - KC.z;
            let ax = dx2 * KC.c - dz2 * KC.s, az = dz2 * KC.c + dx2 * KC.s;
            const qx = Math.max(-KC.bx, Math.min(KC.bx, ax)), qz = Math.max(KC.bz0, Math.min(KC.bz1, az));
            let ox2 = ax - qx, oz2 = az - qz, dd = Math.hypot(ox2, oz2);
            if (dd > 0 && dd < KC.r) {
                ax = qx + ox2 / dd * KC.r;
                az = qz + oz2 / dd * KC.r;
                px = KC.x + ax * KC.c + az * KC.s;
                pz = KC.z - ax * KC.s + az * KC.c;
            }
            const d1 = Math.hypot(ax, az - PLZ), d2 = ax > 0 ? Math.hypot(ax - DIRX, az - DIRZ) : 99;
            nearW = d1 < 2.6 && d1 <= d2 ? 1 : (d2 < 2.4 ? 2 : 0);
            nearK = nearW > 0;
        }
    }
    function treeTex(w, h, rep, paint) {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        paint(c.getContext('2d'), w, h);
        const t = new THREE.CanvasTexture(c);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(rep[0], rep[1]);
        t.magFilter = pixelOn ? THREE.NearestFilter : THREE.LinearFilter;
        t.minFilter = pixelOn ? THREE.NearestMipmapNearestFilter : THREE.LinearMipmapLinearFilter;
        t.anisotropy = 4;
        pixTex.push(t);
        return t;
    }
    const barkTex = treeTex(64, 128, [1, 1], (g, w, h) => {
        g.fillStyle = '#5a4132';
        g.fillRect(0, 0, w, h);
        for (let x = 0; x < w; x += 2) {
            const v = Math.random();
            g.fillStyle = v < .25 ? '#3e2a20' : v < .6 ? '#6b4d3a' : '#7a5a44';
            g.fillRect(x, 0, 2, h);
        }
        for (let i = 0; i < 34; i++) {
            g.fillStyle = Math.random() < .62 ? '#2e1d17' : '#957459';
            g.fillRect(Math.floor(Math.random() * w / 2) * 2, Math.random() * h | 0, 2, 14 + Math.random() * 52 | 0);
        }
        for (let i = 0; i < 9; i++) {
            g.fillStyle = '#2a1a14';
            g.fillRect(Math.floor(Math.random() * w / 2) * 2, Math.random() * h | 0, 4, 3);
        }
    });
    const leafTex = treeTex(64, 64, [3, 2], (g, w, h) => {
        for (let y = 0; y < h; y += 2)
            for (let x = 0; x < w; x += 2) {
                const r = Math.random(), v = r < .2 ? 120 : r < .5 ? 160 : r < .85 ? 195 : 235;
                g.fillStyle = 'rgb(' + (v * .92 | 0) + ',' + v + ',' + (v * .9 | 0) + ')';
                g.fillRect(x, y, 2, 2);
            }
        for (let i = 0; i < 110; i++) {
            const v = Math.random() < .5 ? 100 : 245;
            g.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')';
            g.fillRect(Math.random() * w | 0, Math.random() * h | 0, 1, 3);
        }
    });
    // ===== TREES: pinheiros e floresta =====
    const PINE_COLS = [0x293e30, 0x344e3b, 0x203223];
    const trunkM = new THREE.MeshLambertMaterial({ color: 0xc8c8c8, map: barkTex, flatShading: true });
    const pineM = PINE_COLS.map(c => new THREE.MeshLambertMaterial({ color: c, map: leafTex, flatShading: true }));
    const mkPine = (x, z, i) => {
        const g = new THREE.Group(), th = 14 + Math.random() * 10;
        bx(.9, th * .35, .9, trunkM, 0, th * .175, 0, g);
        for (let k = 0; k < 6; k++) {
            const f = k / 6, rad = (4.2 - 3.6 * f) * (th / 18), c = new THREE.Mesh(new THREE.ConeGeometry(rad, th * .24, 6), pineM[i % 3]);
            c.position.y = th * .28 + f * th * .68;
            g.add(c);
        }
        g.position.set(x, H(x, z), z);
        g.rotation.y = Math.random() * 3;
        scene.add(g);
        HQC.push(g);
        if (nearEnd(x, z, 22))
            END_TREES.push({ x, z, r: .7 });
        TREE_COL.push({ x, z, r: .6, th, y: H(x, z) });
    };
    const INNER = [];
    for (const c of CELL) {
        if (c.t !== 2)
            continue;
        const n = 1 + (Math.random() < .5 ? 1 : 0);
        for (let q = 0; q < n; q++) {
            const x = c.x0 + .9 + Math.random() * (CS - 1.8), z = c.z0 + .9 + Math.random() * (CS - 1.8);
            if (!onRoad(x, z, 7))
                INNER.push([x, z]);
        }
    }
    for (const T of TRAILS)
        for (let q = 0; q < 6; q++) {
            const a = T.dir + (q - 2.5) * .7 + (Math.random() - .5) * .25, r = 8.5 + Math.random() * 3.5, x = T.end[0] + Math.cos(a) * r, z = T.end[1] + Math.sin(a) * r;
            if (onRoad(x, z, 6) || inCorridor(x, z, 2))
                continue;
            mkPine(x, z, q);
        }
    {
        const IRONM = new THREE.MeshLambertMaterial({ color: 0x1a1a20, flatShading: true });
        HQM.push(IRONM);
        const boxG = new THREE.BoxGeometry(1, 1, 1), spG = new THREE.ConeGeometry(.075, .32, 4), rgG = new THREE.TorusGeometry(1, .15, 5, 12), curlG = new THREE.TorusGeometry(1, .22, 5, 10, 4.4);
        const o = new THREE.Object3D();
        const part = (list, g, M, x, y, z, sx, sy, sz, rx, ry, rz) => {
            o.position.set(x, y, z);
            o.rotation.set(rx || 0, ry || 0, rz || 0);
            o.scale.set(sx, sy, sz);
            o.updateMatrix();
            const c = g.clone();
            c.applyMatrix4(o.matrix.clone().premultiply(M));
            list.push(c);
        };
        const leaf = (list, M, L, h0, h1) => {
            const K = h1 / 4.6, Ks = Math.sqrt(K), ht = u => h0 + (h1 - h0) * (.5 - .5 * Math.cos(Math.PI * Math.min(1, u / L))), y0 = .28 * K;
            part(list, boxG, M, L / 2, y0, 0, L, .12, .09);
            part(list, boxG, M, L / 2, 1.1 * K, 0, L, .09, .08);
            const N = Math.max(1, Math.round(L / .5));
            for (let i = 0; i < N; i++) {
                const u0 = L * i / N, u1 = L * (i + 1) / N, ya = ht(u0), yb = ht(u1), len = Math.hypot(u1 - u0, yb - ya), ang = Math.atan2(yb - ya, u1 - u0);
                part(list, boxG, M, (u0 + u1) / 2, (ya + yb) / 2, 0, len + .02, .11, .09, 0, 0, ang);
                part(list, boxG, M, (u0 + u1) / 2, (ya + yb) / 2 - .62 * K, 0, len + .02, .08, .07, 0, 0, ang);
            }
            for (let u = .18; u < L - .05; u += .3) {
                const t = ht(u);
                part(list, boxG, M, u, (y0 + t) / 2, 0, .06, t - y0, .06);
                part(list, spG, M, u, t + .16 * K, 0, Ks, K, Ks);
            }
            for (let u = .3; u < L - .1; u += .56) {
                part(list, rgG, M, u, ht(u) - .34 * K, 0, .14 * K, .14 * K, .14 * K);
            }
            for (let u = .15; u < L - .05; u += .34) {
                part(list, rgG, M, u, .7 * K, 0, .13 * K, .13 * K, .13 * K);
                part(list, rgG, M, u + .17, .9 * K, 0, .08 * K, .08 * K, .08 * K);
                part(list, rgG, M, u + .17, .5 * K, 0, .08 * K, .08 * K, .08 * K);
            }
            part(list, boxG, M, 0, (h0 + .6) / 2, 0, .16 * Ks, h0 + .6, .16 * Ks);
            part(list, spG, M, 0, h0 + .6 + .16 * K, 0, 1.3 * Ks, 1.3 * K, 1.3 * Ks);
            part(list, boxG, M, L, (h1 + .7) / 2, 0, .16 * Ks, h1 + .7, .16 * Ks);
            part(list, curlG, M, L, h1 + .7 + .2 * K, 0, .14 * K, .14 * K, .14 * K, 0, 0, -1.2);
        };
        const shadowMat = (() => {
            const W = 512, Hh = 128, c = document.createElement('canvas');
            c.width = W;
            c.height = Hh;
            const g = c.getContext('2d'), im = g.createImageData(W, Hh);
            for (let y = 0; y < Hh; y++)
                for (let x = 0; x < W; x++) {
                    const u = y / (Hh - 1), ex = Math.min(1, Math.min(x, W - 1 - x) / (W * .1)), st = .82 + .18 * Math.cos(x / W * (17.2 / .3) * 6.283);
                    im.data[(y * W + x) * 4 + 3] = Math.round(255 * .34 * Math.pow(1 - u, 1.5) * ex * ex * st);
                }
            g.putImageData(im, 0, 0);
            const t = new THREE.CanvasTexture(c);
            t.magFilter = t.minFilter = THREE.LinearFilter;
            t.generateMipmaps = false;
            return new THREE.MeshBasicMaterial({ color: 0x000000, map: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
        })();
        const hw = ROAD.hw, L = hw - .06, h0 = 4.2, h1 = 7.0, FL = 3.6, tr = (x) => new THREE.Matrix4().makeTranslation(x, 0, 0), ry = (a) => new THREE.Matrix4().makeRotationY(a);
        for (const T of TRAILS) {
            const dx = Math.cos(T.dir), dz = Math.sin(T.dir), gx = T.end[0] - dx * .5, gz = T.end[1] - dz * .5, a = Math.atan2(dx, dz), list = [];
            const swing = T === GATE_BEHIND, lA = [], lB = [];
            leaf(swing ? lA : list, swing ? new THREE.Matrix4() : tr(-hw), L, h0, h1);
            leaf(swing ? lB : list, swing ? ry(Math.PI) : tr(hw).multiply(ry(Math.PI)), L, h0, h1);
            leaf(list, tr(-hw).multiply(ry(Math.PI)), FL, h0, h0);
            leaf(list, tr(hw), FL, h0, h0);
            const m = new THREE.Mesh(mergeGeos(list), IRONM);
            m.position.set(gx, H(gx, gz) - .05, gz);
            m.rotation.y = a;
            scene.add(m);
            HQC.push(m);
            for (const g of list)
                g.dispose();
            if (swing) {
                const gg = new THREE.Group();
                gg.position.set(gx, H(gx, gz) - .05, gz);
                gg.rotation.y = a;
                scene.add(gg);
                HQC.push(gg);
                [[lA, -hw, -1], [lB, hw, 1]].forEach(([lst, px, dir]) => {
                    const pv = new THREE.Group();
                    pv.position.x = px;
                    pv.add(new THREE.Mesh(mergeGeos(lst), IRONM));
                    gg.add(pv);
                    GATE_LEAVES.push({ pv, dir });
                    for (const g of lst)
                        g.dispose();
                });
            }
            const ca = Math.cos(a), sa = Math.sin(a), add = (lx, lz, r) => { const o = { x: gx + lx * ca + lz * sa, z: gz - lx * sa + lz * ca, r }; GATE_COL.push(o); return o; };
            if (swing)
                GATE_INFO = { gx, gz, ca, sa, hw, L };
            for (let lx = -hw - FL; lx <= hw + FL + .01; lx += .7) {
                const o = add(lx, 0, .25);
                if (swing && Math.abs(lx) < hw)
                    GATE_DOOR_COL.push(o);
            }
            const SW = 2 * (hw + FL) + 1.6, SD = 6.5, sg = new THREE.PlaneGeometry(SW, SD, 24, 8);
            sg.rotateX(-Math.PI / 2);
            sg.translate(0, 0, -.5 + SD / 2);
            const sp = sg.attributes.position, gy = H(gx, gz) - .05;
            for (let i = 0; i < sp.count; i++) {
                const lx = sp.getX(i), lz = sp.getZ(i);
                sp.setY(i, H(gx + lx * ca + lz * sa, gz - lx * sa + lz * ca) - gy + .06);
            }
            const sm = new THREE.Mesh(sg, shadowMat);
            sm.position.set(gx, gy, gz);
            sm.rotation.y = a;
            sm.renderOrder = 1;
            scene.add(sm);
            GATE_SH.push(sm);
        }
    }
    {
        const RING = Math.round(CONFIG.world.treeRing * (IS_MOBILE ? CONFIG.world.treeRingMobileFactor : 1)), NT = RING + INNER.length, o = new THREE.Object3D(), pc = PINE_COLS.map(c => new THREE.Color(c)), RIN = MAP_R - 1, RB = MAP_R + 14, ROUT = 140;
        const trI = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), trunkM, NT);
        const coneG = new THREE.ConeGeometry(1, 1, 6), coI = [];
        for (let k = 0; k < 6; k++)
            coI.push(new THREE.InstancedMesh(coneG, new THREE.MeshLambertMaterial({ flatShading: true, map: leafTex }), NT));
        let n = 0;
        const put = (x, z, th) => {
            const y = H(x, z), ry = Math.random() * 3, w = Math.max(1, th / 18);
            o.position.set(x, y + th * .175, z);
            o.rotation.set(0, ry, 0);
            o.scale.set(.9 * w, th * .35, .9 * w);
            o.updateMatrix();
            trI.setMatrixAt(n, o.matrix);
            for (let k = 0; k < 6; k++) {
                const f = k / 6, rad = (4.2 - 3.6 * f) * (th / 18);
                o.position.set(x, y + th * .28 + f * th * .68, z);
                o.rotation.set(0, ry, 0);
                o.scale.set(rad, th * .24, rad);
                o.updateMatrix();
                coI[k].setMatrixAt(n, o.matrix);
                coI[k].setColorAt(n, pc[n % 3]);
            }
            if (nearEnd(x, z, 20))
                END_TREES.push({ x, z, r: .45 * w + .25 });
            n++;
            return { y, w };
        };
        for (const [x, z] of INNER) {
            const th = 14 + Math.random() * 10, p = put(x, z, th);
            TREE_COL.push({ x, z, r: .6, th, y: p.y });
        }
        const cand = [];
        let nCol = 0;
        while (cand.length < RING) {
            const a = Math.random() * 6.283, u = Math.random();
            const r = u < .5 ? RIN + Math.random() * (RB - RIN) : RB + Math.pow(Math.random(), 1.35) * (ROUT - RB);
            const x = ROAD.x + Math.cos(a) * r, z = ROAD.z + Math.sin(a) * r;
            if (r < MAP_R + 10 && onRoad(x, z, 5))
                continue;
            if (inCorridor(x, z, 2))
                continue;
            cand.push({ x, z, th: (16 + Math.random() * 14) * (1 + Math.max(0, r - MAP_R) / 65 * .35), col: r < MAP_R + 8 });
        }
        cand.sort((A, B) => (B.col ? 1 : 0) - (A.col ? 1 : 0));
        for (const c of cand) {
            const p = put(c.x, c.z, c.th);
            if (c.col) {
                TREE_COL.push({ x: c.x, z: c.z, r: .55 * p.w, th: c.th, y: p.y });
                nCol++;
            }
        }
        for (const mm of [trI, ...coI]) {
            mm.frustumCulled = false;
            scene.add(mm);
        }
        for (const mm of [trI, ...coI]) {
            perfReg(mm, .45, INNER.length + nCol);
            HQC.push(mm);
        }
    }
    if (END_TREES.length) {
        const NR = END_TREES.length * 17, RS = flowerSet(NR), a0 = Math.floor(Math.random() * 3);
        let n = 0;
        END_TREES.forEach((T, ti) => {
            const cnt = 13 + Math.floor(Math.random() * 5);
            for (let q = 0; q < cnt; q++) {
                const a = Math.random() * 6.283, r = T.r + .9 + Math.random() * 2.7, x = T.x + Math.cos(a) * r, z = T.z + Math.sin(a) * r;
                if (onRoad(x, z, .45))
                    continue;
                plantFlower(RS, n, x, z, Math.random() < .78 ? (a0 + ti) % 3 : Math.floor(Math.random() * 3));
                n++;
            }
        });
        RS.stems.count = RS.heads.count = RS.centers.count = n;
        scene.add(RS.stems, RS.heads, RS.centers);
    }
    const PN = 260, pp = new Float32Array(PN * 3);
    for (let i = 0; i < PN; i++) {
        pp[i * 3] = (Math.random() - .5) * 40;
        pp[i * 3 + 1] = Math.random() * 14;
        pp[i * 3 + 2] = (Math.random() - .5) * 40;
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
    const petals = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xffb0c8, size: .16 }));
    petals.frustumCulled = false;
    scene.add(petals);
    const sword = new THREE.Group();
    const M = c => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
    const bladeM = M(0x4a4d56), hamonM = M(0xd0d3da), spineM = M(0x25272c), goldM = M(0xe0b84c), goldD = M(0xa8832f), redM = M(0xc2181f), redD = M(0x7a0f16), whiteM = M(0xf2efe8), silverM = M(0xc4c7cf);
    const cy = (r1, r2, h, sg, m, x, y, z, rx, rz, p) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, sg), m); o.position.set(x, y, z); if (rx)
        o.rotation.x = rx; if (rz)
        o.rotation.z = rz; (p || sword).add(o); return o; };
    // ===== CORRIDOR: corredor escuro de árvores mortas atrás do portão =====
    const CORR = CONFIG.corridor, CX = ROAD.x, CZ0 = GATE_BEHIND.end[1] + .5, CORR_END = { x: CX, z: CZ_END };
    let corrDark = 0, corrDarkLast = 0, corrEndDone = false;
    function onCorridorEnd() {
        // PONTO MARCADO: o que acontece no fim do corredor ainda será definido. Dispara 1x quando o jogador chega em CORR_END.
    }
    {
        const deadM = new THREE.MeshLambertMaterial({ color: 0x4a3d36, flatShading: true });
        HQM.push(deadM);
        const parts = [], o = new THREE.Object3D(), UP = new THREE.Vector3(0, 1, 0), dv = new THREE.Vector3();
        const bpart = (x, y, z, sx, sy, sz, dir) => {
            o.position.set(x, y, z);
            if (dir)
                o.quaternion.setFromUnitVectors(UP, dir);
            else
                o.quaternion.identity();
            o.scale.set(sx, sy, sz);
            o.updateMatrix();
            parts.push(new THREE.BoxGeometry(1, 1, 1).applyMatrix4(o.matrix));
        };
        bpart(0, 4, 0, .55, 8, .55);
        for (let i = 0; i < 6; i++) {
            const ang = i * 2.4, h = 2.8 + i * .95, Lb = 2.6 - i * .22, tilt = .95;
            dv.set(Math.cos(ang) * Math.sin(tilt), Math.cos(tilt), Math.sin(ang) * Math.sin(tilt)).normalize();
            bpart(dv.x * Lb / 2, h + dv.y * Lb / 2, dv.z * Lb / 2, .16, Lb, .16, dv.clone());
        }
        const geo = mergeGeos(parts);
        for (const g of parts)
            g.dispose();
        const spots = [], hw = ROAD.hw;
        for (const side of [-1, 1])
            for (let layer = 0; layer < CORR.rows; layer++)
                for (let z = CZ0 - 1 - layer * 1.1; z > CZ_END; z -= CORR.gap * (.8 + Math.random() * .4))
                    spots.push([CX + side * (hw + .9 + layer * 2.6 + Math.random() * .8), z]);
        for (let layer = 0; layer < CORR.rows; layer++)
            for (let x = CX - hw - 1; x <= CX + hw + 1; x += CORR.gap * (.8 + Math.random() * .4))
                spots.push([x, CZ_END - .5 - layer * 1.2]);
        const im = new THREE.InstancedMesh(geo, deadM, spots.length), m4 = new THREE.Object3D();
        spots.forEach(([x, z], i) => {
            const sc = .85 + Math.random() * .7;
            m4.position.set(x, H(x, z) - .1, z);
            m4.rotation.set((Math.random() - .5) * .16, Math.random() * 6.283, (Math.random() - .5) * .16);
            m4.scale.set(sc, sc, sc);
            m4.updateMatrix();
            im.setMatrixAt(i, m4.matrix);
        });
        im.frustumCulled = false;
        scene.add(im);
        HQC.push(im);
        for (const side of [-1, 1])
            for (let z = CZ0 - .5; z > CZ_END; z -= .9)
                GATE_COL.push({ x: CX + side * (hw + .9), z, r: .3 });
        for (let x = CX - hw - .9; x <= CX + hw + .9; x += .9)
            GATE_COL.push({ x, z: CZ_END - .2, r: .3 });
    }
    const CORR_FOG0 = new THREE.Color(FOG), CORR_BLACK = new THREE.Color(0x000000), corrTmp = new THREE.Color();
    function applyCorrDark(k) {
        corrTmp.copy(CORR_FOG0).lerp(CORR_BLACK, k);
        scene.background.copy(corrTmp);
        FOG_OBJ.color.copy(corrTmp);
        FOG_OBJ.near = CONFIG.camera.fogNear + (CORR.darkFogNear - CONFIG.camera.fogNear) * k;
        FOG_OBJ.far = CONFIG.camera.fogFar + (CORR.darkFogFar - CONFIG.camera.fogFar) * k;
        sky.material.uniforms.uDk.value = k;
        const lk = 1 - CORR.darkLight * k;
        hemi.intensity = (hqOn ? .6 : .95) * lk;
        dl.intensity = (hqOn ? 1.9 : 1.1) * lk;
    }
    // ===== PLAYER MODEL: braços, espada, animação =====
    const BL = 1.5, NB = 12;
    for (let i = 0; i < NB; i++) {
        const t = (i + .5) / NB, y = .27 + t * BL, dx = .16 * t * t, th = -Math.atan(.32 * t / BL), w = .1 - .052 * t, sl = BL / NB * 1.06;
        const g = new THREE.Group();
        g.position.set(dx, y, 0);
        g.rotation.z = th;
        sword.add(g);
        bx(w, sl, .02, bladeM, 0, 0, 0, g);
        bx(w * .42, sl, .024, hamonM, w * .28, 0, 0, g);
        bx(.016, sl, .03, spineM, -w * .5, 0, 0, g);
    }
    cy(0, .026, .1, 4, hamonM, .16, .27 + BL + .04, 0, 0, -.21).scale.z = .5;
    cy(.19, .19, .025, 16, goldM, 0, .245, 0);
    cy(.196, .196, .012, 16, goldD, 0, .245, 0);
    cy(.058, .058, .05, 8, goldM, 0, .2, 0);
    cy(.05, .05, .62, 8, redM, 0, -.09, 0).scale.z = .8;
    for (let i = 0; i < 8; i++) {
        const y = -.35 + i * .075;
        bx(.04, .04, .012, redD, 0, y, .042, sword, 0, .785);
        bx(.018, .018, .014, goldM, 0, y, .047, sword, 0, .785);
    }
    cy(.056, .05, .06, 8, goldM, 0, -.42, 0);
    bx(.05, .12, .02, whiteM, .08, .28, .05, sword, .3, .5);
    bx(.04, .1, .02, whiteM, -.07, .3, .05, sword, -.2, -.6);
    const S = 1.25;
    const plate = M(0xf4f1ea), plateD = M(0xd9d6cf), brown = M(0x6b4430), gold = M(0x131316), mail = M(0x4d3626);
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    function jt(p, v, r, m) { const o = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), m); o.position.copy(v); p.add(o); return o; }
    function fist(g, y0) {
        bx(.22, .25, .16, plateD, 0, y0, 0, g);
        for (let i = 0; i < 4; i++) {
            const y = y0 - .09 + i * .06;
            cy(.03, .03, .22, 8, plate, 0, y, .085, 0, Math.PI / 2, g);
            cy(.034, .034, .02, 8, gold, .1, y, .085, 0, Math.PI / 2, g);
            cy(.034, .034, .02, 8, gold, -.1, y, .085, 0, Math.PI / 2, g);
            cy(.033, .033, .016, 8, gold, 0, y, .085, 0, Math.PI / 2, g);
        }
        cy(.026, .024, .16, 8, plate, .02, y0 + .135, .05, 0, Math.PI / 2, g);
        jt(g, V(-.065, y0 + .135, .05), .028, gold);
        bx(.23, .02, .17, gold, 0, y0 + .125, 0, g);
        bx(.23, .02, .17, gold, 0, y0 - .125, 0, g);
    }
    fist(sword, .07);
    fist(sword, -.2);
    function mkArm() {
        const a = new THREE.Group();
        a.scale.setScalar(S);
        cam.add(a);
        const cz = (r1, r2, h, m, z) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, 8), m); o.rotation.x = Math.PI / 2; o.position.z = z; a.add(o); return o; };
        const studs = (z, r, n) => { for (let k = 0; k < n; k++) {
            const an = k / n * 6.283;
            jt(a, V(Math.cos(an) * r, Math.sin(an) * r, z), .016, gold);
        } };
        cz(.14, .2, .24, plateD, .11);
        cz(.206, .206, .03, gold, -.01);
        studs(-.01, .205, 10);
        cz(.15, .15, .025, gold, .24);
        cz(.19, .15, .8, plate, .65);
        for (const z of [.4, .9]) {
            const r = .15 + (z - .25) * .05 + .01;
            cz(r, r, .03, gold, z);
            studs(z, r + .01, 10);
        }
        {
            const r = .15 + (.65 - .25) * .05;
            cz(r + .014, r + .014, .12, gold, .65);
            cz(r + .02, r + .02, .05, plateD, .65);
        }
        bx(.04, .012, .75, gold, 0, .2, .65, a);
        cz(.2, .2, .05, brown, .8);
        bx(.07, .06, .05, silverM, 0, .21, .8, a);
        cz(.14, .14, .4, mail, 1.3);
        const co = new THREE.Mesh(new THREE.SphereGeometry(.25, 10, 8), plate);
        co.position.z = 1.2;
        co.scale.set(1, 1, .8);
        a.add(co);
        cz(.24, .24, .03, gold, 1.07);
        bx(.08, .34, .3, plate, 0, .24, 1.2, a, .4);
        for (let i = 0; i < 5; i++) {
            const z = 1.62 + i * .17, r = .21 + .025 * i;
            cz(r, r, .22, plate, z);
            cz(r + .01, r + .01, .02, gold, z - .1);
            studs(z - .1, r + .012, 10);
        }
        cz(.34, .34, 1.2, plate, 3.0);
        return a;
    }
    const armR = mkArm(), armL = mkArm();
    sword.scale.setScalar(S);
    const pose = [0, 0, 0, 0, 0, 0], PI_ = [.55, -.6, -1.9, -.12, 0, -.2], PW = [.5, .2, -2.3, -.1, .15, -.3], PT = [.3, -.15, -2.9, -1.25, 0, .1], PS = [-.65, -1.0, -1.8, -1.25, 0, .2], PW2 = [-.5, .2, -2.3, -.1, -.15, .3], PS2 = [.65, -1.0, -1.8, -1.25, 0, -.2];
    function mixP(a, b, t) { t = t * t * (3 - 2 * t); for (let i = 0; i < 6; i++)
        pose[i] = a[i] + (b[i] - a[i]) * t; }
    function mixE(a, b, t) { t = 1 - Math.pow(1 - t, 3); for (let i = 0; i < 6; i++)
        pose[i] = a[i] + (b[i] - a[i]) * t; }
    function kf(s, k) { if (s <= k[0][0])
        return k[0][1]; for (let i = 1; i < k.length; i++) {
        if (s <= k[i][0]) {
            let t = (s - k[i - 1][0]) / (k[i][0] - k[i - 1][0]);
            t = t * t * (3 - 2 * t);
            return k[i - 1][1] + (k[i][1] - k[i - 1][1]) * t;
        }
    } return k[k.length - 1][1]; }
    const K_LOW = [[0, 0], [.22, .35], [.42, 1], [.62, 1], [1, 0]], K_YAW = [[0, 0], [.22, -.18], [.42, .3], [.62, .3], [1, 0]], K_ROLL = [[0, 0], [.22, .06], [.42, -.13], [.62, -.13], [1, 0]], K_PIT = [[0, 0], [.22, -.02], [.42, -.1], [.62, -.1], [1, 0]], K_FREE = [[0, 0], [.3, 0], [.46, 1], [.6, 1], [.85, 0], [1, 0]];
    const FREE = new THREE.Vector3(.85, -1.0, -1.5);
    const wr = new THREE.Vector3(), zA = new THREE.Vector3(), xA = new THREE.Vector3(), yA = new THREE.Vector3(), UPV = new THREE.Vector3(0, 1, 0), mm = new THREE.Matrix4();
    const WR = new THREE.Vector3(.13, .07, 0), WL = new THREE.Vector3(-.13, -.2, 0), SHR = new THREE.Vector3(2.2, -2.6, -1.2), SHL = new THREE.Vector3(-1.5, -3.2, -1.0);
    function placeAt(a, w, sh) {
        zA.copy(sh).sub(w).normalize();
        xA.crossVectors(UPV, zA).normalize();
        yA.crossVectors(zA, xA);
        a.position.copy(w);
        a.quaternion.setFromRotationMatrix(mm.makeBasis(xA, yA, zA));
    }
    function place(a, loc, sh) { wr.copy(loc).applyMatrix4(sword.matrix); placeAt(a, wr, sh); }
    cam.add(sword);
    const RN = 90, rp = new Float32Array(RN * 3), rv = new Float32Array(RN * 3), rl = new Float32Array(RN);
    for (let i = 0; i < RN; i++)
        rp[i * 3 + 1] = -100;
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.BufferAttribute(rp, 3));
    const redP = new THREE.Points(rg, new THREE.PointsMaterial({ color: 0xc9747c, size: .09, transparent: true, opacity: .55, depthWrite: false }));
    redP.frustumCulled = false;
    scene.add(redP);
    function burst() {
        const dir = atk ? 1 : -1;
        const sy = Math.sin(yaw), cy_ = Math.cos(yaw), fx = -sy, fz = -cy_, rx = cy_, rz = -sy;
        for (let i = 0; i < RN; i++) {
            const f = 1.5 + Math.random() * 4.5, r = -dir * (Math.random() * 6 - 1.5), u = -1.4 + Math.random() * 2.8;
            rp[i * 3] = cam.position.x + fx * f + rx * r;
            rp[i * 3 + 1] = cam.position.y + u;
            rp[i * 3 + 2] = cam.position.z + fz * f + rz * r;
            const v = 1.5 + Math.random() * 6;
            rv[i * 3] = dir * rx * v + fx * (Math.random() * 4 - 1);
            rv[i * 3 + 1] = Math.random() * 3 - .5;
            rv[i * 3 + 2] = dir * rz * v + fz * (Math.random() * 4 - 1);
            rl[i] = 1.2 + Math.random() * 1.2;
        }
    }
    const keys = {}, joy = { x: 0, y: 0, m: 0 };
    let active = false, drag = false, yaw = 0, pitch = 0, px = 0, pz = 0, py = H(0, 0), vy = 0, grounded = true, eye = CONFIG.player.eyeStand, bob = 0, swing = -1, last = performance.now(), hintT = 0, jumpQ = 0, shiftOn = false, sprint = false;
    // ===== COMBAT/STATE: ataque, dash =====
    let lastW = 0, atk = 1, atkQ = -1e9, cdEnd = 0, slashFx = false, fpsN = 0, fpsStart = performance.now();
    const CD_ATK = CONFIG.combat.attackCooldownMs, BUFFER = CONFIG.combat.attackBufferMs;
    let dashQ = false, dashT = 0, dashCD = 0, dashX = 0, dashZ = 0, dashK = 0;
    const DASH_T = CONFIG.combat.dashTime, DASH_V = CONFIG.combat.dashSpeed, DASH_CD = CONFIG.combat.dashCooldownMs;
    (function () {
        const C = 10, N = 25, c = document.createElement('canvas');
        c.width = c.height = C * N;
        const g = c.getContext('2d');
        for (let y = 0; y < N; y++)
            for (let x = 0; x < N; x++) {
                const v = Math.random() < .14 ? 44 + Math.random() * 30 : 8 + Math.random() * 30, X = x * C, Y = y * C;
                g.fillStyle = 'rgba(' + v + ',' + v + ',' + (v + 5) + ',.55)';
                g.fillRect(X, Y, C, C);
                const r = Math.random();
                if (r < .2) {
                    g.strokeStyle = 'rgba(255,255,255,.09)';
                    g.lineWidth = 1;
                    g.beginPath();
                    for (let k = -C; k < C; k += 3) {
                        g.moveTo(X + k, Y + C);
                        g.lineTo(X + k + C, Y);
                    }
                    g.save();
                    g.beginPath();
                    g.rect(X, Y, C, C);
                    g.clip();
                    g.stroke();
                    g.restore();
                }
                else if (r < .4) {
                    g.fillStyle = 'rgba(255,255,255,.14)';
                    for (let i = 2; i < C; i += 4)
                        for (let j = 2; j < C; j += 4)
                            g.fillRect(X + i, Y + j, 1, 1);
                }
                g.strokeStyle = 'rgba(255,255,255,.035)';
                g.strokeRect(X + .5, Y + .5, C - 1, C - 1);
            }
        document.documentElement.style.setProperty('--tex', 'url(' + c.toDataURL() + ')');
    })();
    (function () {
        const C = 8, N = 12, c = document.createElement('canvas');
        c.width = c.height = C * N;
        const g = c.getContext('2d');
        for (let y = 0; y < N; y++)
            for (let x = 0; x < N; x++) {
                const v = Math.random() < .22 ? 150 + Math.random() * 50 : 215 + Math.random() * 40, X = x * C, Y = y * C;
                g.fillStyle = 'rgb(' + v + ',' + v + ',' + (v + 4) + ')';
                g.fillRect(X, Y, C, C);
                const r = Math.random();
                if (r < .22) {
                    g.save();
                    g.beginPath();
                    g.rect(X, Y, C, C);
                    g.clip();
                    g.strokeStyle = 'rgba(110,112,122,.45)';
                    g.lineWidth = 1;
                    g.beginPath();
                    for (let k = -C; k < C; k += 3) {
                        g.moveTo(X + k, Y + C);
                        g.lineTo(X + k + C, Y);
                    }
                    g.stroke();
                    g.restore();
                }
                else if (r < .42) {
                    g.fillStyle = 'rgba(110,112,122,.55)';
                    for (let i = 2; i < C; i += 4)
                        for (let j = 2; j < C; j += 4)
                            g.fillRect(X + i, Y + j, 1, 1);
                }
            }
        document.documentElement.style.setProperty('--texL', 'url(' + c.toDataURL() + ')');
    })();
    const tip = document.getElementById('tip');
    const dlgEl = document.getElementById('dlg'), dlgTx = document.getElementById('dlgtx');
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
            loadAudio(BGM_URL, b => { bgmBuf = b; bgmStart(); }, 'música');
        }
        catch (e) {
            console.warn('música indisponível', e);
        }
    }
    function bgmPlay() { bgmWant = true; bgmInit(); if (!actx)
        return; const r = actx.resume(); if (r && r.catch)
        r.catch(() => { }); bgmStart(); }
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
        const mE = document.getElementById('mus'), fE = document.getElementById('sfx'), uE = document.getElementById('ui'), mV = document.getElementById('musV'), fV = document.getElementById('sfxV'), uV = document.getElementById('uiV');
        const show = () => { sV.textContent = sens.toFixed(1) + 'x'; vV.textContent = Math.round(volMaster * 100) + '%'; mV.textContent = Math.round(volMus * 100) + '%'; fV.textContent = Math.round(volSfx * 100) + '%'; uV.textContent = Math.round(volUi * 100) + '%'; };
        const save = () => { try {
            localStorage.setItem(CFG_KEY, JSON.stringify({ sens, vol: volMaster, pixel: pixelOn, perf: perfOn, hq: hqOn, mus: volMus, sfx: volSfx, ui: volUi }));
        }
        catch (e) { } };
        sE.value = sens;
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
            hemi.intensity = hqOn ? .6 : .95;
            dl.intensity = hqOn ? 1.9 : 1.1;
            fill.visible = hqOn;
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
                setEnv(hqOn);
                scene.traverse(o => { if (o.material)
                    (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.needsUpdate = true; }); });
            }
        };
        applyHQ(true);
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
        document.getElementById('menuBtn').addEventListener('click', () => {
            setFly(false);
            closeDlg();
            px = 0;
            pz = 0;
            py = H(0, 0);
            vy = 0;
            grounded = true;
            yaw = 0;
            pitch = 0;
            eye = 2.6;
            bob = 0;
            swing = -1;
            jumpQ = 0;
            sprint = false;
            shiftOn = false;
            for (const k in keys)
                keys[k] = 0;
            atkQ = -1e9;
            cdEnd = 0;
            paused = false;
            hint.classList.remove('on');
            document.getElementById('ttl').textContent = TTL0;
            document.getElementById('sub').textContent = SUB0;
            document.getElementById('go').textContent = GO0;
            ov.classList.add('first');
            try {
                const mv = document.getElementById('menuvid');
                if (mv)
                    mv.play();
            }
            catch (e) { }
        });
        cfg.addEventListener('mousedown', e => { if (e.target === cfg)
            window.__closeCfg(); });
    }
    document.addEventListener('pointerlockchange', () => { if (active && document.pointerLockElement !== cv)
        pause(); });
    const mlook = document.getElementById('mlook'), mjz = document.getElementById('mjz'), mjb = document.getElementById('mjb'), mjt = document.getElementById('mjt');
    // ===== MOBILE UI: joystick e botões de toque =====
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
        mB.inter.classList.toggle('show', !!nearK && !dlgOn && !fly);
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
        btn(mB.inter, () => { if (active && (nearK || dlgOn))
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
    // ===== MAIN LOOP: tick (física, câmera, render) =====
    function tick(now) {
        requestAnimationFrame(tick);
        if (IS_MOBILE) {
            if (now - lastFrameT < 15.2)
                return;
            lastFrameT = now;
        }
        if (IS_MOBILE)
            mobileFrame();
        const dt = Math.min(.05, (now - last) / 1000);
        last = now;
        grassTime.value = now * .001;
        let moving = false, crouch = false;
        if (active) {
            crouch = !!(keys.KeyC || keys.ControlLeft || keys.ControlRight);
            if (crouch)
                sprint = false;
            const run = keys.ShiftLeft || keys.ShiftRight || shiftOn || sprint;
            if (jumpQ > 0)
                jumpQ -= dt;
            const sp = crouch ? CONFIG.player.crouch : run ? CONFIG.player.run : CONFIG.player.walk;
            let fx = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
            let sx = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
            if (dlgOn || fly) {
                fx = 0;
                sx = 0;
            }
            let l = Math.hypot(fx, sx), jm = 1;
            if (joy.m > 0 && !dlgOn && !fly) {
                fx = joy.y;
                sx = joy.x;
                l = Math.hypot(fx, sx);
                jm = joy.m;
            }
            moving = l > 0;
            if (l) {
                fx /= l;
                sx /= l;
            }
            const s = Math.sin(yaw), c = Math.cos(yaw);
            if (dashQ) {
                dashQ = false;
                if (!dlgOn && !fly && now >= dashCD && dashT <= 0) {
                    const df = l ? fx : 1, ds = l ? sx : 0;
                    dashX = -s * df + c * ds;
                    dashZ = -c * df - s * ds;
                    dashT = DASH_T;
                    dashCD = now + DASH_CD;
                    dashPlay();
                }
            }
            if (dashT > 0) {
                const dist = DASH_V * Math.min(dt, dashT), n = Math.max(1, Math.ceil(dist / .4));
                dashT -= dt;
                for (let q = 0; q < n; q++) {
                    px += dashX * dist / n;
                    pz += dashZ * dist / n;
                    collideStatue();
                    collideTrees();
                }
                moving = false;
            }
            else {
                px += (-s * fx + c * sx) * sp * jm * dt;
                pz += (-c * fx - s * sx) * sp * jm * dt;
            }
            {
                const bx_ = px - ROAD.x, bz_ = pz - ROAD.z, bd_ = Math.hypot(bx_, bz_), bm_ = MAP_R + 4;
                if (bd_ > bm_) {
                    px = ROAD.x + bx_ / bd_ * bm_;
                    pz = ROAD.z + bz_ / bd_ * bm_;
                }
            }
            collideStatue();
            collideTrees();
            if (fly) {
                nearK = false;
                const ff = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0), ss = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0), uu = (keys.Space ? 1 : 0) - (keys.KeyC || keys.ControlLeft || keys.ControlRight ? 1 : 0);
                const fs = run ? CONFIG.player.flyRunSpeed : CONFIG.player.flySpeed, sy = Math.sin(yaw), cy = Math.cos(yaw), sp2 = Math.sin(pitch), cp = Math.cos(pitch);
                fcx += (-sy * cp * ff + cy * ss) * fs * dt;
                fcy += (sp2 * ff + uu) * fs * dt;
                fcz += (-cy * cp * ff - sy * ss) * fs * dt;
            }
            const gh = H(px, pz);
            if ((keys.Space || jumpQ > 0) && grounded && !crouch && !dlgOn && !fly) {
                vy = CONFIG.player.jumpSpeed;
                grounded = false;
                jumpQ = 0;
            }
            if (!grounded) {
                vy -= CONFIG.player.gravity * dt;
                py += vy * dt;
                if (py <= gh) {
                    py = gh;
                    vy = 0;
                    grounded = true;
                }
            }
            else
                py = gh;
            if (moving && grounded)
                bob += dt * sp * CONFIG.player.bobFactor;
            stepSet(moving && grounded ? (run && !crouch ? 'run' : 'walk') : null);
            if (hintT > 0) {
                hintT -= dt;
                if (hintT <= 0)
                    hint.classList.remove('on');
            }
        }
        if (!active)
            stepSet(null);
        leafFx(dt);
        if (gateOpening && gateT < 1) {
            gateT = Math.min(1, gateT + dt / CONFIG.world.gateOpenTime);
            const e = gateT * gateT * (3 - 2 * gateT);
            const ang = 1.45 * e;
            for (const L of GATE_LEAVES)
                L.pv.rotation.y = L.dir * ang;
            if (GATE_INFO) {
                if (GATE_DOOR_COL.length) {
                    for (const o of GATE_DOOR_COL) {
                        const i = GATE_COL.indexOf(o);
                        if (i >= 0)
                            GATE_COL.splice(i, 1);
                    }
                    GATE_DOOR_COL.length = 0;
                    for (const lf of GATE_LEAVES)
                        for (let d = .3; d <= GATE_INFO.L; d += .7) {
                            const o = { x: 0, z: 0, r: .25, d, dir: lf.dir, px: lf.pv.position.x };
                            GATE_LEAF_COL.push(o);
                            GATE_COL.push(o);
                        }
                }
                for (const o of GATE_LEAF_COL) {
                    const lx = o.px - o.dir * o.d * Math.cos(ang), lz = o.d * Math.sin(ang);
                    o.x = GATE_INFO.gx + lx * GATE_INFO.ca + lz * GATE_INFO.sa;
                    o.z = GATE_INFO.gz - lx * GATE_INFO.sa + lz * GATE_INFO.ca;
                }
            }
        }
        {
            const inC = pz < CZ0 && Math.abs(px - CX) < ROAD.hw + 6, tgt = inC ? Math.min(1, (CZ0 - pz) / CORR.darkLen) : 0;
            corrDark += (tgt - corrDark) * Math.min(1, dt * 2.5);
            if (tgt === 0 && corrDark < .003)
                corrDark = 0;
            if (corrDark > 0 || corrDarkLast > 0)
                applyCorrDark(corrDark);
            corrDarkLast = corrDark;
            if (!corrEndDone && Math.hypot(px - CORR_END.x, pz - CORR_END.z) < CORR.endRadius) {
                corrEndDone = true;
                onCorridorEnd();
            }
        }
        tip.classList.toggle('on', active && nearK && !dlgOn && !fly);
        if (dlgOn && dlgN < DLG_TEXT.length) {
            dlgAcc += dt * 1000;
            const n = Math.floor(dlgAcc / 45);
            if (n > 0) {
                dlgAcc -= n * 45;
                dlgN = Math.min(DLG_TEXT.length, dlgN + n);
                dlgSet(DLG_TEXT.slice(0, dlgN));
                keyClick(DLG_TEXT[dlgN - 1]);
                if (dlgN >= DLG_TEXT.length)
                    dlgEl.classList.add('done');
            }
        }
        eye += ((crouch ? CONFIG.player.eyeCrouch : CONFIG.player.eyeStand) - eye) * Math.min(1, dt * CONFIG.player.eyeLerp);
        const b = moving && grounded ? Math.sin(bob) : 0;
        if (swing < 0) {
            if (atkQ > 0 && now - atkQ < BUFFER && now >= cdEnd && active && !dlgOn && !fly) {
                swing = 0;
                atk ^= 1;
                swordPlay(atk);
                atkQ = -1e9;
            }
        }
        if (swing >= 0) {
            swing += dt * 1.9;
            if (swing >= .75) {
                swing = -1;
                cdEnd = now + CD_ATK;
            }
        }
        const sw = swing, sk = sw >= 0 ? sw : 0;
        if (fly)
            cam.position.set(fcx, fcy, fcz);
        else
            cam.position.set(px, py + eye, pz);
        cam.rotation.set(pitch, yaw, 0);
        dashK += ((dashT > 0 ? 1 : 0) - dashK) * Math.min(1, dt * 14);
        {
            const fv = CONFIG.camera.fov;
            if (Math.abs(cam.fov - fv) > .01) {
                cam.fov = fv;
                cam.updateProjectionMatrix();
            }
        }
        if (sw < .3)
            slashFx = false;
        else if (!slashFx && sw >= .34) {
            slashFx = true;
            burst();
        }
        const t = now / 1000, cw = atk ? PW2 : PW, cs = atk ? PS2 : PS;
        if (sw < 0) {
            for (let i = 0; i < 6; i++)
                pose[i] = PI_[i];
            pose[0] += b * .008;
            pose[1] += Math.abs(b) * .015 + Math.sin(t * 1.6) * .006;
        }
        else if (sw < .18)
            mixP(PI_, cw, sw / .18);
        else if (sw < .55) {
            const u = (sw - .18) / .37;
            mixE(cw, cs, u);
            const k = Math.sin(Math.PI * Math.min(1, u * 1.15));
            pose[2] -= .9 * k;
            pose[3] -= .7 * k;
        }
        else
            mixP(cs, PI_, (sw - .55) / .2);
        const hw = -pose[2] * .7265 * cam.aspect;
        sword.position.set(pose[0] * hw, pose[1], pose[2]);
        sword.rotation.set(pose[3], pose[4], pose[5]);
        sword.updateMatrix();
        place(armR, WR, SHR);
        wr.copy(WL).applyMatrix4(sword.matrix);
        placeAt(armL, wr, SHL);
        sky.position.copy(cam.position);
        sky.material.uniforms.t.value = t;
        const pa = pg.attributes.position;
        if (!perfOn)
            for (let i = 0; i < PN; i++) {
                let x = pa.getX(i) + dt * 1.4, y = pa.getY(i) - dt * .35, z = pa.getZ(i) + Math.sin(t + i) * dt * .4;
                const cx = cam.position.x, cz = cam.position.z;
                if (x - cx > 20)
                    x -= 40;
                if (x - cx < -20)
                    x += 40;
                if (z - cz > 20)
                    z -= 40;
                if (z - cz < -20)
                    z += 40;
                if (y < H(x, z) + .2)
                    y += 14;
                pa.setXYZ(i, x, y, z);
            }
        if (!perfOn)
            pa.needsUpdate = true;
        for (let i = 0; i < RN; i++) {
            if (rl[i] <= 0)
                continue;
            rl[i] -= dt;
            rv[i * 3 + 1] -= 6 * dt;
            rp[i * 3] += rv[i * 3] * dt;
            rp[i * 3 + 1] += rv[i * 3 + 1] * dt;
            rp[i * 3 + 2] += rv[i * 3 + 2] * dt;
            const g = H(rp[i * 3], rp[i * 3 + 2]) + .05;
            if (rp[i * 3 + 1] < g) {
                rp[i * 3 + 1] = g;
                rv[i * 3] *= .8;
                rv[i * 3 + 1] = 0;
                rv[i * 3 + 2] *= .8;
            }
            if (rl[i] <= 0)
                rp[i * 3 + 1] = -100;
        }
        rg.attributes.position.needsUpdate = true;
        if (hqOn)
            sunFollow();
        cam.layers.set(0);
        renderer.render(scene, cam);
        {
            const ac = renderer.autoClearColor, ad = renderer.autoClearDepth, su = renderer.shadowMap.autoUpdate;
            renderer.autoClearColor = false;
            renderer.autoClearDepth = false;
            renderer.shadowMap.autoUpdate = false;
            renderer.clearDepth();
            cam.layers.set(1);
            renderer.render(scene, cam);
            cam.layers.set(0);
            renderer.autoClearColor = ac;
            renderer.autoClearDepth = ad;
            renderer.shadowMap.autoUpdate = su;
        }
        fpsN++;
        const nowS = performance.now();
        if (nowS - fpsStart >= 500) {
            if (cv.clientWidth !== lastCW || cv.clientHeight !== lastCH)
                size();
            fpsEl.textContent = 'FPS ' + Math.round(fpsN * 1000 / (nowS - fpsStart));
            fpsN = 0;
            fpsStart = nowS;
        }
    }
    requestAnimationFrame(tick);
})();
