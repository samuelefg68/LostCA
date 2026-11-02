// ARQUIVO: SCENE (renderer, câmera, névoa, céu, luzes).
    // ===== SCENE: renderer, câmera, névoa =====
    const FOG = CONFIG.camera.fogColor;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(FOG);
    scene.fog = new THREE.Fog(FOG, CONFIG.camera.fogNear, CONFIG.camera.fogFar);
    const FOG_OBJ = scene.fog;
    const cam = new THREE.PerspectiveCamera(CONFIG.camera.fov, 1, CONFIG.camera.near, CONFIG.camera.far);
    cam.rotation.order = 'YXZ';
    scene.add(cam);
    let lastCW = 0, lastCH = 0;
    function size() { lastCW = cv.clientWidth || innerWidth; lastCH = cv.clientHeight || innerHeight; const w = Math.ceil(lastCW / PIX), h = Math.ceil(lastCH / PIX); renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
    addEventListener('resize', size);
    size();
    addEventListener('orientationchange', () => { size(); setTimeout(size, 300); setTimeout(size, 1000); });
    if (window.visualViewport)
        visualViewport.addEventListener('resize', size);
    setTimeout(size, 400);
    setTimeout(size, 1500);
    const sunDir = new THREE.Vector3(-.2, .34, -1).normalize();
    const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 24, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
        uniforms: { sd: { value: sunDir.clone() }, t: { value: 0 }, uCl: { value: 1 }, uDk: { value: 0 }, uNt: { value: new THREE.Color(0x000000) }, uNk: { value: 0 }, uDay: { value: 0 }, uCs: { value: 1 }, uNg: { value: 0 }, uNl: { value: new THREE.Color(0x3a1470) }, uNm: { value: new THREE.Color(0x101c5c) }, uNh: { value: new THREE.Color(0x020208) }, uMoon: { value: .996 }, uStar: { value: .05 } },
        vertexShader: `varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader: `varying vec3 v;uniform vec3 sd;uniform float t;uniform float uCl;uniform float uDk;uniform vec3 uNt;uniform float uNk;uniform float uDay;uniform float uCs;uniform float uNg;uniform vec3 uNl;uniform vec3 uNm;uniform vec3 uNh;uniform float uMoon;uniform float uStar;
float hs(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float nz(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hs(i),hs(i+vec2(1,0)),f.x),mix(hs(i+vec2(0,1)),hs(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*nz(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}
void main(){
 vec3 d=normalize(v);float h=max(d.y,0.);
 vec3 lo=vec3(.88,.52,.36),mid=vec3(.78,.32,.30),hi=vec3(.17,.09,.2);
 lo=mix(lo,vec3(.78,.90,1.),uDay);mid=mix(mid,vec3(.46,.72,.98),uDay);hi=mix(hi,vec3(.20,.48,.92),uDay);
 lo=mix(lo,uNl,uNg);mid=mix(mid,uNm,uNg);hi=mix(hi,uNh,uNg);
 vec3 c=mix(lo,mid,smoothstep(0.,.28,h));c=mix(c,hi,smoothstep(.2,.95,h));
 if(uNg>.5){float m=fbm(d.xz*5.+7.);float m2=fbm(d.xz*3.+vec2(3.,1.));c=mix(c,uNl,smoothstep(.35,.7,m)*.6);c=mix(c,uNh,smoothstep(.45,.75,m2)*.55);c=mix(c,uNm,smoothstep(.4,.8,fbm(d.xz*4.+vec2(9.,5.)))*.4);}
 float sun=max(dot(d,sd),0.);
 c+=(1.-uNg)*(mix(vec3(1.,.55,.2),vec3(1.,.96,.82),uDay)*pow(sun,5.)*.55+mix(vec3(1.,.8,.4),vec3(1.,1.,.92),uDay)*pow(sun,60.)*.9);
 c+=uNg*(vec3(.45,.55,1.)*pow(sun,8.)*.5+vec3(.8,.85,1.)*pow(sun,80.)*.8);
 float e=mix(.9930,uMoon,uNg);c=mix(c,mix(mix(vec3(1.,.94,.72),vec3(1.),uDay),vec3(1.),uNg),smoothstep(e,e+.001,sun));
 if(uNg>.5){vec2 p=d.xz/(h+.3)*38.;vec2 ci=floor(p),cf=fract(p);float r=hs(ci);vec2 o=vec2(hs(ci+3.1),hs(ci+7.7))*.5+.25;float st=step(1.-uStar,r)*smoothstep(.22,.08,length(cf-o));c+=vec3(1.)*st*(.6+.4*hs(ci+1.3))*(.8+.2*sin(t*3.+r*50.))*smoothstep(.05,.3,h);}
 if(uCl>.5&&h>0.){vec2 uv=d.xz/(h+.2)*1.5*uCs+vec2(t*.012,0.);
 float n=fbm(uv*1.1+fbm(uv*.55)*.9);
 float cl=smoothstep(.40,.74,n)*smoothstep(0.,.1,h);
 cl*=1.-.55*smoothstep(.96,.995,sun);
 float lit=clamp(mix(pow(sun,2.5)*1.1+(1.-n)*.55,pow(sun,6.)*1.4+(1.-n)*.12,uNg),0.,1.);
 vec3 cb=mix(mix(vec3(.24,.11,.19),vec3(.80,.86,.95),uDay),vec3(.07,.05,.14),uNg);vec3 cl2=mix(mix(vec3(1.,.6,.4),vec3(1.),uDay),vec3(.75,.8,1.),uNg);
 vec3 cc=mix(cb,cl2,lit);
 cc=mix(cc,mix(mix(vec3(1.,.82,.56),vec3(1.),uDay),vec3(.9,.93,1.),uNg),pow(sun,10.)*.8*(1.-n));
 c=mix(c,cc,cl*.93);}
 {float lm=dot(c,vec3(.3,.59,.11));c=mix(c,uNt*(.4+.6*lm/.61),uNk);}
 c*=1.-uDk;c=floor(c*7.+.5)/7.;
 gl_FragColor=vec4(c,1.);}` }));
    sky.renderOrder = 1; // céu desenhado depois dos opacos: o z-buffer descarta os pixels cobertos pelo terreno antes do shader pesado
    scene.add(sky);
    const hemi = new THREE.HemisphereLight(0xffc7a0, 0x4a2a30, .95);
    scene.add(hemi);
    const dl = new THREE.DirectionalLight(0xffb27a, 1.1);
    dl.position.copy(sunDir).multiplyScalar(50);
    scene.add(dl);