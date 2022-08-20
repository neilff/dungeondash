import Phaser from 'phaser';
import Graphics from '../assets/Graphics';
import EventsCenter, { eventTypes } from '../events/EventsCenter';
import { ItemType, PlayerStats } from '../utils/types';

const Animations = Graphics.player.animations;

const speed = 125;
const attackSpeed = 500;
const specialAttackDuration = 165;
const specialAttackCooldown = specialAttackDuration * 2;
const slashDuration = specialAttackDuration / 2;
const slashCooldown = specialAttackCooldown / 2;
const staggerDuration = 200;
const staggerSpeed = 100;

type Direction =
  | 'north'
  | 'north-east'
  | 'east'
  | 'south-east'
  | 'south'
  | 'south-west'
  | 'west'
  | 'north-west';

interface Keys {
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
  // Pointer angle relative to the player sprite
  private pointerAngle: number;
  private pointerRadians: number;
  private pointerLocation: { x: number; y: number };
  private scene: Phaser.Scene;
  private eventEmitter: Phaser.Events.EventEmitter;
  private aimRadius: Phaser.GameObjects.Arc;
  private aimBox: Phaser.GameObjects.Rectangle;

  private enableDebugMode: boolean;

  constructor(x: number, y: number, scene: Phaser.Scene) {
    this.stats = {
      maxHP: 100,
      HP: 100,
      maxMP: 10,
      MP: 0,
      maxStamina: 50,
      stamina: 0,
    };

    this.enableDebugMode = true;

    this.aimRadius = scene.add
      .circle(x, y, 10, 0x222222, this.enableDebugMode ? 0.25 : 0)
      .setDepth(10);
    const circleTop = this.aimRadius.getTopCenter();

    // TODO (neilff): Can this become a physics object?
    this.aimBox = scene.add
      .rectangle(
        circleTop.x,
        circleTop.y,
        25,
        25,
        0x222222,
        this.enableDebugMode ? 0.75 : 0
      )
      .setDepth(10);

    this.scene = scene;
    this.sprite = scene.physics.add.sprite(x, y, Graphics.player.name, 0);
    this.sprite.setSize(playerSizeX, playerSizeY);
    this.sprite.setOffset(20, 28);
    this.sprite.anims.play(Animations.idle.key);
    this.sprite.setDepth(5);

    this.hitBox = scene.physics.add
      .sprite(this.sprite.x, this.sprite.y + playerSizeY * 2.25, 'Player', 0)
      .setSize(playerSizeX * 2, playerSizeY * 2);

    this.hitBox.x = x;
    this.hitBox.y = y;

    this.pointerAngle = 0;
    this.pointerRadians = 0;
    this.pointerLocation = { x: 0, y: 0 };

    this.text = scene.add.text(x, y + 25, 'Hello World');
    this.text.setDepth(10);

    this.scene.input.on(
      'pointermove',
      (pointer: { worldX: number; worldY: number }) => {
        this.pointerRadians = Phaser.Math.Angle.BetweenPoints(this.sprite, {
          x: pointer.worldX,
          y: pointer.worldY,
        });

        this.pointerAngle = Phaser.Math.RadToDeg(this.pointerRadians);

        this.pointerLocation.x = pointer.worldX;
        this.pointerLocation.y = pointer.worldY;
      }
    );

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

  private getCircleXY(r: number, radians: number): { x: number; y: number } {
    return { x: -r * Math.cos(radians), y: -r * Math.sin(radians) };
  }

  private convertAngleToDirection(angle: number): Direction {
    let direction = null;

    switch (true) {
      case angle >= -22.5 && angle < 22.5:
        direction = 'east';
        break;
      case angle >= 22.5 && angle < 67.5:
        direction = 'south-east';
        break;
      case angle >= 67.5 && angle < 112.5:
        direction = 'south';
        break;
      case angle >= 112.5 && angle < 157.5:
        direction = 'south-west';
        break;
      case angle >= 157.5 || angle < -157.5:
        direction = 'west';
        break;
      case angle >= -157.5 && angle < -112.5:
        direction = 'north-west';
        break;
      case angle >= -112.5 && angle < -67.5:
        direction = 'north';
        break;
      case angle >= -67.5 && angle < -22.5:
        direction = 'north-east';
        break;
      default:
        throw new Error(`No angle found for ${angle}`);
    }

    this.text.setText(`Angle: ${angle}\n${direction}`);

    return direction as Direction;
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

  update(time: number) {
    const blocked = this.body.blocked;

    this.time = time;

    const keys = this.keys;

    let attackAnim = '';
    let moveAnim = '';

    if (this.staggered && !this.body.touching.none) {
      this.staggerUntil = this.time + staggerDuration;
      this.staggered = false;

      this.body.setVelocity(0);

      switch (true) {
        case this.body.touching.up:
          this.body.setVelocityY(staggerSpeed);
          break;
        case this.body.touching.down:
          this.body.setVelocityY(-staggerSpeed);
          break;
        case this.body.touching.left:
          this.body.setVelocityX(staggerSpeed);
          this.sprite.setFlipX(true);
          break;
        case this.body.touching.right:
          this.body.setVelocityX(-staggerSpeed);
          this.sprite.setFlipX(false);
          break;
      }

      this.sprite.anims.play(Animations.stagger.key);

      this.damageEmitter.start();
    }

    if (time < this.attackUntil || time < this.staggerUntil) {
      return;
    }

    this.body.setVelocity(0);

    const forward = keys.w.isDown;
    const backward = keys.s.isDown;
    const strafeLeft = keys.a.isDown;
    const strafeRight = keys.d.isDown;

    // Pointer direction relative to the character in the world
    const direction = this.convertAngleToDirection(this.pointerAngle);
    const isMoving = forward || backward || strafeLeft || strafeRight;

    // Setup the animation for the user based on the direction they are facing
    switch (true) {
      case !blocked.right && direction === 'east':
        this.sprite.setFlipX(false);
        moveAnim = isMoving ? Animations.walk.key : Animations.idle.key;
        attackAnim = Animations.slash.key;
        break;
      case !blocked.down && direction === 'south':
        moveAnim = isMoving ? Animations.walk.key : Animations.idle.key;
        attackAnim = Animations.slashDown.key;
        break;
      case !blocked.left && direction === 'west':
        this.sprite.setFlipX(true);
        moveAnim = isMoving ? Animations.walk.key : Animations.idle.key;
        attackAnim = Animations.slash.key;
        break;
      case !blocked.up && direction === 'north':
        moveAnim = isMoving ? Animations.walkBack.key : Animations.idleBack.key;
        attackAnim = Animations.slashUp.key;
        break;
    }

    switch (true) {
      case !this.body.blocked.left && direction === 'west':
        this.hitBox.x = this.sprite.x - playerSizeX * 2.25;
        this.hitBox.y = this.sprite.y;
        break;
      case !this.body.blocked.right && direction === 'east':
        this.hitBox.x = this.sprite.x + playerSizeX * 2.25;
        this.hitBox.y = this.sprite.y;
        backward;
        break;
      case !this.body.blocked.up && direction === 'north':
        this.hitBox.x = this.sprite.x;
        this.hitBox.y = this.sprite.y - playerSizeY * 2.25;
        break;
      case !this.body.blocked.down && direction === 'south':
        this.hitBox.x = this.sprite.x;
        this.hitBox.y = this.sprite.y + playerSizeY * 2.25;
        break;
    }

    this.aimRadius.x = this.sprite.x;
    this.aimRadius.y = this.sprite.y;

    this.text.x = this.sprite.x;
    this.text.y = this.sprite.y + 25;

    const circleCoords = this.getCircleXY(
      this.aimRadius.radius,
      this.pointerRadians
    );

    this.aimBox.x = this.aimRadius.x - circleCoords.x;
    this.aimBox.y = this.aimRadius.y - circleCoords.y;
    this.aimBox.rotation = this.pointerRadians;

    const vec = this.scene.physics.velocityFromAngle(this.aimBox.angle, 100);

    if (isMoving && forward) {
      this.sprite.setVelocity(vec.x, vec.y);

      // this.scene.physics.moveTo(
      //   this.sprite,
      //   vec.x,
      //   vec.y,
      //   speed
      // );
    }

    if (isMoving && backward) {
      this.scene.physics.moveTo(
        this.sprite,
        -this.aimBox.x,
        -this.aimBox.y,
        speed
      );
    }

    if (
      keys.space.isDown &&
      time > this.attackLockedUntil &&
      this.body.velocity.length() > 0
    ) {
      this.performSpecialAttack(time, attackAnim);
      return;
    }

    if (
      (keys.f.isDown || this.scene.input.activePointer.leftButtonDown()) &&
      time > this.attackLockedUntil
    ) {
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
