"use client";

import { useEffect, useRef } from "react";
import Phaser from "phaser";

interface GameObject {
  id: string;
  type: "player" | "obstacle";
  x: number;
  y: number;
  width: number;
  height: number;
  sprite: string;
}

interface GameSceneProps {
  objects: GameObject[];
}

export default function GameScene({ objects }: GameSceneProps) {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    class MainScene extends Phaser.Scene {
      private gameObjects: Map<string, Phaser.Physics.Arcade.Sprite> =
        new Map();
      private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

      constructor() {
        super({ key: "MainScene" });
      }

      create() {
        // Create game objects based on the provided objects
        objects.forEach((obj) => {
          const gameObject = this.physics.add.sprite(
            obj.x,
            obj.y,
            "placeholder"
          );
          gameObject.setDisplaySize(obj.width, obj.height);
          gameObject.setTint(obj.type === "player" ? 0x3b82f6 : 0xef4444);
          gameObject.setData("type", obj.type);
          this.gameObjects.set(obj.id, gameObject);
        });

        // Set up keyboard controls
        this.cursors = this.input.keyboard.createCursorKeys();
      }

      update() {
        // Find the player object
        const player = Array.from(this.gameObjects.values()).find(
          (obj) => obj.getData("type") === "player"
        );

        if (player && player.body) {
          // Handle player movement
          if (this.cursors.left.isDown) {
            player.setVelocityX(-160);
          } else if (this.cursors.right.isDown) {
            player.setVelocityX(160);
          } else {
            player.setVelocityX(0);
          }

          // Handle jumping
          if (this.cursors.up.isDown && player.body.touching.down) {
            player.setVelocityY(-330);
          }
        }
      }
    }

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: 800,
      height: 600,
      physics: {
        default: "arcade",
        arcade: {
          gravity: { x: 0, y: 300 },
          debug: false,
        },
      },
      scene: MainScene,
    };

    try {
      gameRef.current = new Phaser.Game(config);
    } catch (error) {
      console.error("Error initializing Phaser game:", error);
    }

    return () => {
      if (gameRef.current) {
        try {
          gameRef.current.destroy(true);
        } catch (error) {
          console.error("Error destroying Phaser game:", error);
        }
        gameRef.current = null;
      }
    };
  }, []);

  // Update game objects when they change
  useEffect(() => {
    if (gameRef.current) {
      const scene = gameRef.current.scene.getScene("MainScene");
      if (scene && scene.children) {
        // Clear existing objects
        scene.children.list.forEach((child) => {
          if (child instanceof Phaser.Physics.Arcade.Sprite) {
            child.destroy();
          }
        });

        // Create new objects
        objects.forEach((obj) => {
          const gameObject = scene.physics.add.sprite(
            obj.x,
            obj.y,
            "placeholder"
          );
          gameObject.setDisplaySize(obj.width, obj.height);
          gameObject.setTint(obj.type === "player" ? 0x3b82f6 : 0xef4444);
          gameObject.setData("type", obj.type);
        });
      }
    }
  }, [objects]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ minHeight: "600px" }}
    />
  );
}
