import Phaser from 'phaser';
import Fonts from '../assets/Fonts';
import EventsCenter, { eventTypes } from '../events/EventsCenter';

export default class InterfaceScene extends Phaser.Scene {
  text?: Phaser.GameObjects.DynamicBitmapText;
  lastUpdate?: number;

  private eventEmitter: Phaser.Events.EventEmitter;
  private maxHP: number | null;
  private HP: number | null;

  constructor() {
    super({ key: 'InterfaceScene' });

    this.maxHP = null;
    this.HP = null;
    this.eventEmitter = EventsCenter;

    this.eventEmitter.on(
      eventTypes.playerCreated,
      ({ maxHP, HP }: { maxHP: number; HP: number }) => {
        this.maxHP = maxHP;
        this.HP = HP;
      }
    );

    this.eventEmitter.on(eventTypes.playerHit, ({ HP }: { HP: number }) => {
      this.HP = HP;
    });
  }

  preload(): void {
    this.load.bitmapFont('default', ...Fonts.default);
  }

  create(): void {
    this.text = this.add.dynamicBitmapText(25, 25, 'default', '', 12);
    this.text.setAlpha(1);
    this.lastUpdate = 0;
  }

  update(time: number, _: number): void {
    if (time > this.lastUpdate! + 100) {
      this.text!.setText([`HP: ${this.HP} / ${this.maxHP}`]);
      this.lastUpdate = time;
    }
  }
}
