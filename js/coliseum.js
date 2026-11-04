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
  hqEnv: true,            // gráfico ALTO: braço/espada refletem o céu de NOITE do coliseu (cubemap recapturado em gfxCave, graphics.js); false = sem reflexo
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
    max: 200,             // vida maxima (e inicial) do jogador
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
  dmgFx: {                // EFEITOS de dano no jogador (bloco COLISEUM HP: coliseumDamageFx, chamado por coliseumDamage)
    text: '#ff3b3b',      // cor do "-dano" que aparece embaixo da barra de vida
    textSize: .7,         // tamanho da fonte do "-dano" = textSize x altura da barra de vida
    textTime: 1.1,        // s do "-dano" na tela (fica parado um pouco e some descendo)
    vignette: 'rgba(210,0,0,.7)', // cor da VINHETA vermelha (nas bordas da tela; CSS)
    vigInner: 38,         // % do raio da tela em que a vinheta comeca (maior = vinheta mais fina)
    vigTime: .7           // s da vinheta sumindo
  },
  gameOver: {             // GAME OVER quando a vida chega a 0 (bloco COLISEUM GAME OVER): tela escurece em preto e aparece o texto
    text: 'GAME OVER',    // texto (mesma fonte, cor e sombreado do titulo `title`)
    fadeIn: .2,           // s para a tela ficar toda preta
    textFadeIn: 1.5,      // s do fade in do texto (comeca quando a tela ja esta preta)
    size: 'min(11vw, 24vh)', // tamanho da fonte (CSS)
    hint: 'Enter ou Espaço para voltar', // dica pequena embaixo ('' = sem dica); no celular, tocar na tela tambem volta
    hintSize: 'min(3.2vw, 5vh)'
  },
  cubes: {                // CUBOS VERDES que saem dos 6 portoes e perseguem o jogador (bloco COLISEUM CUBES)
    delay: 29,            // segundo da luta.mp3 em que sai a 1a leva (medido no relogio do audio, actx.currentTime, que a pausa congela junto com a musica; sem audio, cai para o tempo do jogo)
    gap: 0,               // s de espera DEPOIS que todos os cubos da leva anterior morrerem, ate sair a proxima (0 = sai na hora; a proxima leva so sai quando a anterior acaba)
    waves: 3,             // qtd. de levas (1 goblin por portao em cada: 3 x 6 = 18 goblins)
    height: 1.7,          // altura do goblin em m (a hitbox e um circulo de raio height/2)
    speedK: 1,            // velocidade = speedK x player.walk (1 = velocidade de andar do jogador)
    damage: 20,           // dano por contato (coliseumDamage)
    cooldown: 2,          // s ate o MESMO cubo poder causar dano de novo (ele continua perseguindo)
    hits: 3,              // golpes de espada para destruir um cubo
    playerR: .4,          // raio do corpo do jogador: o cubo NAO entra nele (fica a, no minimo, meia aresta + playerR do centro do jogador)
    hitPad: .5,           // alcance extra do ATAQUE alem do corpo: o cubo causa dano a ate meia aresta + playerR + hitPad m do centro do jogador (sem isso, cubos em anel em volta do jogador nunca o tocariam)
    spawnBack: 1,         // m ATRAS do plano do portao onde o cubo nasce (entre a grade e o bloco preto)
    color: 0x2ecc40,      // verde
    emissive: 0x0b3a12,   // brilho proprio (nao fica preto fora da luz)
    coolColor: 0x1d6b27,  // verde escuro enquanto o cubo esta em cooldown
    flashTime: .15,       // s do clarao branco ao levar um golpe
    bodyK: 1,             // colisao entre cubos: distancia minima entre centros = bodyK x aresta (1 = encostam sem se atravessar)
    playerKnock: { speed: 14, time: .3 }, // KNOCKBACK do JOGADOR ao levar dano de um cubo: empurrao inicial em m/s (cai linear a 0) durante `time` s (~2,1 m), para longe do cubo; as paredes/portoes ainda o seguram
    knock: { speed: 16, time: .3 }, // KNOCKBACK ao levar golpe de espada: empurrao inicial em m/s (cai linear a 0) durante `time` s (~2,4 m); o cubo fica atordoado (nao persegue) e volta a perseguir aos poucos
    healOnKill: 10,       // vida recuperada ao matar cada goblin (coliseumHeal; aparece "+n" verde junto dos danos)
    smoke: { time: .8, puffs: 8, color: 0x9a9a9a, rise: 1, grow: 2.6 }, // FUMACA ao morrer: duracao s, qtd. de nuvens, cor, subida (x altura), crescimento (x)
    goblin: { cloth: 0x6b4423, eye: 0xe6d44a },                         // cores extras do goblin: couro/tanga e olhos (a pele e `color`/`emissive`)
    goblinAnim: { time: .45, reach: .9, runRate: 12, swing: .9, lean: .25 } // animacao: ataque (s), alcance extra que dispara o ataque (m), passada (rad/s), amplitude das pernas (rad), inclinacao do tronco (rad)
  },
  area: {                 // ATAQUE EM AREA (botao direito do mouse / botao AREA no celular; so no coliseu; coliseumCubesArea): atinge TODOS os cubos num raio em volta do jogador
    radius: 4,            // alcance em m a partir do jogador (alem da meia aresta do cubo), em qualquer direcao
    damage: 2,            // dano em golpes (o golpe normal da 1; o cubo morre com cubes.hits = 3)
    cooldown: 5           // s de recarga depois de usar
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
// ===== COLISEUM HP: barra de vida do jogador (topo esquerdo, verde claro, 200 hp); aparece quando o titulo "A Fossa" some =====
// Div criado em JS (nao precisa de index.html/style.css). Valores em CONFIG.coliseum.hp. API global: PLAYER_HP / PLAYER_HP_MAX,
// coliseumHpSet(v) (define a vida, 0..max), coliseumDamage(n) (tira n) e coliseumHeal(n) (cura n). Nada no jogo causa dano ainda: use essas funcoes.
var PLAYER_HP_MAX = CONFIG.coliseum.hp.max, PLAYER_HP = PLAYER_HP_MAX;
var coliseumHpOn = false, COLI_HP_FILL = null, COLI_HP_TXT = null;
function coliseumHpSet(v) {
  PLAYER_HP = Math.max(0, Math.min(PLAYER_HP_MAX, v));
  if (PLAYER_HP <= 0 && inColiseum) coliseumGameOver(); // vida zerada: game over (bloco COLISEUM GAME OVER); a funcao tem guarda de uma vez so
  if (!COLI_HP_FILL) return;
  COLI_HP_FILL.style.width = (PLAYER_HP / PLAYER_HP_MAX * 100) + '%';
  if (COLI_HP_TXT) COLI_HP_TXT.textContent = Math.ceil(PLAYER_HP) + ' / ' + PLAYER_HP_MAX;
}
function coliseumDamage(n) { coliseumDamageFx(n); coliseumHpSet(PLAYER_HP - n); }
// EFEITOS de dano (valores em CONFIG.coliseum.dmgFx): "-n" em vermelho logo EMBAIXO da barra de vida (#dmgtxt, posicao lida do #hpbar a cada dano; varios danos juntos empilham)
// e VINHETA vermelha nas bordas da tela (#dmgvig, z-index 19, abaixo do titulo/barra 20 e do game over 24). Elementos criados em JS na 1a vez; somem com body.noui.
var COLI_DMG_BOX = null, COLI_DMG_VIG = null;
function coliseumDamageFx(n, heal) { // heal = true: mostra "+n" (verde) no mesmo lugar/empilhamento do dano, sem vinheta (chamado por coliseumHeal)
  if (!(n > 0) || coliGameOver) return;
  const F = CONFIG.coliseum.dmgFx, B = CONFIG.coliseum.hp;
  if (!COLI_DMG_VIG) {
    const st = document.createElement('style');
    st.textContent = 'body.noui #dmgtxt,body.noui #dmgvig{display:none!important}';
    document.head.appendChild(st);
    COLI_DMG_VIG = document.createElement('div');
    COLI_DMG_VIG.id = 'dmgvig';
    COLI_DMG_VIG.style.cssText = 'position:fixed;inset:0;z-index:19;pointer-events:none;opacity:0;background:radial-gradient(ellipse at center,rgba(0,0,0,0) ' + F.vigInner + '%,' + F.vignette + ' 100%);';
    COLI_DMG_BOX = document.createElement('div');
    COLI_DMG_BOX.id = 'dmgtxt';
    document.body.append(COLI_DMG_VIG, COLI_DMG_BOX);
  }
  const bar = document.getElementById('hpbar'), r = bar ? bar.getBoundingClientRect() : null; // embaixo da barra (some se a barra ainda nao existe: usa a posicao padrao)
  const left = r ? r.left : B.left, top = r ? r.bottom + 6 : B.top + B.h + 12, fs = Math.round((r ? r.height - 6 : B.h) * F.textSize);
  COLI_DMG_BOX.style.cssText = 'position:fixed;z-index:20;pointer-events:none;display:flex;flex-direction:column;left:' + left + 'px;top:' + top + 'px;';
  const t = document.createElement('div');
  t.textContent = (heal ? '+' : '-') + Math.round(n);
  t.style.cssText = 'font:700 ' + fs + "px 'Silkscreen',ui-monospace,monospace;color:" + (heal ? (F.healText || B.color) : F.text) + ';text-shadow:2px 2px 0 #000;line-height:1.15;';
  COLI_DMG_BOX.appendChild(t);
  const a = t.animate([{ opacity: 1, transform: 'translateY(0)' }, { opacity: 1, transform: 'translateY(0)', offset: .4 }, { opacity: 0, transform: 'translateY(10px)' }], { duration: F.textTime * 1000, easing: 'ease-out' });
  a.onfinish = () => t.remove();
  if (!heal) COLI_DMG_VIG.animate([{ opacity: 1 }, { opacity: 0 }], { duration: F.vigTime * 1000, easing: 'ease-out' }); // base opacity 0: volta a 0 sozinha
}
function coliseumHeal(n) { const g = Math.min(n, PLAYER_HP_MAX - PLAYER_HP); coliseumHpSet(PLAYER_HP + n); if (g > 0) coliseumDamageFx(g, true); } // cura: mostra "+g" (g = o que realmente subiu, limitado ao maximo) junto dos numeros de dano
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

// ===== COLISEUM CUBES: cubos verdes que saem dos portoes e perseguem o jogador (valores em CONFIG.coliseum.cubes) =====
// coliseumCubesStart() e chamada por lutaBgmStart (audio.js; uma vez so); coliseumCubesUpdate(dt) roda no tick (main.js, so com o jogo ativo);
// coliseumCubesHit(fx, fz) e chamada no inicio de impactHit (impact.js) e devolve true se o golpe acertou um cubo (3 golpes matam).
// 1a leva `delay` s depois do inicio da luta; cada leva seguinte so sai quando TODOS os cubos da anterior acabaram (+ `gap` s) (tempo acumulado do tick: a pausa congela). Cada cubo sai atras da grade (ja levantada), anda reto para fora do vao
// e depois persegue (px, pz) a `player.walk` x `speedK`. Contato (e py abaixo do topo do cubo: o pulo passa por cima) = coliseumDamage(damage) e
// `cooldown` s ate esse cubo causar dano de novo. Nao ha morte do jogador (vida 0 so zera a barra).
var COLI_CUBES = [], coliCubesOn = false, coliCubesT = 0, coliCubesWave = 0, coliCubesClear = 0, coliCubesGeo = null, coliCubesA0 = null; // coliCubesA0 = actx.currentTime quando a luta.mp3 comecou
var coliVictory = false; // true depois que o ultimo goblin da ultima leva morreu (arenaVictory ja chamada)
var PLAYER_BLOCK = false; // BLOQUEIO (tecla F / botao mobile): true enquanto segurado; anula TODO dano e knockback dos cubos e (no main.js) impede correr, atacar e dar dash. Quem liga/desliga: input.js (F) e graphics.js (botao mobile)
var PLAYER_KNOCK = { x: 0, z: 0, t: 0 }; // empurrao do jogador ao levar dano de um cubo (dir. unitaria + s restantes); aplicado por coliseumPlayerKnock (main.js, antes das colisoes)
function coliseumCubesStart() { if (coliCubesOn) return; coliCubesOn = true; coliVictory = false; coliCubesT = 0; coliCubesWave = 0; coliCubesClear = 0; try { coliCubesA0 = actx ? actx.currentTime : null; } catch (e) { coliCubesA0 = null; } }
function coliseumPlayerKnock(dt) {
  if (PLAYER_KNOCK.t <= 0) return;
  const P = CONFIG.coliseum.cubes.playerKnock, k = PLAYER_KNOCK.t / P.time;
  px += PLAYER_KNOCK.x * P.speed * k * dt; pz += PLAYER_KNOCK.z * P.speed * k * dt;
  PLAYER_KNOCK.t -= dt;
}
// GOBLIN LOW POLY (sem animacao): grupo de altura 1 (pes em y=-.5, olhando para +z), escalado por `size` no spawn. Geometrias compartilhadas
// (coliCubesGeo = objeto de geometrias), 3 materiais por goblin: pele (K.color/K.emissive/coolColor), couro/tanga e olhos. Cores extras: CONFIG.coliseum.cubes.goblin = { cloth, eye } (opcional).
function coliseumGoblinGeos() {
  const f = g => { g = g.toNonIndexed(); g.computeVertexNormals(); return g; };   // normais por face = visual facetado
  const ico = r => new THREE.IcosahedronGeometry(r, 0);
  return {
    head: ico(.17), eye: ico(.035), hand: ico(.055), belly: ico(.2),
    leg: f(new THREE.CylinderGeometry(.065, .05, .3, 5)), foot: new THREE.BoxGeometry(.15, .08, .22),
    torso: f(new THREE.CylinderGeometry(.19, .15, .34, 6)), belt: f(new THREE.CylinderGeometry(.2, .2, .06, 6)), skirt: f(new THREE.CylinderGeometry(.2, .27, .12, 6)),
    arm: f(new THREE.CylinderGeometry(.05, .04, .3, 5)), bracer: f(new THREE.CylinderGeometry(.058, .058, .05, 5)),
    ear: f(new THREE.ConeGeometry(.06, .22, 4)), nose: f(new THREE.ConeGeometry(.04, .12, 4))
  };
}
function coliseumGoblin(K) {
  const G = coliCubesGeo || (coliCubesGeo = coliseumGoblinGeos()), X = Object.assign({ cloth: 0x6b4423, eye: 0xe6d44a }, K.goblin || {});
  const skin = new THREE.MeshLambertMaterial({ color: K.color, emissive: K.emissive });
  const cloth = new THREE.MeshLambertMaterial({ color: X.cloth, emissive: 0x000000 });
  const eye = new THREE.MeshLambertMaterial({ color: X.eye, emissive: 0x2a2a00 });
  const grp = new THREE.Group();
  const pivot = (par, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); par.add(g); return g; };
  const add = (par, geo, mat, x, y, z, rx, ry, rz, sx, sy, sz) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, rz || 0); m.scale.set(sx || 1, sy || 1, sz || 1); par.add(m); return m;
  };
  // ARTICULACOES (animadas por coliseumGoblinAnim): body = quadril (inclina o tronco; pivo em y=-.2), legL/legR = quadris, armL/armR = ombros (filhos de body)
  const body = pivot(grp, 0, -.2, 0), rig = { body };
  rig.legL = pivot(grp, -.1, -.2, 0); rig.legR = pivot(grp, .1, -.2, 0);
  rig.armL = pivot(body, -.24, .32, 0); rig.armR = pivot(body, .24, .32, 0);
  rig.armL.rotation.z = -.15; rig.armR.rotation.z = .15;
  for (const [leg, arm, s] of [[rig.legL, rig.armL, -1], [rig.legR, rig.armR, 1]]) {
    add(leg, G.leg, skin, 0, -.15, 0);                                  // pernas
    add(leg, G.foot, cloth, 0, -.26, .04);                              // botas
    add(arm, G.arm, skin, 0, -.14, 0);                                  // bracos
    add(arm, G.bracer, cloth, s * .015, -.24, 0);                       // braceletes
    add(arm, G.hand, skin, s * .028, -.31, 0);                          // maos
    add(body, G.ear, skin, s * .25, .55, 0, 0, 0, -s * 1.1);            // orelhas pontudas
    add(body, G.eye, eye, s * .075, .51, .15);                          // olhos
  }
  add(body, G.torso, skin, 0, .17, 0);
  add(body, G.belly, skin, 0, .12, .03, 0, 0, 0, 1, .9, 1.05);          // barriga
  add(body, G.belt, cloth, 0, .03, 0);                                  // cinto
  add(body, G.skirt, cloth, 0, -.05, 0);                                // tanga
  add(body, G.head, skin, 0, .49, 0, 0, 0, 0, 1.05, .95, 1);            // cabeca grande
  add(body, G.nose, skin, 0, .47, .21, Math.PI / 2);                    // nariz
  return { grp, mats: [skin, cloth, eye], emis: [K.emissive, 0x000000, 0x2a2a00], rig };
}
// ANIMACAO DO GOBLIN (corrida sempre que anda; ataque quando chega perto e o cooldown acabou). Chamada por coliseumCubesUpdate depois do movimento.
// Opcional: CONFIG.coliseum.cubes.goblinAnim = { time (s do ataque; .45), reach (m alem do contato em que ele comeca a atacar; .9), runRate (rad/s da passada; 12), swing (amplitude das pernas, rad; .9), lean (inclinacao do tronco correndo, rad; .25) }.
// O DANO continua sendo o do contato (nao mudou); o ataque e so visual: bracos sobem, descem num golpe e o tronco se inclina.
function coliseumGoblinAnim(c, dt, chase) {
  const K = CONFIG.coliseum.cubes, A = Object.assign({ time: .45, reach: .9, runRate: 12, swing: .9, lean: .25 }, K.goblinAnim || {}), R = c.rig;
  if (c.atk <= 0 && !c.out && c.cd <= 0 && py < c.size && Math.hypot(px - c.m.position.x, pz - c.m.position.z) < c.half + K.playerR + K.hitPad + A.reach) c.atk = A.time;
  let t = -1;
  if (c.atk > 0) { c.atk -= dt; t = 1 - Math.max(0, c.atk) / A.time; }
  c.ph += dt * A.runRate * Math.max(.25, chase);
  const s = Math.sin(c.ph), w = A.swing;
  R.legL.rotation.x = s * w; R.legR.rotation.x = -s * w;
  let aL = -s * w * .9, aR = s * w * .9, lean = A.lean;
  if (t >= 0) {                                                  // ataque: 0-.4 levanta os bracos e inclina para tras; .4-.6 golpe rapido; .6-1 volta
    let a;
    if (t < .4) { const u = t / .4; a = -2.6 * u; lean = A.lean - .45 * u; }
    else if (t < .6) { const u = (t - .4) / .2; a = -2.6 + 2.3 * u; lean = A.lean - .45 + .85 * u; }
    else { const u = (t - .6) / .4; a = -.3 * (1 - u); lean = A.lean + .4 * (1 - u); }
    aL = aR = a;
  }
  R.armL.rotation.x = aL; R.armR.rotation.x = aR;
  R.body.rotation.x = lean;
  R.body.position.y = -.2 + Math.abs(s) * .035;
}
// FUMACA DA MORTE: o goblin some na hora e algumas nuvens low poly cinza sobem, crescem e desaparecem (CONFIG.coliseum.cubes.smoke opcional: { time, puffs, color, rise, grow }).
// A morte so termina (e a proxima leva so conta) quando a fumaca acaba.
var coliSmokeGeo = null;
function coliseumSmokeInit(c) {
  const S = Object.assign({ time: .8, puffs: 8, color: 0x9a9a9a, rise: 1, grow: 2.6 }, CONFIG.coliseum.cubes.smoke || {});
  if (!coliSmokeGeo) coliSmokeGeo = new THREE.IcosahedronGeometry(.5, 0);
  c.smoke = S; c.dying = S.time; c.m.visible = false;
  if (!coliGameOver && PLAYER_HP > 0) coliseumHeal(CONFIG.coliseum.cubes.healOnKill); // CURA AO MATAR: +10 de vida por goblin (1 vez: este init roda 1 vez por morte; golpe e ataque em area passam por aqui)
  c.smMat = new THREE.MeshLambertMaterial({ color: S.color, emissive: 0x222222, transparent: true, opacity: .85, depthWrite: false });
  c.sm = new THREE.Group(); c.sm.position.set(c.m.position.x, c.half, c.m.position.z);
  c.puffs = [];
  for (let i = 0; i < S.puffs; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.random() * .3 * c.size, m = new THREE.Mesh(coliSmokeGeo, c.smMat);
    m.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    c.sm.add(m);
    c.puffs.push({ m, x: Math.cos(a) * r, z: Math.sin(a) * r, y: (Math.random() - .5) * .6 * c.size, s0: (.25 + Math.random() * .2) * c.size, vy: .6 + Math.random() * .7, d: (Math.random() - .5) * .5 * c.size });
  }
  COLISEUM.add(c.sm);
}
function coliseumSmokeUpdate(c) {
  const S = c.smoke, u = 1 - Math.max(0, c.dying) / S.time;
  for (const p of c.puffs) {
    p.m.position.set(p.x + p.d * u, p.y + S.rise * c.size * p.vy * u, p.z + p.d * u);
    p.m.scale.setScalar(p.s0 * (1 + (S.grow - 1) * u));
  }
  c.smMat.opacity = .85 * (1 - u);
}
function coliseumCubesSpawn() {
  const C = CONFIG.coliseum, K = C.cubes, size = K.height, half = size / 2; // altura do goblin em m (CONFIG.coliseum.cubes.height)
  for (const g of COLISEUM_GATES) {
    const rg = g.lim + C.gate.margin, d = rg + K.spawnBack;   // rg = centro -> plano do portao
    const gb = coliseumGoblin(K), m = gb.grp, mat = gb.mats[0];
    m.scale.setScalar(size);
    m.position.set(C.x + g.c * d, half, C.z + g.s * d);       // origem do goblin = centro da altura (pes em -.5), igual ao antigo cubo
    COLISEUM.add(m);
    COLI_CUBES.push({ m, mat, mats: gb.mats, emis: gb.emis, rig: gb.rig, ph: Math.random() * 6.28, atk: 0, g, rg, size, half, hits: 0, cd: 0, flash: 0, dying: 0, out: true, kt: 0, kx: 0, kz: 0 });
  }
}
function coliseumCubesUpdate(dt) {
  if (!coliCubesOn || !inColiseum || coliGameOver) return; // game over: os cubos param
  const C = CONFIG.coliseum, K = C.cubes;
  coliCubesT += dt;
  if (coliCubesWave === 0) {                                     // 1a leva: `delay` s depois do inicio da luta
    let tm = coliCubesT;                                         // segundos de musica: relogio do audio (parado na pausa, no mesmo ponto da musica)
    try { if (coliCubesA0 !== null && actx) tm = actx.currentTime - coliCubesA0; } catch (e) {}
    if (tm >= K.delay) { coliCubesWave++; coliseumCubesSpawn(); }
  } else if (coliCubesWave < K.waves) { // numero de levas: CONFIG.coliseum.cubes.waves                          // proximas: so quando a leva anterior acabou (nenhum cubo vivo ou encolhendo) + `gap` s
    if (COLI_CUBES.length === 0) {
      coliCubesClear += dt;
      if (coliCubesClear >= K.gap) { coliCubesClear = 0; coliCubesWave++; coliseumCubesSpawn(); }
    } else coliCubesClear = 0;
  }
  if (!coliVictory && coliCubesWave >= K.waves && COLI_CUBES.every(c => c.dying > 0)) { // VITORIA: ultima leva ja saiu e todos os goblins dela estao morrendo (o ultimo acabou de morrer) -> luta.mp3 some e a plateia toca de novo (audio.js)
    coliVictory = true;
    try { arenaVictory(); } catch (e) {}
  }
  const sp = CONFIG.player.walk * K.speedK;
  for (let i = COLI_CUBES.length - 1; i >= 0; i--) {
    const c = COLI_CUBES[i], m = c.m;
    if (c.dying > 0) {                                           // virando fumaca: sem mover nem causar dano
      if (!c.smoke) coliseumSmokeInit(c);                        // 1o quadro da morte: esconde o goblin e cria a fumaca (define c.dying = smoke.time)
      c.dying -= dt;
      if (c.dying <= 0) { COLISEUM.remove(m); COLISEUM.remove(c.sm); for (const mt of c.mats) mt.dispose(); c.smMat.dispose(); COLI_CUBES.splice(i, 1); continue; }
      coliseumSmokeUpdate(c);
      continue;
    }
    let dx, dz;
    if (c.out) {                                                 // sai do vao em linha reta antes de perseguir (nao raspa na moldura)
      dx = -c.g.c; dz = -c.g.s;
      if ((m.position.x - C.x) * c.g.c + (m.position.z - C.z) * c.g.s <= c.rg - c.half - .3) c.out = false;
    } else {
      dx = px - m.position.x; dz = pz - m.position.z;
      const l = Math.hypot(dx, dz);
      if (l > 1e-4) { dx /= l; dz /= l; } else dx = dz = 0;
    }
    let chase = 1;
    if (c.kt > 0) {                                              // knockback: empurrao que cai linear; enquanto dura, o cubo persegue menos
      const kk = c.kt / K.knock.time;
      chase = 1 - kk;
      m.position.x += c.kx * K.knock.speed * kk * dt; m.position.z += c.kz * K.knock.speed * kk * dt;
      c.kt -= dt;
    }
    m.position.x += dx * sp * chase * dt; m.position.z += dz * sp * chase * dt;
    if (dx || dz) m.rotation.y = Math.atan2(dx, dz);
    coliseumGoblinAnim(c, dt, chase);
    if (c.cd > 0) c.cd -= dt;
    else if (!c.out && PLAYER_BLOCK && py < c.size && c.kt <= 0 && Math.hypot(px - m.position.x, pz - m.position.z) < c.half + K.playerR + K.hitPad) { // BLOQUEIO: o jogador nao leva dano nem knockback; o CUBO e rebatido (knock, como no golpe de espada), com clarao e som de pedra; sem gastar o cooldown
      let kx = m.position.x - px, kz = m.position.z - pz;
      const kl = Math.hypot(kx, kz);
      if (kl > 1e-4) { kx /= kl; kz /= kl; } else { kx = -Math.sin(yaw); kz = -Math.cos(yaw); } // em cima do jogador: para a frente do olhar
      c.kx = kx; c.kz = kz; c.kt = K.knock.time; c.flash = K.flashTime;
      impactPlay('stone');
    }
    else if (!c.out && !PLAYER_BLOCK && py < c.size && Math.hypot(px - m.position.x, pz - m.position.z) < c.half + K.playerR + K.hitPad) { // sem bloqueio: dano + knockback do jogador
      let kx = px - m.position.x, kz = pz - m.position.z;        // knockback do jogador: para longe do cubo (se estiver em cima dele, para tras do olhar)
      const kl = Math.hypot(kx, kz);
      if (kl > 1e-4) { kx /= kl; kz /= kl; } else { kx = Math.sin(yaw); kz = Math.cos(yaw); }
      PLAYER_KNOCK.x = kx; PLAYER_KNOCK.z = kz; PLAYER_KNOCK.t = K.playerKnock.time;
      coliseumDamage(K.damage);
      c.cd = K.cooldown;
    }
    if (c.flash > 0) c.flash -= dt;
    c.mat.color.setHex(c.cd > 0 ? K.coolColor : K.color);          // cooldown escurece so a pele
    for (let q = 0; q < c.mats.length; q++) c.mats[q].emissive.setHex(c.flash > 0 ? 0xffffff : c.emis[q]); // clarao branco em todas as partes
  }
  // colisao entre cubos (circulos de diametro bodyK x aresta; empurra os dois pela metade da sobreposicao, 2 passadas) e limites do hexagono.
  // Cubos ainda saindo do vao (`out`) e cubos morrendo ficam de fora.
  const live = COLI_CUBES.filter(c => c.dying <= 0 && !c.out), wl = C.side * Math.sqrt(3) / 2;
  for (let it = 0; it < 2; it++)
    for (let a = 0; a < live.length; a++)
      for (let b = a + 1; b < live.length; b++) {
        const A = live[a].m.position, B = live[b].m.position, min = live[a].size * K.bodyK;
        let dx = B.x - A.x, dz = B.z - A.z, d = Math.hypot(dx, dz);
        if (d >= min) continue;
        if (d < 1e-4) { dx = 1; dz = 0; d = 1; }                 // sobrepostos no mesmo ponto: separa num eixo qualquer
        const p = (min - Math.hypot(B.x - A.x, B.z - A.z)) / 2, nx = dx / d, nz = dz / d;
        A.x -= nx * p; A.z -= nz * p; B.x += nx * p; B.z += nz * p;
      }
  for (const c of live) {                                        // o jogador e um corpo: nenhum cubo entra nele (empurra o cubo para fora do circulo meia aresta + playerR)
    const p = c.m.position, min = c.half + K.playerR;
    let dx = p.x - px, dz = p.z - pz, d = Math.hypot(dx, dz);
    if (d >= min) continue;
    if (d < 1e-4) { dx = c.g.c; dz = c.g.s; d = 1; }             // exatamente em cima: sai para o lado do portao de origem
    p.x = px + dx / d * min; p.z = pz + dz / d * min;
  }
  for (const c of live) {                                        // nenhum cubo (nem empurrado) atravessa paredes ou o plano dos portoes
    const p = c.m.position;
    for (let k = 0; k < 6; k++) {
      const th = (k * 60 + 30) * Math.PI / 180, cs = Math.cos(th), sn = Math.sin(th), d = (p.x - C.x) * cs + (p.z - C.z) * sn, lim = wl - c.half;
      if (d > lim) { p.x -= (d - lim) * cs; p.z -= (d - lim) * sn; }
    }
    for (const g of COLISEUM_GATES) {
      const d = (p.x - C.x) * g.c + (p.z - C.z) * g.s, lim = c.rg - c.half;
      if (d > lim) { p.x -= (d - lim) * g.c; p.z -= (d - lim) * g.s; }
    }
  }
}
// FIM DA VITORIA: chamada por arenaVictory (audio.js) quando o comemora.mp3 da vitoria ACABA. Fade para preto (fadeRun, no pico do preto recarrega a pagina, como "Voltar ao menu inicial"):
// volta ao menu inicial e reseta TUDO. Apaga a chave do teleporte (CONFIG.teleport.key) para o boot NAO entrar direto no coliseu.
var coliVictoryEnded = false;
function coliseumVictoryEnd() {
  if (coliVictoryEnded) return;
  coliVictoryEnded = true;
  const go = () => { try { if (CONFIG.teleport) localStorage.removeItem(CONFIG.teleport.key); } catch (e) {} location.reload(); };
  try { if (typeof fadeRun === 'function') fadeRun(go); else go(); } catch (e) { go(); }
}
function coliseumCubesHit(fx, fz) {
  if (!coliCubesOn || !COLI_CUBES.length) return false;
  const K = CONFIG.coliseum.cubes, reach = CONFIG.impact.reach, pad = CONFIG.impact.pad;
  for (let d = .5; d <= reach + 1e-6; d += .4) {                 // mesma varredura do impactHit: primeiro cubo no caminho do golpe
    const x = px + fx * d, z = pz + fz * d;
    for (const c of COLI_CUBES) {
      if (c.dying > 0) continue;
      if (Math.hypot(x - c.m.position.x, z - c.m.position.z) < c.half + pad) {
        c.hits++; c.flash = K.flashTime;
        if (!c.out) {                                            // knockback: para longe do jogador (se estiver em cima dele, na direcao do golpe)
          let kx = c.m.position.x - px, kz = c.m.position.z - pz;
          const l = Math.hypot(kx, kz);
          if (l > 1e-4) { kx /= l; kz /= l; } else { kx = fx; kz = fz; }
          c.kx = kx; c.kz = kz; c.kt = K.knock.time;
        }
        if (c.hits >= K.hits) c.dying = K.smoke.time; // marca a morte (>0); coliseumSmokeInit redefine para a duracao da fumaca
        impactPlay('stone');
        return true;
      }
    }
  }
  return false;
}

// ATAQUE EM AREA: chamado por main.js no meio da animacao. Cada cubo vivo (nao morrendo) a ate `radius` m (+ meia aresta) do jogador leva `damage` golpes, clarao e knockback
// (como o golpe normal; cubo ainda saindo do portao (`out`) nao leva knockback) e o som de pedra toca uma vez. Devolve true se acertou algum.
function coliseumCubesArea() {
  if (!coliCubesOn || !COLI_CUBES.length) return false;
  const K = CONFIG.coliseum.cubes, A = CONFIG.coliseum.area;
  let hit = false;
  for (const c of COLI_CUBES) {
    if (c.dying > 0) continue;
    const p = c.m.position;
    if (Math.hypot(p.x - px, p.z - pz) >= c.half + A.radius) continue;
    hit = true;
    c.hits += A.damage; c.flash = K.flashTime;
    if (!c.out) {
      let kx = p.x - px, kz = p.z - pz;
      const l = Math.hypot(kx, kz);
      if (l > 1e-4) { kx /= l; kz /= l; } else { kx = -Math.sin(yaw); kz = -Math.cos(yaw); }
      c.kx = kx; c.kz = kz; c.kt = K.knock.time;
    }
    if (c.hits >= K.hits) c.dying = K.smoke.time; // marca a morte (>0); coliseumSmokeInit redefine para a duracao da fumaca
  }
  if (hit) impactPlay('stone');
  return hit;
}

// ===== COLISEUM GAME OVER: vida 0 -> tela escurece (fade in em preto), aparece "GAME OVER"; Enter/Espaco (ou toque) volta ao coliseu =====
// Chamado por coliseumHpSet quando PLAYER_HP chega a 0 (uma vez so). `walkBusy = true` faz o tick bloquear movimento/pulo/dash/ataque; os cubos congelam
// (coliGameOver em coliseumCubesUpdate). Overlay criado em JS (z-index 24: acima de titulo/barra de vida, abaixo do menu de pausa #ov 25 e do #fade 30).
// Texto na mesma fonte/cor/sombreado de CONFIG.coliseum.title (PixTitle). Voltar = grava o destino 'coliseum' do painel T (CONFIG.teleport.key) e recarrega
// a pagina (estado sempre limpo: vida, cubos, musica); o boot do teleporte entra direto no coliseu (tpEnter('coliseum')), sem o menu inicial.
var coliGameOver = false, coliGoReady = false;
function coliseumGameOver() {
  if (coliGameOver) return;
  coliGameOver = true;
  walkBusy = true;
  knockdownSolo(); // derrubou.mp3 (audio.js) ao morrer
  const G = CONFIG.coliseum.gameOver, T = CONFIG.coliseum.title;
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;inset:0;z-index:24;background:#000;opacity:0;transition:opacity ' + G.fadeIn + 's linear;display:flex;flex-direction:column;align-items:center;justify-content:center;user-select:none;-webkit-user-select:none;';
  const font = 'font-family:' + T.font + ';font-weight:900;letter-spacing:.06em;white-space:nowrap;line-height:1;color:' + T.color + ';text-shadow:' + T.glow + ';opacity:0;';
  const tx = document.createElement('div');
  tx.textContent = G.text;
  tx.style.cssText = font + 'font-size:' + G.size + ';transition:opacity ' + G.textFadeIn + 's;';
  el.appendChild(tx);
  let hn = null;
  if (G.hint) {
    hn = document.createElement('div');
    hn.textContent = G.hint;
    hn.style.cssText = font + 'font-size:' + G.hintSize + ';margin-top:5vh;text-shadow:2px 2px 0 #000;transition:opacity .8s;';
    el.appendChild(hn);
  }
  document.body.appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => { el.style.opacity = 1; })); // 2 rAF para a transicao de opacidade rodar
  const back = () => {
    if (!coliGoReady) return;
    try { if (CONFIG.teleport) localStorage.setItem(CONFIG.teleport.key, 'coliseum'); } catch (e) {}
    location.reload();
  };
  document.addEventListener('keydown', e => {
    if (!coliGoReady || e.repeat || (e.code !== 'Enter' && e.code !== 'NumpadEnter' && e.code !== 'Space')) return;
    e.preventDefault(); e.stopImmediatePropagation(); // o jogo (input.js) nao ve a tecla
    back();
  }, true);
  el.addEventListener('pointerdown', back);
  setTimeout(() => { tx.style.opacity = 1; }, G.fadeIn * 1000);                         // texto aparece com a tela ja preta
  setTimeout(() => { coliGoReady = true; if (hn) hn.style.opacity = 1; }, (G.fadeIn + G.textFadeIn) * 1000);
}