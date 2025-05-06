import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const GAMES_DIR = path.join(process.cwd(), "games");

// Ensure games directory exists
async function ensureGamesDir() {
  try {
    await fs.access(GAMES_DIR);
  } catch {
    await fs.mkdir(GAMES_DIR, { recursive: true });
  }
}

export async function POST(request: Request) {
  try {
    const { name, code } = await request.json();

    if (!name || !code) {
      return NextResponse.json(
        { error: "Name and code are required" },
        { status: 400 }
      );
    }

    await ensureGamesDir();
    const filePath = path.join(GAMES_DIR, `${name}.json`);
    await fs.writeFile(filePath, JSON.stringify({ name, code }));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving game:", error);
    return NextResponse.json({ error: "Failed to save game" }, { status: 500 });
  }
}

export async function GET() {
  try {
    await ensureGamesDir();
    const files = await fs.readdir(GAMES_DIR);
    const games = await Promise.all(
      files
        .filter((file) => file.endsWith(".json"))
        .map(async (file) => {
          const content = await fs.readFile(
            path.join(GAMES_DIR, file),
            "utf-8"
          );
          return JSON.parse(content);
        })
    );

    return NextResponse.json(games);
  } catch (error) {
    console.error("Error loading games:", error);
    return NextResponse.json(
      { error: "Failed to load games" },
      { status: 500 }
    );
  }
}
