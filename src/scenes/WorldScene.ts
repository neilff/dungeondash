import Phaser from 'phaser';

export default class WorldScene extends Phaser.Scene {
  constructor() {
    super('WorldScene');
  }

  create(): void {
    this.registry.set('currentLevel', 1);

    this.scene.run('GameScene');
  }
}
