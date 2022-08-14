export default class Room {
  x: number;
  y: number;
  width: number;
  height: number;

  constructor(options: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) {
    this.x = options.x;
    this.y = options.y;
    this.width = options.width;
    this.height = options.height;
  }

  getBoundingBox() {
    return {
      top: this.y,
      right: this.x + this.width - 1,
      bottom: this.y + this.height - 1,
      left: this.x,
    };
  }
}
