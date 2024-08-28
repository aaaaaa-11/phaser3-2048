import Phaser from 'phaser'
import AssetKeys from '@/consts/AssetKeys'
import SceneKeys from '@/consts/SceneKeys'
import GameStateKeys from '@/consts/GameStateKeys'
import { gameConfig, gridConfig } from '@/gameConfig'
import Score from '@/objects/score'
import GameEventKeys from '@/consts/GameEventKeys'

const { gameWidth, gameHeight } = gameConfig
const halfWidth = gameWidth / 2
const halfHeight = gameHeight / 2
const { gridWidth, gridHeight, rows, cols, offset } = gridConfig

// 方向枚举
enum Direction {
  Up,
  Down,
  Left,
  Right
}

export default class Preloader extends Phaser.Scene {
  /** @type {Score} 得分文字 */
  scoreText!: Score
  /** @type {number} 得分数字 */
  score = 0

  /** @type {string} 游戏状态 */
  gameState = GameStateKeys.BeforeStart

  /** @type {boolean} 鼠标是否按下 */
  isDown = false

  /** @type {Grid[][]} 格子数组 */
  grids: Grid[][] = []

  /** @type {boolean} 是否需要创建方块 */
  needCreateBlock = false

  constructor() {
    super(SceneKeys.Game)
  }

  create() {
    // 背景
    this.addBg()

    // 得分
    this.scoreText = new Score(this)

    // 监听鼠标操作
    this.input.on('pointerdown', this.onPointerDown, this)
    this.input.on('pointerup', this.onPointerUp, this)

    this.input.keyboard?.on('keydown', this.onKeyDown, this)

    // 初始化游戏
    this.initData()
    this.game.events.on(GameEventKeys.Running, this.initData, this)
  }

  // 创建背景
  addBg() {
    // 盒子
    const width = gridWidth * cols + offset * (cols + 1)
    const height = gridHeight * rows + offset * (rows + 1)
    this.add.image(halfWidth, halfHeight, AssetKeys.BoxBg).setDisplaySize(width, height)
    // 格子
    const x = (gameWidth - width) / 2 + offset + gridWidth / 2
    const y = (gameHeight - height) / 2 + offset + gridHeight / 2
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const pX = x + j * (gridWidth + offset)
        const pY = y + i * (gridHeight + offset)
        this.add.image(pX, pY, AssetKeys.GridBg).setDisplaySize(gridWidth, gridHeight)

        // 记录格子属性
        if (!this.grids[i]) {
          this.grids[i] = []
        }
        this.grids[i][j] = {
          x: pX,
          y: pY,
          rows: i,
          cols: j,
          occupied: false,
          number: 0
        }
      }
    }
  }

  // 创建方块
  createBlock() {
    // 获取所有空格子
    const availablePos: Grid[] = []
    this.grids.forEach((row) => {
      row.forEach((grid) => {
        if (!grid.occupied) {
          availablePos.push(grid)
        }
      })
    })

    // 如果没有空格子，则游戏结束
    if (!availablePos.length) {
      return this.gameOver()
    }

    // 不用创建方块
    if (!this.needCreateBlock) return

    // 从空格子中随机选出一个
    const index = Phaser.Math.Between(0, availablePos.length - 1)
    const grid = availablePos[index]
    const is2 = Math.random() > 0.5 // 随机生成2或4
    // 生成方块
    const block = this.add
      .image(grid.x, grid.y, AssetKeys[`Block${is2 ? 2 : 4}`])
      .setDisplaySize(gridWidth, gridHeight)
      .setDepth(1)
      .setScale(0.5)

    // 方块生成动画
    this.tweens.add({
      targets: block,
      scale: 1,
      duration: 100,
      ease: 'Power1'
    })

    // 记录格子属性，并将方块挂到当前格子上
    grid.number = is2 ? 2 : 4
    grid.occupied = true
    this.grids[grid.rows][grid.cols].block = block

    this.needCreateBlock = false
  }

  // 鼠标按下
  onPointerDown() {
    if (this.gameState !== GameStateKeys.Running || this.isDown) return
    this.isDown = true
  }

  // 鼠标抬起
  onPointerUp(pointer: Phaser.Input.Pointer) {
    if (this.gameState !== GameStateKeys.Running || !this.isDown) return
    const { x, y, downX, downY } = pointer
    const dx = x - downX
    const dy = y - downY

    // 根据鼠标向横纵方向移动距离来指定方块移动方向
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) {
        // 右
        this.move(Direction.Right)
      } else {
        // 左
        this.move(Direction.Left)
      }
    } else {
      if (dy > 0) {
        // 下
        this.move(Direction.Down)
      } else {
        // 上
        this.move(Direction.Up)
      }
    }

    this.createBlock()

    this.isDown = false
  }
  // 按键按下
  onKeyDown(event: Phaser.Input.Keyboard.Key) {
    if (this.gameState !== GameStateKeys.Running) return
    const { keyCode } = event

    switch (keyCode) {
      case 37:
        // 左
        this.move(Direction.Left)
        break
      case 38:
        // 上
        this.move(Direction.Up)
        break
      case 39:
        // 右
        this.move(Direction.Right)
        break
      case 40:
        // 下
        this.move(Direction.Down)
        break
    }

    this.createBlock()
  }

  // 处理方块和格子属性
  handleBlockAndGrid(item: Grid, occupiedGrid: Grid, isMove: boolean, moveGrid: Grid) {
    // 只有当前格子中有方块才处理
    if (item.occupied) {
      // 有合并、平移的操作，则之后需要创建方块
      if (occupiedGrid.number === item.number && !occupiedGrid.merged) {
        // 合并

        // 替换合并后的方块图像
        occupiedGrid.number *= 2
        this.add
          .tween({
            targets: item.block,
            x: occupiedGrid.x,
            y: occupiedGrid.y,
            duration: 50
          })
          .on('complete', () => {
            const key = `Block${occupiedGrid.number}` as keyof typeof AssetKeys
            occupiedGrid.block?.setTexture(AssetKeys[key])
          })
        // 清除被合并的方块
        item.number = 0
        item.occupied = false
        occupiedGrid.merged = true
        item.block?.destroy()
        item.block = undefined

        this.addScore()
        this.needCreateBlock = true
      } else if (!occupiedGrid.occupied || isMove) {
        // 平移
        // 修改当前格子和评议后格子属性
        const block = item.block
        occupiedGrid = moveGrid
        occupiedGrid.number = item.number
        occupiedGrid.occupied = true
        occupiedGrid.block = block
        item.block = undefined
        item.number = 0
        item.occupied = false

        this.add
          .tween({
            targets: block,
            x: occupiedGrid.x,
            y: occupiedGrid.y,
            duration: 50
          })
          .on('complete', () => {})
        this.needCreateBlock = true
      } else {
        // 不平移，但是要标记当前被占用的格子
        occupiedGrid = item
      }
    }
    return occupiedGrid
  }

  move(type: Direction) {
    switch (type) {
      case Direction.Right:
        // 整体向右移动
        // 每一行从右往左遍历，该合并的合并，该平移的平移
        for (let i = 0; i < rows; i++) {
          let occupiedGrid = this.grids[i][cols - 1]
          for (let j = cols - 2; j >= 0; j--) {
            const item = this.grids[i][j]
            const availableIndex = occupiedGrid.occupied ? occupiedGrid.cols - 1 : occupiedGrid.cols
            const moveGrid = this.grids[i][availableIndex]
            occupiedGrid = this.handleBlockAndGrid(
              item,
              occupiedGrid,
              occupiedGrid.cols - 1 !== item.cols,
              moveGrid
            )
          }
        }
        break
      case Direction.Left:
        // 整体向左移动，每一行从左往右遍历
        for (let i = 0; i < rows; i++) {
          let occupiedGrid = this.grids[i][0]
          for (let j = 1; j < cols; j++) {
            const item = this.grids[i][j]
            const availableIndex = occupiedGrid.occupied ? occupiedGrid.cols + 1 : occupiedGrid.cols
            const moveGrid = this.grids[i][availableIndex]
            occupiedGrid = this.handleBlockAndGrid(
              item,
              occupiedGrid,
              occupiedGrid.cols + 1 !== item.cols,
              moveGrid
            )
          }
        }
        break
      case Direction.Down:
        // 整体向下移动，每一列从下往上遍历
        for (let j = 0; j < cols; j++) {
          let occupiedGrid = this.grids[rows - 1][j]
          for (let i = rows - 2; i >= 0; i--) {
            const item = this.grids[i][j]
            const availableIndex = occupiedGrid.occupied ? occupiedGrid.rows - 1 : occupiedGrid.rows
            const moveGrid = this.grids[availableIndex][j]
            occupiedGrid = this.handleBlockAndGrid(
              item,
              occupiedGrid,
              occupiedGrid.rows - 1 !== item.rows,
              moveGrid
            )
          }
        }
        break
      case Direction.Up:
        // 整体向上移动，每一列从上往下遍历
        for (let j = 0; j < cols; j++) {
          let occupiedGrid = this.grids[0][j]
          for (let i = 1; i < rows; i++) {
            const item = this.grids[i][j]

            const availableIndex = occupiedGrid.occupied ? occupiedGrid.rows + 1 : occupiedGrid.rows
            const moveGrid = this.grids[availableIndex][j]
            occupiedGrid = this.handleBlockAndGrid(
              item,
              occupiedGrid,
              occupiedGrid.rows + 1 !== item.rows,
              moveGrid
            )
          }
        }
        break
      default:
        break
    }

    this.grids.forEach((row) => {
      row.forEach((item) => {
        item.merged = false
      })
    })
  }

  // 初始化数据
  initData() {
    this.score = 0
    this.scoreText.updateScore(this.score)

    this.gameState = GameStateKeys.Running

    this.grids.forEach((row) => {
      row.forEach((item) => {
        item.number = 0
        item.occupied = false
        item.block?.destroy()
        item.block = undefined
      })
    })

    // 先创建两个方块
    this.needCreateBlock = true
    this.createBlock()
    this.needCreateBlock = true
    this.createBlock()
  }

  // 得分++
  addScore() {
    this.score++
    this.scoreText.updateScore(this.score)
  }

  // 游戏结束
  gameOver() {
    if (this.gameState === GameStateKeys.GameOver) return
    this.gameState = GameStateKeys.GameOver

    if (!this.scene.isActive(SceneKeys.GameOver)) {
      this.scene.run(SceneKeys.GameOver, { score: this.score })
    }
  }
}
