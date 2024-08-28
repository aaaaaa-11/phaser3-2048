interface GameOverData {
  score: number
}

interface Grid {
  x: number
  y: number
  occupied: boolean
  rows: number
  cols: number
  number: number
  merged?: boolean
  block?: Image
}
