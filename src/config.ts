declare global {
  interface GameConfig {
    enableDebugMode?: boolean;
  }
}

const globalConfig: GameConfig = {
  enableDebugMode: true,
};

export default globalConfig;
