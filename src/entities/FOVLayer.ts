import Graphics from "../assets/Graphics";
import Map from "../entities/Map";
import Mrpas from "mrpas";
import Phaser from "phaser";

const radius = 7;
const fogAlpha = 0.8;

const lightDropoff = [0.7, 0.6, 0.3, 0.1];

const alphaPerMs = 0.002;

export default class FOVLayer {
  public layer: Phaser.Tilemaps.DynamicTilemapLayer;
  private mrpas: any;
  private lastPos: Phaser.Math.Vector2;
  private map: Map;

  constructor(map: Map) {
    const utilTiles = map.tilemap.addTilesetImage("util");

    this.layer = map.tilemap
      .createBlankDynamicLayer("Dark", utilTiles, 0, 0)
      .fill(Graphics.util.indices.black);

    this.mrpas = new Mrpas(map.width, map.height, (x: number, y: number) => {
      return map.tiles[y] && !map.tiles[y][x].collides;
    });

    this.lastPos = new Phaser.Math.Vector2({ x: -1, y: -1 });
    this.map = map;
  }

  update(
    pos: Phaser.Math.Vector2,
    bounds: Phaser.Geom.Rectangle,
    delta: number
  ) {
    if (!this.lastPos.equals(pos)) {
      this.updateMRPAS(pos);
      this.lastPos = pos.clone();
    }

    for (let y = bounds.y; y < bounds.y + bounds.height; y++) {
      for (let x = bounds.x; x < bounds.x + bounds.width; x++) {
        if (y < 0 || y > this.map.height || x < 0 || x > this.map.width) {
          continue;
        }
        const desiredAlpha = this.map.tiles[y][x].desiredAlpha;
        const tile = this.layer.getTileAt(x, y);
        if (tile.alpha > desiredAlpha) {
          tile.setAlpha(
            Phaser.Math.MinSub(tile.alpha, alphaPerMs * delta, desiredAlpha)
          );
        } else if (tile.alpha < desiredAlpha) {
          tile.setAlpha(
            Phaser.Math.MaxAdd(tile.alpha, alphaPerMs * delta, desiredAlpha)
          );
        }
      }
    }
  }

  updateMRPAS(pos: Phaser.Math.Vector2) {
    // TODO: performance?
    this.map.tiles.forEach(r =>
      r.forEach(t => {
        if (t.seen) {
          t.desiredAlpha = fogAlpha;
        }
      })
    );

    this.mrpas.compute(
      pos.x,
      pos.y,
      radius,
      (x: number, y: number) => this.map.tiles[y][x].seen,
      (x: number, y: number) => {
        const distance = Math.floor(
          new Phaser.Math.Vector2(x, y).distance(
            new Phaser.Math.Vector2(pos.x, pos.y)
          )
        );

        const rolloffIdx = distance <= radius ? radius - distance : 0;
        const alpha =
          rolloffIdx < lightDropoff.length ? lightDropoff[rolloffIdx] : 0;
        this.map.tiles[y][x].desiredAlpha = alpha;
        this.map.tiles[y][x].seen = true;
      }
    );
  }
}
