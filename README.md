# Game Editor

A web-based game editor for creating side-scrolling games using Phaser and Next.js.

## Features

- Code editor with syntax highlighting
- Live game preview
- Save and load games
- Built with Next.js, Phaser, and TypeScript

## Getting Started

### Prerequisites

- Node.js 18 or later
- pnpm package manager

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd game-editor
```

2. Install dependencies:

```bash
pnpm install
```

3. Start the development server:

```bash
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Write your game code in the editor using Phaser's API
2. Enter a name for your game
3. Click "Save Game" to store your game
4. Load saved games by clicking on them in the "Saved Games" section

## Game Development

The editor provides a basic template for creating Phaser games. Here's a simple example:

```typescript
class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });
  }

  preload() {
    // Load game assets
    this.load.image("player", "path/to/player.png");
  }

  create() {
    // Create game objects
    this.player = this.physics.add.sprite(100, 100, "player");
  }

  update() {
    // Update game state
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-160);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(160);
    } else {
      this.player.setVelocityX(0);
    }
  }
}
```

## License

This project is licensed under the ISC License.
