// 游戏配置
export const gameConfig = {
  gameWidth: innerWidth > 450 ? innerWidth : 450,
  gameHeight: innerHeight > 450 ? innerHeight : 450,
  defaultSpeed: 400,
  fastSpeed: 50,
  speedStep: 100
}

// 贪吃蛇配置
export const gridConfig = {
  gridWidth: 100,
  gridHeight: 100,
  rows: 4,
  cols: 4,
  offset: 10
}
