// ARQUIVO: MAIN LOOP (tick: física, câmera, render).
    // ===== MAIN LOOP: tick (física, câmera, render) =====
    let petAcc = 0, petFr = 0;
    // BLOQUEIO (F no PC, botao #mBlock no celular; so no coliseu): PB = pose da espada levantada (mesmo formato de PI_ em player.js: x, y, z, rotX, rotY, rotZ), blockK = 0..1 suaviza a entrada/saida da pose
    const PB = [.05, -.35, -1.8, -.1, 0, .15];
    let blockK = 0;
    // ATAQUE EM AREA (botao direito / #mArea): areaQ = instante do pedido (buffer), areaSwing 0..1 = progresso da animacao (-1 = parado), areaCdEnd = fim da recarga (ms), areaFx = ja atingiu os cubos neste golpe; PA1/PA2 = poses de preparacao e golpe (formato de PI_), NAO calibradas visualmente
    let areaQ = -1e9, areaSwing = -1, areaCdEnd = 0, areaFx = false;
    const PA1 = [.9, .5, -2.6, .4, .6, -.9], PA2 = [-.9, -1.0, -1.8, -1.6, -.6, .5];
    // ===== LIMITADOR DE FPS (mobile): mede o intervalo do requestAnimationFrame nos primeiros 40 callbacks (RAF_D). Só limita em telas >= ~100 Hz (120 Hz -> 60 fps, pulando 1 em cada 2); em 60/90 Hz NÃO pula quadro (o antigo corte fixo de 15,2 ms perdia quadros por jitter em 60 Hz e dava 45 fps em 90 Hz). CONFIG.gfx.maxFps = 0 desliga =====
    const RAF_D = [];
    let rafPrev = 0, rafThr = 0, rafRi = 0;
    function frameSkip(now) {
        if (rafPrev && RAF_D.length < 40) {
            RAF_D.push(now - rafPrev);
            if (RAF_D.length === 40) {
                rafRi = RAF_D.slice().sort((a, b) => a - b)[10];
                const mf = CONFIG.gfx.maxFps;
                rafThr = mf > 0 && rafRi < 620 / mf ? 750 / mf : 0;
            }
        }
        rafPrev = now;
        return rafThr > 0 && now - lastFrameT < rafThr;
    }
    // ===== DEBUG DE DESEMPENHO (só com ?debug=1 na URL): linha com FPS/calls/triângulos/ms de JS/Hz e botão TESTE que desliga partes da cena, uma a uma, para achar o gargalo no próprio celular =====
    const DBG = /[?&]debug=1/.test(location.search);
    const DBG_SAVE = new Map(), DBG_NAMES = ['normal', 'sem grama/flores/juncos/pétalas', '+ sem pinheiros da borda', '+ sem floresta (anel)', '+ sem céu', '+ cena vazia (só limpa a tela)', '+ sem render (só JS)'];
    let dbgStep = 0, dbgMs = 0, dbgBtn = null, dbgInfo = null;
    function dbgApply() {
        for (const [o, v] of DBG_SAVE)
            o.visible = v;
        DBG_SAVE.clear();
        const hide = o => { if (!DBG_SAVE.has(o))
            DBG_SAVE.set(o, o.visible); o.visible = false; };
        VEG_ON = dbgStep < 1; // vegCull() (world.js) mantém os chunks de vegetação escondidos
        if (dbgStep >= 1)
            scene.traverse(o => { if ((o.isInstancedMesh && !EDGE_MESHES.includes(o) && !TREE_INST.includes(o)) || o.isPoints)
                hide(o); });
        if (dbgStep >= 2)
            EDGE_MESHES.forEach(hide);
        if (dbgStep >= 3)
            TREE_INST.forEach(hide);
        if (dbgStep >= 4)
            hide(sky);
        if (dbgStep >= 5)
            hide(scene);
        dbgBtn.textContent = 'TESTE ' + dbgStep + ': ' + DBG_NAMES[dbgStep] + ' (toque p/ avançar)';
    }
    if (DBG) {
        renderer.info.autoReset = false;
        const st = 'position:fixed;left:50%;transform:translateX(-50%);z-index:99999;background:rgba(0,0,0,.72);color:#fff;font:13px/1.3 monospace;padding:8px 12px;border-radius:8px;text-align:center;user-select:none;-webkit-user-select:none;';
        dbgInfo = document.createElement('div');
        dbgInfo.style.cssText = st + 'top:6px;pointer-events:none;';
        dbgBtn = document.createElement('div');
        dbgBtn.style.cssText = st + 'top:46px;';
        document.body.append(dbgInfo, dbgBtn);
        const nx = e => { e.preventDefault(); e.stopPropagation(); dbgStep = (dbgStep + 1) % DBG_NAMES.length; dbgApply(); };
        dbgBtn.addEventListener('touchstart', nx, { passive: false });
        dbgBtn.addEventListener('click', nx);
        dbgApply();
    }
    function tick(now) {
        requestAnimationFrame(tick);
        if (IS_MOBILE) {
            if (frameSkip(now))
                return;
            lastFrameT = now;
        }
        const dbgT0 = DBG ? performance.now() : 0;
        if (IS_MOBILE)
            mobileFrame();
        const dt = Math.min(.05, (now - last) / 1000);
        last = now;
        grassTime.value = now * .001;
        let moving = false, crouch = false;
        if (active) {
            crouch = !!(keys.KeyC || keys.ControlLeft || keys.ControlRight);
            PLAYER_BLOCK = inColiseum && !!(keys.KeyF || mobBlock) && !dlgOn && !fly && !walkBusy; // coliseum.js: anula dano/knockback dos cubos; aqui tambem impede correr, dash e ataque
            if (crouch || brNoRun || PLAYER_BLOCK)
                sprint = false;
            const run = !brNoRun && !PLAYER_BLOCK && (keys.ShiftLeft || keys.ShiftRight || shiftOn || sprint); // brNoRun (bridge.js, depois do 2º diálogo da ponte): correr desligado
            if (jumpQ > 0)
                jumpQ -= dt;
            let sp = crouch ? CONFIG.player.crouch : run ? CONFIG.player.run : CONFIG.player.walk;
            // lentidão no volume escuro: teto desce linear de slowStart (portão) a slowEnd (parede do fim); dash desligado lá dentro
            const cbT = corrBoxT();
            if (cbT >= 0)
                sp = Math.min(sp, CORR.slowStart + (CORR.slowEnd - CORR.slowStart) * cbT);
            let fx = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
            let sx = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
            if (dlgOn || fly || walkBusy) {
                fx = 0;
                sx = 0;
            }
            let l = Math.hypot(fx, sx), jm = 1;
            if (joy.m > 0 && !dlgOn && !fly && !walkBusy) {
                fx = joy.y;
                sx = joy.x;
                l = Math.hypot(fx, sx);
                jm = joy.m;
            }
            moving = l > 0;
            if (l) {
                fx /= l;
                sx /= l;
            }
            const s = Math.sin(yaw), c = Math.cos(yaw), ppx = px, ppz = pz;
            if (dashQ) {
                dashQ = false;
                if (!dlgOn && !fly && !walkBusy && !PLAYER_BLOCK && cbT < 0 && !brNoDash && now >= dashCD && dashT <= 0) {
                    const df = l ? fx : 1, ds = l ? sx : 0;
                    dashX = -s * df + c * ds;
                    dashZ = -c * df - s * ds;
                    dashT = DASH_T;
                    dashCD = now + DASH_CD;
                    dashPlay();
                }
            }
            if (dashT > 0) {
                const dist = DASH_V * Math.min(dt, dashT), n = Math.max(1, Math.ceil(dist / .4));
                dashT -= dt;
                for (let q = 0; q < n; q++) {
                    px += dashX * dist / n;
                    pz += dashZ * dist / n;
                    collideStatue();
                    collideTrees();
                    collideBlock();
                }
                moving = false;
            }
            else {
                px += (-s * fx + c * sx) * sp * jm * dt;
                pz += (-c * fx - s * sx) * sp * jm * dt;
            }
            if (inColiseum)
                coliseumPlayerKnock(dt); // empurrão ao levar dano dos cubos (coliseum.js); as colisões abaixo ainda valem
            if (!inBridge && !inCube) {
                const bx_ = px - ROAD.x, bz_ = pz - ROAD.z, bd_ = Math.hypot(bx_, bz_), bm_ = MAP_R + 4;
                if (pz < CZ0 && Math.abs(px - CX) < ROAD.hw + 6) {
                    if (pz < CZ_END)
                        pz = CZ_END;
                }
                else if (bd_ > bm_) {
                    px = ROAD.x + bx_ / bd_ * bm_;
                    pz = ROAD.z + bz_ / bd_ * bm_;
                }
            }
            collideStatue();
            collideTrees();
            collideBlock();
            {
                // PAREDE INVISÍVEL do corredor: retângulo |px-CX| <= wallHalf, de CZ0 (portão) até CZ_WALL (wallLen m). Só se entra/sai pelo portão (cruzando CZ0).
                const w = CORR.wallHalf, inR = (x, z) => z < CZ0 && z >= CZ_WALL && Math.abs(x - CX) <= w;
                const was = inR(ppx, ppz), now_ = inR(px, pz);
                if (was && !now_ && pz < CZ0) {
                    px = Math.max(CX - w, Math.min(CX + w, px));
                    if (pz < CZ_WALL)
                        pz = CZ_WALL;
                }
                else if (!was && now_ && ppz < CZ0) {
                    px = ppx;
                    if (inR(px, pz))
                        pz = ppz;
                }
            }
            if (inBridge) {
                bridgeClamp();
                bridgeEvents();
            }
            if (inCube)
                cubeClamp();
            if (fly) {
                nearK = false;
                nearF = false;
                nearD = false;
                const ff = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0), ss = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0), uu = (keys.Space ? 1 : 0) - (keys.KeyC || keys.ControlLeft || keys.ControlRight ? 1 : 0);
                const fs = run ? CONFIG.player.flyRunSpeed : CONFIG.player.flySpeed, sy = Math.sin(yaw), cy = Math.cos(yaw), sp2 = Math.sin(pitch), cp = Math.cos(pitch);
                fcx += (-sy * cp * ff + cy * ss) * fs * dt;
                fcy += (sp2 * ff + uu) * fs * dt;
                fcz += (-cy * cp * ff - sy * ss) * fs * dt;
            }
            const gh = inCube ? cubeGround(px, pz) : inBridge ? BR_DECK_Y : H(px, pz); // cubo: corredor, piso da sala e escada (cube.js)
            if ((keys.Space || jumpQ > 0) && grounded && !crouch && !dlgOn && !fly && !walkBusy) {
                vy = CONFIG.player.jumpSpeed;
                grounded = false;
                jumpQ = 0;
            }
            if (!grounded) {
                vy -= CONFIG.player.gravity * dt;
                py += vy * dt;
                if (py <= gh) {
                    py = gh;
                    vy = 0;
                    grounded = true;
                }
            }
            else if (inCube && Math.abs(gh - py) > .005) // cubo: sobe/desce os degraus com suavização (inner.stairs.smooth), sem solavanco a cada degrau
                py += (gh - py) * Math.min(1, dt * CONFIG.cube.inner.stairs.smooth);
            else
                py = gh;
            if (moving && grounded)
                bob += dt * sp * CONFIG.player.bobFactor;
            stepSet(moving && grounded ? (run && !crouch && cbT < 0 ? 'run' : 'walk') : null);
            if (hintT > 0) {
                hintT -= dt;
                if (hintT <= 0)
                    hint.classList.remove('on');
            }
        }
        if (!active)
            stepSet(null);
        leafFx(dt);
        if (gateOpening && gateT < 1) {
            gateT = Math.min(1, gateT + dt / CONFIG.world.gateOpenTime);
            const e = gateT * gateT * (3 - 2 * gateT);
            const ang = 1.45 * e;
            for (const L of GATE_LEAVES)
                L.pv.rotation.y = L.dir * ang;
            if (GATE_INFO) {
                if (GATE_DOOR_COL.length) {
                    for (const o of GATE_DOOR_COL) {
                        const i = GATE_COL.indexOf(o);
                        if (i >= 0)
                            GATE_COL.splice(i, 1);
                    }
                    GATE_DOOR_COL.length = 0;
                    for (const lf of GATE_LEAVES)
                        for (let d = .3; d <= GATE_INFO.L; d += .7) {
                            const o = { x: 0, z: 0, r: .25, d, dir: lf.dir, px: lf.pv.position.x, g:1, go: GATE_SWING };
                            GATE_LEAF_COL.push(o);
                            GATE_COL.push(o);
                        }
                }
                for (const o of GATE_LEAF_COL) {
                    const lx = o.px - o.dir * o.d * Math.cos(ang), lz = o.d * Math.sin(ang);
                    o.x = GATE_INFO.gx + lx * GATE_INFO.ca + lz * GATE_INFO.sa;
                    o.z = GATE_INFO.gz - lx * GATE_INFO.sa + lz * GATE_INFO.ca;
                }
            }
        }
        {
            const inC = pz < CZ0 && Math.abs(px - CX) < ROAD.hw + 6, tgt = inC ? Math.min(1, (CZ0 - pz) / CORR.darkLen) : 0;
            corrDark += (tgt - corrDark) * Math.min(1, dt * 2.5);
            if (tgt === 0 && corrDark < .003)
                corrDark = 0;
            if (corrDark > 0 || corrDarkLast > 0)
                applyCorrDark(corrDark);
            corrDarkLast = corrDark;
            if (!corrEndDone && !dlgOn && !walkBusy && pz <= CZ_WALL + CORR.touchMargin && Math.abs(px - CX) <= CORR.wallHalf) {
                corrEndDone = true;
                onCorridorEnd();
            }
        }
        tip.classList.toggle('on', active && (nearK || nearF || nearD) && !dlgOn && !fly);
        if (active && dlgOn && dlgN < DLG_TEXT.length) { // só digita o diálogo com o jogo ativo (pausado, o texto não avança nem toca teclas)
            dlgAcc += dt * 1000;
            const n = Math.floor(dlgAcc / 45);
            if (n > 0) {
                dlgAcc -= n * 45;
                dlgN = Math.min(DLG_TEXT.length, dlgN + n);
                dlgSet(DLG_TEXT.slice(0, dlgN));
                keyClick(DLG_TEXT[dlgN - 1]);
                if (dlgN >= DLG_TEXT.length)
                    dlgEl.classList.add('done');
            }
        }
        eye += ((crouch ? CONFIG.player.eyeCrouch : CONFIG.player.eyeStand) - eye) * Math.min(1, dt * CONFIG.player.eyeLerp);
        const b = moving && grounded ? Math.sin(bob) : 0;
        if (swing < 0 && areaSwing < 0 && areaQ > 0 && now - areaQ < BUFFER && now >= areaCdEnd && inColiseum && active && !dlgOn && !fly && !walkBusy && !PLAYER_BLOCK) {
            areaSwing = 0;
            areaFx = false;
            areaQ = -1e9;
            areaCdEnd = now + CONFIG.coliseum.area.cooldown * 1000;
            swordPlay(atk);
        }
        if (areaSwing >= 0) {
            areaSwing += dt * 1.1;
            if (areaSwing >= .5 && !areaFx) {
                areaFx = true;
                coliseumCubesArea();
            }
            if (areaSwing >= 1)
                areaSwing = -1;
        }
        if (swing < 0 && areaSwing < 0) {
            if (atkQ > 0 && now - atkQ < BUFFER && now >= cdEnd && active && !dlgOn && !fly && !walkBusy && !PLAYER_BLOCK) {
                swing = 0;
                atk ^= 1;
                swordPlay(atk);
                atkQ = -1e9;
            }
        }
        if (swing >= 0) {
            swing += dt * 1.9;
            if (swing >= .75) {
                swing = -1;
                cdEnd = now + CD_ATK;
            }
        }
        const sw = swing, sk = sw >= 0 ? sw : 0;
        if (fly)
            cam.position.set(fcx, fcy, fcz);
        else
            cam.position.set(px, py + eye, pz);
        cam.rotation.set(pitch, yaw, 0);
        dashK += ((dashT > 0 ? 1 : 0) - dashK) * Math.min(1, dt * 14);
        {
            const fv = fovUser;
            if (Math.abs(cam.fov - fv) > .01) {
                cam.fov = fv;
                cam.updateProjectionMatrix();
            }
        }
        if (sw < .3)
            slashFx = false;
        else if (!slashFx && sw >= .34) {
            slashFx = true;
            burst();
            impactHit();
        }
        const t = now / 1000, cw = atk ? PW2 : PW, cs = atk ? PS2 : PS;
        if (areaSwing >= 0) {
            const u = areaSwing;
            if (u < .35)
                mixP(PI_, PA1, u / .35);
            else if (u < .7) {
                const v = (u - .35) / .35;
                mixE(PA1, PA2, v);
                const k = Math.sin(Math.PI * Math.min(1, v * 1.15));
                pose[2] -= 1.2 * k;
                pose[3] -= .9 * k;
                pose[4] -= 1.5 * k;
            }
            else
                mixP(PA2, PI_, (u - .7) / .3);
        }
        else if (sw < 0) {
            for (let i = 0; i < 6; i++)
                pose[i] = PI_[i];
            blockK += ((PLAYER_BLOCK ? 1 : 0) - blockK) * Math.min(1, dt * 14);
            for (let i = 0; i < 6; i++)
                pose[i] += (PB[i] - PI_[i]) * blockK;
            pose[0] += b * .008;
            pose[1] += Math.abs(b) * .015 + Math.sin(t * 1.6) * .006;
        }
        else if (sw < .18)
            mixP(PI_, cw, sw / .18);
        else if (sw < .55) {
            const u = (sw - .18) / .37;
            mixE(cw, cs, u);
            const k = Math.sin(Math.PI * Math.min(1, u * 1.15));
            pose[2] -= .9 * k;
            pose[3] -= .7 * k;
        }
        else
            mixP(cs, PI_, (sw - .55) / .2);
        const hw = -pose[2] * .7265 * cam.aspect;
        sword.position.set(pose[0] * hw, pose[1], pose[2]);
        sword.rotation.set(pose[3], pose[4], pose[5]);
        sword.updateMatrix();
        place(armR, WR, SHR);
        wr.copy(WL).applyMatrix4(sword.matrix);
        placeAt(armL, wr, SHL);
        sky.position.copy(cam.position);
        sky.material.uniforms.t.value = t;
        const pa = pg.attributes.position;
        petAcc += dt;
        petFr ^= 1;
        const petRun = petFr === 0 && !perfOn && !inCube; // pétalas atualizadas a cada 2 frames (com o dt acumulado)
        const pdt = Math.min(petAcc, .1);
        if (petRun)
            petAcc = 0;
        if (petRun) // no cubo as pétalas (do mapa antigo, já descartado) não são mais atualizadas
            for (let i = 0; i < PN; i++) {
                let x = pa.getX(i) + pdt * 1.4, y = pa.getY(i) - pdt * .35, z = pa.getZ(i) + Math.sin(t + i) * pdt * .4;
                const cx = cam.position.x, cz = cam.position.z;
                if (x - cx > 20)
                    x -= 40;
                if (x - cx < -20)
                    x += 40;
                if (z - cz > 20)
                    z -= 40;
                if (z - cz < -20)
                    z += 40;
                if (y < H(x, z) + .2)
                    y += 14;
                pa.setXYZ(i, x, y, z);
            }
        if (petRun)
            pa.needsUpdate = true;
        let rAlive = false;
        for (let i = 0; i < RN; i++) {
            if (rl[i] <= 0)
                continue;
            rAlive = true;
            rl[i] -= dt;
            rv[i * 3 + 1] -= 6 * dt;
            rp[i * 3] += rv[i * 3] * dt;
            rp[i * 3 + 1] += rv[i * 3 + 1] * dt;
            rp[i * 3 + 2] += rv[i * 3 + 2] * dt;
            const g = H(rp[i * 3], rp[i * 3 + 2]) + .05;
            if (rp[i * 3 + 1] < g) {
                rp[i * 3 + 1] = g;
                rv[i * 3] *= .8;
                rv[i * 3 + 1] = 0;
                rv[i * 3 + 2] *= .8;
            }
            if (rl[i] <= 0)
                rp[i * 3 + 1] = -100;
        }
        if (rAlive)
            rg.attributes.position.needsUpdate = true; // só envia à GPU quando há partícula viva (inclui o frame em que a última some)
        impactUpdate(dt);
        if (active)
            coliseumCubesUpdate(dt); // cubos verdes do coliseu (parados na pausa)
        if (hqOn)
            sunFollow();
        vegCull();
        if (DBG)
            renderer.info.reset();
        if (!(DBG && dbgStep >= 6)) {
            cam.layers.set(0);
            renderer.render(scene, cam);
            {
                // 2ª passada (braços/espada, layer 1): as matrizes já foram atualizadas na 1ª, então não refaz o updateMatrixWorld da cena inteira
                const ac = renderer.autoClearColor, ad = renderer.autoClearDepth, su = renderer.shadowMap.autoUpdate, sa = scene.autoUpdate;
                renderer.autoClearColor = false;
                renderer.autoClearDepth = false;
                renderer.shadowMap.autoUpdate = false;
                scene.autoUpdate = false;
                renderer.clearDepth();
                cam.layers.set(1);
                renderer.render(scene, cam);
                cam.layers.set(0);
                renderer.autoClearColor = ac;
                renderer.autoClearDepth = ad;
                renderer.shadowMap.autoUpdate = su;
                scene.autoUpdate = sa;
            }
        }
        if (DBG)
            dbgMs += (performance.now() - dbgT0 - dbgMs) * .05;
        fpsN++;
        const nowS = performance.now();
        if (nowS - fpsStart >= 500) {
            if (cv.clientWidth !== lastCW || cv.clientHeight !== lastCH)
                size();
            const fpsV = Math.round(fpsN * 1000 / (nowS - fpsStart));
            fpsEl.textContent = 'FPS ' + fpsV;
            if (DBG)
                dbgInfo.textContent = 'FPS ' + fpsV + ' | gráf ' + (perfOn ? 'LOW' : hqOn ? 'HIGH' : 'MID') + ' | calls ' + renderer.info.render.calls + ' | tris ' + Math.round(renderer.info.render.triangles / 1000) + 'k | JS ' + dbgMs.toFixed(1) + ' ms | tela ' + (rafRi ? Math.round(1000 / rafRi) + ' Hz' : '...') + (rafThr ? ' (limitado)' : '');
            fpsN = 0;
            fpsStart = nowS;
        }
    }
    requestAnimationFrame(tick);