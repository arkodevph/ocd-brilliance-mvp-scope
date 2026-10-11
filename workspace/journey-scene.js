import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export function mountJourneyScene(surface, options) {
  let disposed = false;
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor('#edf1e9');
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  surface.append(renderer.domElement);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#ffffff', '#8b9c82', 2.4));
  const sun = new THREE.DirectionalLight('#fff9e8', 3);
  sun.position.set(10, 25, 12);
  scene.add(sun);
  const camera = new THREE.OrthographicCamera();
  camera.position.set(32, 40, 40);
  camera.lookAt(0, 0, 0);
  const route = new THREE.CatmullRomCurve3(
    [
      [-14, -9],
      [-14, -3],
      [-6, -3],
      [-6, 6],
      [12, 6],
    ].map(([x, z]) => new THREE.Vector3(x, 0, z)),
    false,
    'centripetal',
  );
  const material = (color) => new THREE.MeshStandardMaterial({ color, roughness: 1 });
  function box(width, height, depth, x, z, color) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material(color));
    mesh.position.set(x, height / 2 - 0.15, z);
    scene.add(mesh);
    return mesh;
  }
  box(46, 0.2, 40, 0, 0, '#e1e8db').position.y = -0.2;
  const road = new THREE.Mesh(
    new THREE.TubeGeometry(route, 100, 1.5, 8, false),
    material('#a5b2a4'),
  );
  road.scale.y = 0.025;
  scene.add(road);
  const points = route.getSpacedPoints(200).map((p) => p.setY(0.08));
  const guide = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineDashedMaterial({
      color: '#f9faf5',
      dashSize: 0.55,
      gapSize: 0.45,
    }),
  );
  guide.computeLineDistances();
  scene.add(guide);
  const vertices = [],
    indices = [];
  points.forEach((point, i) => {
    const tangent = route.getTangentAt(i / 200);
    const offset = new THREE.Vector3(-tangent.z, 0, tangent.x).multiplyScalar(0.28);
    for (const side of [-1, 1])
      vertices.push(point.x + offset.x * side, 0.11, point.z + offset.z * side);
    if (i < 200) {
      const v = i * 2;
      indices.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
    }
  });
  const routeGeometry = new THREE.BufferGeometry();
  routeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  routeGeometry.setIndex(indices);
  const remainingRoute = new THREE.Mesh(
    routeGeometry,
    new THREE.MeshBasicMaterial({ color: '#169b58', side: THREE.DoubleSide }),
  );
  scene.add(remainingRoute);
  for (const [x, z, height] of [
    [-18, -5, 2],
    [-18, 5, 3],
    [-10, -9, 2.5],
    [-3, -9, 3.5],
    [4, -9, 2],
    [11, -9, 2.8],
    [3, 0, 3],
    [11, 0, 2.2],
    [-12, 11, 2],
    [-4, 11, 3],
    [4, 11, 2.5],
  ]) {
    box(3.5, height, 3, x, z, '#ced8c7');
    box(3.9, 0.3, 3.4, x, z, '#a5b59e').position.y = height;
  }
  for (const [x, z] of [
    [-19, -11],
    [-19, 11],
    [-1, -1],
    [17, -5],
    [17, 10],
  ]) {
    box(0.3, 1.8, 0.3, x, z, '#9c8e70');
    const leaves = new THREE.Mesh(new THREE.SphereGeometry(1.2, 10, 8), material('#97af87'));
    leaves.position.set(x, 2.2, z);
    scene.add(leaves);
  }
  function label(text, position) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 96;
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, 512, 96);
    context.font = 'bold 32px Arial';
    context.textAlign = 'center';
    context.fillStyle = '#0a5b3e';
    context.fillText(text, 256, 59);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false }));
    sprite.position.copy(position);
    sprite.scale.set(9, 1.7, 1);
    scene.add(sprite);
    return { canvas, context, texture };
  }
  label(
    options.client ? 'Illustrative approach' : 'Office · demo',
    route
      .getPointAt(0)
      .clone()
      .add(new THREE.Vector3(0, 3.2, 0)),
  );
  const destination = route.getPointAt(1);
  const pin = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.7, 16), material('#0a5b3e'));
  pin.rotation.z = Math.PI;
  pin.position.copy(destination).setY(2.8);
  scene.add(pin);
  const pinHead = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 12), material('#0a5b3e'));
  pinHead.position.copy(destination).setY(4);
  scene.add(pinHead);
  const destinationLabel = label(
    'Service location',
    destination.clone().add(new THREE.Vector3(0, 6, 0)),
  );
  let lastName;

  let car;
  const ready = new GLTFLoader().loadAsync('/assets/vehicles/sedan.glb').then((gltf) => {
    car = gltf.scene;
    car.scale.setScalar(1.6);
    if (disposed) {
      release(car);
      return;
    }
    scene.add(car);
  });
  function resize() {
    const padding = options.padding();
    const width = Math.max(1, surface.clientWidth - padding.left - padding.right);
    const aspect = width / surface.clientHeight;
    const halfHeight = Math.max(18, 22 / aspect);
    camera.left = -halfHeight * aspect;
    camera.right = halfHeight * aspect;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.near = 0.1;
    camera.far = 150;
    camera.updateProjectionMatrix();
    renderer.setSize(surface.clientWidth, surface.clientHeight);
    renderer.setViewport(padding.left, 0, width, surface.clientHeight);
  }
  const observer = new ResizeObserver(resize);
  observer.observe(surface);
  resize();
  const setPerspective = (threeD) => {
    camera.position.set(threeD ? 32 : 0, threeD ? 40 : 60, threeD ? 40 : 0.01);
    camera.lookAt(0, 0, 0);
  };
  setPerspective(options.threeD);
  renderer.setAnimationLoop(() => {
    const state = options.snapshot();
    const progress = state.progress || 0;
    if (car) {
      car.visible = Boolean(state.showVehicle);
      car.position.copy(route.getPointAt(progress)).setY(0.08);
      const direction = route.getTangentAt(progress);
      car.rotation.y = Math.atan2(direction.x, direction.z);
    }
    const segment = Math.floor(progress * 200);
    routeGeometry.setDrawRange(segment * 6, (200 - segment) * 6);
    remainingRoute.visible = Boolean(state.name) && state.phase !== 'stale' && !state.hideRoute;
    if (state.name !== lastName) {
      lastName = state.name;
      const { context, texture } = destinationLabel;
      context.clearRect(0, 0, 512, 96);
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, 512, 96);
      context.fillStyle = '#0a5b3e';
      context.fillText(
        state.name ? state.name.slice(0, 30) + ' · service' : 'No booking selected',
        256,
        59,
      );
      texture.needsUpdate = true;
    }
    renderer.render(scene, camera);
  });
  return {
    ready,
    setPerspective,
    dispose() {
      disposed = true;
      observer.disconnect();
      renderer.setAnimationLoop(null);
      release(scene);
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
function release(scene) {
  scene.traverse((object) => {
    object.geometry?.dispose();
    for (const material of Array.isArray(object.material)
      ? object.material
      : object.material
        ? [object.material]
        : []) {
      for (const value of Object.values(material)) if (value?.isTexture) value.dispose();
      material.dispose();
    }
  });
}
