/**
 * Nautical Village Network
 * Interactive canvas simulation of an island archipelago connected by maritime trade.
 */

(function () {
    'use strict';

    // Canvas & Context
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // UI Elements
    const elGold = document.getElementById('gold');
    const elFish = document.getElementById('fish');
    const elWood = document.getElementById('wood');
    const elPopulation = document.getElementById('population');

    const panel = document.getElementById('panel');
    const villageInfo = document.getElementById('villageInfo');
    const villageName = document.getElementById('villageName');
    const villageDesc = document.getElementById('villageDesc');
    const villageStats = document.getElementById('villageStats');
    const actionsContainer = document.getElementById('actions');
    const buildMenu = document.getElementById('buildMenu');
    const routeMenu = document.getElementById('routeMenu');
    const routeCost = document.getElementById('routeCost');
    const messagesContainer = document.getElementById('messages');
    const buildButtons = document.querySelectorAll('.build-btn');

    // Add sound toggle button into header
    const header = document.getElementById('header');
    let soundEnabled = false;
    let audioCtx = null;

    if (header) {
        const soundBtn = document.createElement('button');
        soundBtn.id = 'soundToggle';
        soundBtn.className = 'action-btn';
        soundBtn.style.width = 'auto';
        soundBtn.style.padding = '6px 14px';
        soundBtn.style.margin = '0';
        soundBtn.style.fontSize = '0.85rem';
        soundBtn.textContent = '🔇 Sound: Off';
        soundBtn.title = 'Toggle peaceful nautical sound effects';
        soundBtn.addEventListener('click', () => {
            soundEnabled = !soundEnabled;
            soundBtn.textContent = soundEnabled ? '🔊 Sound: On' : '🔇 Sound: Off';
            if (soundEnabled && !audioCtx) {
                try {
                    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                } catch (e) {
                    console.warn('Web Audio not supported', e);
                }
            }
            if (soundEnabled) {
                playChime(523.25, 'triangle', 0.15, 0.08); // C5
                logMessage('Sound enabled. Enjoy the ocean breezes!', 'info');
            }
        });
        header.appendChild(soundBtn);
    }

    function initAudio() {
        if (!audioCtx) {
            try {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) { }
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    function playChime(freq, type = 'sine', duration = 0.25, vol = 0.1) {
        if (!soundEnabled || !audioCtx) return;
        try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            gain.gain.setValueAtTime(vol, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + duration);
        } catch (e) { }
    }

    function playBell() {
        if (!soundEnabled) return;
        playChime(659.25, 'sine', 0.4, 0.12);
        setTimeout(() => playChime(880.0, 'sine', 0.5, 0.08), 80);
    }

    function playCoin() {
        if (!soundEnabled) return;
        playChime(987.77, 'triangle', 0.15, 0.08);
        setTimeout(() => playChime(1318.51, 'triangle', 0.2, 0.07), 60);
    }

    // Game State
    const resources = {
        gold: 120,
        fish: 60,
        wood: 50,
        population: 0
    };

    let selectedVillageId = null;
    let routeCreationMode = false;
    let hoveredVillageId = null;
    let mousePos = { x: 0, y: 0 };

    // Island Definitions (Normalized coordinates for responsive scaling)
    const islandsData = [
        {
            id: 0,
            name: 'Coral Haven',
            desc: 'A sheltered reef lagoon famous for pearl divers, oyster beds, and calm turquoise waters.',
            nx: 0.22,
            ny: 0.28,
            baseRadius: 52,
            shapeSeed: 42,
            population: 18,
            maxPop: 35,
            buildings: { house: 2, dock: 1, market: 0, temple: 0, lighthouse: 0 },
            routes: [1],
            specialty: 'fish'
        },
        {
            id: 1,
            name: 'Timber Atoll',
            desc: 'A ring of dense ironwood palms and fragrant cedar trees that supply shipbuilders.',
            nx: 0.50,
            ny: 0.24,
            baseRadius: 58,
            shapeSeed: 108,
            population: 15,
            maxPop: 30,
            buildings: { house: 1, dock: 1, market: 0, temple: 0, lighthouse: 0 },
            routes: [0],
            specialty: 'wood'
        },
        {
            id: 2,
            name: 'Pelican Reach',
            desc: 'Chalk cliffs and limestone arches populated by seabirds and deep-water fishermen.',
            nx: 0.80,
            ny: 0.32,
            baseRadius: 50,
            shapeSeed: 77,
            population: 12,
            maxPop: 25,
            buildings: { house: 1, dock: 0, market: 0, temple: 0, lighthouse: 0 },
            routes: [],
            specialty: 'fish'
        },
        {
            id: 3,
            name: 'Sunken Shoals',
            desc: 'A low-lying sandbar island surrounded by azure shallows and bountiful clam beds.',
            nx: 0.26,
            ny: 0.70,
            baseRadius: 48,
            shapeSeed: 91,
            population: 10,
            maxPop: 25,
            buildings: { house: 1, dock: 0, market: 0, temple: 0, lighthouse: 0 },
            routes: [],
            specialty: 'fish'
        },
        {
            id: 4,
            name: 'Gilded Cay',
            desc: 'A vibrant crossroad isle where merchants, sea captains, and travelers gather to barter.',
            nx: 0.56,
            ny: 0.72,
            baseRadius: 62,
            shapeSeed: 13,
            population: 22,
            maxPop: 40,
            buildings: { house: 2, dock: 1, market: 1, temple: 0, lighthouse: 0 },
            routes: [],
            specialty: 'gold'
        },
        {
            id: 5,
            name: "Siren's Crest",
            desc: 'A mystical high promontory that overlooks the endless horizon; ideal for a beacon.',
            nx: 0.82,
            ny: 0.68,
            baseRadius: 54,
            shapeSeed: 55,
            population: 14,
            maxPop: 30,
            buildings: { house: 1, dock: 0, market: 0, temple: 1, lighthouse: 0 },
            routes: [],
            specialty: 'gold'
        }
    ];

    // Compute island procedural coast offsets
    islandsData.forEach(island => {
        island.offsets = [];
        const numPoints = 16;
        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2;
            const pseudoRand = Math.sin(island.shapeSeed * 3.7 + angle * 4) * 0.18 +
                               Math.cos(island.shapeSeed * 1.9 + angle * 2) * 0.12;
            island.offsets.push(1 + pseudoRand);
        }
    });

    // Trade Boats State
    // A boat navigates between two island IDs along a route
    const boats = [
        {
            routeId: '0-1',
            fromId: 0,
            toId: 1,
            progress: 0.25,
            speed: 0.09, // loops in ~11s
            cargo: { gold: 5, fish: 3 },
            trail: []
        }
    ];

    // Floating visual effects
    const particles = [];
    const ripples = [];
    const seagulls = [
        { x: 100, y: 150, vx: 1.2, vy: 0.3, flap: 0 },
        { x: 250, y: 120, vx: 1.1, vy: -0.2, flap: 1.5 },
        { x: 500, y: 300, vx: -1.3, vy: 0.4, flap: 3.0 },
        { x: 700, y: 400, vx: -1.0, vy: -0.3, flap: 4.2 }
    ];

    // Time tracking
    let lastTime = performance.now();
    let simTimer = 0;
    let waveTime = 0;

    // Viewport handling
    function resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        canvas.style.width = `${window.innerWidth}px`;
        canvas.style.height = `${window.innerHeight}px`;
        ctx.resetTransform();
        ctx.scale(dpr, dpr);
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    function getIslandCenter(island) {
        const w = window.innerWidth;
        const h = window.innerHeight;
        // Keep inside bounds with padding
        const padX = 80;
        const padY = 100;
        const x = padX + island.nx * (w - padX * 2);
        const y = padY + island.ny * (h - padY * 2 - 40);
        return { x, y };
    }

    function getIslandAt(px, py) {
        for (let i = islandsData.length - 1; i >= 0; i--) {
            const island = islandsData[i];
            const pt = getIslandCenter(island);
            const dist = Math.hypot(px - pt.x, py - pt.y);
            if (dist <= island.baseRadius + 10) {
                return island;
            }
        }
        return null;
    }

    // Route Cost & Helper
    const ROUTE_COST_GOLD = 50;
    const ROUTE_COST_WOOD = 20;

    function areConnected(idA, idB) {
        const islA = islandsData.find(i => i.id === idA);
        return islA && islA.routes.includes(idB);
    }

    function connectVillages(idA, idB) {
        const islA = islandsData.find(i => i.id === idA);
        const islB = islandsData.find(i => i.id === idB);
        if (!islA || !islB) return false;

        if (!islA.routes.includes(idB)) islA.routes.push(idB);
        if (!islB.routes.includes(idA)) islB.routes.push(idA);

        const routeKey = idA < idB ? `${idA}-${idB}` : `${idB}-${idA}`;
        // Create 1 or 2 trading boats
        boats.push({
            routeId: routeKey,
            fromId: idA,
            toId: idB,
            progress: 0.0,
            speed: 0.08 + (islA.buildings.dock + islB.buildings.dock) * 0.02,
            cargo: { gold: 6, fish: 4 },
            trail: []
        });

        // Add visual ripples
        const ptA = getIslandCenter(islA);
        const ptB = getIslandCenter(islB);
        ripples.push({ x: ptA.x, y: ptA.y, r: 10, maxR: 60, alpha: 1 });
        ripples.push({ x: ptB.x, y: ptB.y, r: 10, maxR: 60, alpha: 1 });

        playBell();
        return true;
    }

    // Cost parsing & affordability
    function parseCost(str) {
        const c = {};
        if (!str) return c;
        str.split(',').forEach(part => {
            const [k, v] = part.split(':');
            if (k && v) c[k.trim()] = parseInt(v.trim(), 10) || 0;
        });
        return c;
    }

    function canAfford(cost) {
        for (const [k, v] of Object.entries(cost)) {
            if ((resources[k] || 0) < v) return false;
        }
        return true;
    }

    function deductCost(cost) {
        for (const [k, v] of Object.entries(cost)) {
            resources[k] -= v;
        }
        updateResourceDisplay();
    }

    function updateResourceDisplay() {
        // Calculate total population
        const totalPop = islandsData.reduce((acc, isl) => acc + isl.population, 0);
        resources.population = totalPop;

        elGold.textContent = Math.floor(resources.gold);
        elFish.textContent = Math.floor(resources.fish);
        elWood.textContent = Math.floor(resources.wood);
        elPopulation.textContent = Math.floor(resources.population);

        // Update build buttons disabled state
        buildButtons.forEach(btn => {
            const cost = parseCost(btn.dataset.cost);
            btn.disabled = !canAfford(cost);
        });

        if (selectedVillageId !== null) {
            updateVillageDetails();
        }
    }

    // Message logging
    function logMessage(text, type = 'info') {
        if (!messagesContainer) return;
        const msg = document.createElement('div');
        msg.className = `message ${type}`;
        msg.textContent = text;
        messagesContainer.prepend(msg);

        while (messagesContainer.children.length > 8) {
            messagesContainer.removeChild(messagesContainer.lastChild);
        }
    }

    // UI Updates
    function updateVillageDetails() {
        const island = islandsData.find(i => i.id === selectedVillageId);
        if (!island) {
            villageInfo.classList.add('hidden');
            buildMenu.classList.add('hidden');
            routeMenu.classList.add('hidden');
            return;
        }

        villageInfo.classList.remove('hidden');
        buildMenu.classList.remove('hidden');
        if (routeCreationMode) {
            routeMenu.classList.remove('hidden');
        } else {
            routeMenu.classList.add('hidden');
        }

        villageName.textContent = `🏝️ ${island.name}`;
        villageDesc.textContent = island.desc;

        // Calculate yields
        const b = island.buildings;
        const fishYield = Math.floor(island.population * 0.15) + (b.dock * 3);
        const woodYield = Math.floor(island.population * 0.10) + (island.specialty === 'wood' ? 2 : 1);
        const goldYield = (b.market * 4) + (island.routes.length * 2) + (b.lighthouse * 3);
        const templeMultiplier = b.temple > 0 ? (1 + b.temple * 0.2) : 1;

        villageStats.innerHTML = `
            <div class="stat">
                <div class="stat-label">POPULATION</div>
                <div class="stat-value">${island.population} / ${island.maxPop}</div>
            </div>
            <div class="stat">
                <div class="stat-label">TRADE ROUTES</div>
                <div class="stat-value">${island.routes.length} Active</div>
            </div>
            <div class="stat">
                <div class="stat-label">FISH YIELD</div>
                <div class="stat-value">+${Math.round(fishYield * templeMultiplier)}/s 🐟</div>
            </div>
            <div class="stat">
                <div class="stat-label">GOLD & WOOD</div>
                <div class="stat-value">+${Math.round(goldYield * templeMultiplier)}🪙 +${Math.round(woodYield * templeMultiplier)}🪵</div>
            </div>
        `;

        // Render Actions
        actionsContainer.innerHTML = '';

        // Route button
        const routeBtn = document.createElement('button');
        routeBtn.className = 'action-btn';
        routeBtn.textContent = routeCreationMode ? '❌ Cancel Route Mode' : '🛤️ Establish Trade Route';
        routeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleRouteMode();
        });
        actionsContainer.appendChild(routeBtn);

        // Festival button
        const festivalBtn = document.createElement('button');
        festivalBtn.className = 'action-btn';
        festivalBtn.textContent = '🎉 Hold Festival (25🐟 ➔ +30🪙)';
        festivalBtn.disabled = resources.fish < 25;
        festivalBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (resources.fish >= 25) {
                resources.fish -= 25;
                resources.gold += 30;
                if (island.population < island.maxPop) {
                    island.population += 2;
                }
                updateResourceDisplay();
                logMessage(`Festival in ${island.name} raised spirits and earned 30🪙!`, 'success');
                playBell();

                const pt = getIslandCenter(island);
                for (let k = 0; k < 12; k++) {
                    particles.push({
                        x: pt.x + (Math.random() - 0.5) * 40,
                        y: pt.y + (Math.random() - 0.5) * 40,
                        vx: (Math.random() - 0.5) * 3,
                        vy: -Math.random() * 3 - 1,
                        color: ['#4ecdc4', '#ffd700', '#ff6b6b', '#a8e6cf'][k % 4],
                        alpha: 1.0,
                        text: null
                    });
                }
            }
        });
        actionsContainer.appendChild(festivalBtn);

        // Timber Expedition button
        const harvestBtn = document.createElement('button');
        harvestBtn.className = 'action-btn';
        harvestBtn.textContent = '🌲 Island Timber Logging (20🪙 ➔ +35🪵)';
        harvestBtn.disabled = resources.gold < 20;
        harvestBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (resources.gold >= 20) {
                resources.gold -= 20;
                resources.wood += 35;
                updateResourceDisplay();
                logMessage(`Logged sustainable timber in ${island.name} (+35🪵).`, 'success');
                playCoin();

                const pt = getIslandCenter(island);
                particles.push({
                    x: pt.x,
                    y: pt.y - 30,
                    vx: 0,
                    vy: -1.2,
                    color: '#c8a165',
                    alpha: 1.0,
                    text: '+35🪵'
                });
            }
        });
        actionsContainer.appendChild(harvestBtn);
    }

    function toggleRouteMode() {
        if (!selectedVillageId) return;
        routeCreationMode = !routeCreationMode;
        if (routeCreationMode) {
            logMessage('Select another island to establish a maritime trade route.', 'info');
        }
        updateVillageDetails();
    }

    function selectVillage(id) {
        selectedVillageId = id;
        routeCreationMode = false;
        updateVillageDetails();
        if (id !== null) {
            initAudio();
            playChime(440, 'triangle', 0.15, 0.05);
        }
    }

    // Build button listeners
    buildButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (selectedVillageId === null) return;
            const island = islandsData.find(i => i.id === selectedVillageId);
            if (!island) return;

            const bType = btn.dataset.type;
            const cost = parseCost(btn.dataset.cost);

            if (!canAfford(cost)) {
                logMessage(`Not enough resources to construct ${bType}!`, 'error');
                return;
            }

            deductCost(cost);
            island.buildings[bType] = (island.buildings[bType] || 0) + 1;

            if (bType === 'house') {
                island.maxPop += 15;
                island.population += 3;
                logMessage(`Constructed a House in ${island.name}! (+15 pop cap, +3 citizens)`, 'success');
            } else if (bType === 'dock') {
                logMessage(`Built a Dock in ${island.name}! Increased fish harvest and trade boat speed.`, 'success');
                // Boost speed of boats connected to this island
                boats.forEach(b => {
                    if (b.fromId === island.id || b.toId === island.id) {
                        b.speed += 0.02;
                    }
                });
            } else if (bType === 'market') {
                logMessage(`Opened a bustling Market in ${island.name}! Earns gold from all connected routes.`, 'success');
            } else if (bType === 'temple') {
                logMessage(`Dedicated a magnificent Sea Temple in ${island.name}! +20% yield across the island.`, 'success');
            } else if (bType === 'lighthouse') {
                logMessage(`Erected a grand Lighthouse in ${island.name}! Radiates navigational light across the sea.`, 'success');
            }

            playBell();
            const pt = getIslandCenter(island);
            particles.push({
                x: pt.x,
                y: pt.y - 25,
                vx: 0,
                vy: -1.2,
                color: '#4ecdc4',
                alpha: 1.0,
                text: `+1 ${bType.toUpperCase()}`
            });

            updateResourceDisplay();
        });
    });

    // Mouse Interaction
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mousePos.x = e.clientX - rect.left;
        mousePos.y = e.clientY - rect.top;

        const hovered = getIslandAt(mousePos.x, mousePos.y);
        hoveredVillageId = hovered ? hovered.id : null;
        canvas.style.cursor = hovered ? 'pointer' : 'default';
    });

    canvas.addEventListener('click', (e) => {
        initAudio();
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        const clickedIsland = getIslandAt(clickX, clickY);

        if (routeCreationMode) {
            if (clickedIsland) {
                if (clickedIsland.id === selectedVillageId) {
                    logMessage('Trade route cannot connect an island to itself.', 'warning');
                } else if (areConnected(selectedVillageId, clickedIsland.id)) {
                    logMessage('A trade route already exists between these islands.', 'warning');
                } else {
                    // Check trade route cost
                    if (resources.gold < ROUTE_COST_GOLD || resources.wood < ROUTE_COST_WOOD) {
                        logMessage(`Trade route requires ${ROUTE_COST_GOLD}🪙 and ${ROUTE_COST_WOOD}🪵.`, 'error');
                    } else {
                        resources.gold -= ROUTE_COST_GOLD;
                        resources.wood -= ROUTE_COST_WOOD;
                        connectVillages(selectedVillageId, clickedIsland.id);
                        const sourceIsland = islandsData.find(i => i.id === selectedVillageId);
                        logMessage(`Trade route established between ${sourceIsland.name} and ${clickedIsland.name}!`, 'success');
                        routeCreationMode = false;
                        updateResourceDisplay();
                    }
                }
            } else {
                routeCreationMode = false;
                logMessage('Route creation cancelled.', 'info');
                updateVillageDetails();
            }
            return;
        }

        if (clickedIsland) {
            selectVillage(clickedIsland.id);
        } else {
            selectVillage(null);
        }
    });

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (routeCreationMode) {
                routeCreationMode = false;
                logMessage('Route creation cancelled.', 'info');
                updateVillageDetails();
            } else {
                selectVillage(null);
            }
        }
    });

    // Simulation Economy Tick (Every 1 second)
    function runSimulationStep() {
        islandsData.forEach(island => {
            const b = island.buildings;
            const templeMultiplier = b.temple > 0 ? (1 + b.temple * 0.2) : 1;

            // Fish production
            const fishRate = (Math.floor(island.population * 0.15) + (b.dock * 3)) * templeMultiplier;
            resources.fish += fishRate;

            // Wood production
            const woodRate = (Math.floor(island.population * 0.10) + (island.specialty === 'wood' ? 2 : 1)) * templeMultiplier;
            resources.wood += woodRate;

            // Gold production
            const goldRate = ((b.market * 4) + (island.routes.length * 2) + (b.lighthouse * 3)) * templeMultiplier;
            resources.gold += goldRate;

            // Population growth (consumes 1 fish per growth when well supplied)
            if (island.population < island.maxPop && resources.fish >= 10 && Math.random() < 0.25) {
                island.population += 1;
                resources.fish -= 1;
            }
        });

        updateResourceDisplay();
    }

    // Drawing Functions
    function drawOcean(time) {
        // Shifting ocean waves
        ctx.strokeStyle = 'rgba(78, 205, 196, 0.06)';
        ctx.lineWidth = 1.5;

        const w = window.innerWidth;
        const h = window.innerHeight;
        const step = 60;

        for (let y = 30; y < h; y += step) {
            ctx.beginPath();
            for (let x = 0; x <= w; x += 40) {
                const wave = Math.sin(x * 0.015 + time * 1.5 + y * 0.05) * 8;
                if (x === 0) ctx.moveTo(x, y + wave);
                else ctx.lineTo(x, y + wave);
            }
            ctx.stroke();
        }

        // Ambient sea sparkles
        for (let i = 0; i < 6; i++) {
            const sx = ((i * 317 + time * 20) % w);
            const sy = ((i * 193 + Math.sin(time + i) * 30) % h);
            const alpha = (Math.sin(time * 3 + i) + 1) * 0.15;
            ctx.fillStyle = `rgba(168, 230, 207, ${alpha})`;
            ctx.beginPath();
            ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawRoutes(time) {
        // Collect drawn pairs to avoid duplicate rendering
        const drawn = new Set();

        islandsData.forEach(islA => {
            const ptA = getIslandCenter(islA);
            islA.routes.forEach(targetId => {
                const key = islA.id < targetId ? `${islA.id}-${targetId}` : `${targetId}-${islA.id}`;
                if (drawn.has(key)) return;
                drawn.add(key);

                const islB = islandsData.find(i => i.id === targetId);
                if (!islB) return;
                const ptB = getIslandCenter(islB);

                // Draw trade route dashed line
                ctx.save();
                ctx.beginPath();
                ctx.setLineDash([8, 8]);
                ctx.lineDashOffset = -time * 18;
                ctx.strokeStyle = 'rgba(78, 205, 196, 0.45)';
                ctx.lineWidth = 2.5;
                ctx.moveTo(ptA.x, ptA.y);
                ctx.lineTo(ptB.x, ptB.y);
                ctx.stroke();

                // Glow under-line
                ctx.beginPath();
                ctx.setLineDash([]);
                ctx.strokeStyle = 'rgba(78, 205, 196, 0.12)';
                ctx.lineWidth = 6;
                ctx.moveTo(ptA.x, ptA.y);
                ctx.lineTo(ptB.x, ptB.y);
                ctx.stroke();
                ctx.restore();
            });
        });

        // Route creation preview
        if (routeCreationMode && selectedVillageId !== null) {
            const selIsl = islandsData.find(i => i.id === selectedVillageId);
            if (selIsl) {
                const ptA = getIslandCenter(selIsl);
                ctx.save();
                ctx.beginPath();
                ctx.setLineDash([6, 6]);
                ctx.lineDashOffset = -time * 30;
                ctx.strokeStyle = '#ffd700';
                ctx.lineWidth = 2.5;
                ctx.moveTo(ptA.x, ptA.y);

                if (hoveredVillageId !== null && hoveredVillageId !== selectedVillageId) {
                    const hIsl = islandsData.find(i => i.id === hoveredVillageId);
                    const ptB = getIslandCenter(hIsl);
                    ctx.lineTo(ptB.x, ptB.y);
                } else {
                    ctx.lineTo(mousePos.x, mousePos.y);
                }
                ctx.stroke();
                ctx.restore();
            }
        }
    }

    function drawBoats(dt) {
        boats.forEach(boat => {
            const islA = islandsData.find(i => i.id === boat.fromId);
            const islB = islandsData.find(i => i.id === boat.toId);
            if (!islA || !islB) return;

            boat.progress += boat.speed * dt;
            if (boat.progress >= 1.0) {
                boat.progress = 0.0;
                // Swap direction
                const temp = boat.fromId;
                boat.fromId = boat.toId;
                boat.toId = temp;

                // Award trade revenue to destination
                const dest = islandsData.find(i => i.id === boat.fromId);
                const templeBonus = dest.buildings.temple > 0 ? 1.25 : 1;
                const earnedGold = Math.round(boat.cargo.gold * templeBonus);
                const earnedFish = Math.round(boat.cargo.fish * templeBonus);

                resources.gold += earnedGold;
                resources.fish += earnedFish;
                updateResourceDisplay();

                playCoin();

                const pt = getIslandCenter(dest);
                particles.push({
                    x: pt.x,
                    y: pt.y - 30,
                    vx: (Math.random() - 0.5) * 0.8,
                    vy: -1.0,
                    color: '#ffd700',
                    alpha: 1.0,
                    text: `+${earnedGold}🪙 +${earnedFish}🐟`
                });

                ripples.push({ x: pt.x, y: pt.y, r: 8, maxR: 45, alpha: 0.9 });
            }

            const ptA = getIslandCenter(islA);
            const ptB = getIslandCenter(islB);

            // Interpolate position with slight arc bow
            const t = boat.progress;
            const rawX = ptA.x + (ptB.x - ptA.x) * t;
            const rawY = ptA.y + (ptB.y - ptA.y) * t;

            const dx = ptB.x - ptA.x;
            const dy = ptB.y - ptA.y;
            const angle = Math.atan2(dy, dx);
            const dist = Math.hypot(dx, dy);

            // Arc displacement
            const bow = Math.sin(t * Math.PI) * (dist * 0.08);
            const perpX = -Math.sin(angle) * bow;
            const perpY = Math.cos(angle) * bow;

            const bx = rawX + perpX;
            const by = rawY + perpY;

            // Record boat wake trail
            boat.trail.push({ x: bx, y: by, alpha: 0.7 });
            if (boat.trail.length > 8) boat.trail.shift();

            // Draw boat wake
            ctx.save();
            boat.trail.forEach((trailPt, idx) => {
                trailPt.alpha *= 0.88;
                ctx.fillStyle = `rgba(168, 230, 207, ${trailPt.alpha * 0.3})`;
                ctx.beginPath();
                ctx.arc(trailPt.x, trailPt.y, 2 + (idx * 0.4), 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.restore();

            // Draw boat hull and sail
            ctx.save();
            ctx.translate(bx, by);
            ctx.rotate(angle);

            // Wooden Hull
            ctx.fillStyle = '#8b5a2b';
            ctx.beginPath();
            ctx.moveTo(8, 0);
            ctx.lineTo(-6, -4);
            ctx.lineTo(-8, 0);
            ctx.lineTo(-6, 4);
            ctx.closePath();
            ctx.fill();

            // White triangular sail
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(3, 0);
            ctx.lineTo(-3, -7);
            ctx.lineTo(-1, 0);
            ctx.closePath();
            ctx.fill();

            // Mast
            ctx.strokeStyle = '#4a2c11';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, -7);
            ctx.stroke();

            ctx.restore();
        });
    }

    function drawIslands(time) {
        islandsData.forEach(island => {
            const pt = getIslandCenter(island);
            const rad = island.baseRadius;
            const isSelected = island.id === selectedVillageId;
            const isHovered = island.id === hoveredVillageId;

            ctx.save();
            ctx.translate(pt.x, pt.y);

            // 1. Shallow reef glow
            ctx.beginPath();
            const numPts = island.offsets.length;
            for (let i = 0; i <= numPts; i++) {
                const idx = i % numPts;
                const angle = (idx / numPts) * Math.PI * 2;
                const r = (rad + 18) * island.offsets[idx];
                const x = Math.cos(angle) * r;
                const y = Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fillStyle = 'rgba(78, 205, 196, 0.18)';
            ctx.fill();

            // 2. Sand Beach
            ctx.beginPath();
            for (let i = 0; i <= numPts; i++) {
                const idx = i % numPts;
                const angle = (idx / numPts) * Math.PI * 2;
                const r = (rad + 6) * island.offsets[idx];
                const x = Math.cos(angle) * r;
                const y = Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fillStyle = '#d4af72';
            ctx.fill();

            // 3. Lush Green Island Core
            ctx.beginPath();
            for (let i = 0; i <= numPts; i++) {
                const idx = i % numPts;
                const angle = (idx / numPts) * Math.PI * 2;
                const r = (rad - 8) * island.offsets[idx];
                const x = Math.cos(angle) * r;
                const y = Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fillStyle = '#2d6a4f';
            ctx.fill();

            // 4. Subtle grass highlight
            ctx.beginPath();
            for (let i = 0; i <= numPts; i++) {
                const idx = i % numPts;
                const angle = (idx / numPts) * Math.PI * 2;
                const r = (rad - 18) * island.offsets[idx];
                const x = Math.cos(angle) * r;
                const y = Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fillStyle = '#40916c';
            ctx.fill();

            // 5. Buildings visual icons on island
            const b = island.buildings;

            // House sprite
            if (b.house > 0) {
                const houseCount = Math.min(b.house, 4);
                for (let h = 0; h < houseCount; h++) {
                    const hx = -12 + (h % 2) * 22;
                    const hy = -10 + Math.floor(h / 2) * 16;
                    // Cottage body
                    ctx.fillStyle = '#e8d8c8';
                    ctx.fillRect(hx - 5, hy - 4, 10, 8);
                    // Cottage roof
                    ctx.fillStyle = '#b23a22';
                    ctx.beginPath();
                    ctx.moveTo(hx - 7, hy - 4);
                    ctx.lineTo(hx, hy - 10);
                    ctx.lineTo(hx + 7, hy - 4);
                    ctx.closePath();
                    ctx.fill();
                }
            }

            // Dock pier on water edge
            if (b.dock > 0) {
                ctx.fillStyle = '#8b5a2b';
                ctx.fillRect(rad - 10, -4, 18, 8);
                // Pier posts
                ctx.fillStyle = '#4a2c11';
                ctx.fillRect(rad + 6, -6, 3, 12);
            }

            // Market stall
            if (b.market > 0) {
                // Striped awning
                ctx.fillStyle = '#ffb703';
                ctx.fillRect(-6, 12, 12, 6);
                ctx.fillStyle = '#023047';
                ctx.fillRect(-2, 12, 4, 6);
            }

            // Sea Temple
            if (b.temple > 0) {
                ctx.fillStyle = '#f1faee';
                ctx.fillRect(-8, -24, 16, 4);
                ctx.fillRect(-6, -20, 3, 7);
                ctx.fillRect(3, -20, 3, 7);
                ctx.fillRect(-10, -13, 20, 3);
            }

            // Lighthouse
            if (b.lighthouse > 0) {
                const lx = -rad + 12;
                const ly = -10;
                // Tower
                ctx.fillStyle = '#e63946';
                ctx.fillRect(lx - 4, ly - 16, 8, 16);
                ctx.fillStyle = '#f1faee';
                ctx.fillRect(lx - 4, ly - 10, 8, 4);
                // Beacon top
                ctx.fillStyle = '#ffd700';
                ctx.beginPath();
                ctx.arc(lx, ly - 18, 3.5, 0, Math.PI * 2);
                ctx.fill();

                // Rotating light beam
                const beamAngle = time * 1.8 + island.id;
                ctx.save();
                ctx.translate(lx, ly - 18);
                ctx.rotate(beamAngle);
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(80, -25);
                ctx.lineTo(80, 25);
                ctx.closePath();
                const beamGrad = ctx.createRadialGradient(0, 0, 5, 40, 0, 80);
                beamGrad.addColorStop(0, 'rgba(255, 235, 100, 0.45)');
                beamGrad.addColorStop(1, 'rgba(255, 235, 100, 0)');
                ctx.fillStyle = beamGrad;
                ctx.fill();
                ctx.restore();
            }

            // 6. Selection Ring
            if (isSelected) {
                ctx.strokeStyle = '#4ecdc4';
                ctx.lineWidth = 3;
                ctx.setLineDash([8, 6]);
                ctx.lineDashOffset = -time * 20;
                ctx.beginPath();
                ctx.arc(0, 0, rad + 14, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);

                // Pulsing compass ticks
                for (let k = 0; k < 4; k++) {
                    const tickAngle = (k * Math.PI) / 2;
                    const tx = Math.cos(tickAngle) * (rad + 14);
                    const ty = Math.sin(tickAngle) * (rad + 14);
                    ctx.fillStyle = '#7ee8fa';
                    ctx.beginPath();
                    ctx.arc(tx, ty, 3.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else if (isHovered) {
                ctx.strokeStyle = 'rgba(78, 205, 196, 0.6)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, 0, rad + 10, 0, Math.PI * 2);
                ctx.stroke();
            }

            ctx.restore();

            // 7. Island Nameplate Banner (Drawn in screen space)
            ctx.save();
            const tagY = pt.y + rad + 20;
            const nameText = `${island.name} 👥${island.population}`;
            ctx.font = '600 12px "Segoe UI", system-ui, sans-serif';
            const metrics = ctx.measureText(nameText);
            const tagWidth = metrics.width + 16;
            const tagHeight = 22;

            ctx.fillStyle = isSelected ? 'rgba(78, 205, 196, 0.95)' : 'rgba(10, 26, 42, 0.85)';
            ctx.strokeStyle = 'rgba(78, 205, 196, 0.4)';
            ctx.lineWidth = 1;

            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(pt.x - tagWidth / 2, tagY - tagHeight / 2, tagWidth, tagHeight, 11);
            } else {
                ctx.rect(pt.x - tagWidth / 2, tagY - tagHeight / 2, tagWidth, tagHeight);
            }
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = isSelected ? '#0a1a2a' : '#e8f4f8';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(nameText, pt.x, tagY);
            ctx.restore();
        });
    }

    function drawRipples(dt) {
        for (let i = ripples.length - 1; i >= 0; i--) {
            const r = ripples[i];
            r.r += 25 * dt;
            r.alpha -= 0.6 * dt;
            if (r.alpha <= 0 || r.r >= r.maxR) {
                ripples.splice(i, 1);
                continue;
            }
            ctx.save();
            ctx.strokeStyle = `rgba(168, 230, 207, ${r.alpha})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }

    function drawParticles(dt) {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= 0.65 * dt;

            if (p.alpha <= 0) {
                particles.splice(i, 1);
                continue;
            }

            ctx.save();
            if (p.text) {
                ctx.font = 'bold 13px "Segoe UI", system-ui, sans-serif';
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.alpha;
                ctx.textAlign = 'center';
                ctx.fillText(p.text, p.x, p.y);
            } else {
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.alpha;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
    }

    function drawSeagulls(dt, time) {
        const w = window.innerWidth;
        const h = window.innerHeight;

        seagulls.forEach(gull => {
            gull.x += gull.vx * 35 * dt;
            gull.y += gull.vy * 35 * dt;
            gull.flap += dt * 6;

            if (gull.x < -30) gull.x = w + 30;
            if (gull.x > w + 30) gull.x = -30;
            if (gull.y < -30) gull.y = h + 30;
            if (gull.y > h + 30) gull.y = -30;

            const wingSpan = 8;
            const wingY = Math.sin(gull.flap) * 4;

            ctx.save();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(gull.x - wingSpan, gull.y - wingY);
            ctx.quadraticCurveTo(gull.x - wingSpan / 2, gull.y + 1, gull.x, gull.y);
            ctx.quadraticCurveTo(gull.x + wingSpan / 2, gull.y + 1, gull.x + wingSpan, gull.y - wingY);
            ctx.stroke();
            ctx.restore();
        });
    }

    // Main Game Loop
    function gameLoop(currentTime) {
        const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
        lastTime = currentTime;
        waveTime += dt;
        simTimer += dt;

        // Run economy tick once every 1 second
        if (simTimer >= 1.0) {
            runSimulationStep();
            simTimer -= 1.0;
        }

        // Render scene
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

        drawOcean(waveTime);
        drawRoutes(waveTime);
        drawBoats(dt);
        drawIslands(waveTime);
        drawRipples(dt);
        drawParticles(dt);
        drawSeagulls(dt, waveTime);

        requestAnimationFrame(gameLoop);
    }

    // Initial greeting
    updateResourceDisplay();
    logMessage('Welcome to Nautical Village Network!', 'info');
    logMessage('Select an island to construct docks, houses, and trade routes.', 'info');

    // Auto-select first island so the player immediately understands the interface
    selectVillage(0);

    requestAnimationFrame(gameLoop);
})();
