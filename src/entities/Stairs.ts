import Phaser from 'phaser';
import Graphics from '../assets/Graphics';
import EventsCenter from '../events/EventsCenter';

type StairsDirection = 'up' | 'down';

export default class Stairs {
  public readonly sprite: Phaser.Physics.Arcade.Sprite;
  private eventEmitter: Phaser.Events.EventEmitter;
  private direction: StairsDirection;

  constructor(
    direction: StairsDirection,
    x: number,
    y: number,
    scene: Phaser.Scene
  ) {
    const frame = Graphics.environment.indices.stairs[direction];

    this.sprite = scene.physics.add.staticSprite(
      x,
      y,
      Graphics.environment.name,
      frame
    );
    this.sprite.setSize(4, 4);
    this.sprite.setOffset(-5, 5);
    this.sprite.setDepth(5);

    this.direction = direction;
    this.eventEmitter = EventsCenter;
  }

  activate(): void {
    console.log('stairs activated: ', this.direction);
  }
}
