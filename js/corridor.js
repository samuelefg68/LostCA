// ARQUIVO: CORRIDOR (corredor escuro de árvores mortas).
    // ===== CORRIDOR: corredor escuro de árvores mortas atrás do portão =====
    const CORR = CONFIG.corridor, CX = ROAD.x, CZ0 = GATE_BEHIND.end[1] + .5, CZ_WALL = CZ0 - CORR.wallLen, CORR_END = { x: CX, z: CZ_WALL };
    let corrDark = 0, corrDarkLast = 0, corrEndDone = false;
    function onCorridorEnd() {
        // Dispara 1x (corrEndDone) quando o jogador encosta na parede do fim (main.js, tick): abre o diálogo story.walkText; ao fechar, dialogue.js (onWalkEnd) faz o fade e teleporta ao início.
        startDlg(WALK_LINES);
    }
    {
        const deadM = trunkM; // mesmo material/textura (barkTex) do tronco dos pinheiros normais (trees.js)
        // merge local que preserva UV (necessário para a textura); não depende de mergeGeos
        const mergeUV = gs => {
            const P = [], N = [], U = [], I = [];
            let off = 0;
            for (const g of gs) {
                const pa = g.attributes.position.array, na = g.attributes.normal.array, ua = g.attributes.uv.array, ia = g.index.array;
                for (let i = 0; i < pa.length; i++) { P.push(pa[i]); N.push(na[i]); }
                for (let i = 0; i < ua.length; i++) U.push(ua[i]);
                for (let i = 0; i < ia.length; i++) I.push(ia[i] + off);
                off += pa.length / 3;
            }
            const r = new THREE.BufferGeometry();
            r.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
            r.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
            r.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
            r.setIndex(I);
            return r;
        };
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
        const geo = mergeUV(parts);
        for (const g of parts)
            g.dispose();
        // dispersão: árvores mortas espalhadas numa faixa larga ao redor do corredor (mais densas perto das paredes)
        const spots = [], hw = ROAD.hw, SW = CORR.scatterWidth, x0 = hw + 1.2, Lc = CZ0 - 1 - CZ_END, endW = 2 * (x0 + SW);
        const NS = Math.round(CORR.scatterCount * (IS_MOBILE ? CORR.scatterMobileFactor : 1));
        const aSide = Lc * SW, aEnd = endW * SW, aTot = 2 * aSide + aEnd;
        for (let i = 0; i < NS; i++) {
            const r = Math.random() * aTot, e = Math.pow(Math.random(), 1.5) * SW;
            if (r < 2 * aSide)
                spots.push([CX + (r < aSide ? -1 : 1) * (x0 + e), CZ0 - 1 - Math.random() * Lc]);
            else
                spots.push([CX + (Math.random() - .5) * endW, CZ_END - .5 - e]);
        }
        // descarta as que cairiam fora do chão (terreno quadrado ±WH, de world.js), com folga corridor.edgeMargin
        const LIM = WH - CORR.edgeMargin;
        for (let i = spots.length - 1; i >= 0; i--)
            if (Math.abs(spots[i][0]) > LIM || Math.abs(spots[i][1]) > LIM)
                spots.splice(i, 1);
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
    }
    // ===== CORRIDOR DARK BOX: volume INVISÍVEL; ao entrar nele a tela toda recebe a cor do retângulo, com opacidade crescente do portão ao fim =====
    const CORR_BOX_EL = (() => {
        const el = document.createElement('div');
        el.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:1;opacity:0;transition:opacity .25s;background:' + CORR.boxColor;
        document.body.appendChild(el);
        return el;
    })();
    // posição do jogador dentro do volume escuro: 0 no portão (CZ0) -> 1 na parede do fim (CZ_WALL); -1 se estiver fora
    function corrBoxT() {
        try {
            const t = (CZ0 - pz) / (CZ0 - CZ_WALL);
            if (Math.abs(px - CX) <= CORR.boxW / 2 && t >= 0 && t <= 1 && py <= H(px, pz) + CORR.boxH)
                return t;
        }
        catch (e) { }
        return -1;
    }
    let corrBoxLast = -1;
    function corrBoxUpdate() {
        const t = corrBoxT();
        const a = t >= 0 ? CORR.boxAlpha + (1 - CORR.boxAlpha) * t : 0;
        if (a !== corrBoxLast) { // só escreve no DOM quando o valor muda (antes escrevia todo frame)
            corrBoxLast = a;
            CORR_BOX_EL.style.opacity = a;
        }
        requestAnimationFrame(corrBoxUpdate);
    }
    requestAnimationFrame(corrBoxUpdate);
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