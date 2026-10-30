// ARQUIVO: CORRIDOR (corredor escuro de árvores mortas).
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
