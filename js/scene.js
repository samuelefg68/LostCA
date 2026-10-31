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
        uniforms: { sd: { value: sunDir.clone() }, t: { value: 0 }, uCl: { value: 1 }, uDk: { value: 0 }, uNt: { value: new THREE.Color(0x000000) }, uNk: { value: 0 } },
        vertexShader: `varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader: `varying vec3 v;uniform vec3 sd;uniform float t;uniform float uCl;uniform float uDk;uniform vec3 uNt;uniform float uNk;
float hs(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float nz(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hs(i),hs(i+vec2(1,0)),f.x),mix(hs(i+vec2(0,1)),hs(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*nz(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}
void main(){
 vec3 d=normalize(v);float h=max(d.y,0.);
 vec3 lo=vec3(.88,.52,.36),mid=vec3(.78,.32,.30),hi=vec3(.17,.09,.2);
 vec3 c=mix(lo,mid,smoothstep(0.,.28,h));c=mix(c,hi,smoothstep(.2,.95,h));
 float sun=max(dot(d,sd),0.);
 c+=vec3(1.,.55,.2)*pow(sun,5.)*.55+vec3(1.,.8,.4)*pow(sun,60.)*.9;
 c=mix(c,vec3(1.,.94,.72),smoothstep(.9930,.9940,sun));
 if(uCl>.5){vec2 uv=d.xz/(h+.2)*1.5+vec2(t*.012,0.);
 float n=fbm(uv*1.1+fbm(uv*.55)*.9);
 float cl=smoothstep(.40,.74,n)*smoothstep(0.,.1,h);
 cl*=1.-.55*smoothstep(.96,.995,sun);
 float lit=clamp(pow(sun,2.5)*1.1+(1.-n)*.55,0.,1.);
 vec3 cc=mix(vec3(.24,.11,.19),vec3(1.,.6,.4),lit);
 cc=mix(cc,vec3(1.,.82,.56),pow(sun,10.)*.8*(1.-n));
 c=mix(c,cc,cl*.93);}
 {float lm=dot(c,vec3(.3,.59,.11));c=mix(c,uNt*(.4+.6*lm/.61),uNk);}
 c*=1.-uDk;c=floor(c*7.+.5)/7.;
 gl_FragColor=vec4(c,1.);}` }));
    scene.add(sky);
    const hemi = new THREE.HemisphereLight(0xffc7a0, 0x4a2a30, .95);
    scene.add(hemi);
    const dl = new THREE.DirectionalLight(0xffb27a, 1.1);
    dl.position.copy(sunDir).multiplyScalar(50);
    scene.add(dl);