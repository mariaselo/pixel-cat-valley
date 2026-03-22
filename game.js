// PIXEL CAT VALLEY - Cool Visuals Edition
// Game constants
const TILE_SIZE = 32;
const GRID_WIDTH = 25;
const GRID_HEIGHT = 19;
const INTERIOR_WIDTH = 20;
const INTERIOR_HEIGHT = 15;

// Game variables
let canvas, ctx;
let player = { 
    x: 12, 
    y: 9, 
    energy: 100, 
    gold: 50,
    insideHouse: false,
    hasSlept: false,
    heldItem: null,
    inventory: {
        fishingRod: 1,
        axe: 1
    },
    selectedTool: 0,
    velX: 0,
    velY: 0,
    speed: 0.25
};

// Interior objects
let interiorObjects = [];
let mouse = { x: 5, y: 5, caught: false };

// Game world
let time = 8 * 60;
let day = 1;
let isDay = true;
let tiles = [];
let trees = [];
let fishableAreas = [];
let gameState = "playing";
let messageTimeout = null;
let particles = [];
let weather = "sunny";
let raindrops = [];
let keys = {};

// Tile types
const TILES = {
    GRASS: 0,
    WATER: 1,
    TREE: 2,
    HOUSE_WALL: 3,
    HOUSE_FLOOR: 4,
    HOUSE_DOOR: 5,
    HOUSE_INTERIOR_FLOOR: 6,
    WATER_DISPENSER: 7,
    FLOWER: 8,
    ROCK: 9,
    BUSH: 10
};

// Object types for interior
const OBJECTS = {
    FISH: 0,
    WOOD: 1,
    CUSHION: 2,
    WATER_BOWL: 3
};

// Initialize game
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // Initialize tiles
    initTiles();
    initInteriorObjects();
    
    // Set up event listeners
    document.addEventListener('keydown', (e) => {
        keys[e.key.toLowerCase()] = true;
    });
    
    document.addEventListener('keyup', (e) => {
        keys[e.key.toLowerCase()] = false;
    });
    
    canvas.addEventListener('click', handleMouseClick);
    document.getElementById('slot1').addEventListener('click', () => selectTool(0));
    document.getElementById('slot2').addEventListener('click', () => selectTool(1));
    
    // Start game loop
    requestAnimationFrame(gameLoop);
    setInterval(updateTime, 100);
}

// Initialize exterior tiles
function initTiles() {
    // Fill with grass
    for (let y = 0; y < GRID_HEIGHT; y++) {
        tiles[y] = [];
        for (let x = 0; x < GRID_WIDTH; x++) {
            tiles[y][x] = TILES.GRASS;
        }
    }
    
    // Add water
    for (let x = 3; x <= 9; x++) {
        for (let y = 14; y <= 16; y++) {
            tiles[y][x] = TILES.WATER;
            fishableAreas.push({x: x, y: y});
        }
    }
    
    // Add trees
    for (let i = 0; i < 35; i++) {
        const x = Math.floor(Math.random() * (GRID_WIDTH - 6)) + 3;
        const y = Math.floor(Math.random() * (GRID_HEIGHT - 8)) + 1;
        if (tiles[y][x] === TILES.GRASS && !(x === Math.floor(player.x) && y === Math.floor(player.y)) && 
            !(x >= 17 && x <= 23 && y >= 14 && y <= 19)) {
            tiles[y][x] = TILES.TREE;
            trees.push({x: x, y: y, health: 3});
        }
    }
    
    // Add house
    for (let x = 18; x <= 22; x++) {
        for (let y = 15; y <= 18; y++) {
            if (x === 20 && y === 18) {
                tiles[y][x] = TILES.HOUSE_DOOR;
            } else {
                tiles[y][x] = TILES.HOUSE_WALL;
            }
        }
    }
    
    // Add decorations
    for (let i = 0; i < 40; i++) {
        const x = Math.floor(Math.random() * GRID_WIDTH);
        const y = Math.floor(Math.random() * GRID_HEIGHT);
        if (tiles[y][x] === TILES.GRASS && !(x === Math.floor(player.x) && y === Math.floor(player.y)) &&
            !(x >= 17 && x <= 23 && y >= 14 && y <= 19)) {
            const rand = Math.random();
            if (rand < 0.3) {
                tiles[y][x] = TILES.FLOWER;
            } else if (rand < 0.6) {
                tiles[y][x] = TILES.ROCK;
            } else {
                tiles[y][x] = TILES.BUSH;
            }
        }
    }
}

// Initialize interior objects
function initInteriorObjects() {
    interiorObjects = [];
    interiorObjects.push({type: OBJECTS.FISH, x: 15, y: 5});
    interiorObjects.push({type: OBJECTS.WOOD, x: 17, y: 5});
    interiorObjects.push({type: OBJECTS.CUSHION, x: 10, y: 7});
    interiorObjects.push({type: OBJECTS.WATER_BOWL, x: 12, y: 7});
}

// Select tool
function selectTool(toolIndex) {
    player.selectedTool = toolIndex;
    
    for (let i = 1; i <= 2; i++) {
        const slot = document.getElementById(`slot${i}`);
        if (i === toolIndex + 1) {
            slot.classList.add('selected');
        } else {
            slot.classList.remove('selected');
        }
    }
    
    showMessage(toolIndex === 0 ? "🎣 Fishing Rod equipped" : "🪓 Axe equipped");
}

// Show message
function showMessage(text) {
    const messageEl = document.getElementById('message');
    messageEl.innerHTML = text;
    messageEl.style.display = 'block';
    
    if (messageTimeout) {
        clearTimeout(messageTimeout);
    }
    
    messageTimeout = setTimeout(() => {
        messageEl.style.display = 'none';
    }, 4000);
}

// Update held item display
function updateHeldItem() {
    const heldItemEl = document.getElementById('held-item-name');
    if (player.heldItem) {
        heldItemEl.textContent = player.heldItem.charAt(0).toUpperCase() + player.heldItem.slice(1);
    } else {
        heldItemEl.textContent = "None";
    }
}

// Handle mouse clicks
function handleMouseClick(e) {
    const rect = canvas.getBoundingClientRect();
    const scale = player.insideHouse ? 2.5 : 1;
    const x = Math.floor((e.clientX - rect.left) / (TILE_SIZE * scale));
    const y = Math.floor((e.clientY - rect.top) / (TILE_SIZE * scale));
    
    if (player.insideHouse) {
        if (y >= 0 && y < INTERIOR_HEIGHT && x >= 0 && x < INTERIOR_WIDTH) {
            handleInteriorClick(x, y);
        }
    } else {
        if (y >= 0 && y < GRID_HEIGHT && x >= 0 && x < GRID_WIDTH) {
            handleClick(x, y);
        }
    }
}

// Handle clicks on specific tiles in exterior
function handleClick(x, y) {
    if (tiles[y][x] === TILES.HOUSE_DOOR && !player.insideHouse) {
        enterHouse();
        return;
    }
    
    if (tiles[y][x] === TILES.WATER && player.selectedTool === 0) {
        if (Math.random() > 0.7) {
            player.heldItem = "fish";
            updateHeldItem();
            showMessage("🐟 Caught a fish!");
        } else {
            showMessage("💔 No bite...");
        }
        return;
    }
    
    if (tiles[y][x] === TILES.TREE && player.selectedTool === 1) {
        for (let i = 0; i < trees.length; i++) {
            if (trees[i].x === x && trees[i].y === y) {
                trees[i].health--;
                if (trees[i].health <= 0) {
                    tiles[y][x] = TILES.GRASS;
                    player.heldItem = "wood";
                    updateHeldItem();
                    showMessage("🪵 Chopped tree! Got wood.");
                    trees.splice(i, 1);
                } else {
                    showMessage("🪓 Chopping tree...");
                }
                return;
            }
        }
    }
}

// Enter house function - FIXED POSITIONING
function enterHouse() {
    player.insideHouse = true;
    // Position player in center of house, away from door
    player.x = 10;
    player.y = 5;
    player.velX = 0;
    player.velY = 0;
    showMessage("🏠 You entered your house! Press E near the door to exit!");
    resizeCanvasForInterior();
    // Show signs at visible position
    document.getElementById('signs').style.display = 'block';
    document.getElementById('signs').style.top = '150px'; // Moved up to be visible
}

// Exit house function - FIXED POSITIONING
function exitHouse() {
    player.insideHouse = false;
    // Position player in front of house door, not on top of it
    player.x = 20;
    player.y = 17; // Position in front of door
    player.velX = 0;
    player.velY = 0;
    showMessage("🚪 You exited your house! Adventure awaits!");
    resizeCanvasForExterior();
    // Hide signs
    document.getElementById('signs').style.display = 'none';
}

// Handle clicks on specific objects in interior
function handleInteriorClick(x, y) {
    // Check if clicked near the door (exit) - FIXED LOCATION AT BOTTOM CENTER
    if (y === INTERIOR_HEIGHT - 1 && x >= 9 && x <= 11) {
        exitHouse();
        return;
    }
    
    for (let i = 0; i < interiorObjects.length; i++) {
        const obj = interiorObjects[i];
        if (obj.type === OBJECTS.WATER_BOWL && obj.x === x && obj.y === y) {
            player.energy = Math.min(100, player.energy + 25);
            showMessage("💧 Drank from water bowl (+25 energy)");
            return;
        }
    }
    
    for (let i = 0; i < interiorObjects.length; i++) {
        const obj = interiorObjects[i];
        if (obj.type === OBJECTS.FISH && obj.x === x && obj.y === y) {
            if (player.heldItem === "fish") {
                showMessage("✋ You're already holding a fish!");
            } else if (player.heldItem === null) {
                interiorObjects.splice(i, 1);
                player.heldItem = "fish";
                updateHeldItem();
                showMessage("🐟 Took fish");
            } else {
                showMessage("✋ Your hands are full!");
            }
            return;
        }
    }
    
    for (let i = 0; i < interiorObjects.length; i++) {
        const obj = interiorObjects[i];
        if (obj.type === OBJECTS.WOOD && obj.x === x && obj.y === y) {
            if (player.heldItem === "wood") {
                showMessage("✋ You're already holding wood!");
            } else if (player.heldItem === null) {
                interiorObjects.splice(i, 1);
                player.heldItem = "wood";
                updateHeldItem();
                showMessage("🪵 Took wood");
            } else {
                showMessage("✋ Your hands are full!");
            }
            return;
        }
    }
    
    for (let i = 0; i < interiorObjects.length; i++) {
        const obj = interiorObjects[i];
        if (obj.type === OBJECTS.CUSHION && obj.x === x && obj.y === y) {
            if (isDay) {
                time = 18 * 60;
                isDay = false;
                player.hasSlept = true;
                player.energy = Math.min(100, player.energy + 30);
                showMessage("😴 Slept on cushion. It's now night. (+30 energy)");
            } else {
                player.energy = Math.min(100, player.energy + 30);
                showMessage("😴 Resting on cushion. (+30 energy)");
            }
            return;
        }
    }
    
    if (Math.abs(mouse.x - x) <= 1 && Math.abs(mouse.y - y) <= 1 && !mouse.caught) {
        if (Math.random() > 0.6) {
            mouse.caught = true;
            player.gold += 20;
            showMessage("🐭 Caught the mouse! (+20 gold)");
        } else {
            showMessage("💨 The mouse got away!");
            mouse.x = Math.floor(Math.random() * (INTERIOR_WIDTH - 4)) + 2;
            mouse.y = Math.floor(Math.random() * (INTERIOR_HEIGHT - 4)) + 2;
        }
        return;
    }
    
    if (player.heldItem) {
        if (player.heldItem === "fish") {
            player.energy = Math.min(100, player.energy + 20);
            player.gold += 15;
            player.heldItem = null;
            updateHeldItem();
            showMessage("😋 Ate fish! (+20 energy, +15 gold)");
        } else if (player.heldItem === "wood") {
            player.gold += 10;
            player.heldItem = null;
            updateHeldItem();
            showMessage("🪵 Placed wood! (+10 gold)");
        }
    }
}

// Resize canvas for interior
function resizeCanvasForInterior() {
    canvas.width = INTERIOR_WIDTH * TILE_SIZE * 2.5;
    canvas.height = INTERIOR_HEIGHT * TILE_SIZE * 2.5;
}

// Resize canvas for exterior
function resizeCanvasForExterior() {
    canvas.width = GRID_WIDTH * TILE_SIZE;
    canvas.height = GRID_HEIGHT * TILE_SIZE;
}

// Check if move is valid
function isValidMove(x, y) {
    if (player.insideHouse) {
        if (x < 0 || x >= INTERIOR_WIDTH || y < 0 || y >= INTERIOR_HEIGHT) {
            return false;
        }
        
        if (y === 0 || y === INTERIOR_HEIGHT - 1 || x === 0 || x === INTERIOR_WIDTH - 1) {
            return false;
        }
        
        return true;
    } else {
        if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) {
            return false;
        }
        
        const tile = tiles[Math.floor(y)][Math.floor(x)];
        
        if (tile === TILES.WATER) {
            return false;
        }
        
        if (tile === TILES.HOUSE_WALL) {
            return false;
        }
        
        return true;
    }
}

// Interact with environment (E key) - FIXED DOOR INTERACTION
function interact() {
    if (player.insideHouse) {
        // Check if player is near the door (exit) - FIXED LOCATION AT BOTTOM CENTER
        if (player.y === INTERIOR_HEIGHT - 1 && player.x >= 9 && player.x <= 11) {
            exitHouse();
            return;
        }
        
        // Check nearby objects
        for (let i = 0; i < interiorObjects.length; i++) {
            const obj = interiorObjects[i];
            if (Math.abs(obj.x - player.x) <= 1 && Math.abs(obj.y - player.y) <= 1) {
                switch(obj.type) {
                    case OBJECTS.WATER_BOWL:
                        player.energy = Math.min(100, player.energy + 25);
                        showMessage("💧 Drank from water bowl (+25 energy)");
                        return;
                    case OBJECTS.FISH:
                        if (player.heldItem === "fish") {
                            showMessage("✋ You're already holding a fish!");
                        } else if (player.heldItem === null) {
                            interiorObjects.splice(i, 1);
                            player.heldItem = "fish";
                            updateHeldItem();
                            showMessage("🐟 Took fish");
                        } else {
                            showMessage("✋ Your hands are full!");
                        }
                        return;
                    case OBJECTS.WOOD:
                        if (player.heldItem === "wood") {
                            showMessage("✋ You're already holding wood!");
                        } else if (player.heldItem === null) {
                            interiorObjects.splice(i, 1);
                            player.heldItem = "wood";
                            updateHeldItem();
                            showMessage("🪵 Took wood");
                        } else {
                            showMessage("✋ Your hands are full!");
                        }
                        return;
                    case OBJECTS.CUSHION:
                        if (isDay) {
                            time = 18 * 60;
                            isDay = false;
                            player.hasSlept = true;
                            player.energy = Math.min(100, player.energy + 30);
                            showMessage("😴 Slept on cushion. It's now night. (+30 energy)");
                        } else {
                            player.energy = Math.min(100, player.energy + 30);
                            showMessage("😴 Resting on cushion. (+30 energy)");
                        }
                        return;
                }
            }
        }
        
        if (Math.abs(mouse.x - player.x) <= 1 && Math.abs(mouse.y - player.y) <= 1 && !mouse.caught) {
            if (Math.random() > 0.6) {
                mouse.caught = true;
                player.gold += 20;
                showMessage("🐭 Caught the mouse! (+20 gold)");
            } else {
                showMessage("💨 The mouse got away!");
                mouse.x = Math.floor(Math.random() * (INTERIOR_WIDTH - 4)) + 2;
                mouse.y = Math.floor(Math.random() * (INTERIOR_HEIGHT - 4)) + 2;
            }
            return;
        }
        
        if (player.heldItem) {
            if (player.heldItem === "fish") {
                player.energy = Math.min(100, player.energy + 20);
                player.gold += 15;
                player.heldItem = null;
                updateHeldItem();
                showMessage("😋 Ate fish! (+20 energy, +15 gold)");
            } else if (player.heldItem === "wood") {
                player.gold += 10;
                player.heldItem = null;
                updateHeldItem();
                showMessage("🪵 Placed wood! (+10 gold)");
            }
        }
    } else {
        // Exterior interactions
        if (tiles[Math.floor(player.y)][Math.floor(player.x)] === TILES.HOUSE_DOOR && !player.insideHouse) {
            enterHouse();
            return;
        }
        
        if (player.selectedTool === 0) {
            const adjacentPositions = [
                {x: Math.floor(player.x), y: Math.floor(player.y - 1)},
                {x: Math.floor(player.x), y: Math.floor(player.y + 1)},
                {x: Math.floor(player.x - 1), y: Math.floor(player.y)},
                {x: Math.floor(player.x + 1), y: Math.floor(player.y)}
            ];
            
            for (const pos of adjacentPositions) {
                if (pos.x >= 0 && pos.x < GRID_WIDTH && pos.y >= 0 && pos.y < GRID_HEIGHT) {
                    if (tiles[pos.y][pos.x] === TILES.WATER) {
                        if (Math.random() > 0.7) {
                            player.heldItem = "fish";
                            updateHeldItem();
                            showMessage("🐟 Caught a fish!");
                        } else {
                            showMessage("💔 No bite...");
                        }
                        return;
                    }
                }
            }
        }
        
        if (player.selectedTool === 1) {
            const adjacentPositions = [
                {x: Math.floor(player.x), y: Math.floor(player.y - 1)},
                {x: Math.floor(player.x), y: Math.floor(player.y + 1)},
                {x: Math.floor(player.x - 1), y: Math.floor(player.y)},
                {x: Math.floor(player.x + 1), y: Math.floor(player.y)}
            ];
            
            for (const pos of adjacentPositions) {
                if (pos.x >= 0 && pos.x < GRID_WIDTH && pos.y >= 0 && pos.y < GRID_HEIGHT) {
                    if (tiles[pos.y][pos.x] === TILES.TREE) {
                        for (let i = 0; i < trees.length; i++) {
                            if (trees[i].x === pos.x && trees[i].y === pos.y) {
                                trees[i].health--;
                                if (trees[i].health <= 0) {
                                    tiles[pos.y][pos.x] = TILES.GRASS;
                                    player.heldItem = "wood";
                                    updateHeldItem();
                                    showMessage("🪵 Chopped tree! Got wood.");
                                    trees.splice(i, 1);
                                } else {
                                    showMessage("🪓 Chopping tree...");
                                }
                                return;
                            }
                        }
                    }
                }
            }
        }
    }
}

// Use selected tool
function useTool() {
    if (player.selectedTool === 0) {
        showMessage("🎣 Equip fishing rod and move near water to fish");
    } else {
        showMessage("🪓 Equip axe and move near a tree to chop");
    }
}

// Update time and day/night cycle
function updateTime() {
    time += 1;
    
    if (time >= 24 * 60) {
        time = 6 * 60;
        day++;
        isDay = true;
        player.hasSlept = false;
        showMessage("🌅 A new day begins - Day " + day);
    }
    
    if (time >= 18 * 60 && isDay) {
        isDay = false;
        if (!player.insideHouse && !player.hasSlept) {
            showMessage("🌙 It's getting dark. Find shelter!");
        }
    } else if (time >= 6 * 60 && time < 18 * 60 && !isDay) {
        isDay = true;
        player.hasSlept = false;
        showMessage("🌅 Morning has come - Day " + day);
    }
    
    if (!isDay && !player.insideHouse && !player.hasSlept) {
        player.energy -= 0.02;
        if (player.energy < 20) {
            showMessage("⚠️ Find shelter or you'll collapse!");
        }
    }
    
    updateGameInfo();
}

// Main game loop
function gameLoop() {
    // Handle keyboard input for smooth movement
    player.velX = 0;
    player.velY = 0;
    
    if (keys['w'] || keys['arrowup']) player.velY = -player.speed;
    if (keys['s'] || keys['arrowdown']) player.velY = player.speed;
    if (keys['a'] || keys['arrowleft']) player.velX = -player.speed;
    if (keys['d'] || keys['arrowright']) player.velX = player.speed;
    
    // Normalize diagonal movement
    if (player.velX !== 0 && player.velY !== 0) {
        player.velX *= 0.707;
        player.velY *= 0.707;
    }
    
    // Update position
    const newX = player.x + player.velX;
    const newY = player.y + player.velY;
    
    if (isValidMove(newX, player.y)) {
        player.x = newX;
    }
    
    if (isValidMove(player.x, newY)) {
        player.y = newY;
    }
    
    // Handle interaction
    if (keys['e']) {
        interact();
        keys['e'] = false; // Prevent continuous interaction
    }
    
    if (keys[' ']) {
        useTool();
        keys[' '] = false; // Prevent continuous tool use
    }
    
    if (keys['1']) {
        selectTool(0);
        keys['1'] = false;
    }
    
    if (keys['2']) {
        selectTool(1);
        keys['2'] = false;
    }
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    if (player.insideHouse) {
        ctx.fillStyle = '#2c2c2c';
    } else {
        if (weather === "rainy" || weather === "stormy") {
            ctx.fillStyle = isDay ? '#778899' : '#2F4F4F';
        } else {
            ctx.fillStyle = isDay ? '#87CEEB' : '#191970';
        }
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw game elements
    drawTiles();
    
    if (player.insideHouse) {
        drawInteriorObjects();
        drawMouse();
    }
    
    drawPlayer();
    
    updateGameInfo();
    
    if (player.energy <= 0) {
        showMessage("💤 Your cat fell asleep forever... Refresh to play again");
    }
    
    requestAnimationFrame(gameLoop);
}

// Draw tiles
function drawTiles() {
    if (player.insideHouse) {
        const scale = 2.5;
        for (let y = 0; y < INTERIOR_HEIGHT; y++) {
            for (let x = 0; x < INTERIOR_WIDTH; x++) {
                const tileX = x * TILE_SIZE * scale;
                const tileY = y * TILE_SIZE * scale;
                
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(tileX, tileY, TILE_SIZE * scale, TILE_SIZE * scale);
                
                ctx.fillStyle = '#5D4037';
                ctx.fillRect(tileX + 5 * scale, tileY + 5 * scale, 3 * scale, 3 * scale);
                ctx.fillRect(tileX + 24 * scale, tileY + 5 * scale, 3 * scale, 3 * scale);
                ctx.fillRect(tileX + 5 * scale, tileY + 24 * scale, 3 * scale, 3 * scale);
                ctx.fillRect(tileX + 24 * scale, tileY + 24 * scale, 3 * scale, 3 * scale);
                
                if (y === 0 || y === INTERIOR_HEIGHT - 1 || x === 0 || x === INTERIOR_WIDTH - 1) {
                    ctx.fillStyle = '#5D4037';
                    ctx.fillRect(tileX, tileY, TILE_SIZE * scale, TILE_SIZE * scale);
                }
                
                // Draw door area (bottom center) - FIXED LOCATION
                if (y === INTERIOR_HEIGHT - 1 && x >= 9 && x <= 11) {
                    ctx.fillStyle = '#5D4037';
                    ctx.fillRect(tileX, tileY, TILE_SIZE * scale, TILE_SIZE * scale);
                    ctx.fillStyle = '#FFD700';
                    ctx.fillRect(tileX + 24 * scale, tileY + 16 * scale, 4 * scale, 4 * scale);
                }
            }
        }
    } else {
        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                const tileX = x * TILE_SIZE;
                const tileY = y * TILE_SIZE;
                
                switch(tiles[y][x]) {
                    case TILES.GRASS:
                        ctx.fillStyle = isDay ? '#7da55e' : '#3d6b2f';
                        ctx.fillRect(tileX, tileY, TILE_SIZE, TILE_SIZE);
                        ctx.fillStyle = isDay ? '#5a8c42' : '#2a521f';
                        for (let i = 0; i < 5; i++) {
                            const grassX = tileX + Math.random() * TILE_SIZE;
                            const grassY = tileY + Math.random() * TILE_SIZE;
                            ctx.fillRect(grassX, grassY, 2, 4);
                        }
                        break;
                    case TILES.WATER:
                        ctx.fillStyle = isDay ? '#4d8fcc' : '#1c3a5f';
                        ctx.fillRect(tileX, tileY, TILE_SIZE, TILE_SIZE);
                        ctx.strokeStyle = isDay ? '#5aa6ff' : '#2a5a9c';
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(tileX + 5, tileY + 10);
                        ctx.lineTo(tileX + 15, tileY + 5);
                        ctx.lineTo(tileX + 25, tileY + 10);
                        ctx.stroke();
                        ctx.beginPath();
                        ctx.moveTo(tileX + 10, tileY + 20);
                        ctx.lineTo(tileX + 20, tileY + 15);
                        ctx.lineTo(tileX + 30, tileY + 20);
                        ctx.stroke();
                        break;
                    case TILES.TREE:
                        ctx.fillStyle = '#8B4513';
                        ctx.fillRect(tileX + 12, tileY + 16, 8, 16);
                        ctx.fillStyle = isDay ? '#228B22' : '#134f13';
                        ctx.beginPath();
                        ctx.arc(tileX + 16, tileY + 8, 12, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.beginPath();
                        ctx.arc(tileX + 10, tileY + 12, 10, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.beginPath();
                        ctx.arc(tileX + 22, tileY + 12, 10, 0, Math.PI * 2);
                        ctx.fill();
                        if (Math.random() > 0.7) {
                            ctx.fillStyle = '#FF0000';
                            ctx.beginPath();
                            ctx.arc(tileX + 8, tileY + 10, 3, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.beginPath();
                            ctx.arc(tileX + 24, tileY + 14, 3, 0, Math.PI * 2);
                            ctx.fill();
                        }
                        break;
                    case TILES.HOUSE_WALL:
                        ctx.fillStyle = '#8B4513';
                        ctx.fillRect(tileX, tileY, TILE_SIZE, TILE_SIZE);
                        break;
                    case TILES.HOUSE_DOOR:
                        ctx.fillStyle = '#5D4037';
                        ctx.fillRect(tileX, tileY, TILE_SIZE, TILE_SIZE);
                        ctx.fillStyle = '#FFD700';
                        ctx.fillRect(tileX + 24, tileY + 16, 4, 4);
                        break;
                    case TILES.FLOWER:
                        ctx.fillStyle = '#FF69B4';
                        ctx.beginPath();
                        ctx.arc(tileX + 16, tileY + 16, 6, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.fillStyle = '#FFD700';
                        ctx.beginPath();
                        ctx.arc(tileX + 16, tileY + 16, 3, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.fillStyle = '#32CD32';
                        ctx.fillRect(tileX + 15, tileY + 22, 2, 8);
                        break;
                    case TILES.ROCK:
                        ctx.fillStyle = '#696969';
                        ctx.beginPath();
                        ctx.arc(tileX + 16, tileY + 16, 8, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.fillStyle = '#808080';
                        ctx.beginPath();
                        ctx.arc(tileX + 12, tileY + 14, 3, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.beginPath();
                        ctx.arc(tileX + 20, tileY + 18, 2, 0, Math.PI * 2);
                        ctx.fill();
                        break;
                    case TILES.BUSH:
                        ctx.fillStyle = isDay ? '#32CD32' : '#228B22';
                        ctx.beginPath();
                        ctx.arc(tileX + 10, tileY + 16, 8, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.beginPath();
                        ctx.arc(tileX + 22, tileY + 16, 8, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.beginPath();
                        ctx.arc(tileX + 16, tileY + 10, 8, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.beginPath();
                        ctx.arc(tileX + 16, tileY + 22, 8, 0, Math.PI * 2);
                        ctx.fill();
                        break;
                }
            }
        }
    }
}

// Draw interior objects
function drawInteriorObjects() {
    const scale = 2.5;
    
    for (const obj of interiorObjects) {
        const x = obj.x * TILE_SIZE * scale;
        const y = obj.y * TILE_SIZE * scale;
        
        switch(obj.type) {
            case OBJECTS.FISH:
                ctx.fillStyle = '#FFD700';
                ctx.beginPath();
                ctx.moveTo(x + 8 * scale, y + 16 * scale);
                ctx.bezierCurveTo(
                    x + 20 * scale, y + 10 * scale,
                    x + 24 * scale, y + 20 * scale,
                    x + 8 * scale, y + 24 * scale
                );
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(x + 8 * scale, y + 16 * scale);
                ctx.lineTo(x, y + 12 * scale);
                ctx.lineTo(x, y + 20 * scale);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = '#000';
                ctx.beginPath();
                ctx.arc(x + 18 * scale, y + 15 * scale, 2 * scale, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case OBJECTS.WOOD:
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(x + 4 * scale, y + 8 * scale, 24 * scale, 16 * scale);
                ctx.fillStyle = '#5D4037';
                ctx.fillRect(x + 8 * scale, y + 10 * scale, 3 * scale, 12 * scale);
                ctx.fillRect(x + 14 * scale, y + 10 * scale, 3 * scale, 12 * scale);
                ctx.fillRect(x + 20 * scale, y + 10 * scale, 3 * scale, 12 * scale);
                ctx.fillStyle = '#654321';
                ctx.fillRect(x + 6 * scale, y + 12 * scale, 2 * scale, 2 * scale);
                ctx.fillRect(x + 18 * scale, y + 18 * scale, 2 * scale, 2 * scale);
                break;
                
            case OBJECTS.CUSHION:
                ctx.fillStyle = '#FF69B4';
                ctx.fillRect(x + 2 * scale, y + 8 * scale, 28 * scale, 16 * scale);
                ctx.fillStyle = '#FF1493';
                ctx.fillRect(x + 6 * scale, y + 12 * scale, 4 * scale, 8 * scale);
                ctx.fillRect(x + 14 * scale, y + 12 * scale, 4 * scale, 8 * scale);
                ctx.fillRect(x + 22 * scale, y + 12 * scale, 4 * scale, 8 * scale);
                ctx.strokeStyle = '#C71585';
                ctx.lineWidth = 2 * scale;
                ctx.strokeRect(x + 2 * scale, y + 8 * scale, 28 * scale, 16 * scale);
                break;
                
            case OBJECTS.WATER_BOWL:
                ctx.fillStyle = '#B0C4DE';
                ctx.beginPath();
                ctx.arc(x + 16 * scale, y + 16 * scale, 12 * scale, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#4d8fcc';
                ctx.beginPath();
                ctx.arc(x + 16 * scale, y + 16 * scale, 10 * scale, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#5aa6ff';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(x + 16 * scale, y + 16 * scale, 7 * scale, 0, Math.PI * 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(x + 16 * scale, y + 16 * scale, 4 * scale, 0, Math.PI * 2);
                ctx.stroke();
                break;
        }
    }
}

// Draw mouse
function drawMouse() {
    if (mouse.caught) return;
    
    const scale = 2.5;
    const x = mouse.x * TILE_SIZE * scale;
    const y = mouse.y * TILE_SIZE * scale;
    
    ctx.fillStyle = '#808080';
    ctx.fillRect(x + 10 * scale, y + 12 * scale, 12 * scale, 8 * scale);
    ctx.fillStyle = '#808080';
    ctx.fillRect(x + 18 * scale, y + 10 * scale, 6 * scale, 6 * scale);
    ctx.fillStyle = '#A9A9A9';
    ctx.fillRect(x + 19 * scale, y + 8 * scale, 2 * scale, 2 * scale);
    ctx.fillRect(x + 21 * scale, y + 8 * scale, 2 * scale, 2 * scale);
    ctx.fillStyle = '#808080';
    ctx.fillRect(x + 4 * scale, y + 14 * scale, 6 * scale, 2 * scale);
    ctx.fillStyle = '#000';
    ctx.fillRect(x + 20 * scale, y + 11 * scale, 1 * scale, 1 * scale);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 19 * scale, y + 12 * scale);
    ctx.lineTo(x + 16 * scale, y + 11 * scale);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 19 * scale, y + 12 * scale);
    ctx.lineTo(x + 16 * scale, y + 13 * scale);
    ctx.stroke();
}

// Draw player (cat)
function drawPlayer() {
    const scale = player.insideHouse ? 2.5 : 1;
    const x = player.x * TILE_SIZE * scale;
    const y = player.y * TILE_SIZE * scale;
    
    // Draw cat shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.arc(x + 16 * scale, y + 28 * scale, 8 * scale, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw cat body
    ctx.fillStyle = '#FFA500';
    ctx.fillRect(x + 6 * scale, y + 6 * scale, 20 * scale, 20 * scale);
    
    // Draw cat pattern
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(x + 10 * scale, y + 10 * scale, 4 * scale, 4 * scale);
    ctx.fillRect(x + 18 * scale, y + 10 * scale, 4 * scale, 4 * scale);
    ctx.fillRect(x + 14 * scale, y + 18 * scale, 4 * scale, 4 * scale);
    
    // Draw cat ears
    ctx.fillStyle = '#FFA500';
    ctx.fillRect(x + 4 * scale, y + 4 * scale, 6 * scale, 6 * scale);
    ctx.fillRect(x + 22 * scale, y + 4 * scale, 6 * scale, 6 * scale);
    ctx.fillStyle = '#FF69B4';
    ctx.fillRect(x + 5 * scale, y + 5 * scale, 4 * scale, 4 * scale);
    ctx.fillRect(x + 23 * scale, y + 5 * scale, 4 * scale, 4 * scale);
    
    // Draw cat eyes
    ctx.fillStyle = '#000';
    ctx.fillRect(x + 10 * scale, y + 12 * scale, 3 * scale, 3 * scale);
    ctx.fillRect(x + 19 * scale, y + 12 * scale, 3 * scale, 3 * scale);
    ctx.fillStyle = '#FFF';
    ctx.fillRect(x + 11 * scale, y + 13 * scale, 1 * scale, 1 * scale);
    ctx.fillRect(x + 20 * scale, y + 13 * scale, 1 * scale, 1 * scale);
    
    // Draw cat nose
    ctx.fillStyle = '#FF69B4';
    ctx.fillRect(x + 15 * scale, y + 16 * scale, 2 * scale, 2 * scale);
    
    // Draw cat mouth
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1 * scale;
    ctx.beginPath();
    ctx.moveTo(x + 14 * scale, y + 18 * scale);
    ctx.lineTo(x + 16 * scale, y + 19 * scale);
    ctx.lineTo(x + 18 * scale, y + 18 * scale);
    ctx.stroke();
    
    // Draw cat tail
    ctx.fillStyle = '#FFA500';
    ctx.fillRect(x - 6 * scale, y + 20 * scale, 10 * scale, 4 * scale);
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(x - 8 * scale, y + 19 * scale, 4 * scale, 6 * scale);
    
    // Draw tool
    switch(player.selectedTool) {
        case 0: // Fishing rod
            ctx.strokeStyle = '#8B4513';
            ctx.lineWidth = 2 * scale;
            ctx.beginPath();
            ctx.moveTo(x + 16 * scale, y + 16 * scale);
            ctx.lineTo(x + 30 * scale, y - 5 * scale);
            ctx.stroke();
            ctx.strokeStyle = '#FFF';
            ctx.lineWidth = 1 * scale;
            ctx.beginPath();
            ctx.moveTo(x + 30 * scale, y - 5 * scale);
            ctx.lineTo(x + 35 * scale, y - 10 * scale);
            ctx.stroke();
            ctx.strokeStyle = '#C0C0C0';
            ctx.lineWidth = 2 * scale;
            ctx.beginPath();
            ctx.moveTo(x + 35 * scale, y - 10 * scale);
            ctx.lineTo(x + 38 * scale, y - 8 * scale);
            ctx.lineTo(x + 36 * scale, y - 6 * scale);
            ctx.stroke();
            break;
        case 1: // Axe
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(x + 20 * scale, y + 8 * scale, 2 * scale, 12 * scale);
            ctx.fillRect(x + 16 * scale, y + 6 * scale, 10 * scale, 4 * scale);
            ctx.fillStyle = '#C0C0C0';
            ctx.beginPath();
            ctx.moveTo(x + 26 * scale, y + 6 * scale);
            ctx.lineTo(x + 32 * scale, y + 2 * scale);
            ctx.lineTo(x + 32 * scale, y + 10 * scale);
            ctx.lineTo(x + 26 * scale, y + 10 * scale);
            ctx.closePath();
            ctx.fill();
            break;
    }
    
    // Draw held item
    if (player.heldItem) {
        switch(player.heldItem) {
            case "fish":
                ctx.fillStyle = '#FFD700';
                ctx.beginPath();
                ctx.moveTo(x + 24 * scale, y + 8 * scale);
                ctx.bezierCurveTo(
                    x + 32 * scale, y + 4 * scale,
                    x + 36 * scale, y + 12 * scale,
                    x + 24 * scale, y + 16 * scale
                );
                ctx.fill();
                break;
            case "wood":
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(x + 24 * scale, y + 8 * scale, 6 * scale, 6 * scale);
                break;
        }
    }
}

// Update game info display
function updateGameInfo() {
    const hours = Math.floor(time / 60);
    const minutes = Math.floor(time % 60);
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    
    document.getElementById('energy').textContent = Math.floor(player.energy);
    document.getElementById('gold').textContent = player.gold;
    document.getElementById('time').textContent = timeString;
    document.getElementById('day').textContent = day;
}

// Start the game when page loads
window.onload = init;