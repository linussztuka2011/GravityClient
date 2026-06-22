# GravityClient

An elegant, private Minecraft client launcher and companion client-core Fabric mod ecosystem. Built with Electron, React, TypeScript, Vite, and Java 21, GravityClient isolates standard optimizations and customized config presets in independent profile environments.

---

## 1. Quick Start & Execution

### Launcher (`/launcher`)

#### Requirements:
- **Node.js** (v18 or higher recommended)
- **npm** (comes bundled with Node.js)

#### 1. Install Dependencies:
```bash
cd launcher
npm install
```

#### 2. Run in Development Mode:
To test the React UI with hot-reloading inside Electron, use two terminal panes:
```bash
# Terminal 1: Starts Vite Dev Server
cd launcher
npm run dev

# Terminal 2: Launches Electron Window (opens instantly in developer mode)
cd launcher
npm run electron:dev
```

#### 3. Compile Production Bundle:
Builds optimized CSS assets and transpile TypeScript Main/Preload files:
```bash
cd launcher
npm run build
```

---

### Client-Core Mod (`/client-core`)

#### Requirements:
- **Java Development Kit (JDK) 21**
- **Gradle** (installed or resolved dynamically)

#### 1. Compile the Fabric Mod:
To compile classes and bundle the final `.jar` archive under `client-core/build/libs/`, run:
```bash
cd client-core
gradle build
```
*(Note: If you have the Gradle Wrapper configured on your host, you can also run `./gradlew build`).*

---

## 2. Testing the Synchronization Workflow

1. Open the Launcher in dev mode (`npm run dev` and `npm run electron:dev`).
2. Go to the **Profiles & Packs** page from the sidebar.
3. Click **+ NEW** in the top right of the profile list to create a profile (e.g., "Opti-Vanilla").
4. Toggle on/off optional mod groupings (e.g., enable **Performance Enhancements** and **HUD & Quality of Life**, disable **Minimap & Navigation**).
5. Click on a **Configuration Preset** target block (e.g., select **Maximum Performance**).
6. Click **Sync & Install**.
   - The launcher will transition you to the **Active Console** page.
   - It will stream real-time logs describing file cleansing, downloads of core mods (Fabric API, Cloth Config, ModMenu) and enabled optionals (Sodium, Lithium, AppleSkin, etc.).
   - It will install standard Fabric loader parameters and apply your selected config preset files under `config/`.
7. Click **Launch Client** (unlocked upon successful sync!).

---

## 3. Architecture & File Layout

```
/
├── launcher/               # Electron + React + TS Desktop App
│   ├── src/
│   │   ├── main/           # Main process services (Paths, Presets, Pack Installers)
│   │   ├── preload/        # Secure contextBridge API maps
│   │   └── renderer/       # Vite + React app UI components & stylesheets
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── client-core/            # Companion client-side Fabric mod (Java 21 Gradle)
│   ├── src/main/java/      # Init modules, synchronization config files, menu mixins
│   ├── src/main/resources/ # fabric.mod.json, mixin declarations
│   └── build.gradle
│
├── packs/                  # Standard modpack manifest and preset definitions
│   └── standard/
│       ├── pack.json       # Mod files, Modrinth project targets, and SHA-1 keys
│       └── presets/        # Balanced, Performance, and Visual config directories
│
└── docs/                   # Full Technical Architecture & Roadmap specifications
```

---

## 4. Completed Milestones & TODOs

### Completed Scope (MVP Foundation):
- **Milestone 1 (Docs)**: Detailed files written in `/docs` regarding legal rules, architectural IPC channels, and roadmaps.
- **Milestone 2 (Manifest)**: Created standard `packs/standard/pack.json` with required/optional groups mapping real Modrinth metadata.
- **Milestone 3 (Presets)**: Implemented Balanced, Performance, and Visual overlays with custom properties for Sodium and BetterF3.
- **Milestone 4 (Launcher)**: Formulated an Electron-React-TS frame-less dashboard with active progress bars and terminal logs.
- **Milestone 5 (Companion Mod)**: Fabric Java 21 initializers, right-shift GUI settings placeholder, and custom title screen branding mixins.

### Next Features (Roadmap Phase 2):
1. **Microsoft OAuth Integration**: Leverage standardized login libraries to retrieve safe session tokens.
2. **Java Process Spawner**: Dynamically generate JVM launch arguments and bootstrap native runtimes.
3. **Delta Sync Checks**: Auto-audit local SHA-1 hashes against Modrinth versions on startup to minimize bandwidth.
