// ARQUIVO: COLISEUM (PENDENTE). Próximo mapa depois do corredor do castelo (cube.js). O mapa AINDA NÃO EXISTE: aqui só há o gancho da porta do fim do corredor.
    // ===== COLISEUM: gancho da porta do fim do corredor (esperando o código do coliseu) =====
    // Carregado depois de cube.js e antes de player.js (ver ordem de carga no AGENTS.md). Funções só rodam em tempo de execução, então podem usar startDlg/fadeRun (carregadas depois).
    // FLUXO JÁ PRONTO: jogador perto/olhando para a porta (nearD, ligada em cubeClamp, cube.js) -> E / botão Interagir -> interact() (dialogue.js) -> coliseumDoorUse() (abaixo).
    const DOOR_LINES = CONFIG.cube.corridor.door.text; // diálogo enquanto a porta está trancada (texto em CONFIG.cube.corridor.door.text)
    const COLISEUM_READY = false; // TROQUE PARA true quando enterColiseum() estiver implementado: a porta passa a levar ao coliseu em vez de abrir o diálogo "trancada"
    let inColiseum = false; // (reservado) ligar em enterColiseum(). main.js e os demais ainda NÃO leem esta flag: ao criar o mapa, trate-a como inCube/inBridge (chão, limites, colisão, golpe)
    function coliseumDoorUse() {
        if (!COLISEUM_READY) {
            startDlg(DOOR_LINES);
            return;
        }
        fadeRun(enterColiseum); // mesmo fade das outras transições (input.js); enterColiseum() roda no pico do preto
    }
    // TODO(coliseu): implementar. Siga o padrão de enterCube() (cube.js) e o roteiro "Próximo mapa: coliseu" do AGENTS.md:
    //  1) inColiseum = true; inCube = false; nearF = nearD = false.
    //  2) descartar o cubo: scene.remove(CUBE); cubeDispose(CUBE); remover CUBE_TORCH da câmera (cam.remove) e CUBE_LAMPS da cena.
    //  3) criar o grupo do coliseu (novo bloco/arquivo, como CUBE), névoa/fundo/luz, cubeSpawn()-like (px/py/pz/yaw/pitch, vy = 0, grounded, dashT = 0).
    //  4) música (como cubeBgmPlay em audio.js: fade out de castelo.mp3 em audio.cubeFadeOut s e tocar a do coliseu).
    //  5) main.js (tick): gh do coliseu, pular o limite do mapa antigo (`!inBridge && !inCube && !inColiseum`) e chamar a função de limites (como cubeClamp).
    //  6) impact.js: ramo de golpe do coliseu (como o `if (inCube)` em impactHit).
    //  7) trocar COLISEUM_READY para true e atualizar o AGENTS.md.
    function enterColiseum() {
        console.warn('[coliseum] enterColiseum() ainda não implementada (COLISEUM_READY = false)');
    }
