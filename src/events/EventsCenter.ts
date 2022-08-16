import Phaser from 'phaser';

const EventsCenter = new Phaser.Events.EventEmitter();

export const eventTypes = {
  PLAYER_CREATED: 'player_create',
  PLAYER_DEATH: 'player_death',
  PLAYER_ATTACK: 'player_attack',
  PLAYER_HEALTH_UPDATE: 'player_health_update',
  POWERUP_CONSUMED: 'powerup_consumed',
};

export default EventsCenter;
