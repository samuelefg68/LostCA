// ARQUIVO: CUBE (mapa final: sala menor + corredor de tijolos vistos por dentro, sem céu; separado do mapa antigo e da ponte).
    // ===== CUBE: sala menor, corredor (tapete, quadros, lustres), luz e limites da área =====
    // Carregado depois de bridge.js e ANTES de player.js. O jogador chega aqui pelo evento dos 200 m da ponte (bridge.js chama enterCube() no pico do preto).
    const CUBG = CONFIG.cube, CUBL = CUBG.light;
    const CUBE_X = CUBG.x, CUBE_Z = CUBG.z, CUBE_Y = 0, CUBE_S = CUBG.size; // chão em y = 0; CUBE_S = aresta de referência (a sala menor tem CUBE_S / inner.div)
    // SALA MENOR: base (size/div) x (size/div), altura inner.heightK x altura do olho em pé, ao LADO do corredor, à esquerda (-x): a parede direita da sala (+x) encosta na parede esquerda do corredor, e o fundo da sala (+z)
    // fica em z = CUBE_Z, onde o corredor começa; a sala se estende de CUBE_Z a CUBE_Z - s (olhando para -z). Paredes de `wall` m. A abertura (`door.w` x `door.h` m) fica no MEIO da
    // parede DIREITA, dando para o corredor: só passa agachado. Piso próprio (tijolos); `boxes` = colisão (AABB em XZ + faixa em y).
    const CUBI = CUBG.inner;
    const CUBE_ROOM = (() => {
        const s = CUBE_S / CUBI.div, w = CUBI.wall, dw = CUBI.door.w, dh = CUBI.door.h, y0 = CUBE_Y, rh = CONFIG.player.eyeStand * CUBI.heightK, yw = CUBE_Y + rh - w; // rh = altura da sala (heightK x altura do olho em pé)
        const x1 = CUBE_X - CUBG.corridor.width / 2, x0 = x1 - s, z1 = CUBE_Z, z0 = z1 - s, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
        const boxes = [
            { x0, x1: x0 + w, z0, z1, y0, y1: yw },                                  // parede esquerda (-x)
            { x0: x1 - w, x1, z0, z1: cz - dw / 2, y0, y1: yw },                     // parede direita, antes da abertura (lado -z)
            { x0: x1 - w, x1, z0: cz + dw / 2, z1, y0, y1: yw },                     // parede direita, depois da abertura (lado +z)
            { x0: x1 - w, x1, z0: cz - dw / 2, z1: cz + dw / 2, y0: y0 + dh, y1: yw }, // verga sobre a abertura (só bloqueia quem está alto demais)
            { x0: x0 + w, x1: x1 - w, z0, z1: z0 + w, y0, y1: yw },                  // parede da frente (-z)
            { x0: x0 + w, x1: x1 - w, z0: z1 - w, z1, y0, y1: yw }                   // parede de trás (+z)
        ];
        return { s, w, x0, x1, z0, z1, cx, cz, top: CUBE_Y + rh, boxes };
    })();
    // CORREDOR: começa em z = CUBE_Z (CUBE_COR_Z0, com uma parede de tijolos fechando o começo) e segue para -z até CUBE_COR_Z1 (fim fechado). Largura/comprimento fixos no CONFIG (os da ponte: 8,8 x 238);
    // altura = heightK x altura do olho em pé. CUBE_TOP = teto do corredor.
    const CUBC = CUBG.corridor, CUBE_CORW = CUBC.width, CUBE_CORL = CUBC.length, CUBE_CORH = CONFIG.player.eyeStand * CUBC.heightK;
    const CUBE_COR_Z0 = CUBE_Z, CUBE_COR_Z1 = CUBE_COR_Z0 - CUBE_CORL, CUBE_TOP = CUBE_Y + CUBE_CORH;
    // z de cada lustre (de CUBE_COR_Z0 para -z): um a cada chandelier.gap m, o 1º a chandelier.start m do início
    const CUBE_LAMP_Z = [];
    for (let z = CUBE_COR_Z0 - CUBC.chandelier.start; z >= CUBE_COR_Z1 + CUBC.chandelier.endMargin; z -= CUBC.chandelier.gap)
        CUBE_LAMP_Z.push(z);
    let inCube = false;
    const CUBE_FRAMES = []; // centro de cada quadro {x, z, s} (s = +1 parede direita, -1 esquerda), usado pela interação (nearF) em cubeClamp()
    const CUBE = new THREE.Group();
    CUBE.visible = false; // só aparece em enterCube()
    scene.add(CUBE);
    {
        // texturas (mesmo filtro do chão; pixTex permite alternar pixelado nas configurações). Sem arquivo -> cor sólida.
        // Phong (luz POR PIXEL): o Lambert do three r128 calcula luz por vértice e as faces gigantes do corredor ficariam sem o brilho da tocha e dos lustres.
        const mkMat = extra => new THREE.MeshPhongMaterial(Object.assign({ color: 0xffffff, specular: 0x000000, shininess: 0, side: THREE.FrontSide }, extra));
        const matB = mkMat(), matK = mkMat(), matF = mkMat({ alphaTest: .5, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }); // tijolos, tapete, quadros
        const loadTex = (url, mat, fb) => {
            const t = new THREE.TextureLoader().load(url, undefined, undefined, () => { mat.map = null; mat.color.setHex(fb); mat.needsUpdate = true; });
            t.wrapS = t.wrapT = THREE.RepeatWrapping;
            t.magFilter = pixelOn ? THREE.NearestFilter : THREE.LinearFilter;
            t.minFilter = pixelOn ? THREE.NearestMipmapNearestFilter : THREE.LinearMipmapLinearFilter;
            pixTex.push(t);
            mat.map = t;
        };
        loadTex(CONFIG.paths.bricks, matB, CUBG.fallbackBricks);
        loadTex(CONFIG.paths.carpet, matK, CUBC.fallbackCarpet);
        loadTex(CONFIG.paths.frame, matF, CUBC.frame.fallback);
        // plano com UV proporcional ao tamanho (a textura se repete a cada `tile` m); rx/ry = rotação que vira a face para dentro
        const mkPlane = (w, h, mat, tile, rx, ry, x, y, z) => {
            const g = new THREE.PlaneGeometry(w, h), u = g.attributes.uv;
            for (let i = 0; i < u.count; i++)
                u.setXY(i, u.getX(i) * w / tile, u.getY(i) * h / tile);
            const m = new THREE.Mesh(g, mat);
            m.rotation.set(rx, ry, 0);
            m.position.set(x, y, z);
            CUBE.add(m);
        };
        // corredor: chão = tapete; paredes, teto e fim = tijolos (cada plano com a normal virada para o interior)
        const hw = CUBE_CORW / 2, zc = CUBE_COR_Z0 - CUBE_CORL / 2, hy = CUBE_Y + CUBE_CORH / 2;
        mkPlane(CUBE_CORW, CUBE_CORL, matK, CUBC.carpetTile, -Math.PI / 2, 0, CUBE_X, CUBE_Y, zc);
        mkPlane(CUBE_CORW, CUBE_CORL, matB, CUBG.tile, Math.PI / 2, 0, CUBE_X, CUBE_Y + CUBE_CORH, zc);
        // parede esquerda só do fim da sala até o fim do corredor: no trecho da sala, a parede DIREITA da sala é a parede do corredor (desenhar as duas daria z-fighting)
        mkPlane(CUBE_ROOM.z0 - CUBE_COR_Z1, CUBE_CORH, matB, CUBG.tile, 0, Math.PI / 2, CUBE_X - hw, hy, (CUBE_ROOM.z0 + CUBE_COR_Z1) / 2);
        mkPlane(CUBE_CORW, CUBE_CORH, matB, CUBG.tile, 0, Math.PI, CUBE_X, hy, CUBE_COR_Z0); // parede do começo (normal para -z)
        // a sala é mais baixa que o corredor: faixa de tijolos fechando a parede esquerda do corredor acima do teto da sala (no trecho da sala)
        if (CUBE_CORH > CUBE_ROOM.top - CUBE_Y)
            mkPlane(CUBE_ROOM.s, CUBE_CORH - (CUBE_ROOM.top - CUBE_Y), matB, CUBG.tile, 0, Math.PI / 2, CUBE_X - hw, (CUBE_ROOM.top + CUBE_Y + CUBE_CORH) / 2, CUBE_ROOM.cz);
        mkPlane(CUBE_CORL, CUBE_CORH, matB, CUBG.tile, 0, -Math.PI / 2, CUBE_X + hw, hy, zc);
        mkPlane(CUBE_CORW, CUBE_CORH, matB, CUBG.tile, 0, 0, CUBE_X, hy, CUBE_COR_Z1);
        // sala menor: piso de tijolos + uma malha por caixa (paredes + teto), com UV proporcional ao tamanho (tijolo a cada CUBG.tile m)
        const R = CUBE_ROOM;
        mkPlane(R.s, R.s, matB, CUBG.tile, -Math.PI / 2, 0, R.cx, CUBE_Y, R.cz);
        for (const b of R.boxes.concat([{ x0: R.x0, x1: R.x1, z0: R.z0, z1: R.z1, y0: R.top - R.w, y1: R.top }])) {
            const sx = b.x1 - b.x0, sy = b.y1 - b.y0, sz = b.z1 - b.z0, gg = new THREE.BoxGeometry(sx, sy, sz), u = gg.attributes.uv;
            const dims = [[sz, sy], [sz, sy], [sx, sz], [sx, sz], [sx, sy], [sx, sy]]; // faces do BoxGeometry: +x, -x, +y, -y, +z, -z (4 vértices cada)
            for (let i = 0; i < u.count; i++) {
                const d = dims[i >> 2];
                u.setXY(i, u.getX(i) * d[0] / CUBG.tile, u.getY(i) * d[1] / CUBG.tile);
            }
            const mesh = new THREE.Mesh(gg, matB);
            mesh.position.set((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, (b.z0 + b.z1) / 2);
            CUBE.add(mesh);
        }
        // InstancedMesh no r128 não calcula a esfera de culling com as instâncias: frustumCulled = false em todos
        const d = new THREE.Object3D();
        const put = (im, i, x, y, z, rx, ry, rz) => { d.position.set(x, y, z); d.rotation.set(rx, ry, rz); d.updateMatrix(); im.setMatrixAt(i, d.matrix); };
        // quadros (quadro.png): pares frente a frente nas duas paredes, a cada frame.gap m, afastados .inset m da parede (evita z-fighting)
        const F = CUBC.frame, nF = Math.max(0, Math.floor((CUBE_CORL - F.start - F.endMargin) / F.gap) + 1);
        const fm = new THREE.InstancedMesh(new THREE.PlaneGeometry(F.w, F.h), matF, nF * 2);
        fm.frustumCulled = false;
        let nFi = 0;
        for (let i = 0; i < nF; i++) {
            const z = CUBE_COR_Z0 - F.start - i * F.gap;
            put(fm, nFi++, CUBE_X + hw - F.inset, F.y, z, 0, -Math.PI / 2, 0);
            CUBE_FRAMES.push({ x: CUBE_X + hw - F.inset, z, s: 1 });
            if (z + F.w / 2 < CUBE_ROOM.z0) { // parede esquerda: pula o trecho da sala (lá fica a porta)
                put(fm, nFi++, CUBE_X - hw + F.inset, F.y, z, 0, Math.PI / 2, 0);
                CUBE_FRAMES.push({ x: CUBE_X - hw + F.inset, z, s: -1 });
            }
        }
        fm.count = nFi;
        fm.instanceMatrix.needsUpdate = true;
        CUBE.add(fm);
        // MOLDURA dos quadros: 4 barras de madeira (`border.t` de largura, `depth` de profundidade) por quadro + filete dourado de `gap` colado ao quadro; 2 InstancedMesh (madeira e ouro), uma instância por barra
        const B = F.border, bg = B.gap, bt = B.t, bd = B.depth, nb = CUBE_FRAMES.length * 4;
        const wood = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshPhongMaterial({ color: B.wood, specular: 0x1a1008, shininess: 10 }), nb);
        const gold = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshPhongMaterial({ color: B.gold, specular: 0x665522, shininess: 40 }), nb);
        wood.frustumCulled = gold.frustumCulled = false;
        const putB = (im, i, x, y, z, sx, sy, sz) => { d.position.set(x, y, z); d.rotation.set(0, 0, 0); d.scale.set(sx, sy, sz); d.updateMatrix(); im.setMatrixAt(i, d.matrix); d.scale.set(1, 1, 1); };
        let nbi = 0;
        for (const f of CUBE_FRAMES) {
            const wallX = f.x + f.s * F.inset, bx = wallX - f.s * bd / 2, gx = wallX - f.s * (bd + .02) / 2, hh = F.h / 2, hw2 = F.w / 2;
            for (const k of [1, -1]) {
                putB(wood, nbi, bx, F.y + k * (hh + bg + bt / 2), f.z, bd, bt, F.w + 2 * bg + 2 * bt); // topo / base
                putB(gold, nbi, gx, F.y + k * (hh + bg / 2), f.z, bd + .02, bg, F.w + 2 * bg);
                nbi++;
                putB(wood, nbi, bx, F.y, f.z + k * (hw2 + bg + bt / 2), bd, F.h + 2 * bg, bt); // lados
                putB(gold, nbi, gx, F.y, f.z + k * (hw2 + bg / 2), bd + .02, F.h, bg);
                nbi++;
            }
        }
        wood.count = gold.count = nbi;
        wood.instanceMatrix.needsUpdate = gold.instanceMatrix.needsUpdate = true;
        CUBE.add(wood);
        CUBE.add(gold);
        // PORTA DO FIM do corredor (coliseu): porta dupla de madeira com batente, faixas e cadeado dourados, colada na parede do fim (z = CUBE_COR_Z1), de frente para o jogador (+z), centrada em CUBE_X.
        // É só a malha: o uso (E) está em cubeClamp() (nearD) -> interact() (dialogue.js) -> coliseumDoorUse() (coliseum.js, onde entra o código do próximo mapa). Sem colisão própria: a parede do fim já barra o jogador.
        {
            const D = CUBC.door, z0 = CUBE_COR_Z1, dep = D.depth, zc = z0 + dep / 2, zf = z0 + (dep + .1) / 2;
            const mW = new THREE.MeshPhongMaterial({ color: D.wood, specular: 0x1a1008, shininess: 12 }), mG = new THREE.MeshPhongMaterial({ color: D.gold, specular: 0x665522, shininess: 40 }), mF = new THREE.MeshPhongMaterial({ color: D.frame, specular: 0x111111, shininess: 6 });
            const dBox = (mat, sx, sy, sz, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat); m.position.set(x, y, z); CUBE.add(m); };
            for (const k of [-1, 1]) {
                dBox(mF, D.frameT, D.h + D.frameT, dep + .1, CUBE_X + k * (D.w / 2 + D.frameT / 2), (D.h + D.frameT) / 2, zf); // batente (poste)
                dBox(mW, D.w / 2 - .02, D.h, dep, CUBE_X + k * D.w / 4, D.h / 2, zc); // folha
                for (const fy of [.2, .5, .8])
                    dBox(mG, D.w / 2 - .02, .12, dep + .04, CUBE_X + k * D.w / 4, D.h * fy, zc); // faixas douradas
                dBox(mG, .1, .35, dep + .16, CUBE_X + k * .35, D.h * .55, zc); // maçanetas
            }
            dBox(mF, D.w + 2 * D.frameT, D.frameT, dep + .1, CUBE_X, D.h + D.frameT / 2, zf); // batente (verga)
            dBox(mG, .06, D.h, dep + .05, CUBE_X, D.h / 2, zc); // junta central
            dBox(mG, .32, .4, dep + .12, CUBE_X, D.h * .4, zc); // cadeado
        }
        // lustres: corrente + aro + 3 barras cruzadas (6 pontas) + 6 lâmpadas (MeshBasicMaterial, sem luz). A luz real vem de CUBE_LAMPS (ver cubeLights)
        const L = CUBC.chandelier, nL = CUBE_LAMP_Z.length, ry = CUBE_CORH - L.drop;
        const metal = new THREE.MeshPhongMaterial({ color: L.metal, specular: 0x222222, shininess: 15 });
        const chain = new THREE.InstancedMesh(new THREE.CylinderGeometry(.025, .025, L.drop, 5), metal, nL);
        const ring = new THREE.InstancedMesh(new THREE.TorusGeometry(L.radius, .04, 6, 20), metal, nL);
        const bars = new THREE.InstancedMesh(new THREE.CylinderGeometry(.03, .03, L.radius * 2, 5), metal, nL * 3);
        const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(.11, 8, 6), new THREE.MeshBasicMaterial({ color: L.bulbColor }), nL * 6);
        for (let i = 0; i < nL; i++) {
            const z = CUBE_LAMP_Z[i];
            put(chain, i, CUBE_X, CUBE_CORH - L.drop / 2, z, 0, 0, 0);
            put(ring, i, CUBE_X, ry, z, Math.PI / 2, 0, 0);
            for (let k = 0; k < 3; k++)
                put(bars, i * 3 + k, CUBE_X, ry, z, 0, k * Math.PI / 3, Math.PI / 2);
            for (let k = 0; k < 6; k++)
                put(bulbs, i * 6 + k, CUBE_X + Math.cos(k * Math.PI / 3) * L.radius, ry + .12, z + Math.sin(k * Math.PI / 3) * L.radius, 0, 0, 0);
        }
        for (const im of [chain, ring, bars, bulbs]) {
            im.frustumCulled = false;
            im.instanceMatrix.needsUpdate = true;
            CUBE.add(im);
        }
    }
    // tocha: luz pontual fraca presa à câmera (criada agora, mas só entra na cena em enterCube para não pesar nos outros mapas)
    const CUBE_TORCH = new THREE.PointLight(CUBL.torchColor, CUBL.torchK, CUBL.torchDist, CUBL.torchDecay);
    CUBE_TORCH.position.set(0, .3, 0);
    // luzes dos lustres: poucas PointLights que andam até os lustres mais próximos do jogador (uma luz por lustre pesaria nos 238 m); só entram na cena em enterCube
    const CUBE_LAMPS = Array.from({ length: CUBC.chandelier.lights }, () => new THREE.PointLight(CUBC.chandelier.lightColor, CUBC.chandelier.lightK, CUBC.chandelier.lightDist, CUBC.chandelier.lightDecay));
    // libera da memória (GPU) tudo que o mapa antigo e a ponte usavam; o jogo não volta a eles (só recarregando a página)
    function cubeDispose(root) {
        root.traverse(o => {
            if (o.geometry)
                o.geometry.dispose();
            if (o.isInstancedMesh && o.dispose)
                o.dispose();
            for (const m of (Array.isArray(o.material) ? o.material : o.material ? [o.material] : [])) {
                for (const key in m) {
                    const v = m[key];
                    if (v && v.isTexture)
                        v.dispose();
                }
                if (m.uniforms)
                    for (const key in m.uniforms) {
                        const v = m.uniforms[key].value;
                        if (v && v.isTexture)
                            v.dispose();
                    }
                m.dispose();
            }
        });
    }
    // entra no cubo (chamada por bridgeEvents, bridge.js, no pico do preto dos 200 m): some com a ponte e o mapa antigo, liga a luz de caverna e posiciona o jogador
    function enterCube() {
        if (inCube)
            return;
        inCube = true;
        inBridge = false;
        // some com o mapa antigo e a ponte: sai da cena (não renderiza nem entra nas sombras) e libera a GPU
        try {
            for (const o of OLD_MAP) {
                scene.remove(o);
                cubeDispose(o);
            }
            scene.remove(BRIDGE);
            cubeDispose(BRIDGE);
            for (const t of [roadTex, roadMask])
                t.dispose();
        }
        catch (err) {
            console.warn('[cube] falha ao liberar os mapas antigos:', err);
        }
        CUBE.visible = true;
        sky.visible = false; // sem céu
        // névoa cinza clara com o alcance do mapa 1
        scene.background.setHex(CUBG.fogColor);
        FOG_OBJ.color.setHex(CUBG.fogColor);
        FOG_OBJ.near = CUBG.fogNear;
        FOG_OBJ.far = CUBG.fogFar;
        // luz de caverna: ambiente frio e fraco, sem sol, tocha quente de alcance curto seguindo a câmera
        hemi.color.setHex(CUBL.hemiSky);
        hemi.groundColor.setHex(CUBL.hemiGround);
        hemi.intensity = CUBL.hemiK;
        dl.visible = false;
        if (typeof gfxCave === 'function')
            gfxCave(true); // graphics.js: gráfico alto sem reflexo (envMap) nem luz de preenchimento na caverna
        cam.add(CUBE_TORCH);
        for (const l of CUBE_LAMPS)
            scene.add(l);
        cubeSpawn();
        cubeLights();
        if (typeof cubeBgmPlay === 'function')
            cubeBgmPlay(); // audio.js: fade out da música da ponte e castelo.mp3 em loop
    }
    // põe o jogador no centro do chão da SALA MENOR olhando para -z (de frente para a abertura)
    function cubeSpawn() {
        px = CUBE_ROOM.cx;
        pz = CUBE_ROOM.cz + CUBG.spawnInset;
        py = CUBE_Y;
        vy = 0;
        grounded = true;
        yaw = 0;
        pitch = 0;
        eye = CONFIG.player.eyeStand;
        dashT = 0;
        dashK = 0;
    }
    // paredes invisíveis (main.js, tick, depois do movimento/dash): sala menor (caixas), corredor (laterais, começo, fim, teto); `wallMargin` = raio do jogador
    function cubeClamp() {
        const m = CUBG.wallMargin, R = CUBE_ROOM;
        // paredes da sala menor: cada caixa expandida por `m` empurra o jogador pelo eixo de menor penetração (dentro ou fora da sala);
        // a verga só atua se a cabeça (py + eye + m) passa da altura da abertura, então só passa agachado (e sem pular)
        const head = py + eye + m;
        for (const b of R.boxes) {
            if (py >= b.y1 || head <= b.y0)
                continue;
            const dxl = px - (b.x0 - m), dxr = (b.x1 + m) - px, dzf = pz - (b.z0 - m), dzb = (b.z1 + m) - pz;
            if (dxl <= 0 || dxr <= 0 || dzf <= 0 || dzb <= 0)
                continue;
            const mn = Math.min(dxl, dxr, dzf, dzb);
            if (mn === dxl)
                px = b.x0 - m;
            else if (mn === dxr)
                px = b.x1 + m;
            else if (mn === dzf)
                pz = b.z0 - m;
            else
                pz = b.z1 + m;
        }
        // corredor: lado direito sempre; lado esquerdo só além da sala em z (no trecho da sala valem as caixas); começo e fim; limites externos de segurança
        const hx = CUBE_CORW / 2 - m;
        px = Math.min(px, CUBE_X + hx);
        if (pz < R.z0)
            px = Math.max(px, CUBE_X - hx);
        px = Math.max(R.x0 + m, px);
        pz = Math.max(CUBE_COR_Z1 + m, Math.min(R.z1 - m, pz));
        const top = px > R.x1 || pz < R.z0 ? CUBE_TOP : R.top; // dentro da sala o teto é o dela; no corredor, o do corredor
        if (py + eye > top - m) {
            py = top - m - eye;
            if (vy > 0)
                vy = 0;
        }
        // interação com os quadros: nearF = algum quadro a menos de frame.talkDist m, na direção do olhar (cosseno >= frame.lookDot)
        {
            const F = CUBC.frame, lx = -Math.sin(yaw), lz = -Math.cos(yaw);
            let nf = false;
            for (const f of CUBE_FRAMES) {
                const dx = f.x - px, dz = f.z - pz, dd = Math.hypot(dx, dz);
                if (dd > F.talkDist || dd < 1e-3)
                    continue;
                if ((dx * lx + dz * lz) / dd >= F.lookDot) {
                    nf = true;
                    break;
                }
            }
            nearF = nf;
        }
        // interação com a porta do fim: nearD = a menos de door.talkDist m do centro da porta, na direção do olhar (cosseno >= door.lookDot)
        {
            const D = CUBC.door, dx = CUBE_X - px, dz = CUBE_COR_Z1 + D.depth - pz, dd = Math.hypot(dx, dz);
            nearD = dd > 1e-3 && dd <= D.talkDist && (dx * -Math.sin(yaw) + dz * -Math.cos(yaw)) / dd >= D.lookDot;
        }
        cubeLights();
    }
    // golpe (impact.js): true se o ponto (x,z), à altura do peito, está a menos de `pad` de uma parede do cubo (corredor ou caixas da sala menor)
    function cubeWallHit(x, z, pad) {
        const R = CUBE_ROOM, hx = CUBE_CORW / 2, yc = py + eye * .6;
        if (x >= CUBE_X + hx - pad && z <= CUBE_COR_Z0 && z >= CUBE_COR_Z1)
            return true; // parede direita
        if (z < R.z0 && z >= CUBE_COR_Z1 && x <= CUBE_X - hx + pad && x >= R.x0)
            return true; // parede esquerda (além da sala)
        if (z <= CUBE_COR_Z1 + pad && x >= CUBE_X - hx && x <= CUBE_X + hx + pad)
            return true; // fim do corredor
        if (z >= CUBE_COR_Z0 - pad && x >= R.x1 && x <= CUBE_X + hx + pad)
            return true; // começo do corredor
        for (const b of R.boxes)
            if (yc > b.y0 && yc < b.y1 && x > b.x0 - pad && x < b.x1 + pad && z > b.z0 - pad && z < b.z1 + pad)
                return true;
        return false;
    }
    // põe as CUBE_LAMPS nos lustres mais próximos do jogador (índice do lustre mais próximo em z, janela de `lights` lustres, limitada às pontas)
    function cubeLights() {
        const n = CUBE_LAMP_Z.length, c = CUBE_LAMPS.length;
        if (!n)
            return;
        const i0 = Math.round((CUBE_COR_Z0 - CUBC.chandelier.start - pz) / CUBC.chandelier.gap);
        const s0 = Math.max(0, Math.min(n - c, i0 - ((c - 1) >> 1)));
        for (let j = 0; j < c; j++)
            CUBE_LAMPS[j].position.set(CUBE_X, CUBE_CORH - CUBC.chandelier.drop, CUBE_LAMP_Z[Math.min(n - 1, s0 + j)]);
    }