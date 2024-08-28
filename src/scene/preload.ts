import Phaser from 'phaser'
import SceneKeys from '@/consts/SceneKeys'

export default class Preloader extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Preloader)
  }

  preload() {
    this.load.on('complete', () => {
      this.scene.start(SceneKeys.Loader)
    })
  }
}
