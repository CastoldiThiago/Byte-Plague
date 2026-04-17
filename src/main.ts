import './style.css';
import { SceneManager } from './core/SceneManager';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('No se encontro el contenedor #app para inicializar la escena.');
}

app.innerHTML = `
  <div id="game-root"></div>
  <div id="hud">
    <p>Click para capturar mouse</p>
    <p>WASD para moverte | ESC para liberar cursor</p>
  </div>
  <div id="crosshair" aria-hidden="true"></div>
`;

const gameRoot = document.querySelector<HTMLDivElement>('#game-root');

if (!gameRoot) {
  throw new Error('No se encontro el contenedor #game-root para renderizar.');
}

const sceneManager = new SceneManager(gameRoot);
sceneManager.start();

window.addEventListener('beforeunload', () => {
  sceneManager.dispose();
});
