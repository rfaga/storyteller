"use client";

import { useEffect, useRef } from "react";
import Phaser from "phaser";

interface GameSceneProps {
  code: string;
}

export default function GameScene({ code }: GameSceneProps) {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

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
      scene: {
        preload: function () {
          // Load game assets
        },
        create: function () {
          // Create game objects
        },
        update: function () {
          // Update game state
        },
      },
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

  // Update game when code changes
  useEffect(() => {
    if (gameRef.current) {
      try {
        // Here you would implement the code to update the game with the new code
        // For now, we'll just log that the code changed
        console.log("Game code updated:", code);
      } catch (error) {
        console.error("Error updating game code:", error);
      }
    }
  }, [code]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ minHeight: "600px" }}
    />
  );
}
