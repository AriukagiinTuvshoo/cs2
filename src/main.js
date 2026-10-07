import { Game } from './game.js';
import { UI } from './ui.js';

const canvas = document.getElementById('view');
const ui = new UI();
const game = new Game(canvas, ui);
ui.bind(game);

window.addEventListener('error', (ev) => ui.crash(ev.error || ev.message));
window.addEventListener('unhandledrejection', (ev) => ui.crash(ev.reason));
