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
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.z = 5;
const controls = new OrbitControls(camera, document.getElementById("can"));

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

let targetRot = 0;
let rot = 0;
//描画
function tick(){
    earth.rotation.y += 0.001;
    clouds.rotation.y += 0.0015;
    rot += (targetRot - rot) * 0.02;

    renderer.render(scene, camera);
}
renderer.setAnimationLoop(tick);


window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
});

function easeInCameraZoomOut(targetRot){
        
        camera.fov += rot;
        camera.updateProjectionMatrix();
}

addEventListener("wheel", (e) => {
    targetRot = e.deltaY;
})