import Phaser from 'phaser';
import ReferenceScene from './scenes/ReferenceScene';
import DungeonScene from './scenes/DungeonScene';
import InfoScene from './scenes/InfoScene';
import InterfaceScene from './scenes/InterfaceScene';
import globalConfig from './config';
// import SceneWatcherPlugin from "phaser-plugin-scene-watcher";

const dungeonScene = new DungeonScene(globalConfig);

new Phaser.Game({
  type: Phaser.WEBGL,
  // width: window.innerWidth,
  // height: window.innerHeight,
  render: { pixelArt: true },
  physics: { default: 'arcade', arcade: { debug: true, gravity: { y: 0 } } },
  scene: [dungeonScene, InfoScene, ReferenceScene, InterfaceScene],
  scale: {
    // mode: Phaser.Scale.RESIZE,
    mode: Phaser.Scale.NONE,
  },
  width: 512,
  height: 512,
  zoom: 1,
  plugins: {
    // global: [{ key: "SceneWatcher", plugin: SceneWatcherPlugin, start: true }],
  },
});
