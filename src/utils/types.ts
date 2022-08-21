import Graphics from '../assets/Graphics';

export type ItemType = keyof typeof Graphics.items.indices;

export interface GameWorldStats {
  level: number;
}
