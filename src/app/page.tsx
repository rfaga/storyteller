"use client";

import { useState, useRef, useEffect } from "react";
import GameScene from "@/components/GameScene";
import CodeEditor from "@/components/CodeEditor";

interface GameObject {
  id: string;
  type: "player" | "obstacle";
  x: number;
  y: number;
  width: number;
  height: number;
  sprite: string;
}

interface Game {
  name: string;
  objects: GameObject[];
  code?: string;
}

export default function Home() {
  const [gameName, setGameName] = useState("");
  const [savedGames, setSavedGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedObject, setSelectedObject] = useState<GameObject | null>(null);
  const [gameObjects, setGameObjects] = useState<GameObject[]>([]);
  const [selectedSprite, setSelectedSprite] = useState("player1");
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [gameCode, setGameCode] = useState("");
  const [activeTab, setActiveTab] = useState<"gui" | "code">("gui");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const gameAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadGames();
  }, []);

  // Generate Phaser code from game objects
  useEffect(() => {
    const code = generatePhaserCode(gameObjects);
    setGameCode(code);
  }, [gameObjects]);

  const generatePhaserCode = (objects: GameObject[]): string => {
    const playerObjects = objects.filter((obj) => obj.type === "player");
    const obstacleObjects = objects.filter((obj) => obj.type === "obstacle");

    return `class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    // Create player objects
    ${playerObjects
      .map(
        (obj) => `
    this.player = this.physics.add.sprite(${obj.x}, ${obj.y}, 'placeholder');
    this.player.setDisplaySize(${obj.width}, ${obj.height});
    this.player.setTint(0x3b82f6);`
      )
      .join("\n")}

    // Create obstacle objects
    ${obstacleObjects
      .map(
        (obj) => `
    const obstacle = this.physics.add.sprite(${obj.x}, ${obj.y}, 'placeholder');
    obstacle.setDisplaySize(${obj.width}, ${obj.height});
    obstacle.setTint(0xef4444);`
      )
      .join("\n")}

    // Set up keyboard controls
    this.cursors = this.input.keyboard.createCursorKeys();
  }

  update() {
    if (this.player && this.player.body) {
      // Handle player movement
      if (this.cursors.left.isDown) {
        this.player.setVelocityX(-160);
      } else if (this.cursors.right.isDown) {
        this.player.setVelocityX(160);
      } else {
        this.player.setVelocityX(0);
      }

      // Handle jumping
      if (this.cursors.up.isDown && this.player.body.touching.down) {
        this.player.setVelocityY(-330);
      }
    }
  }
}`;
  };

  const loadGames = async () => {
    try {
      const response = await fetch("/api/games");
      const games = await response.json();
      setSavedGames(games);
    } catch (error) {
      console.error("Error loading games:", error);
    }
  };

  const saveGame = async () => {
    if (!gameName) {
      alert("Please enter a game name");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/games", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: gameName,
          objects: gameObjects,
          code: gameCode,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save game");
      }

      await loadGames();
      setIsSettingsOpen(false);
      alert("Game saved successfully!");
    } catch (error) {
      console.error("Error saving game:", error);
      alert("Failed to save game");
    } finally {
      setIsLoading(false);
    }
  };

  const loadGame = (game: Game) => {
    setGameObjects(game.objects);
    setGameName(game.name);
    if (game.code) {
      setGameCode(game.code);
    }
    setIsSettingsOpen(false);
  };

  const handleGameAreaClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!gameAreaRef.current) return;

    const rect = gameAreaRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newObject: GameObject = {
      id: Date.now().toString(),
      type: selectedSprite === "player1" ? "player" : "obstacle",
      x,
      y,
      width: 50,
      height: 50,
      sprite: selectedSprite,
    };

    setGameObjects([...gameObjects, newObject]);
  };

  const handleObjectDragStart = (
    e: React.MouseEvent<HTMLDivElement>,
    object: GameObject
  ) => {
    e.stopPropagation();
    setIsDragging(true);
    setSelectedObject(object);
    setDragStart({ x: e.clientX - object.x, y: e.clientY - object.y });
  };

  const handleObjectDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !selectedObject || !gameAreaRef.current) return;

    const rect = gameAreaRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - dragStart.x;
    const y = e.clientY - rect.top - dragStart.y;

    setGameObjects(
      gameObjects.map((obj) =>
        obj.id === selectedObject.id ? { ...obj, x, y } : obj
      )
    );
  };

  const handleObjectDragEnd = () => {
    setIsDragging(false);
    setSelectedObject(null);
  };

  const deleteObject = (id: string) => {
    setGameObjects(gameObjects.filter((obj) => obj.id !== id));
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Game Editor</h1>
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/80"
        >
          Game Settings
        </button>
      </div>

      <div className="bg-secondary p-4 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("gui")}
              className={`px-4 py-2 rounded-lg ${
                activeTab === "gui"
                  ? "bg-primary text-white"
                  : "bg-gray-700 text-gray-300"
              }`}
            >
              GUI Editor
            </button>
            <button
              onClick={() => setActiveTab("code")}
              className={`px-4 py-2 rounded-lg ${
                activeTab === "code"
                  ? "bg-primary text-white"
                  : "bg-gray-700 text-gray-300"
              }`}
            >
              Code Editor
            </button>
          </div>
          {activeTab === "gui" && (
            <select
              value={selectedSprite}
              onChange={(e) => setSelectedSprite(e.target.value)}
              className="px-4 py-2 rounded-lg bg-primary text-white"
            >
              <option value="player1">Player 1</option>
              <option value="obstacle1">Obstacle 1</option>
              <option value="obstacle2">Obstacle 2</option>
            </select>
          )}
        </div>

        <div className="relative w-full h-[600px] bg-black rounded-lg overflow-hidden">
          {activeTab === "gui" ? (
            <div
              ref={gameAreaRef}
              className="absolute inset-0"
              onClick={handleGameAreaClick}
              onMouseMove={handleObjectDrag}
              onMouseUp={handleObjectDragEnd}
              onMouseLeave={handleObjectDragEnd}
            >
              <GameScene objects={gameObjects} />
            </div>
          ) : (
            <CodeEditor
              code={gameCode}
              onChange={setGameCode}
              language="typescript"
            />
          )}
        </div>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-secondary p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Game Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-2">Game Name</label>
                <input
                  type="text"
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  placeholder="Enter game name"
                  className="w-full px-4 py-2 rounded-lg bg-primary text-white"
                />
              </div>

              <button
                onClick={saveGame}
                disabled={isLoading}
                className="w-full bg-accent hover:bg-accent/80 px-4 py-2 rounded-lg disabled:opacity-50"
              >
                {isLoading ? "Saving..." : "Save Game"}
              </button>

              {savedGames.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Saved Games</h3>
                  <div className="space-y-2">
                    {savedGames.map((game) => (
                      <button
                        key={game.name}
                        onClick={() => loadGame(game)}
                        className="w-full bg-primary hover:bg-primary/80 px-4 py-2 rounded-lg text-left"
                      >
                        {game.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setIsSettingsOpen(false)}
                className="w-full bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
