// ARQUIVO: CUBE (mapa final: sala menor + corredor de tijolos vistos por dentro, sem céu; separado do mapa antigo e da ponte).
    // ===== CUBE: sala menor, corredor (tapete, quadros, lustres), luz e limites da área =====
    // Carregado depois de bridge.js e ANTES de player.js. O jogador chega aqui pelo evento dos 200 m da ponte (bridge.js chama enterCube() no pico do preto).
    const CUBG = CONFIG.cube, CUBL = CUBG.light;
    const CUBE_X = CUBG.x, CUBE_Z = CUBG.z, CUBE_Y = 0, CUBE_S = CUBG.size; // chão em y = 0; CUBE_S = aresta de referência (a sala menor tem CUBE_S / inner.div)
    // SALA MENOR: base (size/div) x (size/div), altura inner.roomH (medida do PRÓPRIO piso), à ESQUERDA (-x) do corredor e AFASTADA dele: entre a parede direita da sala (+x) e a parede esquerda do corredor
    // fica um TÚNEL DA ESCADA (paredes laterais, teto e escada de madeira). O fundo da sala (+z) fica em z = CUBE_Z, onde o corredor começa; a sala se estende de CUBE_Z a CUBE_Z - s (olhando para -z). Paredes de `wall` m.
    // A porta (`door.w` x `door.h` m, medida do PISO DA SALA) fica no MEIO da parede DIREITA e só passa agachado; atrás dela a escada SOBE para +x até o corredor (o piso da sala fica `inner.stairs.drop` m abaixo do corredor).
    // Piso próprio (madeira); `boxes` = colisão (AABB em XZ + faixa em y); a altura do chão vem de `cubeGround()`.
    const CUBI = CUBG.inner;
    let nearD3 = false; // perto da PORTA TRANCADA do fim da escada (boca do túnel), olhando para ela; calculado em cubeClamp() (que também liga `nearD` para a dica/tecla E); o uso é cubeDoor3Use(), chamado por interact() (dialogue.js)
    let nearKey = false, cubeHasKey = false, cubeDoor3State = 0, cubeDoor3T0 = 0; // chave: perto dela (olhando) | já pegou; porta do túnel: 0 trancada, 1 abrindo, 2 aberta; cubeDoor3T0 = performance.now() do início da abertura
    const CUBE_KEY = new THREE.Group(), CUBE_DOOR3 = { pv: [], lock: null }; // CHAVE (grupo, parada no piso da sala) | pivôs das 2 folhas da porta do túnel (k = -1, +1) e o cadeado
    let nearD2 = false; // perto da PORTA DO COMEÇO do corredor (só diálogo), olhando para ela; calculado em cubeClamp(); o uso (E) deve chamar cubeDoor2Use() (ligar em interact(), dialogue.js)
    const CUBE_ROOM = (() => {
        // fy = piso da sala, `stairs.drop` m ABAIXO do corredor; top = fy + roomH (teto SÓ da sala; o do túnel acompanha a escada, a `topAbove` acima do chão de cada trecho). Túnel (x de x1 a xl): `entry` m de piso plano logo após a porta (mais que wallMargin, para a verga não pegar quem já subiu o 1º degrau),
        // n degraus de H m x D m subindo para +x, e `landing` m de patamar no topo (y = CUBE_Y) até a parede do corredor. Distância sala-corredor = entry + n*D + landing.
        const ST = CUBI.stairs, n = Math.max(1, Math.round(ST.drop / ST.stepH)), H = ST.drop / n, D = ST.stepD, fy = CUBE_Y - ST.drop;
        const s = CUBE_S / CUBI.div, w = CUBI.wall, dw = CUBI.door.w, dh = CUBI.door.h, y0 = fy, tt = CUBE_Y + CUBI.topAbove, top = fy + CUBI.roomH, yw = top - w, yt = tt + w; // top = teto da SALA (fy + roomH); tt = teto do túnel NO CORREDOR (CUBE_Y + topAbove); yt = topo da laje mais alta do túnel
        const hs = ST.width / 2, run = n * D, gap = ST.entry + run + ST.landing;
        const xl = CUBE_X - CUBG.corridor.width / 2, x1 = xl - gap, x0 = x1 - s, z1 = CUBE_Z, z0 = z1 - s, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2; // xl = parede esquerda do corredor; x1 = face externa da parede direita da sala
        const sx0 = x1 + ST.entry; // onde começa o 1º degrau
        const boxes = [
            { x0: xl - CUBG.corridor.door3.depth, x1: xl, z0: cz - hs, z1: cz + hs, y0: fy, y1: yt, door: true }, // PORTA TRANCADA do fim da escada: SÓ colisão (`door: true` = o loop de desenho pula esta caixa; senão aparecia como parede de tijolos no lugar da porta); sai de `boxes` quando a porta termina de abrir; a malha está mais abaixo, ver door3
            { x0, x1: x0 + w, z0, z1, y0, y1: yw },                                  // parede esquerda (-x)
            { x0: x1 - w, x1, z0, z1: cz - dw / 2, y0, y1: yw },                     // parede direita, antes da porta (lado -z)
            { x0: x1 - w, x1, z0: cz + dw / 2, z1, y0, y1: yw },                     // parede direita, depois da porta (lado +z)
            { x0: x1 - w, x1, z0: cz - dw / 2, z1: cz + dw / 2, y0: fy + dh, y1: yw }, // verga sobre a porta (só bloqueia quem está alto demais; altura medida do PISO DA SALA)
            { x0: x0 + w, x1: x1 - w, z0, z1: z0 + w, y0, y1: yw },                  // parede da frente (-z)
            { x0: x0 + w, x1: x1 - w, z0: z1 - w, z1, y0, y1: yw },                  // parede de trás (+z)
            { x0: x1, x1: xl, z0: cz - hs - w, z1: cz - hs, y0, y1: yt },            // lateral do túnel (lado -z)
            { x0: x1, x1: xl, z0: cz + hs, z1: cz + hs + w, y0, y1: yt }             // lateral do túnel (lado +z)
        ];
        // só visuais (sem colisão), de MADEIRA: piso plano da entrada, um bloco por degrau (o i-ésimo vai de fy até fy + (i+1)*H; o último chega em y = CUBE_Y) e patamar no topo
        const steps = [{ x0: x1, x1: sx0, z0: cz - hs, z1: cz + hs, y0: fy - .1, y1: fy }];
        for (let i = 0; i < n; i++)
            steps.push({ x0: sx0 + i * D, x1: sx0 + (i + 1) * D, z0: cz - hs, z1: cz + hs, y0, y1: fy + (i + 1) * H });
        steps.push({ x0: sx0 + run, x1: xl, z0: cz - hs, z1: cz + hs, y0, y1: CUBE_Y });
        // lajes de tijolos (só visuais): teto da sala (a `roomH` do piso da sala) e teto do túnel EM DEGRAUS, acompanhando a escada: cada trecho (entrada plana, cada degrau, patamar) tem o teto a `topAbove` acima do SEU chão.
        // Cada laje sobe até `H + w` acima do seu vão (limitada a `yt`), para a laje do trecho mais alto encostar nela e não abrir fresta no "degrau" do teto.
        const slabs = [{ x0, x1, z0, z1, y0: top - w, y1: top }];
        const tslab = (xa, xb, g) => { const c = g + CUBI.topAbove; slabs.push({ x0: xa, x1: xb, z0: cz - hs - w, z1: cz + hs + w, y0: c, y1: Math.min(c + H + w, yt) }); };
        tslab(x1, sx0, fy);
        for (let i = 0; i < n; i++)
            tslab(sx0 + i * D, sx0 + (i + 1) * D, fy + (i + 1) * H);
        tslab(sx0 + run, xl, CUBE_Y);
        // CAIXAS espalhadas pela sala (`inner.crates`): posições SORTEADAS com semente fixa (mulberry32, `seed`), então são as mesmas em toda partida. Cada caixa é um cubo de aresta `min`..`max` com giro aleatório (+-`maxYaw` rad);
        // a COLISÃO é a AABB que envolve o cubo girado (em `boxes`, marcada `crate: true` para o loop de desenho de tijolos pulá-la) e sobe até `yw` (teto da sala), então não dá para pular por cima (cubeBoxes só ignora quem está acima de y1).
        // Cada tentativa sorteia um dos 4 cantos da sala e põe o centro da caixa até `cornerZone` m dele, com a distância sorteada ao QUADRADO (concentra perto do canto; 0 = posição livre na sala toda). Regras do sorteio (até 200 tentativas por caixa; sem vaga, a caixa é descartada): `margin` m de folga das paredes, `gap` m entre caixas (sem bolsões fechados), `spawnClear` m do ponto de nascimento (centro da sala), `keyClear` m da chave
        // e o corredor do centro até a porta (`pathHalf` m de meia-largura) livre. A lista `crates` ({x, z, s, yaw, h}) serve ao desenho (malhas com `caixa.png`, mais abaixo).
        const crates = [];
        {
            const C = CUBI.crates, K = CUBI.key;
            let sd = C.seed >>> 0;
            const rnd = () => { sd = (sd + 0x6D2B79F5) >>> 0; let t = sd; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
            const kx = x0 + w + K.inset, kz = z1 - w - K.inset; // posição da chave (mesma fórmula do bloco da chave)
            const dist = (px, pz, c, h) => Math.hypot(Math.max(Math.abs(px - c.x) - h, 0), Math.max(Math.abs(pz - c.z) - h, 0)); // distância de um ponto à AABB de centro c e meia-aresta h
            for (let q = 0; q < C.count; q++) {
                for (let t = 0; t < 200; t++) {
                    const sz = C.min + rnd() * (C.max - C.min), yaw = (rnd() * 2 - 1) * C.maxYaw, h = sz / 2 * (Math.abs(Math.cos(yaw)) + Math.abs(Math.sin(yaw)));
                    const lx0 = x0 + w + C.margin + h, lx1 = x1 - w - C.margin - h, lz0 = z0 + w + C.margin + h, lz1 = z1 - w - C.margin - h;
                    if (lx1 <= lx0 || lz1 <= lz0)
                        continue;
                    let qx, qz;
                    const u = rnd() ** 2, v = rnd() ** 2; // ao quadrado: concentra as caixas perto do canto, mas ainda deixa algumas mais afastadas (senão não cabem 8)
                    if (C.cornerZone > 0) { // perto de um dos 4 cantos: o centro fica até `cornerZone` m do canto sorteado (dentro da área válida, que já respeita `margin`)
                        const fx = rnd() < .5, fz = rnd() < .5;
                        qx = Math.max(lx0, Math.min(lx1, fx ? lx0 + u * C.cornerZone : lx1 - u * C.cornerZone));
                        qz = Math.max(lz0, Math.min(lz1, fz ? lz0 + v * C.cornerZone : lz1 - v * C.cornerZone));
                    }
                    else { // posição livre na sala toda
                        qx = lx0 + u * (lx1 - lx0);
                        qz = lz0 + v * (lz1 - lz0);
                    }
                    const c = { x: qx, z: qz };
                    if (dist(cx, cz, c, h) < C.spawnClear || dist(kx, kz, c, h) < C.keyClear)
                        continue;
                    if (c.x + h > cx && c.x - h < x1 - w && Math.abs(c.z - cz) < h + C.pathHalf)
                        continue; // corredor do centro até a porta
                    if (crates.some(e => Math.abs(c.x - e.x) < h + e.h + C.gap && Math.abs(c.z - e.z) < h + e.h + C.gap))
                        continue;
                    crates.push({ x: c.x, z: c.z, s: sz, yaw, h });
                    boxes.push({ x0: c.x - h, x1: c.x + h, z0: c.z - h, z1: c.z + h, y0: fy, y1: yw, crate: true });
                    break;
                }
            }
        }
        return { s, w, x0, x1, xl, z0, z1, cx, cz, top, tunTop: tt, fy, boxes, steps, slabs, crates, stair: { xs: sx0, n, H, D, hs, entry: ST.entry, landing: ST.landing } };
    })();
    // CORREDOR: começa em z = CUBE_Z (CUBE_COR_Z0, com uma parede de tijolos fechando o começo) e segue para -z até CUBE_COR_Z1 (fim fechado). Largura/comprimento fixos no CONFIG (8,8 x 80; o comprimento era 238, o da ponte);
    // altura = heightK x altura do olho em pé. CUBE_TOP = teto do corredor.
    const CUBC = CUBG.corridor, CUBE_CORW = CUBC.width, CUBE_CORL = CUBC.length, CUBE_CORH = CONFIG.player.eyeStand * CUBC.heightK;
    const CUBE_COR_Z0 = CUBE_Z, CUBE_COR_Z1 = CUBE_COR_Z0 - CUBE_CORL, CUBE_TOP = CUBE_Y + CUBE_CORH;
    // z de cada lustre (de CUBE_COR_Z0 para -z): um a cada chandelier.gap m, o 1º a chandelier.start m do início
    const CUBE_LAMP_Z = [];
    for (let z = CUBE_COR_Z0 - CUBC.chandelier.start; z >= CUBE_COR_Z1 + CUBC.chandelier.endMargin; z -= CUBC.chandelier.gap)
        CUBE_LAMP_Z.push(z);
    let inCube = false;
    let cubeLX = NaN, cubeLZ = NaN; // posição (x, z) do fim do último cubeClamp(): usada na varredura contra paredes e para voltar de áreas inalcançáveis (NaN = sem histórico, ex.: logo após o spawn)
    const CUBE_FRAMES = []; // centro de cada quadro {x, z, s} (s = +1 parede direita, -1 esquerda), usado pela interação (nearF) em cubeClamp()
    const CUBE = new THREE.Group();
    CUBE.visible = false; // só aparece em enterCube()
    scene.add(CUBE);
    {
        // texturas (mesmo filtro do chão; pixTex permite alternar pixelado nas configurações). Sem arquivo -> cor sólida.
        // Phong (luz POR PIXEL): o Lambert do three r128 calcula luz por vértice e as faces gigantes do corredor ficariam sem o brilho da tocha e dos lustres.
        const mkMat = extra => new THREE.MeshPhongMaterial(Object.assign({ color: 0xffffff, specular: 0x000000, shininess: 0, side: THREE.FrontSide }, extra));
        const matB = mkMat(), matK = mkMat(), matW = mkMat(), matF = mkMat({ alphaTest: .5, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }); // tijolos, tapete, madeira (piso da sala menor), quadros
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
        loadTex(CONFIG.paths.wood, matW, CUBI.fallbackWood);
        const matC = mkMat(); // caixas da sala (caixa.png; UV padrão do BoxGeometry = a imagem inteira em cada face)
        loadTex(CONFIG.paths.crate, matC, CUBI.crates.fallback);
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
        // parede esquerda inteira, com um FURO onde o túnel da escada encontra o corredor: o furo cobre a largura externa do túnel (cz ± (hs + wall)) e vai do chão até o topo da laje do túnel (CUBE_ROOM.tunTop + wall);
        // as laterais e a laje do túnel terminam rente à parede e preenchem o furo, deixando só o vão da escada aberto. Faixa de tijolos acima do furo.
        {
            const hz1 = CUBE_ROOM.cz + CUBE_ROOM.stair.hs + CUBE_ROOM.w, hz0 = CUBE_ROOM.cz - CUBE_ROOM.stair.hs - CUBE_ROOM.w, yt = CUBE_ROOM.tunTop + CUBE_ROOM.w;
            mkPlane(CUBE_COR_Z0 - hz1, CUBE_CORH, matB, CUBG.tile, 0, Math.PI / 2, CUBE_X - hw, hy, (CUBE_COR_Z0 + hz1) / 2); // do começo até o furo
            mkPlane(hz0 - CUBE_COR_Z1, CUBE_CORH, matB, CUBG.tile, 0, Math.PI / 2, CUBE_X - hw, hy, (hz0 + CUBE_COR_Z1) / 2); // do furo até o fim
            if (CUBE_CORH > yt)
                mkPlane(hz1 - hz0, CUBE_CORH - yt, matB, CUBG.tile, 0, Math.PI / 2, CUBE_X - hw, (yt + CUBE_CORH) / 2, CUBE_ROOM.cz); // acima do furo
        }
        mkPlane(CUBE_CORW, CUBE_CORH, matB, CUBG.tile, 0, Math.PI, CUBE_X, hy, CUBE_COR_Z0); // parede do começo (normal para -z)
        mkPlane(CUBE_CORL, CUBE_CORH, matB, CUBG.tile, 0, -Math.PI / 2, CUBE_X + hw, hy, zc);
        mkPlane(CUBE_CORW, CUBE_CORH, matB, CUBG.tile, 0, 0, CUBE_X, hy, CUBE_COR_Z1);
        // sala menor: piso de MADEIRA (wood.png, a cada inner.woodTile m) em y = R.fy (abaixo do corredor) + uma malha por caixa (paredes da sala, laterais do túnel) e por laje (tetos) de TIJOLOS
        // (tijolo a cada CUBG.tile m) + uma malha por degrau/patamar/entrada (R.steps) de MADEIRA (wood.png, a cada inner.woodTile m); todas com UV proporcional ao tamanho
        const R = CUBE_ROOM;
        mkPlane(R.s, R.s, matW, CUBI.woodTile, -Math.PI / 2, 0, R.cx, R.fy, R.cz);
        const addBox = (b, mat, tile) => {
            const sx = b.x1 - b.x0, sy = b.y1 - b.y0, sz = b.z1 - b.z0, gg = new THREE.BoxGeometry(sx, sy, sz), u = gg.attributes.uv;
            const dims = [[sz, sy], [sz, sy], [sx, sz], [sx, sz], [sx, sy], [sx, sy]]; // faces do BoxGeometry: +x, -x, +y, -y, +z, -z (4 vértices cada)
            for (let i = 0; i < u.count; i++) {
                const d = dims[i >> 2];
                u.setXY(i, u.getX(i) * d[0] / tile, u.getY(i) * d[1] / tile);
            }
            const mesh = new THREE.Mesh(gg, mat);
            mesh.position.set((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, (b.z0 + b.z1) / 2);
            CUBE.add(mesh);
        };
        for (const b of R.boxes.concat(R.slabs))
            if (!b.door && !b.crate)
                addBox(b, matB, CUBG.tile); // a caixa da porta do túnel (`door: true`) e as das caixas espalhadas (`crate: true`) são só colisão
        for (const b of R.steps)
            addBox(b, matW, CUBI.woodTile);
        // caixas espalhadas (inner.crates; `caixa.png`, material matC): cubo girado em y, assentado no piso da sala (a colisão está em R.boxes, `crate: true`)
        for (const c of R.crates) {
            const m = new THREE.Mesh(new THREE.BoxGeometry(c.s, c.s, c.s), matC);
            m.position.set(c.x, R.fy + c.s / 2, c.z);
            m.rotation.y = c.yaw;
            CUBE.add(m);
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
            if (Math.abs(z - CUBE_ROOM.cz) >= F.w / 2 + CUBE_ROOM.stair.hs + CUBE_ROOM.w + .2) { // parede esquerda: pula só o trecho do furo do túnel da escada (+ folga p/ a moldura)
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
            const D = CUBC.door, dep = D.depth;
            const mW = new THREE.MeshPhongMaterial({ color: D.wood, specular: 0x1a1008, shininess: 12 }), mG = new THREE.MeshPhongMaterial({ color: D.gold, specular: 0x665522, shininess: 40 }), mF = new THREE.MeshPhongMaterial({ color: D.frame, specular: 0x111111, shininess: 6 });
            const dBox = (mat, sx, sy, sz, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat); m.position.set(x, y, z); CUBE.add(m); };
            // sg = +1: porta do FIM (z0 = CUBE_COR_Z1, sai da parede para +z); sg = -1: porta do COMEÇO (z0 = CUBE_COR_Z0, sai da parede para -z). Geometria simétrica em z, então é a mesma malha.
            const mkDoor = (z0, sg) => {
            const zc = z0 + sg * dep / 2, zf = z0 + sg * (dep + .1) / 2;
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
            };
            mkDoor(CUBE_COR_Z1, 1);
            mkDoor(CUBE_COR_Z0, -1); // PORTA DO COMEÇO: cópia da do fim, SEM função (só diálogo `door2.text`, ver nearD2/cubeDoor2Use)
            // PORTA TRANCADA do fim da escada (`door3`): mesma aparência das outras, mas no eixo x: ocupa de xl - depth a xl (rente à parede esquerda do corredor), fecha o vão do túnel (largura = stairs.width, altura = topAbove)
            // e fica virada para quem sobe a escada. Cores e batente vêm de `door`. Grupo g3 girado PI/2: o z local vira x no mundo, então z local negativo = para -x (para dentro do túnel). Colisão: 1ª caixa de CUBE_ROOM.boxes (`door: true`, sem desenho).
            // Cada folha fica num PIVÔ (CUBE_DOOR3.pv[0] = k -1, pv[1] = k +1) na dobradiça (borda externa do vão); com a chave, cubeClamp() gira os pivôs em k * openAngle para o lado do corredor (+z local = +x no mundo).
            // A junta central e o cadeado ficam na folha k = +1; o cadeado some quando a porta começa a abrir.
            {
                const T3 = CUBC.door3, w3 = CUBI.stairs.width, h3 = CUBI.topAbove, p3 = T3.depth, g3 = new THREE.Group();
                const b3 = (par, mat, sx, sy, sz, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat); m.position.set(x, y, z); par.add(m); return m; };
                const zc3 = -p3 / 2, zf3 = -(p3 + .1) / 2;
                for (const k of [-1, 1]) {
                    b3(g3, mF, D.frameT, h3 + D.frameT, p3 + .1, k * (w3 / 2 + D.frameT / 2 - .01), (h3 + D.frameT) / 2, zf3); // batente (poste; .01 para dentro da lateral do túnel, sem face coplanar com ela)
                    const pv = new THREE.Group();
                    pv.position.set(k * w3 / 2, 0, 0);
                    g3.add(pv);
                    CUBE_DOOR3.pv.push(pv);
                    b3(pv, mW, w3 / 2 - .02, h3, p3, -k * w3 / 4, h3 / 2, zc3); // folha
                    for (const fy of [.2, .5, .8])
                        b3(pv, mG, w3 / 2 - .02, .12, p3 + .04, -k * w3 / 4, h3 * fy, zc3); // faixas douradas
                    b3(pv, mG, .1, .35, p3 + .16, k * (.35 - w3 / 2), h3 * .55, zc3); // maçaneta
                    if (k === 1) {
                        b3(pv, mG, .06, h3, p3 + .05, -w3 / 2, h3 / 2, zc3); // junta central
                        CUBE_DOOR3.lock = b3(pv, mG, .32, .4, p3 + .12, -w3 / 2, h3 * .4, zc3); // cadeado
                    }
                }
                b3(g3, mF, w3 + 2 * D.frameT, D.frameT, p3 + .1, 0, h3 + D.frameT / 2, zf3); // batente (verga)
                g3.rotation.y = Math.PI / 2;
                g3.position.set(CUBE_ROOM.xl, CUBE_Y, CUBE_ROOM.cz);
                CUBE.add(g3);
            }
            // CHAVE (`inner.key`): argola + haste + 2 dentes (dourada, com brilho próprio), DEITADA no piso (parada, sem girar nem flutuar) no canto de TRÁS à esquerda da sala: x0 + wall + inset, z1 - wall - inset
            // (a sala olha para -z, então o fundo, +z, fica ATRÁS de quem nasce no centro olhando para -z; a porta da escada fica à direita). O modelo é montado em pé (eixo y); rotation.x = -PI/2 o deita (argola para cima,
            // haste ao longo do piso) e rotation.z = key.angle gira em torno da vertical (Euler XYZ: o z local vira o y do mundo). `key.y` = altura do centro sobre o piso (.04 = metade da espessura do modelo; escale junto com `size`).
            // Pegar (E olhando para ela) = cubeKeyUse(), sem diálogo: a chave some e liga cubeHasKey, que libera a abertura da porta do túnel.
            {
                const K = CUBI.key, mk = new THREE.MeshPhongMaterial({ color: K.color, specular: 0x665522, shininess: 60, emissive: 0x3a2c05 });
                const ring = new THREE.Mesh(new THREE.TorusGeometry(.13, .04, 8, 16), mk);
                ring.position.y = .32;
                CUBE_KEY.add(ring);
                const part = (sx, sy, sz, x, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mk); m.position.set(x, y, 0); CUBE_KEY.add(m); };
                part(.07, .5, .07, 0, 0); // haste
                part(.14, .07, .06, .1, -.22); // dente de baixo
                part(.1, .07, .06, .08, -.1); // dente de cima
                CUBE_KEY.scale.setScalar(K.size);
                CUBE_KEY.rotation.set(-Math.PI / 2, 0, K.angle);
                CUBE_KEY.position.set(CUBE_ROOM.x0 + CUBE_ROOM.w + K.inset, CUBE_ROOM.fy + K.y, CUBE_ROOM.z1 - CUBE_ROOM.w - K.inset);
                CUBE.add(CUBE_KEY);
            }
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
    // luzes dos lustres: poucas PointLights que andam até os lustres mais próximos do jogador (uma luz por lustre pesaria no corredor); só entram na cena em enterCube
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
    // põe o jogador no centro do chão da SALA MENOR olhando para -z (a porta fica à sua direita)
    function cubeSpawn() {
        px = CUBE_ROOM.cx;
        pz = CUBE_ROOM.cz + CUBG.spawnInset;
        py = CUBE_ROOM.fy; // piso da sala menor (abaixo do corredor)
        vy = 0;
        grounded = true;
        yaw = 0;
        pitch = 0;
        eye = CONFIG.player.eyeStand;
        dashT = 0;
        dashK = 0;
        cubeLX = cubeLZ = NaN; // sem histórico: o 1º cubeClamp() não faz varredura a partir do ponto anterior (era a ponte)
    }
    // altura do chão em (x, z) no cubo (main.js usa como `gh`): corredor = CUBE_Y; sala (x <= R.x1) = CUBE_ROOM.fy; túnel da escada (x de R.x1 a R.xl, |z - cz| <= hs): `entry` m planos em fy,
    // depois n degraus de H m x D m subindo para +x (o k-ésimo tem a superfície em fy + (k+1)*H) e o patamar em CUBE_Y (as laterais em `boxes` impedem sair da escada de lado)
    function cubeGround(x, z) {
        const R = CUBE_ROOM, S = R.stair;
        if (x >= R.xl)
            return CUBE_Y; // corredor (inclui a boca do túnel)
        if (x <= R.x1 || z < R.z0 || z > R.z1)
            return R.fy; // sala (e qualquer ponto fora do túnel, que as caixas já barram)
        if (Math.abs(z - R.cz) > S.hs || x < S.xs)
            return R.fy; // fora da largura da escada ou ainda na entrada plana (logo após a porta)
        const k = Math.floor((x - S.xs) / S.D);
        return k >= S.n ? CUBE_Y : R.fy + (k + 1) * S.H; // k >= n: patamar no topo
    }
    // paredes da sala menor e do túnel: cada caixa de `boxes` expandida por `m` empurra o jogador pelo eixo de menor penetração (dentro ou fora);
    // a verga só atua se a cabeça (py + eye + m) passa da altura da abertura, então só passa agachado (e sem pular)
    function cubeBoxes(m) {
        const head = py + eye + m;
        for (const b of CUBE_ROOM.boxes) {
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
    }
    // paredes invisíveis (main.js, tick, depois do movimento/dash): sala menor e túnel (caixas), corredor (laterais, começo, fim, teto); `wallMargin` = raio do jogador
    function cubeClamp() {
        const m = CUBG.wallMargin, R = CUBE_ROOM;
        // caixas com VARREDURA: o dash anda ~1,5 m por frame, mais que a espessura de uma parede + folga (1,3 m), então atravessaria a parede; por isso o caminho do último ponto válido (cubeLX/LZ) até o atual
        // é percorrido em passos de <= .25 m, aplicando as caixas em cada um (a posição final é a do último passo)
        if (cubeLX === cubeLX) {
            const tx = px, tz = pz, n = Math.max(1, Math.ceil(Math.hypot(tx - cubeLX, tz - cubeLZ) / .25));
            if (n > 1) {
                const sx = (tx - cubeLX) / n, sz = (tz - cubeLZ) / n;
                px = cubeLX;
                pz = cubeLZ;
                for (let i = 0; i < n; i++) {
                    px += sx;
                    pz += sz;
                    cubeBoxes(m);
                }
            }
            else
                cubeBoxes(m);
        }
        else
            cubeBoxes(m);
        // corredor: lado direito sempre; lado esquerdo (px >= xl + m) só para quem está no corredor ou além da parede externa da sala (px > R.x1) e fora da faixa do túnel (|pz - cz| > hs + wall):
        // dentro da sala (px <= R.x1) NÃO vale (a sala ocupa essa faixa de z; foi o bug do teletransporte). Na faixa do túnel valem as laterais em `boxes` (só o vão da escada fica livre).
        // Quem já estava no corredor (último x >= xl) é só empurrado de volta para dentro; quem aparece no vão entre a sala e o corredor sem ter passado pelo túnel volta ao último ponto válido.
        const hx = CUBE_CORW / 2 - m;
        px = Math.min(px, CUBE_X + hx);
        if (px > R.x1 && px < CUBE_X - hx && Math.abs(pz - R.cz) > R.stair.hs + R.w) {
            if (cubeLX >= R.xl || cubeLX !== cubeLX) // estava no corredor (ou sem histórico): só empurra de volta para dentro
                px = CUBE_X - hx;
            else {
                px = cubeLX;
                pz = cubeLZ;
            }
        }
        px = Math.max(R.x0 + R.w + m, px); // parede esquerda da sala (face interna + raio)
        pz = Math.max(CUBE_COR_Z1 + m, Math.min(R.z1 - m, pz));
        if (px <= R.x1)
            pz = Math.max(R.z0 + R.w + m, Math.min(R.z1 - R.w - m, pz)); // paredes da frente e de trás da sala (limite duro, garante que nada empurre o jogador para fora)
        // corredor (x >= xl): CUBE_TOP; sala (x <= x1): R.top (fy + roomH); túnel (x1 < x < xl): `topAbove` acima do chão do trecho (cubeGround), o teto em degraus
        const top = px >= R.xl ? CUBE_TOP : px <= R.x1 ? R.top : cubeGround(px, pz) + CUBI.topAbove;
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
        // interação com a porta do COMEÇO do corredor (só diálogo): nearD2 = a menos de door2.talkDist m, na direção do olhar (cosseno >= door2.lookDot)
        {
            const D2 = CUBC.door2, dx = CUBE_X - px, dz = CUBE_COR_Z0 - CUBC.door.depth - pz, dd = Math.hypot(dx, dz);
            nearD2 = dd > 1e-3 && dd <= D2.talkDist && (dx * -Math.sin(yaw) + dz * -Math.cos(yaw)) / dd >= D2.lookDot;
        }
        // interação com a porta TRANCADA do fim da escada: nearD3 = a menos de door3.talkDist m da face da porta, na direção do olhar (cosseno >= door3.lookDot).
        // Também liga `nearD` (a dica "E" e a tecla E em graphics.js/input.js/main.js só olham nearK/nearF/nearD); interact() testa nearD3 ANTES de nearD.
        {
            const D3 = CUBC.door3, dx = CUBE_ROOM.xl - D3.depth - px, dz = CUBE_ROOM.cz - pz, dd = Math.hypot(dx, dz);
            nearD3 = cubeDoor3State === 0 && dd > 1e-3 && dd <= D3.talkDist && (dx * -Math.sin(yaw) + dz * -Math.cos(yaw)) / dd >= D3.lookDot; // só enquanto trancada (depois de começar a abrir, não interage mais)
            if (nearD3)
                nearD = true;
        }
        // interação com a CHAVE: nearKey = ainda não pegou e a menos de key.talkDist m dela, na direção do olhar (cosseno >= key.lookDot). Também liga `nearD` (dica/tecla E); interact() testa nearKey primeiro.
        {
            const K = CUBI.key, dx = CUBE_KEY.position.x - px, dz = CUBE_KEY.position.z - pz, dd = Math.hypot(dx, dz);
            nearKey = !cubeHasKey && dd > 1e-3 && dd <= K.talkDist && (dx * -Math.sin(yaw) + dz * -Math.cos(yaw)) / dd >= K.lookDot;
            if (nearKey)
                nearD = true;
        }
        // abertura da porta do túnel (estado 1): as folhas giram k * openAngle em door3.openTime s (suavizado); no fim a caixa de colisão sai de `boxes` (estado 2) e o jogador passa
        if (cubeDoor3State === 1) {
            const D3 = CUBC.door3, e = Math.min(1, (performance.now() - cubeDoor3T0) / (D3.openTime * 1000)), sm = e * e * (3 - 2 * e);
            CUBE_DOOR3.pv[0].rotation.y = -D3.openAngle * sm;
            CUBE_DOOR3.pv[1].rotation.y = D3.openAngle * sm;
            if (e >= 1) {
                cubeDoor3State = 2;
                const i = CUBE_ROOM.boxes.findIndex(b => b.door);
                if (i >= 0)
                    CUBE_ROOM.boxes.splice(i, 1);
            }
        }
        cubeLX = px;
        cubeLZ = pz;
        cubeLights();
    }
    // uso (E) da porta do começo: só abre o diálogo (sem efeito nenhum além disso)
    function cubeDoor2Use() {
        startDlg(CUBC.door2.text);
    }
    // uso (E) da porta do fim da escada: SEM a chave abre o diálogo, o MESMO da porta do fim do corredor (`door.text`; mudar lá muda aqui); COM a chave começa a abrir (sem diálogo, ver a animação em cubeClamp())
    function cubeDoor3Use() {
        if (!cubeHasKey) {
            startDlg(CUBC.door.text);
            return;
        }
        cubeDoor3State = 1;
        cubeDoor3T0 = performance.now();
        if (CUBE_DOOR3.lock)
            CUBE_DOOR3.lock.visible = false; // destrancou
    }
    // uso (E) da chave: pega (some da sala), sem diálogo
    function cubeKeyUse() {
        cubeHasKey = true;
        CUBE_KEY.visible = false;
    }
    // golpe (impact.js): true se o ponto (x,z), à altura do peito, está a menos de `pad` de uma parede do cubo (corredor ou caixas da sala menor)
    function cubeWallHit(x, z, pad) {
        const R = CUBE_ROOM, hx = CUBE_CORW / 2, yc = py + eye * .6;
        if (x >= CUBE_X + hx - pad && z <= CUBE_COR_Z0 && z >= CUBE_COR_Z1)
            return true; // parede direita
        if (x >= R.xl && x <= CUBE_X - hx + pad && z <= CUBE_COR_Z0 && z >= CUBE_COR_Z1 && Math.abs(z - R.cz) > R.stair.hs)
            return true; // parede esquerda (menos o vão do túnel; as laterais dele estão em `boxes`)
        if (z <= CUBE_COR_Z1 + pad && x >= CUBE_X - hx && x <= CUBE_X + hx + pad)
            return true; // fim do corredor
        if (z >= CUBE_COR_Z0 - pad && x >= R.xl && x <= CUBE_X + hx + pad)
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