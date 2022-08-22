import ReferenceScene from './scenes/ReferenceScene';
import Phaser from 'phaser';
import InterfaceScene from './scenes/InterfaceScene';
import GameScene from './scenes/GameScene';
import PreloaderScene from './scenes/PreloaderScene';
// import SceneWatcherPlugin from "phaser-plugin-scene-watcher";

const game = new Phaser.Game({
  type: Phaser.WEBGL,
  width: window.innerWidth,
  height: window.innerHeight,
  render: { pixelArt: true },
  physics: { default: 'arcade', arcade: { debug: true, gravity: { y: 0 } } },
  scene: [PreloaderScene, GameScene, ReferenceScene, InterfaceScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
  },
  zoom: 1,
  plugins: {
    // global: [{ key: "SceneWatcher", plugin: SceneWatcherPlugin, start: true }],
  },
});

game.registry.set('devMode', false);
