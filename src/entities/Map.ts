import Dungeoneer from 'dungeoneer';
import Tile, { TileType } from './Tile';
import Slime from './Slime';
import Powerup from './Powerup';
import Graphics from '../assets/Graphics';
import GameScene from '../scenes/GameScene';
import Room from './Room';
import Stairs from './Stairs';

const chunk = (arr: Array<any>, size: number) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );

type MapOptions = {
  enableDebugMode: boolean;
};

export default class Map {
  public readonly tiles: Tile[][];
  public readonly width: number;
  public readonly height: number;
  public readonly tilemap: Phaser.Tilemaps.Tilemap;
  public readonly groundLayer: Phaser.Tilemaps.TilemapLayer;
  public readonly wallLayer: Phaser.Tilemaps.TilemapLayer;
  public readonly doorLayer: Phaser.Tilemaps.TilemapLayer;

  public readonly currentLevel: number;
  public readonly startingX: number;
  public readonly startingY: number;

  public readonly stairs: Stairs[];
  public readonly slimes: Slime[];
  public readonly powerups: Powerup[];

  public readonly rooms: Dungeoneer.Room[];

  constructor(
    currentLevel: number,
    width: number,
    height: number,
    scene: GameScene,
    options: MapOptions
  ) {
    let dungeon = null;

    if (options.enableDebugMode) {
      type TileObject = {
        x: number;
        y: number;
        type: 'floor' | 'wall' | 'door';
      };

      const rooms = [new Room({ x: 0, y: 0, width, height })];

      const staticTiles: Array<Array<TileObject>> = rooms.reduce(
        (acc, room) => {
          for (let x = 0; x < room.width; x++) {
            const tileVertileLine: Array<TileObject> = [];

            const isFirstX = x === 0;
            const isLastX = x === room.width - 1;

            for (let y = 0; y < room.height; y++) {
              const isFirstY = y === 0;
              const isLastY = y === room.height - 1;

              const line: TileObject = {
                x: x,
                y: y,
                type:
                  isFirstX || isLastX || isFirstY || isLastY ? 'wall' : 'floor',
              };

              tileVertileLine.push(line);
            }

            acc.push(tileVertileLine);
          }

          return acc;
        },
        [] as Array<Array<TileObject>>
      );

      dungeon = {
        seed: 'development',
        rooms,
        tiles: staticTiles,
      };
    }

    if (!options.enableDebugMode) {
      dungeon = Dungeoneer.build({
        width: width,
        height: height,
      });
    }

    this.currentLevel = currentLevel;

    this.rooms = dungeon!.rooms;

    this.width = width;
    this.height = height;

    this.tiles = [];

    for (let y = 0; y < height; y++) {
      this.tiles.push([]);
      for (let x = 0; x < width; x++) {
        const tileType = Tile.tileTypeFor(dungeon!.tiles[x][y].type);
        this.tiles[y][x] = new Tile(tileType, x, y, this);
      }
    }

    const toReset = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tile = this.tiles[y][x];
        if (tile.type === TileType.Wall && tile.isEnclosed()) {
          toReset.push({ y: y, x: x });
        }
      }
    }

    toReset.forEach((d) => {
      this.tiles[d.y][d.x] = new Tile(TileType.None, d.x, d.y, this);
    });

    const roomNumber = Math.floor(Math.random() * dungeon!.rooms.length);

    if (options.enableDebugMode) {
      this.startingX = 5;
      this.startingY = 15;
    } else {
      const firstRoom = dungeon!.rooms[roomNumber];

      this.startingX = Math.floor(firstRoom.x + firstRoom.width / 2);
      this.startingY = Math.floor(firstRoom.y + firstRoom.height / 2);
    }

    this.tilemap = scene.make.tilemap({
      tileWidth: Graphics.environment.width,
      tileHeight: Graphics.environment.height,
      width: width,
      height: height,
    });

    const dungeonTiles = this.tilemap.addTilesetImage(
      Graphics.environment.name,
      Graphics.environment.name,
      Graphics.environment.width,
      Graphics.environment.height,
      Graphics.environment.margin,
      Graphics.environment.spacing
    );

    this.groundLayer = this.tilemap
      .createBlankLayer('Ground', dungeonTiles, 0, 0)
      .randomize(
        0,
        0,
        this.width,
        this.height,
        Graphics.environment.indices.floor.outerCorridor
      );

    // TODO (neilff): This is a temporary workaround to render all powerups
    // in the development environment. Add a proper solution for this.
    const powerUpsArray = chunk(Object.keys(Graphics.items.indices), 5);

    this.powerups = powerUpsArray.reduce((acc, row, rowIndex) => {
      row.forEach((powerupType, colIndex) => {
        const xValue = this.startingX + 100 + colIndex * 20;
        const yValue = this.startingY + 100 + rowIndex * 20;

        acc.push(new Powerup(powerupType, xValue, yValue, scene));
      });

      return acc;
    }, []);

    this.slimes = [];

    const randomRoom =
      dungeon!.rooms[Math.floor(Math.random() * dungeon!.rooms.length)];
    const randomRoomTL = this.tilemap.tileToWorldXY(
      randomRoom.x + 1,
      randomRoom.y + 1
    );
    const randomRoomBounds = this.tilemap.tileToWorldXY(
      randomRoom.x + randomRoom.width - 1,
      randomRoom.y + randomRoom.height - 1
    );

    this.stairs = [
      new Stairs(
        'down',
        Phaser.Math.Between(randomRoomTL.x, randomRoomBounds.x),
        Phaser.Math.Between(randomRoomTL.y, randomRoomBounds.y),
        scene
      ),
    ];

    for (let room of dungeon!.rooms) {
      this.groundLayer.randomize(
        room.x - 1,
        room.y - 1,
        room.width + 2,
        room.height + 2,
        Graphics.environment.indices.floor.outer
      );

      if (room.height < 4 || room.width < 4) {
        continue;
      }

      const roomTL = this.tilemap.tileToWorldXY(room.x + 1, room.y + 1);
      const roomBounds = this.tilemap.tileToWorldXY(
        room.x + room.width - 1,
        room.y + room.height - 1
      );
      const numSlimes = Phaser.Math.Between(1, 3);

      for (let i = 0; i < numSlimes; i++) {
        this.slimes.push(
          new Slime(
            Phaser.Math.Between(roomTL.x, roomBounds.x),
            Phaser.Math.Between(roomTL.y, roomBounds.y),
            scene
          )
        );
      }
    }

    this.wallLayer = this.tilemap.createBlankLayer('Wall', dungeonTiles, 0, 0);
    this.doorLayer = this.tilemap.createBlankLayer('Door', dungeonTiles, 0, 0);

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const tile = this.tiles[y][x];
        if (tile.type === TileType.Wall) {
          this.wallLayer.putTileAt(tile.spriteIndex(), x, y);
        } else if (tile.type === TileType.Door) {
          this.doorLayer.putTileAt(tile.spriteIndex(), x, y);
        }
      }
    }

    this.wallLayer.setCollisionBetween(0, 0x7f);

    const collidableDoors = [
      Graphics.environment.indices.doors.horizontal,
      Graphics.environment.indices.doors.vertical,
    ];

    this.doorLayer.setCollision(collidableDoors);

    this.doorLayer.setTileIndexCallback(
      collidableDoors,
      (_: unknown, tile: Phaser.Tilemaps.Tile) => {
        this.doorLayer.putTileAt(
          Graphics.environment.indices.doors.destroyed,
          tile.x,
          tile.y
        );
        this.tileAt(tile.x, tile.y)!.open();

        // FOV will not exist if debug mode is enabled.
        scene.fov?.recalculate();
      },
      this
    );

    this.groundLayer.setDepth(1);
    this.wallLayer.setDepth(2);
    this.doorLayer.setDepth(3);
  }

  tileAt(x: number, y: number): Tile | null {
    if (y < 0 || y >= this.height || x < 0 || x >= this.width) {
      return null;
    }
    return this.tiles[y][x];
  }

  withinRoom(x: number, y: number): boolean {
    return (
      this.rooms.find((r) => {
        const { top, left, right, bottom } = r.getBoundingBox();
        return (
          y >= top - 1 && y <= bottom + 1 && x >= left - 1 && x <= right + 1
        );
      }) != undefined
    );
  }
}
