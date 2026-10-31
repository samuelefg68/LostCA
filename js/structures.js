// ARQUIVO: PEDESTAL (estátua, pedestal, placas) e COLLISION (collideStatue, collideTrees).
    // ===== PEDESTAL: pedestal do cavaleiro, placas =====
    const PED_H = 4.6;
    K.position.set(-2.5, H(-2.5, -11) - .02 + PED_H, -11);
    K.rotation.y = 0;
    K.scale.setScalar(2.2);
    scene.add(K);
    const PED = new THREE.Group();
    PED.position.set(-2.5, H(-2.5, -11) - .02, -11);
    PED.rotation.y = 0;
    scene.add(PED);
    const stoneTex = treeTex(64, 64, [1, 1], (g, w, h) => {
        g.fillStyle = '#9c9b96';
        g.fillRect(0, 0, w, h);
        for (let i = 0; i < 260; i++) {
            const v = Math.random();
            g.fillStyle = v < .4 ? '#a6a59f' : v < .8 ? '#92918c' : '#b0afa9';
            g.fillRect(Math.random() * w | 0, Math.random() * h | 0, 1 + (Math.random() < .2), 1);
        }
        for (let i = 0; i < 7; i++) {
            g.fillStyle = '#6f6e69';
            g.fillRect(Math.random() * w | 0, Math.random() * h | 0, 1, 1);
        }
        g.fillStyle = '#8a8984';
        g.fillRect(0, 0, w, 1);
    });
    const stoneM = new THREE.MeshLambertMaterial({ map: stoneTex, flatShading: true });
    const stoneD = new THREE.MeshLambertMaterial({ color: 0x7d7c77, flatShading: true });
    function stoneBox(w, h, d, x, y, z, p, m) {
        const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv, n = uv.count;
        for (let i = 0; i < n; i++) {
            const f = Math.floor(i / 4);
            let a, b;
            if (f < 2) {
                a = d;
                b = h;
            }
            else if (f < 4) {
                a = w;
                b = d;
            }
            else {
                a = w;
                b = h;
            }
            uv.setXY(i, uv.getX(i) * a / 2, uv.getY(i) * b / 2);
        }
        const o = new THREE.Mesh(g, m || stoneM);
        o.position.set(x, y, z);
        p.add(o);
        return o;
    }
    const PBW = 6.0, PZ0B = -2.9, PZ1B = 3.3, PTW = 4.0, PZ0T = -1.6, PZ1T = 2.2, PBY = -.3, PTY = PED_H - .2;
    {
        const g = new THREE.BoxGeometry(1, 1, 1), pos = g.attributes.position, uv = g.attributes.uv;
        for (let i = 0; i < pos.count; i++) {
            const top = pos.getY(i) > 0;
            const z0 = top ? PZ0T : PZ0B, z1 = top ? PZ1T : PZ1B, w = top ? PTW : PBW;
            pos.setXYZ(i, pos.getX(i) * w, top ? PTY : PBY, pos.getZ(i) < 0 ? z0 : z1);
            const f = Math.floor(i / 4);
            uv.setXY(i, uv.getX(i) * (f < 2 ? 8 : 6) / 2, uv.getY(i) * (PTY - PBY) / 2);
        }
        g.computeVertexNormals();
        const o = new THREE.Mesh(g, stoneM);
        PED.add(o);
        stoneBox(PTW + .4, .2, PZ1T - PZ0T + .4, 0, PTY + .1, (PZ0T + PZ1T) / 2, PED, stoneD);
    }
    const PLZ = 4.25;
    const plqTex = (() => {
        const c = document.createElement('canvas');
        c.width = 128;
        c.height = 80;
        const g = c.getContext('2d');
        g.fillStyle = '#5b4526';
        g.fillRect(0, 0, 128, 80);
        g.fillStyle = '#7a5d33';
        g.fillRect(3, 3, 122, 74);
        g.fillStyle = '#8f7040';
        g.fillRect(6, 6, 116, 68);
        g.fillStyle = '#d9b865';
        g.fillRect(6, 6, 116, 2);
        g.fillRect(6, 72, 116, 2);
        g.textAlign = 'center';
        g.fillStyle = '#2a1c0a';
        g.font = "700 14px 'Silkscreen',monospace";
        g.fillText('LOST', 64, 28);
        g.fillText('CAVALIER', 64, 46);
        g.fillStyle = '#4a3515';
        g.font = "400 8px 'Silkscreen',monospace";
        g.fillText('aperte  E', 64, 64);
        const t = new THREE.CanvasTexture(c);
        t.magFilter = pixelOn ? THREE.NearestFilter : THREE.LinearFilter;
        t.minFilter = pixelOn ? THREE.NearestMipmapNearestFilter : THREE.LinearMipmapLinearFilter;
        pixTex.push(t);
        if (document.fonts && document.fonts.load) {
            document.fonts.load("700 14px 'Silkscreen'").then(() => { const g2 = c.getContext('2d'); g2.fillStyle = '#8f7040'; g2.fillRect(8, 10, 112, 60); g2.textAlign = 'center'; g2.fillStyle = '#2a1c0a'; g2.font = "700 14px 'Silkscreen',monospace"; g2.fillText('LOST', 64, 28); g2.fillText('CAVALIER', 64, 46); g2.fillStyle = '#4a3515'; g2.font = "400 8px 'Silkscreen',monospace"; g2.fillText('aperte  E', 64, 64); t.needsUpdate = true; }).catch(() => { });
        }
        return t;
    })();
    const PLQ = new THREE.Group();
    PED.add(PLQ);
    PLQ.position.set(0, -.3, PLZ);
    stoneBox(1.5, .25, .9, 0, .125, 0, PLQ);
    stoneBox(.8, .7, .5, 0, .25 + .35, -.1, PLQ);
    const TLT = new THREE.Group();
    TLT.position.set(0, 1.05, -.02);
    TLT.rotation.x = -.55;
    PLQ.add(TLT);
    stoneBox(1.4, .9, .22, 0, 0, 0, TLT, stoneD);
    const plqPlate = new THREE.Mesh(new THREE.PlaneGeometry(1.25, .78), new THREE.MeshLambertMaterial({ map: plqTex, flatShading: true }));
    plqPlate.position.set(0, 0, .113);
    TLT.add(plqPlate);
    const DIRX = 2.57, DIRY = 1.8, DIRZ = 2.05;
    const dirTex = (() => {
        const c = document.createElement('canvas');
        c.width = c.height = 512;
        const g = c.getContext('2d');
        g.fillStyle = '#6b4a2b';
        g.fillRect(0, 0, 512, 512);
        const PARAS = ["Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc gravida efficitur justo sit amet volutpat. Suspendisse volutpat enim sit amet justo iaculis, et tincidunt dolor iaculis. Nulla facilisi. Integer non tellus ac nibh ornare rhoncus at a ipsum. Vivamus commodo ultricies quam. Phasellus elit mi, interdum sed dignissim a, pharetra sit amet orci. Duis lacinia, urna eu scelerisque dignissim, quam quam sollicitudin sem, sed placerat magna sapien at lorem. Morbi eleifend dui quam, nec rutrum leo accumsan sed. Ut a blandit sem. Aliquam erat volutpat. Cras vitae ante enim. Proin porttitor velit et elit rutrum rutrum. Vestibulum sit amet eros iaculis, pretium sapien non, tincidunt justo.", "Morbi commodo enim nec gravida tincidunt. In rhoncus porttitor nisl eu bibendum. Donec tellus elit, cursus sed magna ut, condimentum sollicitudin massa. Suspendisse pulvinar ac magna id faucibus. Donec a arcu ante. Nulla porttitor lorem eu elit iaculis dictum. Nam sem tortor, rutrum et blandit vitae, accumsan nec odio. Vivamus mollis lacus ac felis sagittis, a luctus eros molestie. Cras nunc ex, hendrerit vitae turpis eu, sagittis consectetur erat. Etiam molestie semper tempor. Praesent eget vestibulum nibh. Suspendisse sed viverra lorem. Pellentesque maximus eu nisi eget ultrices. Nam blandit placerat orci, et vehicula dolor fermentum ut. Nunc nec dui eget sapien porttitor malesuada. Ut mattis mauris a sem tempor lacinia vel in arcu."];
        g.save();
        g.textAlign = 'left';
        g.textBaseline = 'top';
        g.font = "600 12px monospace";
        g.fillStyle = 'rgba(255,255,255,.8)';
        g.shadowColor = '#fff';
        g.shadowBlur = 4;
        if ('filter' in g)
            g.filter = 'blur(2.2px)';
        const X0 = 34, MAXW = 444;
        let y = 38;
        for (const par of PARAS) {
            let line = '';
            for (const w of par.split(' ')) {
                const tst = line ? line + ' ' + w : w;
                if (g.measureText(tst).width > MAXW && line) {
                    g.fillText(line, X0, y);
                    y += 19;
                    line = w;
                }
                else
                    line = tst;
            }
            if (line) {
                g.fillText(line, X0, y);
                y += 19;
            }
            y += 15;
        }
        g.restore();
        const t = new THREE.CanvasTexture(c);
        t.magFilter = pixelOn ? THREE.NearestFilter : THREE.LinearFilter;
        t.minFilter = pixelOn ? THREE.NearestMipmapNearestFilter : THREE.LinearMipmapLinearFilter;
        pixTex.push(t);
        return t;
    })();
    {
        const th = Math.atan(1 / 4.7);
        const grp = new THREE.Group();
        grp.position.set(DIRX + .03, DIRY, DIRZ);
        grp.rotation.z = th;
        PED.add(grp);
        const face = new THREE.Group();
        face.rotation.y = Math.PI / 2;
        grp.add(face);
        const back = new THREE.Mesh(new THREE.BoxGeometry(.95, .95, .06), stoneD);
        back.position.z = -.03;
        face.add(back);
        const pl = new THREE.Mesh(new THREE.PlaneGeometry(.9, .9), new THREE.MeshLambertMaterial({ map: dirTex, flatShading: true }));
        pl.position.z = .005;
        face.add(pl);
        for (const [bx_, by_] of [[-.4, -.4], [.4, -.4], [-.4, .4], [.4, .4]]) {
            const bolt = new THREE.Mesh(new THREE.BoxGeometry(.07, .07, .05), goldK);
            bolt.position.set(bx_, by_, .03);
            face.add(bolt);
        }
    }
    // ===== COLLISION: colisão com estátua/árvores =====
    const KC = { x: -2.5, z: -11, c: 1, s: 0, hx: PBW / 2, z0: PZ0B, z1: PZ1B, r: .5, bx: .75, bz0: PLZ - .45 - .3, bz1: PLZ + .5 };
    let nearK = false, nearW = 0;
    function collideTrees() {
        for (let i = 0; i < TREE_COL.length; i++) {
            const T = TREE_COL[i], dx = px - T.x, dz = pz - T.z, rr = T.r + .4, d2 = dx * dx + dz * dz;
            if (d2 < rr * rr) {
                const d = Math.sqrt(d2) || .001;
                px = T.x + dx / d * rr;
                pz = T.z + dz / d * rr;
            }
        }
        for (let i = 0; i < GATE_COL.length; i++) {
            const T = GATE_COL[i], dx = px - T.x, dz = pz - T.z, rr = T.r + .4, d2 = dx * dx + dz * dz;
            if (d2 < rr * rr) {
                const d = Math.sqrt(d2) || .001;
                px = T.x + dx / d * rr;
                pz = T.z + dz / d * rr;
            }
        }
    }
    // ===== GATE BLOCK: barreira invisível a CONFIG.gateBlock.dist m de cada portão (lado de dentro) =====
    // Bloco sólido de `depth` m de espessura (face voltada ao jogador a `dist` m do portão, estendendo-se em direção ao portão e atravessando-o para a área de trás). No 1º contato: diálogo (sem empurrão; o jogador só é barrado na face); só rearma ao se afastar `rearm` m da face.
    // A do GATE_BEHIND some quando gateOpening fica true. Geometria local igual à dos portões (trees.js).
    const GATE_BLOCK = TRAILS.map(T => {
        const dx = Math.cos(T.dir), dz = Math.sin(T.dir), a = Math.atan2(dx, dz);
        return { gx: T.end[0] - dx * .5, gz: T.end[1] - dz * .5, ca: Math.cos(a), sa: Math.sin(a), armed: true, behind: T === GATE_BEHIND };
    });
    function collideBlock() {
        const B = CONFIG.gateBlock, lim = -B.dist - .4;
        for (const b of GATE_BLOCK) {
            if (b.behind && gateOpening)
                continue;
            const dx = px - b.gx, dz = pz - b.gz, lx = dx * b.ca - dz * b.sa;
            let lz = dx * b.sa + dz * b.ca;
            if (!b.armed && (Math.abs(lx) > B.half || lz < lim - B.rearm))
                b.armed = true;
            if (Math.abs(lx) > B.half || lz >= lim + B.depth || lz <= lim)
                continue;
            if (b.armed && !dlgOn) {
                b.armed = false;
                startDlg([B.text]);
            }
            lz = lim;
            px = b.gx + lx * b.ca + lz * b.sa;
            pz = b.gz - lx * b.sa + lz * b.ca;
        }
    }
    function collideStatue() {
        const dx = px - KC.x, dz = pz - KC.z;
        let lx = dx * KC.c - dz * KC.s, lz = dx * KC.s + dz * KC.c;
        const cx = Math.max(-KC.hx, Math.min(KC.hx, lx)), cz = Math.max(KC.z0, Math.min(KC.z1, lz));
        let ox = lx - cx, oz = lz - cz, d = Math.hypot(ox, oz);
        if (d === 0) {
            const e = [KC.hx - lx, lx + KC.hx, KC.z1 - lz, lz - KC.z0], m = Math.min(...e);
            if (m === e[0]) {
                ox = 1;
                oz = 0;
            }
            else if (m === e[1]) {
                ox = -1;
                oz = 0;
            }
            else if (m === e[2]) {
                ox = 0;
                oz = 1;
            }
            else {
                ox = 0;
                oz = -1;
            }
            lx = cx + ox * (m + KC.r);
            lz = cz + oz * (m + KC.r);
            d = KC.r;
        }
        else if (d < KC.r) {
            lx = cx + ox / d * KC.r;
            lz = cz + oz / d * KC.r;
            d = KC.r;
        }
        px = KC.x + lx * KC.c + lz * KC.s;
        pz = KC.z - lx * KC.s + lz * KC.c;
        {
            const dx2 = px - KC.x, dz2 = pz - KC.z;
            let ax = dx2 * KC.c - dz2 * KC.s, az = dz2 * KC.c + dx2 * KC.s;
            const qx = Math.max(-KC.bx, Math.min(KC.bx, ax)), qz = Math.max(KC.bz0, Math.min(KC.bz1, az));
            let ox2 = ax - qx, oz2 = az - qz, dd = Math.hypot(ox2, oz2);
            if (dd > 0 && dd < KC.r) {
                ax = qx + ox2 / dd * KC.r;
                az = qz + oz2 / dd * KC.r;
                px = KC.x + ax * KC.c + az * KC.s;
                pz = KC.z - ax * KC.s + az * KC.c;
            }
            const d1 = Math.hypot(ax, az - PLZ), d2 = ax > 0 ? Math.hypot(ax - DIRX, az - DIRZ) : 99;
            nearW = d1 < 2.6 && d1 <= d2 ? 1 : (d2 < 2.4 ? 2 : 0);
            nearK = nearW > 0;
        }
    }
    function treeTex(w, h, rep, paint) {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        paint(c.getContext('2d'), w, h);
        const t = new THREE.CanvasTexture(c);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(rep[0], rep[1]);
        t.magFilter = pixelOn ? THREE.NearestFilter : THREE.LinearFilter;
        t.minFilter = pixelOn ? THREE.NearestMipmapNearestFilter : THREE.LinearMipmapLinearFilter;
        t.anisotropy = 4;
        pixTex.push(t);
        return t;
    }
    const barkTex = treeTex(64, 128, [1, 1], (g, w, h) => {
        g.fillStyle = '#5a4132';
        g.fillRect(0, 0, w, h);
        for (let x = 0; x < w; x += 2) {
            const v = Math.random();
            g.fillStyle = v < .25 ? '#3e2a20' : v < .6 ? '#6b4d3a' : '#7a5a44';
            g.fillRect(x, 0, 2, h);
        }
        for (let i = 0; i < 34; i++) {
            g.fillStyle = Math.random() < .62 ? '#2e1d17' : '#957459';
            g.fillRect(Math.floor(Math.random() * w / 2) * 2, Math.random() * h | 0, 2, 14 + Math.random() * 52 | 0);
        }
        for (let i = 0; i < 9; i++) {
            g.fillStyle = '#2a1a14';
            g.fillRect(Math.floor(Math.random() * w / 2) * 2, Math.random() * h | 0, 4, 3);
        }
    });
    const leafTex = treeTex(64, 64, [3, 2], (g, w, h) => {
        for (let y = 0; y < h; y += 2)
            for (let x = 0; x < w; x += 2) {
                const r = Math.random(), v = r < .2 ? 120 : r < .5 ? 160 : r < .85 ? 195 : 235;
                g.fillStyle = 'rgb(' + (v * .92 | 0) + ',' + v + ',' + (v * .9 | 0) + ')';
                g.fillRect(x, y, 2, 2);
            }
        for (let i = 0; i < 110; i++) {
            const v = Math.random() < .5 ? 100 : 245;
            g.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')';
            g.fillRect(Math.random() * w | 0, Math.random() * h | 0, 1, 3);
        }
    });