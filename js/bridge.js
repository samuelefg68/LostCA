// ARQUIVO: BRIDGE (área final: ponte sobre a água, sem saída; separada do mapa antigo).
    // ===== BRIDGE: ponte, água, pinheiros e limites da área final =====
    // Carregado depois de corridor.js e ANTES de player.js/impact.js: o snapshot OLD_MAP abaixo pega só os objetos do mapa antigo
    // (world/structures/trees/corridor); efeitos criados depois (golpe, folhas) continuam visíveis na ponte.
    const BRG = CONFIG.bridge, BRGP = BRG.pines;
    const BR_L = BRG.length, BR_HW = ROAD.hw, BR_WL = BR_L + 2 * BRG.endPad; // comprimento = bridge.length (ponte de uma ponta a outra do mapa); largura = 2*ROAD.hw (8,8 m, a das trilhas); BR_WL = comprimento do plano de água (sobra endPad m em cada ponta para os pinheiros)
    const BR_X = BRG.x, BR_Z = BRG.z, BR_ZS = BR_Z + BR_L / 2, BR_ZE = BR_Z - BR_L / 2; // início (ZS, o jogador nasce aqui) e fim (ZE); a ponte corre no sentido -z
    const BR_DECK_Y = 0, BR_WATER_Y = -BRG.height;
    let inBridge = false;
    const OLD_MAP = scene.children.filter(o => o !== cam && o !== sky && o !== hemi && o !== dl);
    const BRIDGE = new THREE.Group();
    BRIDGE.visible = false; // só aparece em enterBridge(); enquanto oculto não custa render
    scene.add(BRIDGE);
    {
        // texturas (mesmo filtro do chão; pixTex permite alternar pixelado nas configurações). Se o arquivo não carregar, cai para cor sólida.
        const mkMat = (url, fallback, rx, ry) => {
            const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });
            const t = new THREE.TextureLoader().load(url, undefined, undefined, () => { mat.map = null; mat.color.setHex(fallback); mat.needsUpdate = true; });
            t.wrapS = t.wrapT = THREE.RepeatWrapping;
            t.magFilter = pixelOn ? THREE.NearestFilter : THREE.LinearFilter;
            t.minFilter = pixelOn ? THREE.NearestMipmapNearestFilter : THREE.LinearMipmapLinearFilter;
            t.repeat.set(rx, ry);
            pixTex.push(t);
            mat.map = t;
            return mat;
        };
        const bridgeM = mkMat(CONFIG.paths.bridge, BRG.fallbackBridge, 1, 1);
        // caixa com UV proporcional ao tamanho (textura se repete a cada BRG.tile m); não cria mesh: acumula em `parts`, mesclado em UM mesh no fim
        const parts = [];
        const mkBox = (w, h, d, x, y, z) => {
            const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv, T = BRG.tile;
            const sc = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]]; // px, nx, py, ny, pz, nz
            for (let f = 0; f < 6; f++)
                for (let i = 0; i < 4; i++) {
                    const n = f * 4 + i;
                    uv.setXY(n, uv.getX(n) * sc[f][0] / T, uv.getY(n) * sc[f][1] / T);
                }
            g.translate(x, y, z);
            parts.push(g);
        };
        // corpo da ponte: pista (laje) + pilares com "ombros" (topo em degrau dos arcos), conforme o desenho (arco = metade da altura total)
        const aw = BRG.archW, pw = aw, W = BR_HW * 2, deckT = BRG.height - BRG.archH, baseH = BRG.archH - BRG.archStepH, sh = (aw - BRG.archTopW) / 2;
        mkBox(W, deckT, BR_L, BR_X, BR_DECK_Y - deckT / 2, BR_Z);
        const NA = Math.floor((BR_L + pw) / (aw + pw)), e = (BR_L - NA * aw - (NA - 1) * pw) / 2, pil = [[0, e]];
        for (let k = 0; k < NA - 1; k++) {
            const a = e + k * (aw + pw) + aw;
            pil.push([a, a + pw]);
        }
        pil.push([BR_L - e, BR_L]);
        for (const [a, b] of pil) {
            mkBox(W, baseH, b - a, BR_X, BR_WATER_Y + baseH / 2, BR_ZS - (a + b) / 2);
            const a2 = a > 0 ? a - sh : a, b2 = b < BR_L ? b + sh : b;
            mkBox(W, BRG.archStepH, b2 - a2, BR_X, BR_WATER_Y + baseH + BRG.archStepH / 2, BR_ZS - (a2 + b2) / 2);
        }
        // corrimão de pedra dos dois lados (mesma textura da ponte): parede contínua de railH m de altura e railW m de espessura, na borda da pista
        for (const sd of [-1, 1])
            mkBox(BRG.railW, BRG.railH, BR_L, BR_X + sd * (BR_HW - BRG.railW / 2), BR_DECK_Y + BRG.railH / 2, BR_Z);
        {
            // merge local (preserva UV): pista + pilares + corrimãos = um único mesh
            const P = [], N = [], U = [], I = [];
            let off = 0;
            for (const g of parts) {
                const pa = g.attributes.position.array, na = g.attributes.normal.array, ua = g.attributes.uv.array, ia = g.index.array;
                for (let i = 0; i < pa.length; i++) { P.push(pa[i]); N.push(na[i]); }
                for (let i = 0; i < ua.length; i++) U.push(ua[i]);
                for (let i = 0; i < ia.length; i++) I.push(ia[i] + off);
                off += pa.length / 3;
                g.dispose();
            }
            const bg = new THREE.BufferGeometry();
            bg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
            bg.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
            bg.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
            bg.setIndex(I);
            const body = new THREE.Mesh(bg, bridgeM);
            body.frustumCulled = false;
            BRIDGE.add(body);
        }
        // ===== BRIDGE WATER: plano com SHADER PIXELADO (ondas em células, brilho, espuma nos pilares); cai para o plano texturizado se o shader não compilar =====
        const WB = BRG.water, mkC = h => new THREE.Color(h);
        const WVS = `varying vec3 vW;
#include <fog_pars_vertex>
void main(){vec4 wp=modelMatrix*vec4(position,1.);vW=wp.xyz;vec4 mvPosition=viewMatrix*wp;gl_Position=projectionMatrix*mvPosition;
#include <fog_vertex>
}`;
        const WFS = `uniform float uT,uCell,uSteps,uNK,uGP,uGK,uFoamW,uTexK,uUnder,uHasTex,uE,uAW,uL,uHW,uTile;
uniform vec3 uDeep,uShallow,uGlint,uFoam,uSky,uSun;
uniform vec2 uC;
uniform sampler2D uTex;
varying vec3 vW;
#include <fog_pars_fragment>
float hs(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float nz(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hs(i),hs(i+vec2(1.,0.)),f.x),mix(hs(i+vec2(0.,1.)),hs(i+vec2(1.,1.)),f.x),f.y);}
float wh(vec2 p){
 float h=nz(p*.35+vec2(0.,uT*.5));
#ifndef WSIMPLE
 h=h*.6+nz(p*.8+vec2(-uT*.4,uT*.25)+7.3)*.4;
#endif
 return h;}
float pdz(float s){
 if(s<0.||s>uL)return 99.;
 float per=uAW*2.;
 float m=mod(s-uE-uAW,per);
 float d=m<uAW?0.:min(m-uAW,per-m);
 d=min(d,s>uE?s-uE:0.);
 d=min(d,s<uL-uE?uL-uE-s:0.);
 return d;}
void main(){
 vec2 q=vW.xz-uC;
 vec2 p=(floor(q/uCell)+.5)*uCell;
 float s=uL*.5-p.y;
 float h0=wh(p),hx=wh(p+vec2(uCell,0.)),hz=wh(p+vec2(0.,uCell));
 vec3 n=normalize(vec3((h0-hx)*uNK*2.,1.,(h0-hz)*uNK*2.));
 vec3 V=normalize(cameraPosition-vW);
 float fr=pow(1.-max(dot(n,V),0.),3.);
 vec3 col=mix(uDeep,uShallow,smoothstep(.25,.75,h0));
 if(uHasTex>.5){vec3 tc=texture2D(uTex,p/uTile+vec2(uT*.01,-uT*.015)).rgb;float l=dot(tc,vec3(.3,.59,.11));col*=mix(1.,l*1.8,uTexK);}
 col=mix(col,uSky,fr*.65);
 vec3 R=reflect(-V,n);
 float g=pow(max(dot(R,uSun),0.),uGP);
 col+=uGlint*step(.3,g)*uGK;
 float sp=step(.985,hs(p*3.1+floor(uT*2.5)));
 col+=uGlint*sp*.5*(.4+fr);
 col=mix(col,uFoam,step(.8,h0)*.35);
 float ax=abs(p.x);
 float under=(ax<uHW&&s>0.&&s<uL)?1.:0.;
 col*=1.-uUnder*under;
#ifdef WSIMPLE
 float pulse=.8;
#else
 float pulse=.75+.25*sin(uT*2.+s*.6);
#endif
 float dd=length(vec2(max(ax-uHW,0.),pdz(s)));
 float edge=uFoamW*pulse+(hs(p+floor(uT*1.5))-.5)*.5;
 col=mix(col,uFoam,step(dd,edge)*.9);
 col=floor(col*uSteps+.5)/uSteps;
 gl_FragColor=vec4(col,1.);
#include <fog_fragment>
}`;
        // compila o fragment num WebGL descartável (expandindo os #include do three); se falhar, usa o plano texturizado antigo
        const shaderOK = fs => {
            try {
                const gl = document.createElement('canvas').getContext('webgl');
                if (!gl)
                    return true;
                const src = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n#define USE_FOG\nuniform vec3 cameraPosition;\n' + fs.replace(/#include <(\w+)>/g, (m, k) => THREE.ShaderChunk[k] || '');
                const sh = gl.createShader(gl.FRAGMENT_SHADER);
                gl.shaderSource(sh, src);
                gl.compileShader(sh);
                const ok = gl.getShaderParameter(sh, gl.COMPILE_STATUS);
                if (!ok)
                    console.warn('[bridge] shader da água não compilou, usando o plano texturizado:', gl.getShaderInfoLog(sh));
                return ok;
            }
            catch (err) { return true; }
        };
        const WFSX = ((IS_MOBILE || perfOn) ? '#define WSIMPLE\n' : '') + WFS; // mobile/desempenho: 1 camada de onda e espuma estática
        let BR_WATER_U = null, waterM;
        if (shaderOK(WFSX)) {
            const wt = new THREE.TextureLoader().load(CONFIG.paths.water, () => { U.uHasTex.value = 1; }, undefined, () => { U.uHasTex.value = 0; });
            wt.wrapS = wt.wrapT = THREE.RepeatWrapping;
            wt.magFilter = pixelOn ? THREE.NearestFilter : THREE.LinearFilter;
            wt.minFilter = pixelOn ? THREE.NearestMipmapNearestFilter : THREE.LinearMipmapLinearFilter;
            pixTex.push(wt);
            const U = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uT: { value: 0 } }]);
            Object.assign(U, {
                uCell: { value: WB.cell }, uSteps: { value: WB.steps }, uNK: { value: WB.normalK }, uGP: { value: WB.glintPow }, uGK: { value: WB.glintK },
                uFoamW: { value: WB.foamW }, uTexK: { value: WB.texK }, uUnder: { value: WB.underK }, uHasTex: { value: 0 }, uTex: { value: wt },
                uE: { value: e }, uAW: { value: aw }, uL: { value: BR_L }, uHW: { value: BR_HW }, uTile: { value: BRG.waterTile }, uC: { value: new THREE.Vector2(BR_X, BR_Z) },
                uDeep: { value: mkC(WB.deep) }, uShallow: { value: mkC(WB.shallow) }, uGlint: { value: mkC(WB.glint) }, uFoam: { value: mkC(WB.foam) },
                uSky: { value: mkC(BRG.fogColor) }, uSun: { value: sunDir.clone() }
            });
            BR_WATER_U = U;
            waterM = new THREE.ShaderMaterial({ uniforms: U, vertexShader: WVS, fragmentShader: WFSX, fog: true });
        }
        else
            waterM = mkMat(CONFIG.paths.water, BRG.fallbackWater, BRG.waterW / BRG.waterTile, BR_WL / BRG.waterTile);
        const wg = new THREE.PlaneGeometry(BRG.waterW, BR_WL);
        wg.rotateX(-Math.PI / 2);
        const water = new THREE.Mesh(wg, waterM);
        if (BR_WATER_U) {
            const t0 = performance.now();
            water.onBeforeRender = () => { BR_WATER_U.uT.value = (performance.now() - t0) * .001 * WB.speed; };
        }
        water.position.set(BR_X, BR_WATER_Y, BR_Z);
        BRIDGE.add(water);
        // pinheiros normais (mesmo modelo/material dos EDGE PINES; sem colisão): blocos nas duas pontas, fileira contínua na borda da água e faixa aleatória atrás
        const spots = [], hx = BRG.waterW / 2, hz = BR_WL / 2, jit = () => (Math.random() - .5) * 1.2;
        const cols = Math.ceil(2 * (BR_HW + BRGP.endSide) / BRGP.endSpacing) + 1;
        for (const dir of [1, -1]) {
            const zEnd = dir > 0 ? BR_ZS : BR_ZE;
            for (let r = 0; r < BRGP.endRows; r++)
                for (let c = 0; c < cols; c++)
                    spots.push([BR_X - (BR_HW + BRGP.endSide) + c * BRGP.endSpacing + jit(), zEnd + dir * (BRGP.endGap + r * BRGP.endSpacing) + jit()]);
        }
        const eX = hx - BRGP.inset, eZ = hz - BRGP.inset;
        for (let t = -hz; t <= hz; t += BRGP.rowGap) {
            spots.push([BR_X - eX, BR_Z + t], [BR_X + eX, BR_Z + t]);
        }
        for (let t = -hx; t <= hx; t += BRGP.rowGap) {
            spots.push([BR_X + t, BR_Z - eZ], [BR_X + t, BR_Z + eZ]);
        }
        const keep = spots.length, NE = Math.round(BRGP.stripCount * (IS_MOBILE ? BRGP.mobileFactor : 1));
        // faixa aleatória: lado sorteado proporcional ao comprimento da borda (laterais compridas recebem mais que as pontas); descarta o que cairia sobre a ponte
        const pLat = hz / (hz + hx);
        for (let q = 0; q < NE;) {
            const off = Math.pow(Math.random(), .8) * BRGP.stripWidth, sg = Math.random() < .5 ? -1 : 1;
            const lat = Math.random() < pLat, x = lat ? BR_X + sg * (hx - BRGP.inset - off) : BR_X + (Math.random() * 2 - 1) * hx, z = lat ? BR_Z + (Math.random() * 2 - 1) * hz : BR_Z + sg * (hz - BRGP.inset - off);
            if (Math.abs(x - BR_X) < BR_HW + 4 && Math.abs(z - BR_Z) < BR_L / 2 + BRGP.endGap)
                continue;
            spots.push([x, z]);
            q++;
        }
        const NT = spots.length, o = new THREE.Object3D(), pc = PINE_COLS.map(c => new THREE.Color(c));
        const trI = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), trunkM, NT), coneG = new THREE.ConeGeometry(1, 1, 6), coI = [];
        for (let k = 0; k < 6; k++)
            coI.push(new THREE.InstancedMesh(coneG, new THREE.MeshLambertMaterial({ flatShading: true, map: leafTex }), NT));
        spots.forEach(([x, z], n) => {
            const th = 16 + Math.random() * 14, w = Math.max(1, th / 18), y = BR_WATER_Y, ry = Math.random() * 3;
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
        });
        for (const mm of [trI, ...coI]) {
            mm.frustumCulled = false;
            BRIDGE.add(mm);
            perfReg(mm, .45, keep); // modo desempenho preserva os blocos das pontas e a fileira da borda
            HQC.push(mm);
        }
    }
    // ===== BRIDGE FIGURE: silhueta escura parada no metro bridge.figAt da ponte (só visível na ponte, pois fica dentro de BRIDGE) =====
    {
        // modelo desenhado para 3,4 m de altura e escalado para bridge.figH; MeshBasicMaterial preto (sem luz): só a névoa da ponte (fogNear/fogFar) a deixa parcialmente visível
        const fm = new THREE.MeshBasicMaterial({ color: 0x000000 }), fig = new THREE.Group(), S = BRG.figH / 3.4;
        const fb = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w * S, h * S, d * S), fm); m.position.set(x * S, y * S, z * S); fig.add(m); };
        fb(.5, 1.5, .5, -.28, .75, 0); fb(.5, 1.5, .5, .28, .75, 0); // pernas
        fb(1.3, 1.3, .6, 0, 2.15, 0); // tronco
        fb(.4, 1.5, .4, -.9, 2.1, 0); fb(.4, 1.5, .4, .9, 2.1, 0); // braços
        fb(.8, .8, .8, 0, 3, 0); // cabeça
        fig.position.set(BR_X, BR_DECK_Y, BR_ZS - BRG.figAt); // figAt m do início, no eixo da pista
        BRIDGE.add(fig);
    }
    // entra na área da ponte (chamada por walkTeleport, em dialogue.js, no pico do preto): esconde o mapa antigo, mostra a ponte e posiciona o jogador no início
    function enterBridge() {
        if (inBridge)
            return;
        inBridge = true;
        for (const o of OLD_MAP)
            o.visible = false;
        BRIDGE.visible = true;
        // névoa mais densa na ponte: zera o escurecimento do corredor (senão o tick o reaplicaria) e depois ajusta near/far
        corrDark = 0; corrDarkLast = 0;
        applyCorrDark(0);
        FOG_OBJ.near = BRG.fogNear; FOG_OBJ.far = BRG.fogFar;
        // noite azulada: cor da névoa/fundo = bridge.fogColor; o céu recebe o mesmo tom (uNt/uNk em scene.js) para o horizonte casar com a névoa
        scene.background.setHex(BRG.fogColor); FOG_OBJ.color.setHex(BRG.fogColor);
        sky.material.uniforms.uNt.value.setHex(BRG.fogColor); sky.material.uniforms.uNk.value = 1;
        bridgeSpawn();
        bridgeBgmPlay(); // audio.js: música do jogo some com fade e começa ponte.mp3 em loop
    }
    // põe o jogador no início da ponte olhando para -z (usada por enterBridge e pelo teleporte dos 200 m)
    function bridgeSpawn() {
        px = BR_X; pz = BR_ZS - BRG.spawnInset; py = BR_DECK_Y; vy = 0; grounded = true; yaw = 0; pitch = 0; eye = CONFIG.player.eyeStand; dashT = 0; dashK = 0;
    }
    // ===== BRIDGE EVENTS: diálogos aos 119 e 178,5 m e fade + ida ao cubo (cube.js, sem volta) aos 200 m (distância = BR_ZS - pz, 0 no início) =====
    const BR_EV = CONFIG.bridge.events;
    let brTired = false, brExhausted = false, brLoopBusy = false;
    let brNoDash = false, brNoRun = false; // ligadas quando o diálogo dos 119 m / 178,5 m FECHA (bridgeDlgEnd); main.js e graphics.js (botões mobile) as leem
    const BR_TIRED_LINES = [BR_EV.tiredText], BR_EXH_LINES = [BR_EV.exhaustedText], BR_FALL_LINES = [BR_EV.fallText]; // arrays fixos: onDlgEnd (dialogue.js) os reconhece por identidade
    // chamada por onDlgEnd (dialogue.js) ao fechar qualquer diálogo; devolve true se era um diálogo da ponte
    function bridgeDlgEnd() {
        if (DLG_LINES === BR_TIRED_LINES) { brNoDash = true; return true; }
        if (DLG_LINES === BR_EXH_LINES) { brNoRun = true; return true; }
        if (DLG_LINES === BR_FALL_LINES) {
            // fim do "Você caiu" (diálogo estava acima do preto): desce o diálogo, clareia a tela e solta o jogador
            dlgEl.classList.remove('top');
            brLoopBusy = !BR_EV.repeat;
            fallPlay(() => { walkBusy = false; fadeRelease(); }); // audio.js: toca caiu.mp3 com a tela ainda preta e o jogador parado; ao terminar (ou se o som falhar) solta o jogador e clareia com FADE.in
            return true;
        }
        return false;
    }
    // chamada no tick (main.js) dentro de `if (inBridge)`, depois de bridgeClamp(); cada evento dispara uma vez ao cruzar a marca
    function bridgeEvents() {
        if (dlgOn || walkBusy || fading || brLoopBusy)
            return;
        const d = BR_ZS - pz;
        if (!brTired && d >= BR_EV.tiredAt) {
            brTired = true;
            startDlg(BR_TIRED_LINES);
        }
        else if (!brExhausted && d >= BR_EV.exhaustedAt) {
            brExhausted = true;
            startDlg(BR_EXH_LINES);
        }
        else if (!brLoopBusy && d >= BR_EV.loopAt) {
            // fade preto (o mesmo da transição de mundos); no pico do preto volta ao início e abre "Você caiu" ACIMA do preto (#dlg.top); o preto fica até o jogador fechar o diálogo (fadeRun(…, -1) + fadeRelease em bridgeDlgEnd); o tick fica travado por walkBusy
            brLoopBusy = true;
            walkBusy = true;
            fadeRun(() => {
                enterCube(); // cube.js: some com a ponte e o mapa antigo e leva o jogador ao cubo (sem volta à ponte)
                brNoDash = false; brNoRun = false; // dash e correr voltam a funcionar no cubo
                knockdownPlay(() => { // audio.js: derrubou.mp3 com a tela já preta; só depois do som abre o diálogo
                    startDlg(BR_FALL_LINES);
                    dlgEl.classList.add('top');
                });
            }, -1, true); // 3º argumento: preto INSTANTÂNEO (sem fade de entrada)
        }
    }
    // paredes invisíveis da ponte (main.js, tick, depois do movimento/dash): laterais (face interna dos corrimãos, `railW`) e as duas pontas; `wallMargin` = raio do jogador
    function bridgeClamp() {
        const m = BRG.wallMargin, hx = BR_HW - BRG.railW - m;
        px = Math.max(BR_X - hx, Math.min(BR_X + hx, px));
        pz = Math.max(BR_ZE + m, Math.min(BR_ZS - m, pz));
    }