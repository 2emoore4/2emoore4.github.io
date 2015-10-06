var w = 480;
var h = 270;

var renderer = new PIXI.WebGLRenderer(w, h, {antialias: true});
renderer.backgroundColor = 0x222222;
var graphics = new PIXI.Graphics();
var drawingRenderer = new UTIL.renderer(graphics, w, h);

noise.seed(Math.random());

function init() {
  while (eyes.firstChild) {
    eyes.removeChild(eyes.firstChild);
  }

  document.getElementById("eyes").appendChild(renderer.view);

  initCube();

  setInterval(renderGraphics, 100);
  requestAnimationFrame(animate);
}

var vr = false, renderer2, graphics2, drawingRenderer2;
function initvr() {
  vr = true;

  var eyes = document.getElementById("eyes");
  if (eyes.requestFullscreen) {
    eyes.requestFullscreen();
  } else if (eyes.msRequestFullscreen) {
    eyes.msRequestFullscreen();
  } else if (eyes.mozRequestFullScreen) {
    eyes.mozRequestFullScreen();
  } else if (eyes.webkitRequestFullscreen) {
    eyes.webkitRequestFullscreen();
  }

  while (eyes.firstChild) {
    eyes.removeChild(eyes.firstChild);
  }

  renderer = new PIXI.WebGLRenderer(screen.width / 2, screen.height, {antialias: true});
  renderer.backgroundColor = 0x222222;
  graphics = new PIXI.Graphics();

  renderer2 = new PIXI.WebGLRenderer(screen.width / 2, screen.height, {antialias: true});
  renderer2.backgroundColor = 0x222222;
  graphics2 = new PIXI.Graphics();

  drawingRenderer = new UTIL.renderer(graphics, screen.width / 2, screen.height, graphics2);

  eyes.appendChild(renderer.view);
  eyes.appendChild(renderer2.view);

  initCube();

  var lastAlpha = null, lastBeta = null, lastGamma = null;
  window.addEventListener('deviceorientation', function(eventData) {
    var adiff = eventData.alpha - lastAlpha;
    var bdiff = eventData.beta - lastBeta;
    var gdiff = eventData.gamma - lastGamma;

    drawingRenderer.rotateY(adiff * (Math.PI / 180));
    drawingRenderer.rotateX(bdiff * (Math.PI / 180));
    drawingRenderer.rotateZ(gdiff * (Math.PI / 180));

    lastAlpha = eventData.alpha;
    lastBeta = eventData.beta;
    lastGamma = eventData.gamma;
  }, false);

  function FShandler() {
    if (document.webkitFullscreenElement == null) {
      renderer = new PIXI.WebGLRenderer(w, h, {antialias: true});
      renderer.backgroundColor = 0x222222;
      graphics = new PIXI.Graphics();
      drawingRenderer = new UTIL.renderer(graphics, w, h);

      while (eyes.firstChild) {
        eyes.removeChild(eyes.firstChild);
      }

      document.getElementById("eyes").appendChild(renderer.view);

      initCube();
    }
  }

  document.addEventListener("webkitfullscreenchange", FShandler);
}

var cube;
function initCube() {
  cube = new UTIL.geometry().cube();
  drawingRenderer.world.add(cube);
}

function renderGraphics() {
  graphics.clear();
  graphics.lineStyle(3, 0x5c6274);

  if (vr) {
    graphics2.clear();
    graphics2.lineStyle(3, 0x5c6274);
  }

  drawingRenderer.renderWorld();
}

function animate() {
  cube.rotateY(0.01);
  renderer.render(graphics);

  if (vr) {
    renderer2.render(graphics2);
  }

  requestAnimationFrame(animate);
}

init();
