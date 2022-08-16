import Phaser from 'phaser';
import Graphics from '../assets/Graphics';
import EventsCenter, { eventTypes } from '../events/EventsCenter';
import { ItemType } from '../utils/types';

export default class Powerup {
  public readonly sprite: Phaser.Physics.Arcade.Sprite;
  private readonly body: Phaser.Physics.Arcade.Body;
  private readonly itemType: ItemType;
  private eventEmitter: Phaser.Events.EventEmitter;

  constructor(itemType: ItemType, x: number, y: number, scene: Phaser.Scene) {
    const frame = Graphics.items.indices[itemType];

    this.sprite = scene.physics.add.sprite(x, y, Graphics.items.name, frame);
    this.sprite.setSize(Graphics.items.height, Graphics.items.width);
    this.sprite.setOffset(0, 0);
    this.sprite.setDepth(10);

    this.body = <Phaser.Physics.Arcade.Body>this.sprite.body;
    this.body.setImmovable(true);

    this.itemType = itemType;
    this.eventEmitter = EventsCenter;
  }

  consume(): void {
    this.eventEmitter.emit(eventTypes.POWERUP_CONSUMED, {
      itemType: this.itemType,
    });

    this.sprite.destroy();
  }
}
