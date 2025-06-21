import Phaser from 'phaser';
import { useEffect, useRef } from 'react';

interface PhaserGameProps {
  parent: string;
}

const PhaserGame: React.FC<PhaserGameProps> = ({ parent }) => {
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (gameRef.current) {
      return;
    }

    let slabby: Phaser.Physics.Arcade.Image;
    let cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    let wasd: Record<string, Phaser.Input.Keyboard.Key>;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.WEBGL,
      width: '100%',
      height: '100%',
      parent,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false,
        },
      },
      scene: {
        preload: preload,
        create: create,
        update: update,
      },
    };

    gameRef.current = new Phaser.Game(config);

    function preload(this: Phaser.Scene) {
      this.load.image('slabby', '/slabby-crop-128.png');
    }

    function create(this: Phaser.Scene) {
      const squareSize = 64;
      const { width, height } = this.cameras.main;
      const graphics = this.add.graphics();

      for (let y = 0; y < height; y += squareSize) {
        for (let x = 0; x < width; x += squareSize) {
          const green = Phaser.Math.Between(50, 150);
          const color = Phaser.Display.Color.GetColor(0, green, 0);
          graphics.fillStyle(color, 1);
          graphics.fillRect(x, y, squareSize, squareSize);
        }
      }

      slabby = this.physics.add.image(this.cameras.main.width / 2, this.cameras.main.height / 2, 'slabby');
      const scale = 64 / slabby.height;
      slabby.setScale(scale);

      cursors = this.input.keyboard!.createCursorKeys();
      wasd = this.input.keyboard!.addKeys('W,A,S,D') as Record<string, Phaser.Input.Keyboard.Key>;
    }

    function update(this: Phaser.Scene) {
      if (!slabby || !slabby.body || !cursors || !wasd) {
        return;
      }
      const speed = 200;
      const body = slabby.body as Phaser.Physics.Arcade.Body;

      body.setVelocity(0);

      if (cursors.left.isDown || wasd.A.isDown) {
        body.setVelocityX(-speed);
      } else if (cursors.right.isDown || wasd.D.isDown) {
        body.setVelocityX(speed);
      }

      if (cursors.up.isDown || wasd.W.isDown) {
        body.setVelocityY(-speed);
      } else if (cursors.down.isDown || wasd.S.isDown) {
        body.setVelocityY(speed);
      }
    }

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [parent]);

  return null; // The Phaser canvas is attached to the parent, so this component doesn't render anything itself.
};

export default PhaserGame; 