// ===== COLISEUM: hexagono visto por dentro (areia.png no chao, plateia.png inteira em cada parede, portoes com grade nos vertices), sem teto, com ceu de noite (azul, preto e roxo, estrelas, lua no zenite, nuvens escuras) =====
CONFIG.paths.sand = 'assets/areia.jpg';   // chao
CONFIG.paths.crowd = 'assets/plateia.png'; // paredes
CONFIG.coliseum = {
  x: 3000, z: 0,          // centro do cubo (longe das outras areas)
  side: 40,               // aresta do hexagono em m (= raio)
  height: 45,             // altura das paredes em m
  text: 'Você sente uma multidão à espera.',
  fogColor: 0x140c30, fogNear: 70, fogFar: 240, // neblina de noite (roxo bem escuro)
  sky: { sunDir: [0, 1, 0], cloudScale: 4, night: { low: 0x3a1470, mid: 0x101c5c, high: 0x020208, moonSize: 5, stars: .05 } }, // ceu de dia: sunDir = direcao do sol SO no ceu do coliseu (zenite = centralizado no topo; o sunDir global/luzes nao mudam); cloudScale = escala das nuvens (maior = nuvens menores; 4 porque as paredes de 45 m deixam ver so a parte alta do ceu)
  wallMargin: .4,         // folga das paredes invisiveis
  dark: .12,              // brilho do mapa (0..1): multiplica a cor de chao, paredes e portoes (MeshBasicMaterial nao reage a luz, entao o escurecimento e feito na cor); 1 = como as texturas sao
  hemiK: .4,              // intensidade da luz ambiente no coliseu (so braco/espada reagem; 0 = braco preto total, .8 = como antes); o sol, a luz de preenchimento (graphics.js) e a tocha do cubo ficam sempre desligados aqui, so os bracos/espada reagem a luz
  lightOn: {              // LUZES ACENDEM quando o jogador entra na area do centro (uma vez; nao apagam mais)
    radius: 25,           // raio em m da area central (o hexagono tem raio 40 e o portao fica a ~37,6 m do centro)
    time: 1.5,            // s da transicao (mapa vai de `dark` a 1 e a luz ambiente de `hemiK` a `hemiK` daqui)
    hemiK: .8             // luz ambiente (braco/espada) com as luzes acesas; o sol (`dl`) liga junto
    // junto das luzes: toca paths.comemora (plateia) e, quando acaba, paths.luta em loop (audio.js, arenaMusicPlay); as outras musicas ja pararam ao ENTRAR no coliseu (enterColiseum -> arenaMusicStop, fade audio.arenaFadeOut)
  },
  title: {                // TITULO na tela durante a musica da luta (luta.mp3): comeca quando ela comeca; total = fadeIn + hold + fadeOut (15 + 3,5 + 10 = 28,5 s)
    text: 'A Fossa',
    fadeIn: 15,           // s subindo de 0 a 100% de opacidade (totalmente visivel aos 15 s)
    hold: 3.5,            // s totalmente visivel, TREMENDO
    fadeOut: 10,          // s sumindo (de 100% a 0)
    shake: 14,             // amplitude do tremor em px (so durante `hold`)
    top: '20%',           // posicao vertical do titulo na tela
    size: 'min(13vw, 28vh)', // tamanho da fonte (CSS): quase a tela toda
    color: '#ffffff',     // cor do texto (CSS)
    font: "'PixTitle', Impact, fantasy", // PixTitle = assets/pixalpha.ttf (carregada em coliseumTitleShow); fallback Impact
    glow: '0 0 12px #f00, 0 0 30px #c00, 0 0 60px #800, 5px 5px 0 #5a0000' // sombreado vermelho (text-shadow)
  },
  hp: {                   // BARRA DE VIDA no topo esquerdo da tela: aparece (fade in) quando o titulo termina de sumir
    max: 350,             // vida maxima (e inicial) do jogador
    left: 18, top: 18,    // distancia em px das bordas esquerda e de cima (somada a safe-area no celular)
    w: 500, h: 42,        // tamanho da barra em px (no celular a largura e limitada a 60vw)
    color: '#8dff9e',     // cor do preenchimento (verde claro)
    back: '#10301a',      // cor do fundo da barra (parte sem vida)
    border: '#000000',    // cor da borda e da sombra
    showText: true,       // mostra "vida/max" dentro da barra
    fadeIn: .8            // s do fade in ao aparecer
  },
  spawn: { vertex: 0, dist: 2 }, // nascimento: vertice k (0..5, k*60 graus; mesma convencao dos portoes), `dist` m na frente da grade do portao, virado para o centro
  gate: {                 // PORTOES de pedra com grade nos 6 VERTICES (atras da grade, so um bloco preto)
    w: 5.2,               // largura do vao em m (o arco por cima e um semicirculo de raio w/2)
    rectH: 3.2,           // altura da parte reta do vao em m (topo do arco = rectH + w/2)
    frame: 1.6,           // espessura da moldura de pedra em m (laterais e topo); largura total = w + 2*frame
    depth: .8,            // profundidade da moldura em m (limitada para o vao caber dentro do hexagono)
    overlap: .1,          // m que a moldura entra nas paredes, para nao deixar fresta
    tile: 2.5,            // m por repeticao do tijolo (paths.bricks)
    fallback: 0x9a7a55,   // cor da pedra se tijolos.png faltar
    barGap: .3,           // espacamento das barras verticais em m
    barT: .07,            // espessura das barras em m
    barZ: .25,            // recuo das barras em relacao a face da moldura em m
    barColor: 0x5a554d,   // cor do ferro (cinza claro o bastante para aparecer contra o preto)
    margin: .6,           // folga do jogador ao plano do portao (colisao)
    openTime: 1.5,        // s da animacao de ABRIR os 6 portoes (grade sobe)
    openLead: 3           // s ANTES do titulo "A Fossa" terminar de sumir (= antes da barra de vida) em que os portoes comecam a abrir
  },
  fallback: 0x8a8a8a      // cor se areia.png ou plateia.png faltar
};

var inColiseum = false;
var COLI_K = CONFIG.coliseum.dark;      // brilho atual do mapa (dark -> 1 quando as luzes acendem)
var COLI_HEMI = CONFIG.coliseum.hemiK;  // luz ambiente atual do coliseu (lida tambem por graphics.js)
var COLI_MATS = [];                     // {m, fb}: materiais do mapa e cor de reserva (sem textura)
var coliseumLit = false, coliseumLitAt = 0;
function coliseumBright(k) {            // cor = base x k (base = branco com textura, fb sem ela)
  COLI_K = k;
  for (const e of COLI_MATS) { if (e.m.map) e.m.color.setScalar(k); else e.m.color.copy(e.fb).multiplyScalar(k); }
}
var COLISEUM = new THREE.Group();
COLISEUM.visible = false;
scene.add(COLISEUM);

(function () {
  const C = CONFIG.coliseum, R = C.side, H = C.height;
  const mk = url => {
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(C.fallback).multiplyScalar(C.dark), side: THREE.FrontSide, fog: true });
    new THREE.TextureLoader().load(url, t => {
      t.magFilter = THREE.NearestFilter;
      t.minFilter = THREE.NearestFilter;
      mat.map = t; mat.color.setScalar(COLI_K); mat.needsUpdate = true;
    }, undefined, () => {});
    COLI_MATS.push({ m: mat, fb: new THREE.Color(C.fallback) });
    return mat;
  };
  const matF = mk(CONFIG.paths.sand), matW = mk(CONFIG.paths.crowd);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(R, 6), matF);
  floor.rotation.x = -Math.PI / 2; floor.position.set(C.x, 0, C.z); floor.frustumCulled = false;
  COLISEUM.add(floor);
  const ap = R * Math.sqrt(3) / 2;
  for (let k = 0; k < 6; k++) {
    const th = (k * 60 + 30) * Math.PI / 180, c = Math.cos(th), s = Math.sin(th);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(R, H), matW);
    m.position.set(C.x + c * ap, H / 2, C.z + s * ap);
    m.rotation.y = Math.atan2(-c, -s);
    m.frustumCulled = false;
    COLISEUM.add(m);
  }
})();

// ===== COLISEUM GATES: portoes de pedra com grade nos 6 vertices (atras da grade, so um bloco preto) =====
// Cada portao fica logo DENTRO do vertice, de parede a parede: no vertice as paredes formam 120 graus, entao a
// distancia dV do vertice ao plano do portao e escolhida para o hexagono ter ali exatamente a largura da moldura.
var COLI_GRID = null, coliseumGatesOpened = false;
var COLISEUM_GATES = []; // {c, s, lim}: direcao do vertice (x,z) e distancia maxima do jogador ao centro nessa direcao
(function () {
  const C = CONFIG.coliseum, G = C.gate, R = C.side, S3 = Math.sqrt(3);
  const hw = G.w / 2, W = G.w + 2 * G.frame, top = G.rectH + hw;   // meia-largura do vao, largura da moldura, topo do arco
  const dV = (W - G.overlap) / (2 * S3);                            // vertice -> plano do portao (largura do hexagono ali = W - overlap)
  const rg = R - dV;                                                // centro -> plano do portao
  const fd = Math.min(G.depth, dV - hw / S3 - .02);                 // profundidade da moldura: o vao tem que caber no hexagono ate o fundo dela
  // pedra: moldura em forma de arco (um unico contorno, sem furo) extrudada para tras; UV em metros -> repeat 1/tile
  const stone = new THREE.MeshBasicMaterial({ color: new THREE.Color(G.fallback).multiplyScalar(C.dark), side: THREE.FrontSide, fog: true });
  COLI_MATS.push({ m: stone, fb: new THREE.Color(G.fallback) });
  if (CONFIG.paths.bricks) new THREE.TextureLoader().load(CONFIG.paths.bricks, t => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / G.tile, 1 / G.tile);
    t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
    stone.map = t; stone.color.setScalar(COLI_K); stone.needsUpdate = true;
  }, undefined, () => {});
  const sh = new THREE.Shape(), NA = 14;
  sh.moveTo(-W / 2, 0); sh.lineTo(-hw, 0); sh.lineTo(-hw, G.rectH);
  for (let j = 1; j < NA; j++) { const a = Math.PI - Math.PI * j / NA; sh.lineTo(hw * Math.cos(a), G.rectH + hw * Math.sin(a)); }
  sh.lineTo(hw, G.rectH); sh.lineTo(hw, 0); sh.lineTo(W / 2, 0);
  sh.lineTo(W / 2, top + G.frame); sh.lineTo(-W / 2, top + G.frame); sh.lineTo(-W / 2, 0);
  const fg = new THREE.ExtrudeGeometry(sh, { depth: fd, bevelEnabled: false, steps: 1 });
  fg.translate(0, 0, -fd);                                          // face da frente em z = 0 (plano do portao), fundo em z = -fd
  // bloco preto atras da grade (a frente rente ao fundo da moldura; o que passa das paredes fica escondido atras delas)
  const bh = top + .5;
  const blk = new THREE.Mesh(new THREE.BoxGeometry(G.w + 1, bh, .4), new THREE.MeshBasicMaterial({ color: 0x000000, fog: false }));
  blk.position.set(0, bh / 2, -fd - .2);
  // grade: barras verticais (topo acompanha o arco), 3 travessas e o arco em segmentos; tudo num unico InstancedMesh
  const bz = -G.barZ, it = [];                                      // [x, y, z, giro em z, escala x, y, z] no espaco do portao
  const nb = Math.max(2, Math.round(G.w / G.barGap)), sp = G.w / nb;
  for (let i = 1; i < nb; i++) {
    const x = -hw + i * sp, h = G.rectH + Math.sqrt(Math.max(0, hw * hw - x * x)) - .06;
    it.push([x, h / 2, bz, 0, G.barT, h, G.barT]);
  }
  for (const y of [.35, G.rectH * .55, G.rectH]) it.push([0, y, bz, 0, G.w, G.barT * 1.5, G.barT * 1.5]);
  const rr = hw - .04, NS = 14;
  for (let j = 0; j < NS; j++) {
    const a0 = Math.PI * j / NS, a1 = Math.PI * (j + 1) / NS, am = (a0 + a1) / 2;
    it.push([rr * Math.cos(am), G.rectH + rr * Math.sin(am), bz, am + Math.PI / 2, 2 * rr * Math.sin((a1 - a0) / 2) * 1.04, G.barT * 1.5, G.barT * 1.5]);
  }
  // plano de corte: a grade que sobe some no topo da moldura (y > top + frame), sem aparecer acima do portao
  renderer.localClippingEnabled = true;
  const barM = new THREE.MeshBasicMaterial({ color: new THREE.Color(G.barColor).multiplyScalar(C.dark), fog: true, clippingPlanes: [new THREE.Plane(new THREE.Vector3(0, -1, 0), top + G.frame - .05)] });
  COLI_MATS.push({ m: barM, fb: new THREE.Color(G.barColor) });
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), barM, it.length * 6);
  im.frustumCulled = false; // r128 nao calcula a esfera de culling das instancias
  const gm = new THREE.Matrix4(), lm = new THREE.Matrix4(), mm = new THREE.Matrix4(), q = new THREE.Quaternion(), qz = new THREE.Quaternion(),
    p = new THREE.Vector3(), pl = new THREE.Vector3(), sc = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1),
    AX = new THREE.Vector3(0, 0, 1), eu = new THREE.Euler();
  let n = 0;
  for (let k = 0; k < 6; k++) {
    const ph = k * 60 * Math.PI / 180, c = Math.cos(ph), s = Math.sin(ph); // vertice k: mesma convencao (x,z) das paredes (k*60+30)
    const gx = C.x + c * rg, gz = C.z + s * rg, ry = Math.atan2(-c, -s);  // +z local aponta para o centro, como nas paredes
    const g = new THREE.Group();
    g.position.set(gx, 0, gz); g.rotation.y = ry;
    g.add(new THREE.Mesh(fg, stone)); g.add(blk.clone());
    COLISEUM.add(g);
    gm.compose(p.set(gx, 0, gz), q.setFromEuler(eu.set(0, ry, 0)), one);
    for (const o of it) {
      lm.compose(pl.set(o[0], o[1], o[2]), qz.setFromAxisAngle(AX, o[3]), sc.set(o[4], o[5], o[6]));
      im.setMatrixAt(n++, mm.multiplyMatrices(gm, lm));
    }
    COLISEUM_GATES.push({ c, s, lim: rg - G.margin });
  }
  im.instanceMatrix.needsUpdate = true;
  COLISEUM.add(im);
  COLI_GRID = { im, base: im.instanceMatrix.array.slice(), lift: top + .3 }; // matrizes originais + quanto subir (acima de todo o vao)
})();

// Descarta tudo que e do cubo/corredor (sem volta)
function coliseumDispose(o) {
  o.traverse(n => {
    if (n.geometry) n.geometry.dispose();
    const ms = n.material ? (Array.isArray(n.material) ? n.material : [n.material]) : [];
    for (const m of ms) {
      for (const k in m) if (m[k] && m[k].isTexture) m[k].dispose();
      m.dispose();
    }
  });
}

function enterColiseum() {
  const C = CONFIG.coliseum;
  inColiseum = true;
  arenaMusicStop(CONFIG.audio.arenaFadeOut); // todas as musicas param ao entrar no coliseu (fade out)
  // some o cubo antigo
  scene.remove(CUBE); coliseumDispose(CUBE);
  if (typeof CUBE_LAMPS !== 'undefined') for (const l of CUBE_LAMPS) scene.remove(l);
  COLISEUM.visible = true;
  // ceu de NOITE: o mesmo shader do jogo em modo noite do coliseu (uNg = 1: azul/preto/roxo mesclados, estrelas, lua branca no zenite, nuvens escuras com borda iluminada), sem o tom noturno da ponte (uNk) nem escurecimento
  sky.visible = true;
  const U = sky.material && sky.material.uniforms;
  if (U) {
    if (U.uNk) U.uNk.value = 0;
    if (U.uDk) U.uDk.value = 0;
    if (U.uDay) U.uDay.value = 0;
    if (U.uNg) {
      const N = C.sky.night;
      U.uNg.value = 1;
      U.uNl.value.set(N.low); U.uNm.value.set(N.mid); U.uNh.value.set(N.high);
      U.uMoon.value = Math.cos(N.moonSize * Math.PI / 180);
      U.uStar.value = N.stars;
    }
    if (U.uCs) U.uCs.value = C.sky.cloudScale;
    if (U.sd) U.sd.value.set(C.sky.sunDir[0], C.sky.sunDir[1], C.sky.sunDir[2]).normalize(); // so o vetor do ceu; sunDir global (luz, sombras, agua) nao e tocado
  }
  FOG_OBJ.color.set(C.fogColor); FOG_OBJ.near = C.fogNear; FOG_OBJ.far = C.fogFar;
  scene.background = new THREE.Color(C.fogColor);
  // luzes APAGADAS: ambiente = coliseum.hemiK (0), sol desligado, tocha do cubo (presa a camera) removida e luz de preenchimento do graphics.js desligada (gfxCave le inColiseum). O mapa escuro vem de coliseum.dark (cor dos materiais)
  hemi.color.set(0x9aa4ff); hemi.intensity = COLI_HEMI;
  dl.visible = false;
  if (typeof CUBE_TORCH !== 'undefined') cam.remove(CUBE_TORCH);
  if (typeof gfxCave === 'function' && gfxCave) gfxCave(true);
  // chao/colisao/interacoes do cubo viram as do coliseu (sem editar main.js/impact.js)
  cubeGround = () => 0;
  cubeClamp = function () {
    const lim = C.side * Math.sqrt(3) / 2 - C.wallMargin;
    for (let k = 0; k < 6; k++) {
      const th = (k * 60 + 30) * Math.PI / 180, c = Math.cos(th), s = Math.sin(th);
      const d = (px - C.x) * c + (pz - C.z) * s;
      if (d > lim) { px -= (d - lim) * c; pz -= (d - lim) * s; }
    }
    // portoes dos vertices: tudo alem do plano do portao e o canto atras da grade, o jogador para na grade
    for (const g of COLISEUM_GATES) {
      const d = (px - C.x) * g.c + (pz - C.z) * g.s;
      if (d > g.lim) { px -= (d - g.lim) * g.c; pz -= (d - g.lim) * g.s; }
    }
    nearD = nearD2 = nearD3 = nearKey = false;
    // AREA CENTRAL: ao entrar (raio lightOn.radius) as luzes acendem aos poucos e ficam acesas
    const L = C.lightOn;
    if (!coliseumLit) {
      const dx = px - C.x, dz = pz - C.z;
      if (dx * dx + dz * dz <= L.radius * L.radius) { coliseumLit = true; coliseumLitAt = performance.now(); arenaMusicPlay(); }
    }
    if (coliseumLit && COLI_K < 1) {
      let k = Math.min(1, (performance.now() - coliseumLitAt) / (L.time * 1000));
      k = k * k * (3 - 2 * k);
      coliseumBright(C.dark + (1 - C.dark) * k);
      COLI_HEMI = C.hemiK + (L.hemiK - C.hemiK) * k;
      hemi.intensity = COLI_HEMI;
      dl.visible = k > 0;
    }
  };
  // golpe: som de pedra so quando o ponto atingido esta na parede do coliseu
  cubeWallHit = function (x, z) {
    const lim = C.side * Math.sqrt(3) / 2 - .1;
    for (let k = 0; k < 6; k++) {
      const th = (k * 60 + 30) * Math.PI / 180;
      if ((x - C.x) * Math.cos(th) + (z - C.z) * Math.sin(th) >= lim) return true;
    }
    for (const g of COLISEUM_GATES) if ((x - C.x) * g.c + (z - C.z) * g.s >= g.lim + C.gate.margin - .1) return true; // grade do portao
    return false;
  };
  coliseumDoorUse = function () {};
  // spawn num VERTICE, a `spawn.dist` m na frente da grade do portao, virado para o centro (forward = (-sin yaw, -cos yaw); yaw = 0 olha para -z)
  const sg = COLISEUM_GATES[C.spawn.vertex % 6], sd = sg.lim - C.spawn.dist;
  px = C.x + sg.c * sd; pz = C.z + sg.s * sd; py = 0; vy = 0; yaw = Math.atan2(sg.c, sg.s); pitch = 0;
  // dialogo sobre o preto; ao fechar, o fade sai
  const d = document.getElementById('dlg');
  d.classList.add('top');
  startDlg([C.text]);
  const wait = () => {
    if (dlgOn) return requestAnimationFrame(wait);
    d.classList.remove('top');
    walkBusy = false;
    fadeRelease();
    setTimeout(() => { document.getElementById('fade').style.background = ''; },
      ((CONFIG.fade && CONFIG.fade.in) || 600) + 150);
  };
  requestAnimationFrame(wait);
}

// A porta do fim do corredor: fade PRETO (o padrao do #fade) + dialogo, entra no coliseu
function coliseumDoorUse() {
  if (inColiseum || fading) return;
  walkBusy = true;
  fadeRun(enterColiseum, -1);
}

// ===== COLISEUM TITLE: titulo "A Fossa" durante os 28,5 s iniciais da luta.mp3 (chamado por lutaBgmStart, audio.js; uma vez so) =====
// Div fixo criado em JS (nao precisa de index.html/style.css), fonte PixTitle (assets/pixalpha.ttf, via FontFace) com sombreado vermelho (title.glow): fade in (fadeIn s) -> totalmente visivel e TREMENDO (hold s) -> fade out (fadeOut s) -> removido
var coliseumTitleOn = false;
function coliseumTitleShow() {
  if (coliseumTitleOn) return;
  coliseumTitleOn = true;
  const T = CONFIG.coliseum.title;
  const el = document.createElement('div');
  el.textContent = T.text;
  try { const f = new FontFace('PixTitle', 'url(assets/pixalpha.ttf)'); f.load().then(ff => document.fonts.add(ff)); } catch (e) {}
  el.style.cssText = 'position:fixed;left:0;right:0;top:' + T.top + ';text-align:center;z-index:20;pointer-events:none;opacity:0;font-family:' + T.font + ';font-weight:900;letter-spacing:.06em;white-space:nowrap;line-height:1;' +
    'color:' + T.color + ';font-size:' + T.size + ';text-shadow:' + T.glow + ';';
  document.body.appendChild(el);
  const t0 = performance.now(), tIn = T.fadeIn * 1000, tHold = tIn + T.hold * 1000, tEnd = tHold + T.fadeOut * 1000;
  const T0LEAD = CONFIG.coliseum.gate.openLead * 1000;
  let last = 0;
  const step = now => {
    const e = now - t0;
    if (e >= tEnd - T0LEAD) coliseumGatesOpen(); // um pouco antes da barra de vida: abre os portoes
    if (e >= tEnd) { el.remove(); coliseumHpShow(); return; } // titulo sumiu -> aparece a barra de vida
    el.style.opacity = e < tIn ? e / tIn : e < tHold ? 1 : 1 - (e - tHold) / (tEnd - tHold);
    if (e >= tIn && e < tHold) {
      if (now - last > 35) { // tremor ~28 vezes por segundo
        last = now;
        el.style.transform = 'translate(' + ((Math.random() * 2 - 1) * T.shake).toFixed(1) + 'px,' + ((Math.random() * 2 - 1) * T.shake).toFixed(1) + 'px)';
      }
    }
    else if (el.style.transform)
      el.style.transform = '';
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
// ===== COLISEUM HP: barra de vida do jogador (topo esquerdo, verde claro, 350 hp); aparece quando o titulo "A Fossa" some =====
// Div criado em JS (nao precisa de index.html/style.css). Valores em CONFIG.coliseum.hp. API global: PLAYER_HP / PLAYER_HP_MAX,
// coliseumHpSet(v) (define a vida, 0..max), coliseumDamage(n) (tira n) e coliseumHeal(n) (cura n). Nada no jogo causa dano ainda: use essas funcoes.
var PLAYER_HP_MAX = CONFIG.coliseum.hp.max, PLAYER_HP = PLAYER_HP_MAX;
var coliseumHpOn = false, COLI_HP_FILL = null, COLI_HP_TXT = null;
function coliseumHpSet(v) {
  PLAYER_HP = Math.max(0, Math.min(PLAYER_HP_MAX, v));
  if (!COLI_HP_FILL) return;
  COLI_HP_FILL.style.width = (PLAYER_HP / PLAYER_HP_MAX * 100) + '%';
  if (COLI_HP_TXT) COLI_HP_TXT.textContent = Math.ceil(PLAYER_HP) + ' / ' + PLAYER_HP_MAX;
}
function coliseumDamage(n) { coliseumHpSet(PLAYER_HP - n); }
function coliseumHeal(n) { coliseumHpSet(PLAYER_HP + n); }
function coliseumHpShow() {
  if (coliseumHpOn) return;
  coliseumHpOn = true;
  coliseumGatesOpen();
  const B = CONFIG.coliseum.hp;
  const st = document.createElement('style'); // some junto com o resto da UI (body.noui) e cabe em telas estreitas
  st.textContent = 'body.noui #hpbar{display:none!important}';
  document.head.appendChild(st);
  const el = document.createElement('div');
  el.id = 'hpbar';
  el.style.cssText = 'position:fixed;z-index:20;pointer-events:none;opacity:0;transition:opacity ' + B.fadeIn + 's;' +
    'left:calc(' + B.left + 'px + env(safe-area-inset-left,0px));top:calc(' + B.top + 'px + env(safe-area-inset-top,0px));' +
    'width:min(' + B.w + 'px,60vw);height:' + B.h + 'px;background:' + B.back + ';border:3px solid ' + B.border + ';box-shadow:3px 3px 0 ' + B.border + ';overflow:hidden;';
  const fill = document.createElement('div');
  fill.style.cssText = 'position:absolute;left:0;top:0;bottom:0;width:100%;background:' + B.color + ';box-shadow:inset 0 -5px 0 rgba(0,0,0,.18);transition:width .2s;';
  el.appendChild(fill);
  COLI_HP_FILL = fill;
  if (B.showText) {
    const tx = document.createElement('div');
    tx.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:700 ' + Math.round(B.h * .5) + "px 'Silkscreen',ui-monospace,monospace;color:#fff;text-shadow:2px 2px 0 #000;";
    el.appendChild(tx);
    COLI_HP_TXT = tx;
  }
  document.body.appendChild(el);
  coliseumHpSet(PLAYER_HP);
  requestAnimationFrame(() => requestAnimationFrame(() => { el.style.opacity = 1; })); // 2 rAF para a transicao de opacidade rodar
}

// ===== COLISEUM GATES OPEN: abre os 6 portoes (grade sobe) quando a barra de vida aparece (chamado por coliseumHpShow; uma vez so) =====
// A grade e um InstancedMesh: soma-se dy (m) ao y de cada instancia a partir das matrizes originais; o plano de corte esconde o que passa do topo da moldura.
// A colisao (COLISEUM_GATES) continua: atras da grade so existe o bloco preto. Valores em CONFIG.coliseum.gate (openTime, openLead).
// Disparo: coliseumTitleShow, `openLead` s antes do titulo acabar; coliseumHpShow chama de novo so como garantia (uma vez so).
function coliseumGatesOpen() {
  if (coliseumGatesOpened || !COLI_GRID) return;
  coliseumGatesOpened = true;
  const G = CONFIG.coliseum.gate, g = COLI_GRID, arr = g.im.instanceMatrix.array, n = arr.length / 16;
  let t0 = 0;
  const step = now => {
    if (!t0) t0 = now;
    let k = Math.min(1, (now - t0) / (G.openTime * 1000));
    k = k * k * (3 - 2 * k); // suaviza inicio e fim
    const dy = g.lift * k;
    for (let i = 0; i < n; i++) arr[i * 16 + 13] = g.base[i * 16 + 13] + dy; // elemento 13 = translacao y da matriz
    g.im.instanceMatrix.needsUpdate = true;
    if (now - t0 < G.openTime * 1000) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}