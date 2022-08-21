import Phaser from 'phaser';
import Graphics from '../assets/Graphics';
import EventsCenter, { eventTypes } from '../events/EventsCenter';

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
    const frame = Graphics.interactive.indices.stairs[direction];

    this.sprite = scene.physics.add.staticSprite(
      x,
      y,
      Graphics.interactive.name,
      frame
    );
    this.sprite.setSize(4, 4);
    this.sprite.setOffset(-5, 5);
    this.sprite.setDepth(5);

    this.direction = direction;
    this.eventEmitter = EventsCenter;
  }

  activate(): void {
    this.eventEmitter.emit(eventTypes.CHANGE_LEVEL, {
      direction: this.direction,
    });
  }
}
