// ARQUIVO: PLAYER MODEL (braços, espada) e COMBAT/STATE (ataque, dash).
    // ===== PLAYER MODEL: braços, espada, animação =====
    const BL = 1.5, NB = 12;
    for (let i = 0; i < NB; i++) {
        const t = (i + .5) / NB, y = .27 + t * BL, dx = .16 * t * t, th = -Math.atan(.32 * t / BL), w = .1 - .052 * t, sl = BL / NB * 1.06;
        const g = new THREE.Group();
        g.position.set(dx, y, 0);
        g.rotation.z = th;
        sword.add(g);
        bx(w, sl, .02, bladeM, 0, 0, 0, g);
        bx(w * .42, sl, .024, hamonM, w * .28, 0, 0, g);
        bx(.016, sl, .03, spineM, -w * .5, 0, 0, g);
    }
    cy(0, .026, .1, 4, hamonM, .16, .27 + BL + .04, 0, 0, -.21).scale.z = .5;
    cy(.19, .19, .025, 16, goldM, 0, .245, 0);
    cy(.196, .196, .012, 16, goldD, 0, .245, 0);
    cy(.058, .058, .05, 8, goldM, 0, .2, 0);
    cy(.05, .05, .62, 8, redM, 0, -.09, 0).scale.z = .8;
    for (let i = 0; i < 8; i++) {
        const y = -.35 + i * .075;
        bx(.04, .04, .012, redD, 0, y, .042, sword, 0, .785);
        bx(.018, .018, .014, goldM, 0, y, .047, sword, 0, .785);
    }
    cy(.056, .05, .06, 8, goldM, 0, -.42, 0);
    bx(.05, .12, .02, whiteM, .08, .28, .05, sword, .3, .5);
    bx(.04, .1, .02, whiteM, -.07, .3, .05, sword, -.2, -.6);
    const S = 1.25;
    const plate = M(0xf4f1ea), plateD = M(0xd9d6cf), brown = M(0x6b4430), gold = M(0x131316), mail = M(0x4d3626);
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    function jt(p, v, r, m) { const o = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), m); o.position.copy(v); p.add(o); return o; }
    function fist(g, y0) {
        bx(.22, .25, .16, plateD, 0, y0, 0, g);
        for (let i = 0; i < 4; i++) {
            const y = y0 - .09 + i * .06;
            cy(.03, .03, .22, 8, plate, 0, y, .085, 0, Math.PI / 2, g);
            cy(.034, .034, .02, 8, gold, .1, y, .085, 0, Math.PI / 2, g);
            cy(.034, .034, .02, 8, gold, -.1, y, .085, 0, Math.PI / 2, g);
            cy(.033, .033, .016, 8, gold, 0, y, .085, 0, Math.PI / 2, g);
        }
        cy(.026, .024, .16, 8, plate, .02, y0 + .135, .05, 0, Math.PI / 2, g);
        jt(g, V(-.065, y0 + .135, .05), .028, gold);
        bx(.23, .02, .17, gold, 0, y0 + .125, 0, g);
        bx(.23, .02, .17, gold, 0, y0 - .125, 0, g);
    }
    fist(sword, .07);
    fist(sword, -.2);
    function mkArm() {
        const a = new THREE.Group();
        a.scale.setScalar(S);
        cam.add(a);
        const cz = (r1, r2, h, m, z) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, 8), m); o.rotation.x = Math.PI / 2; o.position.z = z; a.add(o); return o; };
        const studs = (z, r, n) => { for (let k = 0; k < n; k++) {
            const an = k / n * 6.283;
            jt(a, V(Math.cos(an) * r, Math.sin(an) * r, z), .016, gold);
        } };
        cz(.14, .2, .24, plateD, .11);
        cz(.206, .206, .03, gold, -.01);
        studs(-.01, .205, 10);
        cz(.15, .15, .025, gold, .24);
        cz(.19, .15, .8, plate, .65);
        for (const z of [.4, .9]) {
            const r = .15 + (z - .25) * .05 + .01;
            cz(r, r, .03, gold, z);
            studs(z, r + .01, 10);
        }
        {
            const r = .15 + (.65 - .25) * .05;
            cz(r + .014, r + .014, .12, gold, .65);
            cz(r + .02, r + .02, .05, plateD, .65);
        }
        bx(.04, .012, .75, gold, 0, .2, .65, a);
        cz(.2, .2, .05, brown, .8);
        bx(.07, .06, .05, silverM, 0, .21, .8, a);
        cz(.14, .14, .4, mail, 1.3);
        const co = new THREE.Mesh(new THREE.SphereGeometry(.25, 10, 8), plate);
        co.position.z = 1.2;
        co.scale.set(1, 1, .8);
        a.add(co);
        cz(.24, .24, .03, gold, 1.07);
        bx(.08, .34, .3, plate, 0, .24, 1.2, a, .4);
        for (let i = 0; i < 5; i++) {
            const z = 1.62 + i * .17, r = .21 + .025 * i;
            cz(r, r, .22, plate, z);
            cz(r + .01, r + .01, .02, gold, z - .1);
            studs(z - .1, r + .012, 10);
        }
        cz(.34, .34, 1.2, plate, 3.0);
        return a;
    }
    const armR = mkArm(), armL = mkArm();
    sword.scale.setScalar(S);
    const pose = [0, 0, 0, 0, 0, 0], PI_ = [.55, -.6, -1.9, -.12, 0, -.2], PW = [.5, .2, -2.3, -.1, .15, -.3], PT = [.3, -.15, -2.9, -1.25, 0, .1], PS = [-.65, -1.0, -1.8, -1.25, 0, .2], PW2 = [-.5, .2, -2.3, -.1, -.15, .3], PS2 = [.65, -1.0, -1.8, -1.25, 0, -.2];
    function mixP(a, b, t) { t = t * t * (3 - 2 * t); for (let i = 0; i < 6; i++)
        pose[i] = a[i] + (b[i] - a[i]) * t; }
    function mixE(a, b, t) { t = 1 - Math.pow(1 - t, 3); for (let i = 0; i < 6; i++)
        pose[i] = a[i] + (b[i] - a[i]) * t; }
    function kf(s, k) { if (s <= k[0][0])
        return k[0][1]; for (let i = 1; i < k.length; i++) {
        if (s <= k[i][0]) {
            let t = (s - k[i - 1][0]) / (k[i][0] - k[i - 1][0]);
            t = t * t * (3 - 2 * t);
            return k[i - 1][1] + (k[i][1] - k[i - 1][1]) * t;
        }
    } return k[k.length - 1][1]; }
    const K_LOW = [[0, 0], [.22, .35], [.42, 1], [.62, 1], [1, 0]], K_YAW = [[0, 0], [.22, -.18], [.42, .3], [.62, .3], [1, 0]], K_ROLL = [[0, 0], [.22, .06], [.42, -.13], [.62, -.13], [1, 0]], K_PIT = [[0, 0], [.22, -.02], [.42, -.1], [.62, -.1], [1, 0]], K_FREE = [[0, 0], [.3, 0], [.46, 1], [.6, 1], [.85, 0], [1, 0]];
    const FREE = new THREE.Vector3(.85, -1.0, -1.5);
    const wr = new THREE.Vector3(), zA = new THREE.Vector3(), xA = new THREE.Vector3(), yA = new THREE.Vector3(), UPV = new THREE.Vector3(0, 1, 0), mm = new THREE.Matrix4();
    const WR = new THREE.Vector3(.13, .07, 0), WL = new THREE.Vector3(-.13, -.2, 0), SHR = new THREE.Vector3(2.2, -2.6, -1.2), SHL = new THREE.Vector3(-1.5, -3.2, -1.0);
    function placeAt(a, w, sh) {
        zA.copy(sh).sub(w).normalize();
        xA.crossVectors(UPV, zA).normalize();
        yA.crossVectors(zA, xA);
        a.position.copy(w);
        a.quaternion.setFromRotationMatrix(mm.makeBasis(xA, yA, zA));
    }
    function place(a, loc, sh) { wr.copy(loc).applyMatrix4(sword.matrix); placeAt(a, wr, sh); }
    cam.add(sword);
    const RN = 90, rp = new Float32Array(RN * 3), rv = new Float32Array(RN * 3), rl = new Float32Array(RN);
    for (let i = 0; i < RN; i++)
        rp[i * 3 + 1] = -100;
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.BufferAttribute(rp, 3));
    const redP = new THREE.Points(rg, new THREE.PointsMaterial({ color: 0xc9747c, size: .09, transparent: true, opacity: .55, depthWrite: false }));
    redP.frustumCulled = false;
    scene.add(redP);
    function burst() {
        const dir = atk ? 1 : -1;
        const sy = Math.sin(yaw), cy_ = Math.cos(yaw), fx = -sy, fz = -cy_, rx = cy_, rz = -sy;
        for (let i = 0; i < RN; i++) {
            const f = 1.5 + Math.random() * 4.5, r = -dir * (Math.random() * 6 - 1.5), u = -1.4 + Math.random() * 2.8;
            rp[i * 3] = cam.position.x + fx * f + rx * r;
            rp[i * 3 + 1] = cam.position.y + u;
            rp[i * 3 + 2] = cam.position.z + fz * f + rz * r;
            const v = 1.5 + Math.random() * 6;
            rv[i * 3] = dir * rx * v + fx * (Math.random() * 4 - 1);
            rv[i * 3 + 1] = Math.random() * 3 - .5;
            rv[i * 3 + 2] = dir * rz * v + fz * (Math.random() * 4 - 1);
            rl[i] = 1.2 + Math.random() * 1.2;
        }
    }
    const keys = {}, joy = { x: 0, y: 0, m: 0 };
    let active = false, drag = false, yaw = 0, pitch = 0, px = 0, pz = 0, py = H(0, 0), vy = 0, grounded = true, eye = CONFIG.player.eyeStand, bob = 0, swing = -1, last = performance.now(), hintT = 0, jumpQ = 0, shiftOn = false, sprint = false;
    // ===== COMBAT/STATE: ataque, dash =====
    let lastW = 0, atk = 1, atkQ = -1e9, cdEnd = 0, slashFx = false, fpsN = 0, fpsStart = performance.now();
    const CD_ATK = CONFIG.combat.attackCooldownMs, BUFFER = CONFIG.combat.attackBufferMs;
    let dashQ = false, dashT = 0, dashCD = 0, dashX = 0, dashZ = 0, dashK = 0;
    const DASH_T = CONFIG.combat.dashTime, DASH_V = CONFIG.combat.dashSpeed, DASH_CD = CONFIG.combat.dashCooldownMs;
    (function () {
        const C = 10, N = 25, c = document.createElement('canvas');
        c.width = c.height = C * N;
        const g = c.getContext('2d');
        for (let y = 0; y < N; y++)
            for (let x = 0; x < N; x++) {
                const v = Math.random() < .14 ? 44 + Math.random() * 30 : 8 + Math.random() * 30, X = x * C, Y = y * C;
                g.fillStyle = 'rgba(' + v + ',' + v + ',' + (v + 5) + ',.55)';
                g.fillRect(X, Y, C, C);
                const r = Math.random();
                if (r < .2) {
                    g.strokeStyle = 'rgba(255,255,255,.09)';
                    g.lineWidth = 1;
                    g.beginPath();
                    for (let k = -C; k < C; k += 3) {
                        g.moveTo(X + k, Y + C);
                        g.lineTo(X + k + C, Y);
                    }
                    g.save();
                    g.beginPath();
                    g.rect(X, Y, C, C);
                    g.clip();
                    g.stroke();
                    g.restore();
                }
                else if (r < .4) {
                    g.fillStyle = 'rgba(255,255,255,.14)';
                    for (let i = 2; i < C; i += 4)
                        for (let j = 2; j < C; j += 4)
                            g.fillRect(X + i, Y + j, 1, 1);
                }
                g.strokeStyle = 'rgba(255,255,255,.035)';
                g.strokeRect(X + .5, Y + .5, C - 1, C - 1);
            }
        document.documentElement.style.setProperty('--tex', 'url(' + c.toDataURL() + ')');
    })();
    (function () {
        const C = 8, N = 12, c = document.createElement('canvas');
        c.width = c.height = C * N;
        const g = c.getContext('2d');
        for (let y = 0; y < N; y++)
            for (let x = 0; x < N; x++) {
                const v = Math.random() < .22 ? 150 + Math.random() * 50 : 215 + Math.random() * 40, X = x * C, Y = y * C;
                g.fillStyle = 'rgb(' + v + ',' + v + ',' + (v + 4) + ')';
                g.fillRect(X, Y, C, C);
                const r = Math.random();
                if (r < .22) {
                    g.save();
                    g.beginPath();
                    g.rect(X, Y, C, C);
                    g.clip();
                    g.strokeStyle = 'rgba(110,112,122,.45)';
                    g.lineWidth = 1;
                    g.beginPath();
                    for (let k = -C; k < C; k += 3) {
                        g.moveTo(X + k, Y + C);
                        g.lineTo(X + k + C, Y);
                    }
                    g.stroke();
                    g.restore();
                }
                else if (r < .42) {
                    g.fillStyle = 'rgba(110,112,122,.55)';
                    for (let i = 2; i < C; i += 4)
                        for (let j = 2; j < C; j += 4)
                            g.fillRect(X + i, Y + j, 1, 1);
                }
            }
        document.documentElement.style.setProperty('--texL', 'url(' + c.toDataURL() + ')');
    })();
    const tip = document.getElementById('tip');
    const dlgEl = document.getElementById('dlg'), dlgTx = document.getElementById('dlgtx');
