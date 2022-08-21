import Phaser from 'phaser';
import Fonts from '../assets/Fonts';
import { PlayerStats } from '../utils/types';

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
      const { HP, maxHP, MP, maxMP, stamina, maxStamina }: PlayerStats =
        this.registry.get('playerStats');
      const currentLevel = this.registry.get('currentLevel');

      this.text!.setText([
        `HP: ${HP} / ${maxHP}` +
          `\nMP: ${MP} / ${maxMP}` +
          `\nStamina: ${stamina} / ${maxStamina}` +
          `\nLevel: ${currentLevel}`,
      ]);
      this.lastUpdate = time;
    }
  }
}
