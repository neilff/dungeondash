import Phaser from 'phaser';
import Graphics from '../assets/Graphics';

export default class PreloaderScene extends Phaser.Scene {
  constructor() {
    super('PreloaderScene');
  }

  preload(): void {
    this.load.spritesheet(
      Graphics.interactive.name,
      Graphics.interactive.file,
      {
        frameHeight: Graphics.interactive.height,
        frameWidth: Graphics.interactive.width,
      }
    );
    this.load.image(Graphics.environment.name, Graphics.environment.file);
    this.load.image(Graphics.util.name, Graphics.util.file);
    this.load.spritesheet(Graphics.player.name, Graphics.player.file, {
      frameHeight: Graphics.player.height,
      frameWidth: Graphics.player.width,
    });
    this.load.spritesheet(Graphics.slime.name, Graphics.slime.file, {
      frameHeight: Graphics.slime.height,
      frameWidth: Graphics.slime.width,
    });
    this.load.spritesheet(Graphics.items.name, Graphics.items.file, {
      frameHeight: Graphics.items.height,
      frameWidth: Graphics.items.width,
    });
  }

  create(): void {
    Object.values(Graphics.player.animations).forEach((anim) => {
      if (!this.anims.get(anim.key)) {
        this.anims.create({
          ...anim,
          frames: this.anims.generateFrameNumbers(
            Graphics.player.name,
            anim.frames
          ),
        });
      }
    });

    Object.values(Graphics.slime.animations).forEach((anim) => {
      if (!this.anims.get(anim.key)) {
        this.anims.create({
          ...anim,
          frames: this.anims.generateFrameNumbers(
            Graphics.slime.name,
            anim.frames
          ),
        });
      }
    });

    this.scene.run('GameScene');
  }
}
