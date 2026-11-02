// ===== COLISEUM: hexagono visto por dentro (areia.png no chao, plateia.png inteira em cada parede, portoes com grade nos vertices), sem teto, com ceu de noite (azul, preto e roxo, estrelas, lua no zenite, nuvens escuras) =====
CONFIG.paths.sand = 'assets/areia.jpg';   // chao
CONFIG.paths.crowd = 'assets/plateia.png'; // paredes
CONFIG.coliseum = {
  x: 3000, z: 0,          // centro do cubo (longe das outras areas)
  side: 40,               // aresta do hexagono em m (= raio)
  height: 45,             // altura das paredes em m
  text: 'A luz do sol bate em seus olhos.',
  fogColor: 0x140c30, fogNear: 70, fogFar: 240, // neblina de noite (roxo bem escuro)
  sky: { sunDir: [0, 1, 0], cloudScale: 4, night: { low: 0x3a1470, mid: 0x101c5c, high: 0x020208, moonSize: 5, stars: .05 } }, // ceu de dia: sunDir = direcao do sol SO no ceu do coliseu (zenite = centralizado no topo; o sunDir global/luzes nao mudam); cloudScale = escala das nuvens (maior = nuvens menores; 4 porque as paredes de 45 m deixam ver so a parte alta do ceu)
  wallMargin: .4,         // folga das paredes invisiveis
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
    margin: .6            // folga do jogador ao plano do portao (colisao)
  },
  fallback: 0x8a8a8a      // cor se areia.png ou plateia.png faltar
};

var inColiseum = false;
var COLISEUM = new THREE.Group();
COLISEUM.visible = false;
scene.add(COLISEUM);

(function () {
  const C = CONFIG.coliseum, R = C.side, H = C.height;
  const mk = url => {
    const mat = new THREE.MeshBasicMaterial({ color: C.fallback, side: THREE.FrontSide, fog: true });
    new THREE.TextureLoader().load(url, t => {
      t.magFilter = THREE.NearestFilter;
      t.minFilter = THREE.NearestFilter;
      mat.map = t; mat.color.set(0xffffff); mat.needsUpdate = true;
    }, undefined, () => {});
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
var COLISEUM_GATES = []; // {c, s, lim}: direcao do vertice (x,z) e distancia maxima do jogador ao centro nessa direcao
(function () {
  const C = CONFIG.coliseum, G = C.gate, R = C.side, S3 = Math.sqrt(3);
  const hw = G.w / 2, W = G.w + 2 * G.frame, top = G.rectH + hw;   // meia-largura do vao, largura da moldura, topo do arco
  const dV = (W - G.overlap) / (2 * S3);                            // vertice -> plano do portao (largura do hexagono ali = W - overlap)
  const rg = R - dV;                                                // centro -> plano do portao
  const fd = Math.min(G.depth, dV - hw / S3 - .02);                 // profundidade da moldura: o vao tem que caber no hexagono ate o fundo dela
  // pedra: moldura em forma de arco (um unico contorno, sem furo) extrudada para tras; UV em metros -> repeat 1/tile
  const stone = new THREE.MeshBasicMaterial({ color: G.fallback, side: THREE.FrontSide, fog: true });
  if (CONFIG.paths.bricks) new THREE.TextureLoader().load(CONFIG.paths.bricks, t => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / G.tile, 1 / G.tile);
    t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
    stone.map = t; stone.color.set(0xffffff); stone.needsUpdate = true;
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
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: G.barColor, fog: true }), it.length * 6);
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
  hemi.color.set(0x9aa4ff); hemi.intensity = .8;
  dl.visible = true;
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
  // spawn no centro, olhando para -z
  px = C.x; pz = C.z; py = 0; vy = 0; yaw = 0; pitch = 0;
  // dialogo sobre o branco; ao fechar, o fade sai
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

// A porta do fim do corredor: fade BRANCO + dialogo, entra no coliseu
function coliseumDoorUse() {
  if (inColiseum || fading) return;
  walkBusy = true;
  document.getElementById('fade').style.background = '#fff';
  fadeRun(enterColiseum, -1);
}