import "./style.css";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { AfterimagePass } from "three/examples/jsm/postprocessing/AfterimagePass";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass";
import { FilmPass } from "three/examples/jsm/postprocessing/FilmPass";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass";
import { Group } from "three";

const scene = new THREE.Scene();
scene.raycast(THREE.Raycaster);
const camera = new THREE.PerspectiveCamera(
  120,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById("bg"),
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
camera.position.setZ(150);
renderer.render(scene, camera);

const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
const afterImagePass = new AfterimagePass(0.5);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(), 0.5, 1, 0);
const filmPass = new FilmPass(0.5, 0, 0, 0);
composer.addPass(renderPass);
composer.addPass(afterImagePass);
composer.addPass(bloomPass);
composer.addPass(filmPass);

const meshGroup = new THREE.Group();

function addMesh(iteration = 1) {
  const primaryGeometry = new THREE.TetrahedronBufferGeometry(
    THREE.MathUtils.randInt(5, 30)
  );
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

Array(60)
  .fill()
  .map((x) => addMesh(x));
scene.add(meshGroup);

const pointLight = new THREE.PointLight(0xffffff, 0.02);
const ambientLight = new THREE.AmbientLight("white", 0);
pointLight.position.set(100, 200, 200);
scene.add(pointLight, ambientLight);

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
// animate();

const starGeometry = new THREE.SphereBufferGeometry(
  THREE.MathUtils.randFloatSpread(0.5),
  24,
  24
);
const starMaterial = new THREE.MeshToonMaterial({ color: 0xffffff });

function getRandomFloatCoordinates(spread) {
  return Array(3)
    .fill()
    .map(() => THREE.MathUtils.randFloatSpread(spread));
}

const contentElement = document.getElementById("content");

function moveCamera(event) {
  const t = event.target.scrollTop;
  camera.position.setY(t * -0.02);
  camera.updateProjectionMatrix();
  composer.render();
}
contentElement.onscroll = moveCamera;

camera.updateProjectionMatrix();
composer.render();
