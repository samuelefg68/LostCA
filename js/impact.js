// IMPACT: golpe em árvore/pedra/portão: som, tremor, folhas
    // ===== IMPACT: detecção do golpe, tremor da árvore e folhas =====
    const IMP = CONFIG.impact, IMP_SHAKES = [], IMP_N = 60;
    const impP = new Float32Array(IMP_N * 3), impV = new Float32Array(IMP_N * 3), impL = new Float32Array(IMP_N), impPh = new Float32Array(IMP_N);
    for (let i = 0; i < IMP_N; i++)
        impP[i * 3 + 1] = -100;
    const impGeo = new THREE.BufferGeometry();
    impGeo.setAttribute('position', new THREE.BufferAttribute(impP, 3));
    const impPts = new THREE.Points(impGeo, new THREE.PointsMaterial({ color: IMP.leafColor, size: IMP.leafSize, depthWrite: false }));
    impPts.frustumCulled = false;
    scene.add(impPts);
    const impQ = new THREE.Quaternion(), impAx = new THREE.Vector3(), impR = new THREE.Matrix4(), impA = new THREE.Matrix4(), impB = new THREE.Matrix4(), impM = new THREE.Matrix4();
    function impactHit() {
        const fx = -Math.sin(yaw), fz = -Math.cos(yaw), reach = IMP.reach, pad = IMP.pad;
        const trees = [], gates = [];
        for (let i = 0; i < TREE_COL.length; i++) {
            const T = TREE_COL[i], dx = T.x - px, dz = T.z - pz, R = reach + T.r + pad;
            if (dx * dx + dz * dz <= R * R)
                trees.push(T);
        }
        for (let i = 0; i < GATE_COL.length; i++) {
            const T = GATE_COL[i];
            if (T.g !== 1)
                continue;
            const dx = T.x - px, dz = T.z - pz, R = reach + T.r + pad;
            if (dx * dx + dz * dz <= R * R)
                gates.push(T);
        }
        const kx = KC.x - px, kz = KC.z - pz, KR = reach + pad + Math.hypot(KC.hx, Math.max(Math.abs(KC.z0), Math.abs(KC.z1)));
        const stoneNear = kx * kx + kz * kz <= KR * KR;
        for (let d = .5; d <= reach + 1e-6; d += .4) {
            const x = px + fx * d, z = pz + fz * d;
            for (const T of trees)
                if (Math.hypot(x - T.x, z - T.z) < T.r + pad) {
                    impactPlay('tree');
                    treeShake(T, fx, fz);
                    leafBurst(T);
                    return;
                }
            if (stoneNear) {
                const dx = x - KC.x, dz = z - KC.z, lx = dx * KC.c - dz * KC.s, lz = dx * KC.s + dz * KC.c;
                if (Math.abs(lx) <= KC.hx + pad && lz >= KC.z0 - pad && lz <= KC.z1 + pad) {
                    impactPlay('stone');
                    return;
                }
            }
            for (const T of gates)
                if (Math.hypot(x - T.x, z - T.z) < T.r + pad) {
                    impactPlay('gate');
                    if (T.go)
                        gateShake(T.go, fx, fz);
                    return;
                }
        }
    }
    function treeShake(T, fx, fz) {
        for (const s of IMP_SHAKES)
            if (s.T === T) {
                s.t = 0;
                return;
            }
        if (T.g === undefined && T.i !== undefined)
            T.o = TREE_INST.map(m => { const mt = new THREE.Matrix4(); m.getMatrixAt(T.i, mt); return mt; });
        IMP_SHAKES.push({ T, t: 0, ax: fz, az: -fx, amp: IMP.shakeAmp });
    }
    function gateShake(G, fx, fz) {
        for (const s of IMP_SHAKES)
            if (s.T === G) {
                s.t = 0;
                return;
            }
        G.qm = G.m.quaternion.clone();
        G.qg = G.gg ? G.gg.quaternion.clone() : null;
        IMP_SHAKES.push({ T: G, t: 0, ax: fz, az: -fx, amp: IMP.gateShakeAmp });
    }
    function impUpload(T) {
        for (const m of TREE_INST) {
            const u = m.instanceMatrix;
            u.updateRange.offset = T.i * 16;
            u.updateRange.count = 16;
            u.needsUpdate = true;
        }
    }
    function impactRestore(T) {
        if (T.m) {
            T.m.quaternion.copy(T.qm);
            if (T.gg)
                T.gg.quaternion.copy(T.qg);
            return;
        }
        if (T.g) {
            T.g.quaternion.copy(T.qy);
            return;
        }
        for (let k = 0; k < TREE_INST.length; k++)
            TREE_INST[k].setMatrixAt(T.i, T.o[k]);
        impUpload(T);
    }
    function impactApply(s, a) {
        const T = s.T;
        impAx.set(s.ax, 0, s.az);
        if (T.m) {
            impQ.setFromAxisAngle(impAx, a);
            T.m.quaternion.copy(impQ).multiply(T.qm);
            if (T.gg)
                T.gg.quaternion.copy(impQ).multiply(T.qg);
            return;
        }
        if (T.g) {
            impQ.setFromAxisAngle(impAx, a);
            T.g.quaternion.copy(impQ).multiply(T.qy);
            return;
        }
        impR.makeRotationAxis(impAx, a);
        impA.makeTranslation(T.x, T.y, T.z);
        impB.makeTranslation(-T.x, -T.y, -T.z);
        for (let k = 0; k < TREE_INST.length; k++) {
            impM.copy(impA).multiply(impR).multiply(impB).multiply(T.o[k]);
            TREE_INST[k].setMatrixAt(T.i, impM);
        }
        impUpload(T);
    }
    function leafBurst(T) {
        if (perfOn)
            return;
        const rad = 2.2 * T.th / 18;
        let c = 0;
        for (let i = 0; i < IMP_N && c < IMP.leaves; i++) {
            if (impL[i] > 0)
                continue;
            const a = Math.random() * 6.2832, r = Math.sqrt(Math.random()) * rad;
            impP[i * 3] = T.x + Math.cos(a) * r;
            impP[i * 3 + 1] = T.y + T.th * (.3 + Math.random() * .55);
            impP[i * 3 + 2] = T.z + Math.sin(a) * r;
            impV[i * 3 + 1] = -2 * (.8 + Math.random() * .4);
            impPh[i] = Math.random() * 6.2832;
            impL[i] = IMP.leafLife * (.8 + Math.random() * .4);
            c++;
        }
    }
    function impactUpdate(dt) {
        for (let i = IMP_SHAKES.length - 1; i >= 0; i--) {
            const s = IMP_SHAKES[i];
            s.t += dt;
            if (s.t >= IMP.shakeTime) {
                impactRestore(s.T);
                IMP_SHAKES.splice(i, 1);
            }
            else
                impactApply(s, s.amp * Math.sin(s.t * IMP.shakeFreq * 6.2832) * (1 - s.t / IMP.shakeTime));
        }
        let alive = false;
        for (let i = 0; i < IMP_N; i++) {
            if (impL[i] <= 0)
                continue;
            alive = true;
            impL[i] -= dt;
            if (impL[i] <= 0) {
                impP[i * 3 + 1] = -100;
                continue;
            }
            const g = H(impP[i * 3], impP[i * 3 + 2]) + .05;
            if (impP[i * 3 + 1] > g) {
                impPh[i] += dt * 3;
                impP[i * 3] += Math.sin(impPh[i]) * .8 * dt;
                impP[i * 3 + 2] += Math.cos(impPh[i] * .8 + i) * .8 * dt;
                impP[i * 3 + 1] = Math.max(g, impP[i * 3 + 1] + impV[i * 3 + 1] * dt);
            }
        }
        if (alive)
            impGeo.attributes.position.needsUpdate = true;
    }