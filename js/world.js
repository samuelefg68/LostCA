// ARQUIVO: WORLD (terreno, estrada, grama, flores, portões).
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
