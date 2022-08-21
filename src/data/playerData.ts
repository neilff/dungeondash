export interface PlayerStats {
  maxHP: number;
  HP: number;
  maxMP: number;
  MP: number;
  maxStamina: number;
  stamina: number;
}

const playerData: PlayerStats = {
  maxHP: 100,
  HP: 100,
  maxMP: 10,
  MP: 0,
  maxStamina: 50,
  stamina: 0,
};

export default playerData;
