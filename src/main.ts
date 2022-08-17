import ReferenceScene from './scenes/ReferenceScene';
import Phaser from 'phaser';
import InterfaceScene from './scenes/InterfaceScene';
import InfoScene from './scenes/InfoScene';
import GameScene from './scenes/GameScene';
// import SceneWatcherPlugin from "phaser-plugin-scene-watcher";

const game = new Phaser.Game({
  type: Phaser.WEBGL,
  width: window.innerWidth,
  height: window.innerHeight,
  render: { pixelArt: true },
  physics: { default: 'arcade', arcade: { debug: true, gravity: { y: 0 } } },
  scene: [GameScene, InfoScene, ReferenceScene, InterfaceScene],
  scale: {
    // mode: Phaser.Scale.RESIZE,
    mode: Phaser.Scale.NONE,
  },
  zoom: 1,
  plugins: {
    // global: [{ key: "SceneWatcher", plugin: SceneWatcherPlugin, start: true }],
  },
});

game.registry.set('devMode', true);
