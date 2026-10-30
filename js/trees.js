// ARQUIVO: TREES (pinheiros e floresta).
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
        TREE_COL.push({ x, z, r: .6, th, y: H(x, z), g, qy: g.quaternion.clone() });
    };
    const INNER = [];
    const TREE_INST = [];
    let GATE_SWING = null;
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
            const gobj = { m, gg: null };
            for (const g of list)
                g.dispose();
            if (swing) {
                const gg = new THREE.Group();
                gg.position.set(gx, H(gx, gz) - .05, gz);
                gg.rotation.y = a;
                gobj.gg = gg;
                GATE_SWING = gobj;
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
            const ca = Math.cos(a), sa = Math.sin(a), add = (lx, lz, r) => { const o = { x: gx + lx * ca + lz * sa, z: gz - lx * sa + lz * ca, r, g:1, go: gobj }; GATE_COL.push(o); return o; };
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
            const idx = n;
            n++;
            return { y, w, i: idx };
        };
        for (const [x, z] of INNER) {
            const th = 14 + Math.random() * 10, p = put(x, z, th);
            TREE_COL.push({ x, z, r: .6, th, y: p.y, i: p.i });
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
                TREE_COL.push({ x: c.x, z: c.z, r: .55 * p.w, th: c.th, y: p.y, i: p.i });
                nCol++;
            }
        }
        for (const mm of [trI, ...coI]) {
            mm.frustumCulled = false;
            scene.add(mm);
        }
        TREE_INST.push(trI, ...coI);
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