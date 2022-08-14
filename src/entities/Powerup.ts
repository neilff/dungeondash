import Phaser from 'phaser';
import Graphics from '../assets/Graphics';

export default class Powerup {
  public readonly sprite: Phaser.Physics.Arcade.Sprite;
  private readonly body: Phaser.Physics.Arcade.Body;

  constructor(x: number, y: number, scene: Phaser.Scene) {
    this.sprite = scene.physics.add.sprite(x, y, Graphics.slime.name, 0);
    this.sprite.setSize(12, 10);
    this.sprite.setOffset(10, 14);
    this.sprite.anims.play(Graphics.slime.animations.idle.key);
    this.sprite.setDepth(10);

    this.body = <Phaser.Physics.Arcade.Body>this.sprite.body;
    this.body.bounce.set(0, 0);
    this.body.setImmovable(true);
  }

  update(time: number) {
    console.log({ time });
  }

  consume() {
    this.sprite.destroy();
  }
}
