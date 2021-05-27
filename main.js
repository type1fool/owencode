import "./style.css";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { AfterimagePass } from "three/examples/jsm/postprocessing/AfterimagePass";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  120,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById("bg"),
  antialias: true,
});

renderer.setClearColor(new THREE.Color("#040404"), 1);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
camera.position.setZ(100);
renderer.render(scene, camera);

const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
const afterImagePass = new AfterimagePass(0.6);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(), 0.5, 1, 0);
composer.addPass(renderPass);
composer.addPass(afterImagePass);
composer.addPass(bloomPass);

const meshGroup = new THREE.Group();
const primaryGeometry = new THREE.TetrahedronBufferGeometry(
  THREE.MathUtils.randInt(5, 30)
);

Array(60)
  .fill()
  .map((x) => addMesh(x));
scene.add(meshGroup);

const pointLight = new THREE.PointLight(0xffffff, 0.02);
const ambientLight = new THREE.AmbientLight("white", 0);
pointLight.position.set(100, 200, 200);
scene.add(pointLight, ambientLight);

const starMaterial = new THREE.PointsMaterial({
  size: 1,
  // map: new THREE.SphereBufferGeometry({ size: 0.005 }),
  // transparent: true,
});
const starGeometry = new THREE.BufferGeometry();
const starCount = 5000;
const starPositions = new Float32Array(starCount * 3).map(
  (i) => (Math.random() - 0.5) * 5000
);

starGeometry.setAttribute(
  "position",
  new THREE.BufferAttribute(starPositions, 3)
);

const starMesh = new THREE.Points(starGeometry, starMaterial);
scene.add(starMesh);

const contentElement = document.getElementById("content");

contentElement.onscroll = moveCamera;

camera.updateProjectionMatrix();
composer.render();

window.addEventListener("resize", onWindowResize);

// animate();

function animate() {
  requestAnimationFrame(animate);
  // TODO: slow down/stop when close to meshGroup
  // camera.position.z += -0.01;

  if (typeof controls !== "undefined") {
    controls.update();
  }

  camera.updateProjectionMatrix();
  composer.render();
}

function addMesh(iteration = 1) {
  const primaryMaterial = new THREE.MeshPhysicalMaterial({
    clearcoat: 1,
    color: new THREE.Color(
      THREE.MathUtils.randInt(0, 40),
      THREE.MathUtils.randInt(0, 40),
      THREE.MathUtils.randInt(0, 40)
    ),
    dithering: true,
  });
  const mesh = new THREE.Mesh(primaryGeometry, primaryMaterial);

  const [xPosition, yPosition, zPosition] = getRandomFloatCoordinates(
    window.innerWidth / 2
  );
  mesh.position.set(xPosition, yPosition, zPosition);

  const [xRotation, yRotation, zRotation] = getRandomFloatCoordinates(180);
  mesh.rotation.set(xRotation, yRotation, zRotation);

  // mesh.castShadow = true;
  // mesh.receiveShadow = true;
  meshGroup.add(mesh);
}

function getRandomFloatCoordinates(spread) {
  return Array(3)
    .fill()
    .map(() => THREE.MathUtils.randFloatSpread(spread));
}

function moveCamera(event) {
  const t = event.target.scrollTop;
  camera.position.setY(t * -0.02);
  camera.updateProjectionMatrix();
  composer.render();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.render();
}
