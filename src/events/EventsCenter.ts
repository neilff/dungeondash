import Phaser from 'phaser';

const EventsCenter = new Phaser.Events.EventEmitter();

export const eventTypes = {
  playerCreated: 'player_create',
  playerDeath: 'player_death',
  playerAttack: 'player_attack',
  playerHit: 'player_hit',
};

export default EventsCenter;
