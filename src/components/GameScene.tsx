"use client";

import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";

interface GameObject {
  id: string;
  type: "character" | "prop" | "background";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  sprite: string;
  name?: string;
  description?: string;
  shape?: "rectangle" | "circle";
}

interface GameSceneProps {
  objects: GameObject[];
  onObjectsChange?: (objects: GameObject[]) => void;
}

type DrawingTool =
  | "select"
  | "rectangle"
  | "circle"
  | "image"
  | "resize"
  | "rotate";

export default function GameScene({
  objects,
  onObjectsChange,
}: GameSceneProps) {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedTool, setSelectedTool] = useState<DrawingTool>("select");
  const [isDrawing, setIsDrawing] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [moveStart, setMoveStart] = useState({ x: 0, y: 0 });
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  const [localObjects, setLocalObjects] = useState<GameObject[]>(objects);
  const [selectedObject, setSelectedObject] = useState<GameObject | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<
    "nw" | "ne" | "sw" | "se" | null
  >(null);

  useEffect(() => {
    setLocalObjects(objects);
  }, [objects]);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    class MainScene extends Phaser.Scene {
      private gameObjects: Map<string, Phaser.GameObjects.Container> =
        new Map();
      private graphics!: Phaser.GameObjects.Graphics;
      private selectionGraphics!: Phaser.GameObjects.Graphics;
      private draggedObject: Phaser.GameObjects.Container | null = null;
      private dragStart: { x: number; y: number } | null = null;
      private isDrawing: boolean = false;
      private drawStart: { x: number; y: number } | null = null;

      constructor() {
        super({ key: "MainScene" });
      }

      preload() {
        // Add a placeholder texture
        this.load.image(
          "placeholder",
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
        );
      }

      create() {
        // Create game objects based on the provided objects
        localObjects.forEach((obj) => {
          const container = this.add.container(obj.x, obj.y);

          if (obj.type === "prop") {
            const shape = this.add.graphics();
            shape.lineStyle(2, 0xffffff);
            shape.fillStyle(0xef4444, 0.5);

            if (obj.shape === "circle") {
              shape.fillCircle(0, 0, obj.width / 2);
              shape.strokeCircle(0, 0, obj.width / 2);
            } else {
              shape.fillRect(
                -obj.width / 2,
                -obj.height / 2,
                obj.width,
                obj.height
              );
              shape.strokeRect(
                -obj.width / 2,
                -obj.height / 2,
                obj.width,
                obj.height
              );
            }

            container.add(shape);
          } else {
            // Check if the sprite key exists in the texture manager
            if (this.textures.exists(obj.sprite)) {
              const sprite = this.add.sprite(0, 0, obj.sprite);
              sprite.setDisplaySize(obj.width, obj.height);
              container.add(sprite);
            } else {
              // Fallback to placeholder if texture doesn't exist
              const sprite = this.add.sprite(0, 0, "placeholder");
              sprite.setDisplaySize(obj.width, obj.height);
              sprite.setTint(obj.type === "character" ? 0x3b82f6 : 0x22c55e);
              container.add(sprite);
            }
          }

          container.setData("type", obj.type);
          container.setData("id", obj.id);
          container.setInteractive(
            new Phaser.Geom.Rectangle(
              -obj.width / 2,
              -obj.height / 2,
              obj.width,
              obj.height
            ),
            Phaser.Geom.Rectangle.Contains
          );
          container.setRotation(obj.rotation || 0);
          this.gameObjects.set(obj.id, container);

          // Add drag events
          container.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
            if (selectedTool === "select") {
              this.draggedObject = container;
              this.dragStart = { x: pointer.x, y: pointer.y };
              const obj = localObjects.find(
                (o) => o.id === container.getData("id")
              );
              if (obj) {
                setSelectedObject(obj);
              }
            }
          });
        });

        // Create graphics objects for drawing and selection
        this.graphics = this.add.graphics();
        this.selectionGraphics = this.add.graphics();

        // Add global pointer events
        this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
          if (selectedTool === "rectangle" || selectedTool === "circle") {
            this.isDrawing = true;
            this.drawStart = { x: pointer.x, y: pointer.y };
          }
        });

        this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
          if (this.draggedObject && this.dragStart) {
            const dx = pointer.x - this.dragStart.x;
            const dy = pointer.y - this.dragStart.y;

            this.draggedObject.x += dx;
            this.draggedObject.y += dy;

            this.dragStart = { x: pointer.x, y: pointer.y };

            // Update the object in localObjects
            const id = this.draggedObject.getData("id");
            const updatedObjects = localObjects.map((obj) => {
              if (obj.id === id) {
                return {
                  ...obj,
                  x: this.draggedObject!.x,
                  y: this.draggedObject!.y,
                };
              }
              return obj;
            });
            setLocalObjects(updatedObjects);
            onObjectsChange?.(updatedObjects);
          } else if (this.isDrawing && this.drawStart) {
            this.drawPreview(
              this.drawStart,
              { x: pointer.x, y: pointer.y },
              selectedTool
            );
          }
        });

        this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
          if (this.draggedObject) {
            this.draggedObject = null;
            this.dragStart = null;
          } else if (this.isDrawing && this.drawStart) {
            const width = Math.abs(pointer.x - this.drawStart.x);
            const height = Math.abs(pointer.y - this.drawStart.y);

            const newObject: GameObject = {
              id: Date.now().toString(),
              type: "prop",
              x: Math.min(this.drawStart.x, pointer.x) + width / 2,
              y: Math.min(this.drawStart.y, pointer.y) + height / 2,
              width,
              height,
              rotation: 0,
              sprite: "placeholder",
              name: `Prop ${localObjects.length + 1}`,
              description: "A new prop",
              shape: selectedTool === "circle" ? "circle" : "rectangle",
            };

            const updatedObjects = [...localObjects, newObject];
            setLocalObjects(updatedObjects);
            onObjectsChange?.(updatedObjects);
            setSelectedTool("select");
          }
          this.isDrawing = false;
          this.drawStart = null;
          this.graphics.clear();
        });

        // Add click handler for objects
        this.input.on(
          "gameobjectdown",
          (
            pointer: Phaser.Input.Pointer,
            gameObject: Phaser.GameObjects.Sprite
          ) => {
            const id = gameObject.getData("id");
            const obj = localObjects.find((o) => o.id === id);
            if (obj) {
              setSelectedObject(obj);
              setSelectedTool("select");
            }
          }
        );
      }

      drawPreview(
        start: { x: number; y: number },
        end: { x: number; y: number },
        tool: DrawingTool
      ) {
        this.graphics.clear();
        this.graphics.lineStyle(2, 0xffffff);
        this.graphics.fillStyle(0xef4444, 0.5);

        const width = Math.abs(end.x - start.x);
        const height = Math.abs(end.y - start.y);
        const x = Math.min(start.x, end.x);
        const y = Math.min(start.y, end.y);

        switch (tool) {
          case "rectangle":
            this.graphics.fillRect(x, y, width, height);
            this.graphics.strokeRect(x, y, width, height);
            break;
          case "circle":
            const radius = Math.max(width, height) / 2;
            this.graphics.fillCircle(x + width / 2, y + height / 2, radius);
            this.graphics.strokeCircle(x + width / 2, y + height / 2, radius);
            break;
        }
      }

      drawSelectionHandles(obj: GameObject) {
        this.selectionGraphics.clear();
        this.selectionGraphics.lineStyle(2, 0xffffff);

        // Draw selection rectangle
        this.selectionGraphics.strokeRect(
          obj.x - obj.width / 2,
          obj.y - obj.height / 2,
          obj.width,
          obj.height
        );

        // Draw resize handles
        const handleSize = 8;
        const handles = [
          { x: obj.x - obj.width / 2, y: obj.y - obj.height / 2, type: "nw" },
          { x: obj.x + obj.width / 2, y: obj.y - obj.height / 2, type: "ne" },
          { x: obj.x - obj.width / 2, y: obj.y + obj.height / 2, type: "sw" },
          { x: obj.x + obj.width / 2, y: obj.y + obj.height / 2, type: "se" },
        ];

        handles.forEach((handle) => {
          this.selectionGraphics.fillStyle(0xffffff);
          this.selectionGraphics.fillRect(
            handle.x - handleSize / 2,
            handle.y - handleSize / 2,
            handleSize,
            handleSize
          );
        });

        // Draw rotation handle
        const rotationHandleY = obj.y - obj.height / 2 - 20;
        this.selectionGraphics.lineStyle(2, 0xffffff);
        this.selectionGraphics.lineBetween(
          obj.x,
          obj.y - obj.height / 2,
          obj.x,
          rotationHandleY
        );
        this.selectionGraphics.fillStyle(0xffffff);
        this.selectionGraphics.fillCircle(obj.x, rotationHandleY, 6);
      }

      restart() {
        this.scene.restart();
      }
    }

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: "100%",
      height: "100%",
      scene: MainScene,
      transparent: true,
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
  }, [localObjects, selectedObject, selectedTool]);

  // Update game objects when they change
  useEffect(() => {
    if (gameRef.current) {
      const scene = gameRef.current.scene.getScene("MainScene");
      if (scene && scene.children) {
        // Clear existing objects
        scene.children.list.forEach((child) => {
          if (child instanceof Phaser.GameObjects.Container) {
            child.destroy();
          }
        });

        // Create new objects
        localObjects.forEach((obj) => {
          const container = scene.add.container(obj.x, obj.y);

          if (obj.type === "prop") {
            const shape = scene.add.graphics();
            shape.lineStyle(2, 0xffffff);
            shape.fillStyle(0xef4444, 0.5);

            if (obj.shape === "circle") {
              shape.fillCircle(0, 0, obj.width / 2);
              shape.strokeCircle(0, 0, obj.width / 2);
            } else {
              shape.fillRect(
                -obj.width / 2,
                -obj.height / 2,
                obj.width,
                obj.height
              );
              shape.strokeRect(
                -obj.width / 2,
                -obj.height / 2,
                obj.width,
                obj.height
              );
            }

            container.add(shape);
          } else {
            // Check if the sprite key exists in the texture manager
            if (scene.textures.exists(obj.sprite)) {
              const sprite = scene.add.sprite(0, 0, obj.sprite);
              sprite.setDisplaySize(obj.width, obj.height);
              container.add(sprite);
            } else {
              // Fallback to placeholder if texture doesn't exist
              const sprite = scene.add.sprite(0, 0, "placeholder");
              sprite.setDisplaySize(obj.width, obj.height);
              sprite.setTint(obj.type === "character" ? 0x3b82f6 : 0x22c55e);
              container.add(sprite);
            }
          }

          container.setData("type", obj.type);
          container.setData("id", obj.id);
          container.setInteractive(
            new Phaser.Geom.Rectangle(
              -obj.width / 2,
              -obj.height / 2,
              obj.width,
              obj.height
            ),
            Phaser.Geom.Rectangle.Contains
          );
          container.setRotation(obj.rotation || 0);
        });

        // Draw selection handles for selected object
        if (selectedObject) {
          (scene as any).drawSelectionHandles(selectedObject);
        }
      }
    }
  }, [localObjects, selectedObject]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (!event.target?.result) return;

      // Create a unique key for the image
      const imageKey = `image_${Date.now()}`;

      // Add the image to Phaser's texture manager
      const scene = gameRef.current?.scene.getScene("MainScene");
      if (scene) {
        // Create a temporary image element
        const img = new Image();
        img.src = event.target.result as string;

        img.onload = () => {
          // Create a canvas to draw the image
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          // Draw the image onto the canvas
          ctx.drawImage(img, 0, 0);

          // Add the canvas as a texture
          scene.textures.addCanvas(imageKey, canvas);

          const newObject: GameObject = {
            id: Date.now().toString(),
            type: "character",
            x: 100,
            y: 100,
            width: img.width,
            height: img.height,
            rotation: 0,
            sprite: imageKey,
            name: `Image ${localObjects.length + 1}`,
            description: "An uploaded image",
          };

          const updatedObjects = [...localObjects, newObject];
          setLocalObjects(updatedObjects);
          onObjectsChange?.(updatedObjects);
          setSelectedTool("select");
        };
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteObject = (id: string) => {
    const updatedObjects = localObjects.filter((obj) => obj.id !== id);
    setLocalObjects(updatedObjects);
    onObjectsChange?.(updatedObjects);
    if (selectedObject?.id === id) {
      setSelectedObject(null);
    }
  };

  const handleRestart = () => {
    const scene = gameRef.current?.scene.getScene("MainScene");
    if (scene) {
      (scene as any).restart();
    }
  };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 p-4 flex flex-col">
        <h2 className="text-lg font-semibold text-white mb-4">Objects</h2>
        <div className="flex-1 overflow-y-auto">
          {localObjects.map((obj) => (
            <div
              key={obj.id}
              className={`bg-gray-700 p-2 rounded mb-2 text-white flex items-center justify-between ${
                selectedObject?.id === obj.id ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => setSelectedObject(obj)}
            >
              <div>
                <div className="font-medium">{obj.name || obj.type}</div>
                <div className="text-sm text-gray-400">{obj.type}</div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteObject(obj.id);
                }}
                className="text-red-400 hover:text-red-300"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="bg-gray-800 p-2 flex gap-2">
          <button
            onClick={() => setSelectedTool("select")}
            className={`p-2 rounded ${
              selectedTool === "select" ? "bg-primary" : "bg-gray-700"
            }`}
            title="Select"
          >
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
              />
            </svg>
          </button>
          <button
            onClick={() => setSelectedTool("resize")}
            className={`p-2 rounded ${
              selectedTool === "resize" ? "bg-primary" : "bg-gray-700"
            }`}
            title="Resize"
          >
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"
              />
            </svg>
          </button>
          <button
            onClick={() => setSelectedTool("rotate")}
            className={`p-2 rounded ${
              selectedTool === "rotate" ? "bg-primary" : "bg-gray-700"
            }`}
            title="Rotate"
          >
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
          <button
            onClick={() => setSelectedTool("rectangle")}
            className={`p-2 rounded ${
              selectedTool === "rectangle" ? "bg-primary" : "bg-gray-700"
            }`}
            title="Rectangle"
          >
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
            </svg>
          </button>
          <button
            onClick={() => setSelectedTool("circle")}
            className={`p-2 rounded ${
              selectedTool === "circle" ? "bg-primary" : "bg-gray-700"
            }`}
            title="Circle"
          >
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="9" />
            </svg>
          </button>
          <label
            className="p-2 rounded bg-gray-700 cursor-pointer"
            title="Upload Image"
          >
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </label>
          <button
            onClick={handleRestart}
            className="p-2 rounded bg-gray-700 hover:bg-gray-600"
            title="Restart Game"
          >
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>

        {/* Canvas */}
        <div ref={containerRef} className="flex-1 bg-black" />
      </div>
    </div>
  );
}
