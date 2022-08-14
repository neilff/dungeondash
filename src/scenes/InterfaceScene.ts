import Phaser from 'phaser';
import Fonts from '../assets/Fonts';

export default class InterfaceScene extends Phaser.Scene {
  text?: Phaser.GameObjects.DynamicBitmapText;
  lastUpdate?: number;

  constructor() {
    super({ key: 'InterfaceScene' });
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
      this.text!.setText(['Dungeon Dash!']);
      this.lastUpdate = time;
    }
  }
}
