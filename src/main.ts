import './style.css';
import { SceneManager } from './core/SceneManager';
import { HUDManager } from './ui/HUDManager';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('No se encontro el contenedor #app para inicializar la escena.');

app.innerHTML = `
  <div id="game-root"></div>
  <div id="hud">
    <p>Virus infiltrado por phishing</p>
    <p>WASD moverse | E interactuar | 1/2/3 elegir comando | Q/R ver notas | ESC liberar cursor</p>
    <div id="alert-bar-track">
      <div id="alert-bar-fill"></div>
    </div>
    <p id="alert-status">Presencia encubierta</p>
    <p id="timer-display">TIEMPO: 03:00</p>
  </div>
  <div id="crosshair" aria-hidden="true"></div>
`;

const sceneManager = new SceneManager(document.querySelector<HTMLDivElement>('#game-root')!);

const hud = new HUDManager(
  document.querySelector<HTMLDivElement>('#alert-bar-fill')!,
  document.querySelector<HTMLParagraphElement>('#alert-status')!,
  document.querySelector<HTMLParagraphElement>('#timer-display')!,
);

sceneManager.start();

window.addEventListener('beforeunload', () => {
  hud.dispose();
  sceneManager.dispose();
});
