import './style.css';
import { SceneManager } from './core/SceneManager';
import { HUDManager } from './ui/HUDManager';
import { PauseMenu } from './ui/PauseMenu';
import { StartScreen } from './ui/StartScreen';
import { GameConfig } from './core/GameConfig';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('No se encontro el contenedor #app.');

// Game systems — created only after start screen closes
let sceneManager: SceneManager | null = null;
let pauseMenu: PauseMenu | null = null;
let hud: HUDManager | null = null;

function initGame(): void {
  app!.innerHTML = `
    <div id="game-root"></div>
    <div id="hud">
      <p>Virus infiltrado por phishing</p>
      <p>WASD moverse | E abrir terminal | Enter ejecutar | ° cerrar terminal | N objetivos | H herramientas | ESC pausar</p>
      <div id="alert-bar-track">
        <div id="alert-bar-fill"></div>
      </div>
      <p id="alert-status">Presencia encubierta</p>
      <p id="timer-display">TIEMPO: 03:00</p>
    </div>
    <div id="crosshair" aria-hidden="true"></div>
  `;

  sceneManager = new SceneManager(document.querySelector<HTMLDivElement>('#game-root')!);
  pauseMenu    = new PauseMenu(() => sceneManager!.requestPointerLock());
  hud          = new HUDManager(
    document.querySelector<HTMLDivElement>('#alert-bar-fill')!,
    document.querySelector<HTMLParagraphElement>('#alert-status')!,
    document.querySelector<HTMLParagraphElement>('#timer-display')!,
  );
  sceneManager.start();
}

// If "Reintentar" was clicked, skip the start screen and jump straight to game
if (GameConfig.consumeAutostart()) {
  initGame();
} else {
  new StartScreen(initGame);
}

window.addEventListener('beforeunload', () => {
  hud?.dispose();
  pauseMenu?.dispose();
  sceneManager?.dispose();
});
