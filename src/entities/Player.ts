import Phaser from 'phaser';
import Graphics from '../assets/Graphics';
import EventsCenter, { eventTypes } from '../events/EventsCenter';
import { ItemType, PlayerStats } from '../utils/types';

const speed = 125;
const attackSpeed = 500;
const attackDuration = 165;
const staggerDuration = 200;
const staggerSpeed = 100;
const attackCooldown = attackDuration * 2;

interface Keys {
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  space: Phaser.Input.Keyboard.Key;
  w: Phaser.Input.Keyboard.Key;
  a: Phaser.Input.Keyboard.Key;
  s: Phaser.Input.Keyboard.Key;
  d: Phaser.Input.Keyboard.Key;
  7: Phaser.Input.Keyboard.Key;
  8: Phaser.Input.Keyboard.Key;
  9: Phaser.Input.Keyboard.Key;
  6: Phaser.Input.Keyboard.Key;
  3: Phaser.Input.Keyboard.Key;
  2: Phaser.Input.Keyboard.Key;
  1: Phaser.Input.Keyboard.Key;
  4: Phaser.Input.Keyboard.Key;
}

export default class Player {
  public sprite: Phaser.Physics.Arcade.Sprite;
  private keys: Keys;

  private stats: PlayerStats;

  private attackUntil: number;
  private staggerUntil: number;
  private attackLockedUntil: number;
  private emitter: Phaser.GameObjects.Particles.ParticleEmitter;
  private flashEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
  private body: Phaser.Physics.Arcade.Body;
  private attacking: boolean;
  private time: number;
  private staggered: boolean;
  private scene: Phaser.Scene;
  private facingUp: boolean;
  private eventEmitter: Phaser.Events.EventEmitter;

  constructor(x: number, y: number, scene: Phaser.Scene) {
    this.stats = {
      maxHP: 100,
      HP: 100,
      maxMP: 10,
      MP: 0,
      maxStamina: 50,
      stamina: 0,
    };

    this.scene = scene;
    this.sprite = scene.physics.add.sprite(x, y, Graphics.player.name, 0);
    this.sprite.setSize(8, 8);
    this.sprite.setOffset(20, 28);
    this.sprite.anims.play(Graphics.player.animations.idle.key);
    this.facingUp = false;
    this.sprite.setDepth(5);

    this.keys = scene.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      w: 'w',
      a: 'a',
      s: 's',
      d: 'd',
      8: Phaser.Input.Keyboard.KeyCodes.NUMPAD_EIGHT,
      9: Phaser.Input.Keyboard.KeyCodes.NUMPAD_NINE,
      6: Phaser.Input.Keyboard.KeyCodes.NUMPAD_SIX,
      3: Phaser.Input.Keyboard.KeyCodes.NUMPAD_THREE,
      2: Phaser.Input.Keyboard.KeyCodes.NUMPAD_TWO,
      1: Phaser.Input.Keyboard.KeyCodes.NUMPAD_ONE,
      4: Phaser.Input.Keyboard.KeyCodes.NUMPAD_FOUR,
      7: Phaser.Input.Keyboard.KeyCodes.NUMPAD_SEVEN,
    }) as Keys;

    this.attackUntil = 0;
    this.attackLockedUntil = 0;
    this.attacking = false;
    this.staggerUntil = 0;
    this.staggered = false;

    const particles = scene.add.particles(Graphics.player.name);

    particles.setDepth(6);

    this.emitter = particles.createEmitter({
      alpha: { start: 0.7, end: 0, ease: 'Cubic.easeOut' },
      follow: this.sprite,
      quantity: 1,
      lifespan: 200,
      blendMode: Phaser.BlendModes.ADD,
      scaleX: () => (this.sprite.flipX ? -1 : 1),
      emitCallback: (particle: Phaser.GameObjects.Particles.Particle) => {
        particle.frame = this.sprite.frame;
      },
    });

    this.emitter.stop();

    this.flashEmitter = particles.createEmitter({
      alpha: { start: 0.5, end: 0, ease: 'Cubic.easeOut' },
      follow: this.sprite,
      quantity: 1,
      lifespan: 100,
      scaleX: () => (this.sprite.flipX ? -1 : 1),
      emitCallback: (particle: Phaser.GameObjects.Particles.Particle) => {
        particle.frame = this.sprite.frame;
      },
    });

    this.flashEmitter.stop();

    this.body = <Phaser.Physics.Arcade.Body>this.sprite.body;
    this.time = 0;

    // Allows other objects to subscribe to changes to the players stats
    this.scene.registry.set('playerStats', this.stats);

    // The event emitter allows us to communicate changes that occur to
    // the player from external sources. For example, when a power up is
    // picked up, we emit an event to notify the game that the player's
    // stats should be changed.
    this.eventEmitter = EventsCenter;
    this.eventEmitter.on(
      eventTypes.POWERUP_CONSUMED,
      ({ itemType }: { itemType: ItemType }) => {
        switch (itemType) {
          case 'healthPotion':
            this.heal();
            return;
          case 'manaPotion':
            this.increaseMP();
            return;
          case 'staminaPotion':
            this.increaseStamina();
            return;
        }
      }
    );
  }

  isAttacking(): boolean {
    return this.attacking;
  }

  stagger(): void {
    if (this.time > this.staggerUntil) {
      this.staggered = true;
      // TODO
      this.scene.cameras.main.shake(150, 0.001);
      this.scene.cameras.main.flash(50, 100, 0, 0);

      // TODO (neilff): Hardcoded attack value
      this.stats.HP = this.stats.HP - 10;

      if (this.stats.HP <= 0) {
        this.eventEmitter.emit(eventTypes.PLAYER_DEATH);
      }
    }
  }

  heal(): void {
    if (this.stats.HP < this.stats.maxHP) {
      this.stats.HP = this.stats.HP + 10;
    }
  }

  increaseMP(): void {
    if (this.stats.MP < this.stats.maxMP) {
      this.stats.MP = this.stats.MP + 10;
    }
  }

  increaseStamina(): void {
    if (this.stats.stamina < this.stats.maxStamina) {
      this.stats.stamina = this.stats.stamina + 10;
    }
  }

  private performSpecialAttack(time: number, attackAnim: string): void {
    this.attackUntil = time + attackDuration;
    this.attackLockedUntil = time + attackDuration + attackCooldown;
    this.body.velocity.normalize().scale(attackSpeed);
    this.sprite.anims.play(attackAnim, true);
    this.emitter.start();
    this.sprite.setBlendMode(Phaser.BlendModes.ADD);
    this.attacking = true;
  }

  update(time: number) {
    this.time = time;

    const keys = this.keys;

    let attackAnim = '';
    let moveAnim = '';

    if (this.staggered && !this.body.touching.none) {
      this.staggerUntil = this.time + staggerDuration;
      this.staggered = false;

      this.body.setVelocity(0);

      if (this.body.touching.down) {
        this.body.setVelocityY(-staggerSpeed);
      } else if (this.body.touching.up) {
        this.body.setVelocityY(staggerSpeed);
      } else if (this.body.touching.left) {
        this.body.setVelocityX(staggerSpeed);
        this.sprite.setFlipX(true);
      } else if (this.body.touching.right) {
        this.body.setVelocityX(-staggerSpeed);
        this.sprite.setFlipX(false);
      }
      this.sprite.anims.play(Graphics.player.animations.stagger.key);

      this.flashEmitter.start();
    }

    if (time < this.attackUntil || time < this.staggerUntil) {
      return;
    }

    this.body.setVelocity(0);

    const left = keys.left.isDown || keys.a.isDown;
    const right = keys.right.isDown || keys.d.isDown;
    const up = keys.up.isDown || keys.w.isDown;
    const down = keys.down.isDown || keys.s.isDown;

    if (!this.body.blocked.left && left) {
      this.body.setVelocityX(-speed);
      this.sprite.setFlipX(true);
    } else if (!this.body.blocked.right && right) {
      this.body.setVelocityX(speed);
      this.sprite.setFlipX(false);
    }

    if (!this.body.blocked.up && up) {
      this.body.setVelocityY(-speed);
    } else if (!this.body.blocked.down && down) {
      this.body.setVelocityY(speed);
    }

    if (left || right) {
      moveAnim = Graphics.player.animations.walk.key;
      attackAnim = Graphics.player.animations.slash.key;
      this.facingUp = false;
    } else if (down) {
      moveAnim = Graphics.player.animations.walk.key;
      attackAnim = Graphics.player.animations.slashDown.key;
      this.facingUp = false;
    } else if (up) {
      moveAnim = Graphics.player.animations.walkBack.key;
      attackAnim = Graphics.player.animations.slashUp.key;
      this.facingUp = true;
    } else if (this.facingUp) {
      moveAnim = Graphics.player.animations.idleBack.key;
    } else {
      moveAnim = Graphics.player.animations.idle.key;
    }

    if (
      keys.space!.isDown &&
      time > this.attackLockedUntil &&
      this.body.velocity.length() > 0
    ) {
      this.performSpecialAttack(time, attackAnim);
      return;
    }

    this.attacking = false;
    this.sprite.anims.play(moveAnim, true);
    this.body.velocity.normalize().scale(speed);
    this.sprite.setBlendMode(Phaser.BlendModes.NORMAL);

    if (this.emitter.on) {
      this.emitter.stop();
    }

    if (this.flashEmitter.on) {
      this.flashEmitter.stop();
    }
  }
}
