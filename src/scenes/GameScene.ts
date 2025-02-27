import Phaser from 'phaser';
import Graphics from '../assets/Graphics';
import FOVLayer from '../entities/FOVLayer';
import Player from '../entities/Player';
import Slime from '../entities/Slime';
import Stairs from '../entities/Stairs';
import Map from '../entities/Map';
import Powerup from '../entities/Powerup';
import playerData from '../data/playerData';
import EventsCenter, { eventTypes } from '../events/EventsCenter';

const worldTileHeight = 25;
const worldTileWidth = 25;

export default class GameScene extends Phaser.Scene {
  lastX: number;
  lastY: number;
  player: Player | null;
  slimes: Slime[];
  slimeGroup: Phaser.GameObjects.Group | null;
  stairs: Stairs[];
  stairGroup: Phaser.GameObjects.Group | null;
  powerups: Powerup[];
  powerupGroup: Phaser.GameObjects.Group | null;
  fov: FOVLayer | null;
  tilemap: Phaser.Tilemaps.Tilemap | null;
  map: Map | null;
  roomDebugGraphics?: Phaser.GameObjects.Graphics;
  enableDebugMode: boolean;

  private eventEmitter: Phaser.Events.EventEmitter;

  constructor() {
    super('GameScene');
    this.lastX = -1;
    this.lastY = -1;
    this.player = null;
    this.fov = null;
    this.map = null;
    this.tilemap = null;
    this.slimes = [];
    this.slimeGroup = null;
    this.stairs = [];
    this.stairGroup = null;
    this.powerups = [];
    this.powerupGroup = null;
    this.eventEmitter = EventsCenter;
    this.enableDebugMode = false;
  }

  init(props: { level: number }): void {
    const { level = 1 } = props;
    this.registry.set('currentLevel', level);
  }

  create(): void {
    this.enableDebugMode = this.registry.get('devMode');

    this.scene.run('InterfaceScene');

    const map = new Map(
      this.registry.get('currentLevel'),
      worldTileWidth,
      worldTileHeight,
      this,
      {
        enableDebugMode: this.enableDebugMode,
      }
    );

    this.map = map;
    this.tilemap = map.tilemap;

    if (!this.enableDebugMode) {
      this.fov = new FOVLayer(map);
    }

    this.player = new Player(
      playerData,
      this.tilemap.tileToWorldX(map.startingX),
      this.tilemap.tileToWorldY(map.startingY),
      this
    );

    // TODO (neilff): Rename slimes -> generic enemy class so that
    // we can have different types of enemies.
    this.slimes = map.slimes;
    this.slimeGroup = this.physics.add.group(this.slimes.map((s) => s.sprite));

    this.powerups = map.powerups;
    this.powerupGroup = this.physics.add.group(
      this.powerups.map((p) => p.sprite)
    );

    this.stairs = map.stairs;
    this.stairGroup = this.physics.add.staticGroup(
      this.stairs.map((p) => p.sprite)
    );

    this.cameras.main.setRoundPixels(true);
    this.cameras.main.setZoom(3);
    this.cameras.main.setBounds(
      0,
      0,
      map.width * Graphics.environment.width,
      map.height * Graphics.environment.height
    );
    this.cameras.main.startFollow(this.player.sprite);

    this.physics.add.collider(this.player.sprite, map.wallLayer);
    this.physics.add.collider(this.slimeGroup, map.wallLayer);

    this.physics.add.collider(this.player.sprite, map.doorLayer);
    this.physics.add.collider(this.slimeGroup, map.doorLayer);

    this.physics.add.collider(
      this.player.sprite,
      this.stairGroup,
      undefined,
      this.stairsPlayerCollide,
      this
    );

    this.physics.add.collider(
      this.player.hitBox,
      this.slimeGroup,
      undefined,
      this.playerAttackSlime,
      this
    );

    this.physics.add.collider(
      this.player.sprite,
      this.slimeGroup,
      undefined,
      this.slimePlayerCollide,
      this
    );

    this.physics.add.collider(
      this.player.sprite,
      this.powerupGroup,
      undefined,
      this.powerupPlayerCollide,
      this
    );

    for (let slime of this.slimes) {
      this.physics.add.collider(slime.sprite, map.wallLayer);
    }

    // TODO (neilff): Move keyboard bindings to a central place.
    // As-is it is hard to tell which key is which
    this.input.keyboard
      .addKey(Phaser.Input.Keyboard.KeyCodes.L)
      .on('down', () => {
        this.fov?.layer.setVisible(!this.fov?.layer.visible);
      });

    this.input.keyboard
      .addKey(Phaser.Input.Keyboard.KeyCodes.O)
      .on('down', () => {
        this.scene.run('ReferenceScene');
        this.scene.sleep();
      });

    this.eventEmitter.on(eventTypes.PLAYER_DEATH, () => {
      if (this.enableDebugMode) {
        console.info('Player has died, clearing scene.');
      }

      this.onDeath();
    });

    this.eventEmitter.on(
      eventTypes.CHANGE_LEVEL,
      ({ direction }: { direction: 'up' | 'down' }) => {
        this.onChangeLevel(direction);
      }
    );

    this.renderDebugGraphics();
  }

  update(time: number, delta: number) {
    this.player!.update(time);

    const camera = this.cameras.main;

    for (let slime of this.slimes) {
      slime.update(time);
    }

    const player = new Phaser.Math.Vector2({
      x: this.tilemap!.worldToTileX(this.player!.sprite.body.x),
      y: this.tilemap!.worldToTileY(this.player!.sprite.body.y),
    });

    const bounds = new Phaser.Geom.Rectangle(
      this.tilemap!.worldToTileX(camera.worldView.x) - 1,
      this.tilemap!.worldToTileY(camera.worldView.y) - 1,
      this.tilemap!.worldToTileX(camera.worldView.width) + 2,
      this.tilemap!.worldToTileX(camera.worldView.height) + 2
    );

    this.fov?.update(player, bounds, delta);
  }

  private stairsPlayerCollide(
    _playerObj: Phaser.GameObjects.GameObject,
    stairSprite: Phaser.GameObjects.GameObject
  ) {
    const stairs = this.stairs.find((s) => s.sprite === stairSprite);

    if (!stairs) {
      console.warn('Missing stair sprite in stairs array!');
      return false;
    }

    stairs.activate();

    return true;
  }

  private playerAttackSlime(
    _: Phaser.GameObjects.GameObject,
    slimeSprite: Phaser.GameObjects.GameObject
  ) {
    const slime = this.slimes.find((s) => s.sprite === slimeSprite);

    if (!slime) {
      console.warn('Missing slime for sprite collision!');
      return;
    }

    // Player attacks Slime
    if (this.player!.isAttacking()) {
      this.slimes = this.slimes.filter((s) => s != slime);
      slime.kill();
      return false;
    }

    return;
  }

  private slimePlayerCollide(
    _: Phaser.GameObjects.GameObject,
    slimeSprite: Phaser.GameObjects.GameObject
  ) {
    const slime = this.slimes.find((s) => s.sprite === slimeSprite);

    if (!slime) {
      console.warn('Missing slime for sprite collision!');
      return;
    }

    // Player attacks Slime
    if (this.player!.isAttacking()) {
      this.slimes = this.slimes.filter((s) => s != slime);
      slime.kill();
      return false;
    }

    // Slime attacks Player
    if (!this.player!.isAttacking()) {
      this.player!.stagger();
      return true;
    }

    return;
  }

  private powerupPlayerCollide(
    _: Phaser.GameObjects.GameObject,
    targetSprite: Phaser.GameObjects.GameObject
  ) {
    const targetPowerup = this.powerups.find((s) => s.sprite === targetSprite);

    targetPowerup?.consume();
  }

  private renderDebugGraphics() {
    this.input.keyboard
      .addKey(Phaser.Input.Keyboard.KeyCodes.Q)
      .on('down', () => {
        this.physics.world.drawDebug = !this.physics.world.drawDebug;
        if (!this.physics.world.debugGraphic) {
          this.physics.world.createDebugGraphic();
        }
        this.physics.world.debugGraphic.clear();
        this.roomDebugGraphics!.setVisible(this.physics.world.drawDebug);
      });

    this.roomDebugGraphics = this.add.graphics({ x: 0, y: 0 });
    this.roomDebugGraphics.setVisible(false);
    this.roomDebugGraphics.lineStyle(2, 0xff5500, 0.5);

    for (let room of this.map!.rooms) {
      this.roomDebugGraphics.strokeRect(
        this.tilemap!.tileToWorldX(room.x),
        this.tilemap!.tileToWorldY(room.y),
        this.tilemap!.tileToWorldX(room.width),
        this.tilemap!.tileToWorldY(room.height)
      );
    }
  }

  private onChangeLevel(direction: 'up' | 'down') {
    const currentLevel = this.registry.get('currentLevel');
    const nextLevel =
      direction === 'down' ? currentLevel + 1 : currentLevel - 1;

    this.scene.restart({ level: nextLevel });
  }

  private onDeath() {
    this.eventEmitter.off(eventTypes.PLAYER_DEATH);

    this.registry.reset(); // destroy registry
    this.scene.restart(); // restart current scene
  }
}
