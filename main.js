import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

//レンダラー
const renderer = new THREE.WebGPURenderer({
        canvas: document.querySelector("#can"),
    });
renderer.setPixelRatio(devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);

//シーンを作成
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

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
    new THREE.SphereGeometry(1, 64, 64),
    new THREE.MeshStandardMaterial({
        map: earthTexture
    })
);
scene.add(earth);
//雲
const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(1.03, 64, 64),
    new THREE.MeshStandardMaterial({
        map: cloudTexture,
        transparent: true,
        opacity: 0.8
    })
);
scene.add(clouds);

//ライト
const light = new THREE.DirectionalLight(0xffffff, 10);
light.position.set(5, 5, 5);
scene.add(light);

const AmbientLight = new THREE.AmbientLight(0xBBBBBB);
AmbientLight.position.set(1, 1, 1);
scene.add(AmbientLight);

document.body.style.overflow = 'hidden';

//描画
function tick(){
    earth.rotation.y += 0.001;
    clouds.rotation.y += 0.0015;
    updateZoom();
    updateView();
    cameraPosEasing();
    camera.lookAt(new THREE.Vector3(nowX,nowY,nowZ));
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
}
camera.lookAt(new THREE.Vector3(0, 0, 0));
renderer.setAnimationLoop(tick);


window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
});

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
}

let targetMag = 1;
window.addEventListener("wheel", (e) => {
    targetMag -= e.deltaY * 0.008;
    targetMag = Math.max(0.5, Math.min(75, targetMag));
});
let nowMag = 1
function updateZoom(){
    nowMag += (targetMag - nowMag) * 0.03;
    camera.zoom = nowMag;
}

window.addEventListener("mousemove", (e) => {
    absoluteMouseX = e.clientX;
    absoluteMouseY = e.clientY;
});

const deltaPos = 1;
window.addEventListener('keydown', (e) => {
  switch(e.key){
    case "w" :
        cameraZ += deltaPos
        break;
    case "a" :
        cameraX -= deltaPos;
        break;
    case "s" : 
        cameraZ -= deltaPos;
        break;
    case "d" : 
        cameraX += deltaPos;
        break;
  }
  console.log(cameraX,cameraY,cameraZ)
});
function cameraPosEasing(){
    nowX += (cameraX - nowX) * 0.02;
    nowY += (cameraY - nowY) * 0.02;
    nowZ += (cameraZ - nowZ) * 0.02;
}