import './style.css';
import { SceneManager } from './core/SceneManager';
import { GameStateManager } from './core/GameStateManager';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('No se encontro el contenedor #app para inicializar la escena.');
}

app.innerHTML = `
  <div id="game-root"></div>
  <div id="hud">
    <p>Click para capturar mouse</p>
    <p>WASD para moverte | ESC para liberar cursor</p>
    <div id="alert-bar-track">
      <div id="alert-bar-fill"></div>
    </div>
    <p id="alert-status">Sistema en reposo</p>
    <p id="timer-display">TIEMPO: 02:00</p>
  </div>
  <div id="crosshair" aria-hidden="true"></div>
`;

const gameRoot = document.querySelector<HTMLDivElement>('#game-root')!;
const alertFill = document.querySelector<HTMLDivElement>('#alert-bar-fill')!;
const alertStatus = document.querySelector<HTMLParagraphElement>('#alert-status')!;
const timerDisplay = document.querySelector<HTMLParagraphElement>('#timer-display')!;

const sceneManager = new SceneManager(gameRoot);
sceneManager.start();

const intervalId = setInterval((): void => {
  const state = GameStateManager.getInstance();

  const level = state.alertLevel;
  const hue = Math.round(120 - (level / 100) * 120);

  alertFill.style.width = `${level}%`;
  alertFill.style.backgroundColor = `hsl(${hue}, 85%, 45%)`;

  if (level <= 30) {
    alertStatus.textContent = 'Sistema en reposo';
    alertStatus.style.color = '#9bff4f';
  } else if (level <= 70) {
    alertStatus.textContent = 'Anomalía detectada';
    alertStatus.style.color = '#ffd166';
  } else {
    alertStatus.textContent = 'Alerta crítica';
    alertStatus.style.color = '#ff6b6b';
  }

  const secs = state.timerSeconds;
  const min = Math.floor(secs / 60).toString().padStart(2, '0');
  const sec = (secs % 60).toString().padStart(2, '0');
  timerDisplay.textContent = `TIEMPO: ${min}:${sec}`;
  timerDisplay.style.color = secs <= 30 ? '#ff6b6b' : '#9bff4f';
}, 500);

window.addEventListener('beforeunload', () => {
  clearInterval(intervalId);
  sceneManager.dispose();
});
