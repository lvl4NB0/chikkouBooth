import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// シーン
const scene = new THREE.Scene();

// カメラ
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.z = 5;

//レンダラー
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const earthTexture = new THREE.TextureLoader().load("earth_8k.webp");
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

//描画
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
});

const correctionFactor = 0.01;
let absoluteMouseX = 0;
let absoluteMouseY = 0;
function onMouseMove(){    
    const mouseX = (absoluteMouseX / window.innerWidth) * 2 - 1;
    const mouseY = -(absoluteMouseY / window.innerHeight) * 2 + 1;
    earth.rotation.y += mouseX * correctionFactor;
    earth.rotation.x += mouseY * correctionFactor;
    clouds.rotation.y += mouseX * correctionFactor;
    clouds.rotation.x += mouseY * correctionFactor;
}

window.addEventListener("mousemove", (event) => {
    absoluteMouseX = event.clientX;
    absoluteMouseY = event.clientY;
});
let interval;
window.addEventListener("mousedown", () => {interval = setInterval(onMouseMove,10)});
window,addEventListener("mouseup", () => {clearInterval(interval)})