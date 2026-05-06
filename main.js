import * as THREE from "three/webgpu";
import Stats from "three/examples/jsm/libs/stats.module";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

//物理演算部分
class Body {
    constructor({ mass, position, velocity }) {
        this.mass = mass;
        this.position = position.clone();
        this.velocity = velocity.clone();
        this.force = new THREE.Vector3();
    }
    //力をリセット
    resetForce() {
        this.force.set(0, 0, 0);
    }
    //他の天体からの力を計算して加算
    addForce(other) {
        const G = 6.674e-11;
        const dir = new THREE.Vector3().subVectors(other.position, this.position);
        const distSq = dir.lengthSq();
        const softening = 1e7;
        const dist = Math.sqrt(distSq + softening);

        const forceMag = G * this.mass * other.mass / (dist * dist);
        dir.normalize().multiplyScalar(forceMag);

        this.force.add(dir);
    }
    //位置と速度を更新
    update(dt) {
        const acc = this.force.clone().divideScalar(this.mass);
        this.velocity.add(acc.multiplyScalar(dt));
        this.position.add(this.velocity.clone().multiplyScalar(dt));
    }
}
//太陽
const sunBody = new Body({
    mass: 1.989e30,
    position: new THREE.Vector3(0,0,0),
    velocity: new THREE.Vector3(0,0,0)
});
//地球
const earthBody = new Body({
    mass: 5.972e24,
    position: new THREE.Vector3(1.5e11, 0, 0),
    velocity: new THREE.Vector3(0, 0, 30000)
});
//月
const moonBody = new Body({
    mass: 7.35e22,
    position: earthBody.position.clone().add(new THREE.Vector3(3.84e8, 0, 0)),
    velocity: earthBody.velocity.clone().add(new THREE.Vector3(0, 0, 1022))
});
//直行方向に再計算
const r = new THREE.Vector3().subVectors(moonBody.position, earthBody.position);
const tangent = new THREE.Vector3().crossVectors(r, new THREE.Vector3(0,1,0)).normalize();
moonBody.velocity = earthBody.velocity.clone().add(tangent.multiplyScalar(1022));

const scaleFactor = 0.1;
const SCALE = 2e-9;
let TIME_SCALE = 60 * 60;
//物理演算の更新
function physicsUpdate(dt){
    const bodies = [sunBody, earthBody, moonBody];
    bodies.forEach(b => b.resetForce());

    for(let i=0;i<bodies.length;i++){
        for(let j=i+1;j<bodies.length;j++){
            bodies[i].addForce(bodies[j]);
            bodies[j].addForce(bodies[i]);
        }
    }

    bodies.forEach(b => b.update(dt));
}
//以下レンダー部分
//DOM要素
const DOM = {
    container : document.getElementById("container"),
    x : document.getElementById("x"),
    y : document.getElementById("y"),
    z : document.getElementById("z"),
    zoom : document.getElementById("zoom"),
    viewX : document.getElementById("viewX"),
    viewY : document.getElementById("viewY"),
    viewZ : document.getElementById("viewZ"),
    day : document.getElementById("day"),
};

//レンダラー
const renderer = new THREE.WebGPURenderer({
        canvas: document.querySelector("#can"),
    });
renderer.setPixelRatio(devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);

//シーンを作成
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

//fps表示用
const stats = new Stats();
stats.showPanel(0);
stats.dom.style.position = "absolute";
stats.dom.style.top = "0px";
stats.dom.style.left = "auto";
stats.dom.style.right = "0px";
DOM.container.appendChild(stats.dom);

//カメラ
const POV = 75
let cameraX = 0;
let cameraY = 0;
let cameraZ = 0;
const camera = new THREE.PerspectiveCamera(POV, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.z = cameraZ;


const earthTexture = new THREE.TextureLoader().load("earth_8k.jpg");
const cloudTexture = new THREE.TextureLoader().load("cloud_8k.jpg");
//地球
const earth = new THREE.Mesh(
    new THREE.SphereGeometry(1 * scaleFactor, 64, 64),
    new THREE.MeshStandardMaterial({
        map: earthTexture
    })
);
scene.add(earth);

/*const initEarth = new THREE.Mesh(
    new THREE.SphereGeometry(1.05 * scaleFactor, 64, 64),
    new THREE.MeshStandardMaterial({
        color: 0x555555,
    })
);
scene.add(initEarth);
initEarth.position.copy(earthBody.position.clone().multiplyScalar(SCALE));
*/
//雲
const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(1.1 * scaleFactor, 64, 64),
    new THREE.MeshStandardMaterial({
        map: cloudTexture,
        transparent: true,
        opacity: 0.8
    })
);
scene.add(clouds);

//太陽
const sunGeometry = new THREE.SphereGeometry(0.5 * scaleFactor, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

//月
const moon = new THREE.Mesh(
    new THREE.SphereGeometry(0.27 * scaleFactor, 32, 32),
    new THREE.MeshStandardMaterial({ color: 0xaaaaaa })
);
scene.add(moon);

//ライト
const light = new THREE.DirectionalLight(0xffffff, 10);
light.position.set(5, 5, 5);
scene.add(light);

const AmbientLight = new THREE.AmbientLight(0xBBBBBB);
AmbientLight.position.set(1, 1, 1);
scene.add(AmbientLight);

document.body.style.overflow = 'hidden';

//地球の軌道線
const MAX_POINTS = 1000;

const trailPositions = new Float32Array(MAX_POINTS * 3);
//なんかうまくいかんかったやつ
/*const earthPosForInit = earthBody.position.clone().multiplyScalar(SCALE);
for(let i = 0; i < MAX_POINTS * 3; i+=3){
    trailPositions[i] = earthPosForInit.x;
    trailPositions[i+1] = earthPosForInit.y;
    trailPositions[i+2] = earthPosForInit.z;
    console.log(trailPositions[i], trailPositions[i+1], trailPositions[i+2]);
}*/
let trailAdded = false;

const trailGeometry = new THREE.BufferGeometry();
trailGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(trailPositions, 3)
);

const trailMaterial = new THREE.LineBasicMaterial({ color: 0x00ffff });
const trailLine = new THREE.Line(trailGeometry, trailMaterial);
//月の軌道線
const moonTrailPositions = new Float32Array(MAX_POINTS * 3);
const moonTrailGeometry = new THREE.BufferGeometry();

moonTrailGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(moonTrailPositions, 3)
);

const moonTrail = new THREE.Line(
    moonTrailGeometry,
    new THREE.LineBasicMaterial({ color: 0xffffff })
);

//軌道線の更新
let moonTrailIndex = 0;
let earthTrailIndex = 0;
function updateTrail(earthPos, moonPos){
    const i = earthTrailIndex * 3;

    trailPositions[i] = earthPos.x;
    trailPositions[i + 1] = earthPos.y;
    trailPositions[i + 2] = earthPos.z;

    earthTrailIndex++;

    const j = moonTrailIndex * 3;

    moonTrailPositions[j] = moonPos.x;
    moonTrailPositions[j+1] = moonPos.y;
    moonTrailPositions[j+2] = moonPos.z;

    moonTrailIndex++;


    if(earthTrailIndex >= MAX_POINTS){
        earthTrailIndex = 0;
        moonTrailIndex = 0;
        //TrailPositions系を全部0で初期化してるから一回全部埋めてから表示
        if(!trailAdded){
            scene.add(trailLine);
            scene.add(moonTrail);
            trailAdded = true;
        } 
    }
    moonTrailGeometry.attributes.position.needsUpdate = true;
    trailGeometry.attributes.position.needsUpdate = true;
}
//背景の星
function createStarField(count = 5000) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count * 3; i++) {
        positions[i] = (Math.random() - 0.5) * 2000;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 1,
        sizeAttenuation: true
    });

    const stars = new THREE.Points(geometry, material);
    scene.add(stars);
}
createStarField();

let nowViewX = 0;
let nowViewY = 0;
let nowViewZ = 0;
let loockAtX = 0;
let loockAtY = 0;
let loockAtZ = 0;
let followEarth = true;
const FIXED_DT = 60;
let timeStop = false;
let day = 0;
const clock = new THREE.Clock();
//描画
function tick(){
    stats.begin();

    try{
        const fps = 1 / clock.getDelta();
        if(fps > 0){
            TIME_SCALE /= (1 / fps);
        }
        console.log(TIME_SCALE);
        for(let i = 0; i < TIME_SCALE / FIXED_DT; i++){
            physicsUpdate(FIXED_DT);
        }

        const earthPos = earthBody.position.clone().multiplyScalar(SCALE);
        const moonPos = moonBody.position.clone().multiplyScalar(SCALE);
        earth.position.copy(earthPos);
        clouds.position.copy(earthPos);
        sun.position.copy(sunBody.position.clone().multiplyScalar(SCALE));
        moon.position.copy(moonPos);
        day += TIME_SCALE / (60 * 60 * 24);
        DOM.day.textContent = Math.floor(day).toString();
        if(!timeStop){
        earth.rotation.y += 0.001;
        clouds.rotation.y += 0.0015;
        }
        loockAtX = earthPos.x + nowViewX;
        loockAtY = earthPos.y + nowViewY;
        loockAtZ = earthPos.z + nowViewZ;
        if (followEarth){
            camera.lookAt(new THREE.Vector3(loockAtX, loockAtY, loockAtZ));
        }else{
            camera.lookAt(0,0,0);
        }
        updateTrail(earthPos, moonPos);
        updateZoom();
        updateView();
        cameraViewEasing();
        camera.updateProjectionMatrix();
        renderer.render(scene, camera);
    }finally{    
        stats.end();
    }
}
renderer.setAnimationLoop(tick);


window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
});

//カメラ操作
const radius = 10;
let absoluteMouseX = 0;
let absoluteMouseY = 0;
let Xrot = 0;
let Yrot = 0;
let nowX = cameraX;
let nowY = cameraY;
let nowZ = cameraZ;
function updateView(){  
    const mouseX = (absoluteMouseX / window.innerWidth)*360;
    const mouseY = ((absoluteMouseY / window.innerHeight)/2 +0.25)*360;
    Xrot += (mouseX - Xrot) * 0.02;
    Yrot += (mouseY - Yrot) * 0.02;
    const phi = THREE.MathUtils.degToRad(90 - Yrot);
    const theta = THREE.MathUtils.degToRad(Xrot);
    camera.position.x = radius * Math.sin(phi) * Math.sin(theta);
    camera.position.y = radius * Math.cos(phi);
    camera.position.z = radius * Math.sin(phi) * Math.cos(theta);
    renderInfo();
}
//情報表示
function renderInfo(){
    DOM.x.textContent = camera.position.x.toFixed(2);
    DOM.y.textContent = camera.position.y.toFixed(2);
    DOM.z.textContent = camera.position.z.toFixed(2);
    DOM.zoom.textContent = camera.zoom.toFixed(2);
    DOM.viewX.textContent = loockAtX.toFixed(2);
    DOM.viewY.textContent = loockAtY.toFixed(2);
    DOM.viewZ.textContent = loockAtZ.toFixed(2);
}
//ズーム操作
let targetMag = 300;
window.addEventListener("wheel", (e) => {
    let correctionFactor = 0.008;
    if(targetMag < 1){
        correctionFactor *= 0.05;
    }else{
        correctionFactor *= 10;
    }
    targetMag -= e.deltaY * correctionFactor;
    targetMag = Math.max(0.05, Math.min(7500, targetMag));
});
let nowMag = 1;
function updateZoom(){
    nowMag += (targetMag - nowMag) * 0.03;
    camera.zoom = nowMag;
}
//マウス位置の取得
window.addEventListener("mousemove", (e) => {
    absoluteMouseX = e.clientX;
    absoluteMouseY = e.clientY;
});
//キーボード操作
const deltaPos = 1;
let cameraViewX = 0;
let cameraViewY = 0;
let cameraViewZ = 0;
window.addEventListener('keydown', (e) => {
  switch(e.key){
    case "w" :
        cameraViewY += deltaPos
        break;
    case "a" :
        cameraViewX -= deltaPos;
        break;
    case "s" : 
        cameraViewY -= deltaPos;
        break;
    case "d" : 
        cameraViewX += deltaPos;
        break;
    case "z" :
        cameraViewZ += deltaPos;
        break;
    case "c" :
        cameraViewZ -= deltaPos;
        break;
    case "0" :
        cameraViewX = 0;
        cameraViewY = 0;
        cameraViewZ = 0;
        camera.zoom = 1;
        cameraX = 0;
        cameraY = 0;
        cameraZ = 5;
        break;
    case " " :
        DOM.container.classList.toggle("hidden");
        break;
    case "f" :
        followEarth = !followEarth;
        break;
    case "1" :
        TIME_SCALE = 60 * 60;
        break;
    case "2" :
        TIME_SCALE = 60 * 60 * 24;
        break;
    case "3" :
        TIME_SCALE = 60 * 60 * 24 * 365;
        break;
    case "4" :
        TIME_SCALE = 0;
        timeStop = true;
        break;
  }
        console.log(TIME_SCALE);
});
//カメラの視点移動をイージング
function cameraViewEasing(){
    nowViewX += (cameraViewX - nowViewX) * 0.02;
    nowViewY += (cameraViewY - nowViewY) * 0.02;
    nowViewZ += (cameraViewZ - nowViewZ) * 0.02;
}
//ポインタロック
window.addEventListener('click', () => {
    if(document.pointerLockElement){
        document.exitPointerLock();
    } else {
        document.body.requestPointerLock();
    }});