import Phaser from 'phaser';
import Graphics from '../assets/Graphics';
import EventsCenter, { eventTypes } from '../events/EventsCenter';
import { ItemType, PlayerStats } from '../utils/types';

const speed = 125;
const attackSpeed = 500;
const specialAttackDuration = 165;
const specialAttackCooldown = specialAttackDuration * 2;
const slashDuration = specialAttackDuration / 2;
const slashCooldown = specialAttackCooldown / 2;
const staggerDuration = 200;
const staggerSpeed = 100;

interface Keys {
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  space: Phaser.Input.Keyboard.Key;
  f: Phaser.Input.Keyboard.Key;
  w: Phaser.Input.Keyboard.Key;
  a: Phaser.Input.Keyboard.Key;
  s: Phaser.Input.Keyboard.Key;
  d: Phaser.Input.Keyboard.Key;
}

const playerSizeX = 8;
const playerSizeY = 8;

export default class Player {
  public sprite: Phaser.Physics.Arcade.Sprite;
  public hitBox: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private keys: Keys;

  private stats: PlayerStats;

  private attackUntil: number;
  private staggerUntil: number;
  private attackLockedUntil: number;
  private specialAttackEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
  private damageEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
  private body: Phaser.Physics.Arcade.Body;
  private attacking: boolean;
  private time: number;
  private staggered: boolean;
  private scene: Phaser.Scene;
  private facingUp: boolean;
  private eventEmitter: Phaser.Events.EventEmitter;
  private lastDirection: 'left' | 'right' | 'up' | 'down' | 'idle';

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
    this.sprite.setSize(playerSizeX, playerSizeY);
    this.sprite.setOffset(20, 28);
    this.sprite.anims.play(Graphics.player.animations.idle.key);
    this.facingUp = false;
    this.sprite.setDepth(5);

    this.hitBox = scene.physics.add.sprite(
      this.sprite.x,
      this.sprite.y + playerSizeY * 2.25,
      'Player',
      0
    );

    this.hitBox.setSize(playerSizeX * 2, playerSizeY * 2);

    this.keys = scene.input.keyboard.addKeys({
      // Movement
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      w: 'w',
      a: 'a',
      s: 's',
      d: 'd',

      // Attacks
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      f: 'f',
    }) as Keys;

    this.lastDirection = 'down';
    this.attackUntil = 0;
    this.attackLockedUntil = 0;
    this.attacking = false;
    this.staggerUntil = 0;
    this.staggered = false;

    const particles = scene.add.particles(Graphics.player.name);

    particles.setDepth(6);

    this.specialAttackEmitter = particles.createEmitter({
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

    this.specialAttackEmitter.stop();

    this.damageEmitter = particles.createEmitter({
      alpha: { start: 0.5, end: 0, ease: 'Cubic.easeOut' },
      follow: this.sprite,
      quantity: 1,
      lifespan: 100,
      scaleX: () => (this.sprite.flipX ? -1 : 1),
      emitCallback: (particle: Phaser.GameObjects.Particles.Particle) => {
        particle.frame = this.sprite.frame;
      },
    });

    this.damageEmitter.stop();

    this.body = <Phaser.Physics.Arcade.Body>this.sprite.body;
    this.time = 0;

    // Allows other objects to subscribe to changes to the players stats
    this.scene.registry.set('playerStats', this.stats);

    // The event specialAttackEmitter allows us to communicate changes that occur to
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
    this.attackUntil = time + specialAttackDuration;
    this.attackLockedUntil =
      time + specialAttackDuration + specialAttackCooldown;
    this.body.velocity.normalize().scale(attackSpeed);
    this.sprite.anims.play(attackAnim, true);
    this.specialAttackEmitter.start();
    this.sprite.setBlendMode(Phaser.BlendModes.ADD);
    this.attacking = true;
  }

  private performSlash(time: number, attackAnim: string): void {
    this.attackUntil = time + slashDuration;
    this.attackLockedUntil = time + slashDuration + slashCooldown;
    // this.body.velocity.normalize().scale(attackSpeed);
    this.sprite.anims.play(attackAnim, true);
    this.specialAttackEmitter.start();
    this.attacking = true;
  }

  private getDirection({
    left,
    right,
    up,
    down,
  }: {
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
  }) {
    if (left) return 'left';
    if (right) return 'right';
    if (up) return 'up';
    if (down) return 'down';
    return this.lastDirection;
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

      this.damageEmitter.start();
    }

    if (time < this.attackUntil || time < this.staggerUntil) {
      return;
    }

    this.body.setVelocity(0);

    const left = keys.left.isDown || keys.a.isDown;
    const right = keys.right.isDown || keys.d.isDown;
    const up = keys.up.isDown || keys.w.isDown;
    const down = keys.down.isDown || keys.s.isDown;

    this.lastDirection = this.getDirection({ left, right, up, down });

    if (!this.body.blocked.left && left) {
      this.hitBox.x = this.sprite.x - playerSizeX * 2.25;
      this.hitBox.y = this.sprite.y;
      this.body.setVelocityX(-speed);
      this.sprite.setFlipX(true);
    } else if (!this.body.blocked.right && right) {
      this.hitBox.x = this.sprite.x + playerSizeX * 2.25;
      this.hitBox.y = this.sprite.y;
      this.body.setVelocityX(speed);
      this.sprite.setFlipX(false);
    }

    if (!this.body.blocked.up && up) {
      this.hitBox.x = this.sprite.x;
      this.hitBox.y = this.sprite.y - playerSizeY * 2.25;
      this.body.setVelocityY(-speed);
    } else if (!this.body.blocked.down && down) {
      this.hitBox.x = this.sprite.x;
      this.hitBox.y = this.sprite.y + playerSizeY * 2.25;
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
      attackAnim = Graphics.player.animations.slashUp.key;
    } else {
      const isFacingHorizontal =
        this.lastDirection === 'left' || this.lastDirection === 'right';
      moveAnim = Graphics.player.animations.idle.key;
      attackAnim = isFacingHorizontal
        ? Graphics.player.animations.slash.key
        : Graphics.player.animations.slashDown.key;
    }

    if (
      keys.space!.isDown &&
      time > this.attackLockedUntil &&
      this.body.velocity.length() > 0
    ) {
      this.performSpecialAttack(time, attackAnim);
      return;
    }

    if (keys.f.isDown && time > this.attackLockedUntil) {
      this.performSlash(time, attackAnim);
      return;
    }

    this.attacking = false;
    this.sprite.anims.play(moveAnim, true);
    this.body.velocity.normalize().scale(speed);
    this.sprite.setBlendMode(Phaser.BlendModes.NORMAL);

    if (this.specialAttackEmitter.on) {
      this.specialAttackEmitter.stop();
    }

    if (this.damageEmitter.on) {
      this.damageEmitter.stop();
    }
  }
}
