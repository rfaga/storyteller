"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import GameScene from "@/components/GameScene";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] bg-secondary flex items-center justify-center">
      <p className="text-gray-400">Loading editor...</p>
    </div>
  ),
});

interface Game {
  name: string;
  code: string;
}

export default function Home() {
  const [code, setCode] = useState(`// Your game code will go here
class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    // Load game assets
  }

  create() {
    // Create game objects
  }

  update() {
    // Update game state
  }
}`);
  const [gameName, setGameName] = useState("");
  const [savedGames, setSavedGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditorReady, setIsEditorReady] = useState(false);

  useEffect(() => {
    loadGames();
  }, []);

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
        body: JSON.stringify({ name: gameName, code }),
      });

      if (!response.ok) {
        throw new Error("Failed to save game");
      }

      await loadGames();
      alert("Game saved successfully!");
    } catch (error) {
      console.error("Error saving game:", error);
      alert("Failed to save game");
    } finally {
      setIsLoading(false);
    }
  };

  const loadGame = (game: Game) => {
    setCode(game.code);
    setGameName(game.name);
  };

  const handleEditorDidMount = () => {
    setIsEditorReady(true);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Game Editor</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-secondary p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Code Editor</h2>
          <div className="h-[600px]">
            <MonacoEditor
              height="100%"
              language="typescript"
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value || "")}
              onMount={handleEditorDidMount}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                wordWrap: "on",
                automaticLayout: true,
              }}
            />
          </div>
        </div>

        <div className="bg-secondary p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Game Preview</h2>
          <div className="h-[600px] bg-black rounded-lg overflow-hidden">
            {isEditorReady && <GameScene code={code} />}
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <div className="flex gap-4">
          <input
            type="text"
            value={gameName}
            onChange={(e) => setGameName(e.target.value)}
            placeholder="Enter game name"
            className="px-4 py-2 rounded-lg bg-secondary text-white"
          />
          <button
            onClick={saveGame}
            disabled={isLoading}
            className="bg-accent hover:bg-accent/80 px-4 py-2 rounded-lg disabled:opacity-50"
          >
            {isLoading ? "Saving..." : "Save Game"}
          </button>
        </div>

        {savedGames.length > 0 && (
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Saved Games</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {savedGames.map((game) => (
                <button
                  key={game.name}
                  onClick={() => loadGame(game)}
                  className="bg-secondary hover:bg-secondary/80 px-4 py-2 rounded-lg text-left truncate"
                >
                  {game.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
