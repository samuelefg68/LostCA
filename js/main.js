// ARQUIVO: MAIN LOOP (tick: física, câmera, render).
    // ===== MAIN LOOP: tick (física, câmera, render) =====
    function tick(now) {
        requestAnimationFrame(tick);
        if (IS_MOBILE) {
            if (now - lastFrameT < 15.2)
                return;
            lastFrameT = now;
        }
        if (IS_MOBILE)
            mobileFrame();
        const dt = Math.min(.05, (now - last) / 1000);
        last = now;
        grassTime.value = now * .001;
        let moving = false, crouch = false;
        if (active) {
            crouch = !!(keys.KeyC || keys.ControlLeft || keys.ControlRight);
            if (crouch)
                sprint = false;
            const run = keys.ShiftLeft || keys.ShiftRight || shiftOn || sprint;
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
                if (!dlgOn && !fly && !walkBusy && cbT < 0 && now >= dashCD && dashT <= 0) {
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
            {
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
            if (fly) {
                nearK = false;
                const ff = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0), ss = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0), uu = (keys.Space ? 1 : 0) - (keys.KeyC || keys.ControlLeft || keys.ControlRight ? 1 : 0);
                const fs = run ? CONFIG.player.flyRunSpeed : CONFIG.player.flySpeed, sy = Math.sin(yaw), cy = Math.cos(yaw), sp2 = Math.sin(pitch), cp = Math.cos(pitch);
                fcx += (-sy * cp * ff + cy * ss) * fs * dt;
                fcy += (sp2 * ff + uu) * fs * dt;
                fcz += (-cy * cp * ff - sy * ss) * fs * dt;
            }
            const gh = H(px, pz);
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
        tip.classList.toggle('on', active && nearK && !dlgOn && !fly);
        if (dlgOn && dlgN < DLG_TEXT.length) {
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
        if (swing < 0) {
            if (atkQ > 0 && now - atkQ < BUFFER && now >= cdEnd && active && !dlgOn && !fly && !walkBusy) {
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
        if (sw < 0) {
            for (let i = 0; i < 6; i++)
                pose[i] = PI_[i];
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
        if (!perfOn)
            for (let i = 0; i < PN; i++) {
                let x = pa.getX(i) + dt * 1.4, y = pa.getY(i) - dt * .35, z = pa.getZ(i) + Math.sin(t + i) * dt * .4;
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
        if (!perfOn)
            pa.needsUpdate = true;
        for (let i = 0; i < RN; i++) {
            if (rl[i] <= 0)
                continue;
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
        rg.attributes.position.needsUpdate = true;
        impactUpdate(dt);
        if (hqOn)
            sunFollow();
        cam.layers.set(0);
        renderer.render(scene, cam);
        {
            const ac = renderer.autoClearColor, ad = renderer.autoClearDepth, su = renderer.shadowMap.autoUpdate;
            renderer.autoClearColor = false;
            renderer.autoClearDepth = false;
            renderer.shadowMap.autoUpdate = false;
            renderer.clearDepth();
            cam.layers.set(1);
            renderer.render(scene, cam);
            cam.layers.set(0);
            renderer.autoClearColor = ac;
            renderer.autoClearDepth = ad;
            renderer.shadowMap.autoUpdate = su;
        }
        fpsN++;
        const nowS = performance.now();
        if (nowS - fpsStart >= 500) {
            if (cv.clientWidth !== lastCW || cv.clientHeight !== lastCH)
                size();
            fpsEl.textContent = 'FPS ' + Math.round(fpsN * 1000 / (nowS - fpsStart));
            fpsN = 0;
            fpsStart = nowS;
        }
    }
    requestAnimationFrame(tick);