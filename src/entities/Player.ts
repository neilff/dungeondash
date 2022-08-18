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

type Direction = 'up' | 'down' | 'left' | 'right';

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
  public directionIndicator: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
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
  private pointerLocation: { x: number; y: number };
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
    this.sprite.setSize(playerSizeX, playerSizeY);
    this.sprite.setOffset(20, 28);
    this.sprite.anims.play(Graphics.player.animations.idle.key);
    this.facingUp = false;
    this.sprite.setDepth(5);

    this.hitBox = scene.physics.add
      .sprite(this.sprite.x, this.sprite.y + playerSizeY * 2.25, 'Player', 0)
      .setSize(playerSizeX * 2, playerSizeY * 2);

    this.directionIndicator = scene.physics.add
      .sprite(0, 0, 'cursor', 0)
      .setVisible(false);

    this.directionIndicator.setSize(24, 24);

    this.text = scene.add.text(10, 150, 'Hello World').setDepth(10);

    this.pointerAngle = 0;
    this.pointerLocation = { x: 0, y: 0 };

    this.scene.input.on(
      'pointermove',
      (pointer: { worldX: number; worldY: number }) => {
        this.pointerAngle = Phaser.Math.RadToDeg(
          Phaser.Math.Angle.BetweenPoints(this.sprite, {
            x: pointer.worldX,
            y: pointer.worldY,
          })
        );

        this.text.setText(this.convertAngleToDirection(this.pointerAngle));

        this.pointerLocation.x = pointer.worldX;
        this.pointerLocation.y = pointer.worldY;

        this.directionIndicator
          .setPosition(pointer.worldX, pointer.worldY)
          .setVisible(true);
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

  private convertAngleToDirection(angle: number): Direction {
    if (angle >= -45 && angle < 45) {
      return 'right';
    } else if (angle >= 45 && angle < 135) {
      return 'down';
    } else if (angle >= 135 || angle < -135) {
      return 'left';
    } else {
      return 'up';
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

    const left = keys.left.isDown;
    const right = keys.right.isDown;
    const up = keys.up.isDown;
    const down = keys.down.isDown;

    const forward = keys.w.isDown;
    const backward = keys.s.isDown;
    const strafeLeft = keys.a.isDown;
    const strafeRight = keys.d.isDown;

    const distanceBetweenPointerAndPlayer = Phaser.Math.Distance.BetweenPoints(
      this.sprite,
      this.pointerLocation
    );

    const speedMultiplier =
      distanceBetweenPointerAndPlayer > 100
        ? 1
        : distanceBetweenPointerAndPlayer / 100;

    const pointerDirection = this.convertAngleToDirection(this.pointerAngle);
    const isMoving =
      (forward || backward || strafeLeft || strafeRight) &&
      distanceBetweenPointerAndPlayer > 5;

    if (!this.body.blocked.left && pointerDirection === 'left') {
      this.hitBox.x = this.sprite.x - playerSizeX * 2.25;
      this.hitBox.y = this.sprite.y;
      this.facingUp = false;
      this.sprite.setFlipX(true);
      moveAnim = isMoving
        ? Graphics.player.animations.walk.key
        : Graphics.player.animations.idle.key;
      attackAnim = Graphics.player.animations.slash.key;
    } else if (!this.body.blocked.right && pointerDirection === 'right') {
      this.hitBox.x = this.sprite.x + playerSizeX * 2.25;
      this.hitBox.y = this.sprite.y;
      this.facingUp = false;
      this.sprite.setFlipX(false);
      moveAnim = isMoving
        ? Graphics.player.animations.walk.key
        : Graphics.player.animations.idle.key;
      attackAnim = Graphics.player.animations.slash.key;
    }

    if (!this.body.blocked.up && pointerDirection === 'up') {
      this.hitBox.x = this.sprite.x;
      this.hitBox.y = this.sprite.y - playerSizeY * 2.25;
      this.facingUp = true;
      moveAnim = isMoving
        ? Graphics.player.animations.walkBack.key
        : Graphics.player.animations.idleBack.key;
      attackAnim = Graphics.player.animations.slashUp.key;
    } else if (!this.body.blocked.down && pointerDirection === 'down') {
      this.hitBox.x = this.sprite.x;
      this.hitBox.y = this.sprite.y + playerSizeY * 2.25;
      this.facingUp = false;
      moveAnim = isMoving
        ? Graphics.player.animations.walk.key
        : Graphics.player.animations.idle.key;
      attackAnim = Graphics.player.animations.slashDown.key;
    }

    console.log({ speed: speed * speedMultiplier });

    if (isMoving && forward) {
      this.scene.physics.moveTo(
        this.sprite,
        this.pointerLocation.x,
        this.pointerLocation.y,
        speed * speedMultiplier
      );
    }

    if (isMoving && backward) {
      this.scene.physics.moveTo(
        this.sprite,
        -this.pointerLocation.x,
        -this.pointerLocation.y,
        speed
      );
    }

    // if (left || right) {
    //   moveAnim = Graphics.player.animations.walk.key;
    //   attackAnim = Graphics.player.animations.slash.key;
    //   this.facingUp = false;
    // } else if (down) {
    //   moveAnim = Graphics.player.animations.walk.key;
    //   attackAnim = Graphics.player.animations.slashDown.key;
    //   this.facingUp = false;
    // } else if (up) {
    //   moveAnim = Graphics.player.animations.walkBack.key;
    //   attackAnim = Graphics.player.animations.slashUp.key;
    //   this.facingUp = true;
    // } else if (this.facingUp) {
    //   moveAnim = Graphics.player.animations.idleBack.key;
    //   attackAnim = Graphics.player.animations.slashUp.key;
    // } else {
    //   const isFacingHorizontal =
    //     pointerDirection === 'left' || pointerDirection === 'right';
    //   moveAnim = Graphics.player.animations.idle.key;
    //   attackAnim = isFacingHorizontal
    //     ? Graphics.player.animations.slash.key
    //     : Graphics.player.animations.slashDown.key;
    // }

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
