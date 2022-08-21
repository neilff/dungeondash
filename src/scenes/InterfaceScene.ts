import Phaser from 'phaser';
import Fonts from '../assets/Fonts';
import { PlayerStats } from '../data/playerData';

export default class InterfaceScene extends Phaser.Scene {
  text?: Phaser.GameObjects.DynamicBitmapText;
  levelText?: Phaser.GameObjects.DynamicBitmapText;
  blackScreen?: Phaser.GameObjects.Rectangle;
  lastUpdate?: number;
  isLevelScreenVisible: boolean;

  constructor() {
    super({ key: 'InterfaceScene' });

    this.isLevelScreenVisible = false;
  }

  preload(): void {
    this.load.bitmapFont('default', ...Fonts.default);
  }

  create(): void {
    this.text = this.add.dynamicBitmapText(25, 25, 'default', '', 12);
    this.levelText = this.add.dynamicBitmapText(25, 25, 'default', '', 12);

    this.blackScreen = this.add
      .rectangle(
        0,
        0,
        this.game.config.width as number,
        this.game.config.height as number,
        0x000000
      )
      .setOrigin(0, 0)
      .setDepth(20)
      .setAlpha(0);

    this.text.setAlpha(1);
    this.lastUpdate = 0;

    this.showLevelIndicator();
  }

  private hideLevelIndicator(): void {
    this.tweens.add({
      targets: this.levelText!,
      delay: 2000,
      duration: 750,
      alpha: 0,
    });

    this.tweens.add({
      targets: this.blackScreen!,
      delay: 2000,
      duration: 750,
      alpha: 0,
      onComplete: () => {
        this.isLevelScreenVisible = false;
      },
    });
  }

  private showLevelIndicator(): void {
    this.isLevelScreenVisible = true;

    this.blackScreen!.setAlpha(1);
    this.levelText!.setAlpha(1);
    this.levelText!.setDepth(21);

    const currentLevel = this.registry.get('currentLevel');
    const screenCenterX =
      this.cameras.main.worldView.x + this.cameras.main.width / 2;
    const screenCenterY =
      this.cameras.main.worldView.y + this.cameras.main.height / 2;

    this.levelText!.setText([`Level ${currentLevel}`]).setPosition(
      screenCenterX,
      screenCenterY
    );

    this.hideLevelIndicator();
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
