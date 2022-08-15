import Phaser from 'phaser';
import Graphics from '../assets/Graphics';

type ItemType = keyof typeof Graphics.items.indices;

export default class Powerup {
  public readonly sprite: Phaser.Physics.Arcade.Sprite;
  private readonly body: Phaser.Physics.Arcade.Body;

  constructor(itemType: ItemType, x: number, y: number, scene: Phaser.Scene) {
    const frame = Graphics.items.indices[itemType];

    this.sprite = scene.physics.add.sprite(x, y, Graphics.items.name, frame);
    this.sprite.setSize(Graphics.items.height, Graphics.items.width);
    this.sprite.setOffset(0, 0);
    this.sprite.setDepth(10);

    this.body = <Phaser.Physics.Arcade.Body>this.sprite.body;
    this.body.setImmovable(true);
  }

  update(time: number) {}

  consume(_: Phaser.Scene) {
    this.sprite.destroy();
  }
}
