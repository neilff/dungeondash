import Graphics from '../assets/Graphics';

export type ItemType = keyof typeof Graphics.items.indices;

export interface PlayerStats {
  maxHP: number;
  HP: number;
  maxMP: number;
  MP: number;
  maxStamina: number;
  stamina: number;
}
