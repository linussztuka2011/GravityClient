# Legal and Packaging Notes

GravityClient is designed as a legitimate quality-of-life, performance, and customizable modpack launcher ecosystem. It is **not** a cheat client, and it does not facilitate hacks, exploits, or unfair advantages.

This document sets forth the legal, licensing, and packaging rules governing the development and distribution of the GravityClient launcher, presets, and companion client-core Fabric mod.

---

## 1. Mojang/Minecraft Intellectual Property Compliance

- **No Decompiled Code Redistribution**: Under no circumstances will decompiled, patched, or raw Mojang/Minecraft game binaries or source files be committed, bundled, or redistributed within this repository.
- **Runtime Assets**: The launcher must fetch game runtime assets, JARs, and official libraries directly from official Mojang manifest endpoints and servers.
- **Dynamic Loader Attaching**: Modding must rely purely on standard, runtime-driven modding loaders (such as Fabric Loader) and open APIs.

---

## 2. Third-Party Mod Packaging and Attribution

- **No Direct Bundling of Mod Jars**: Mod JAR files will not be checked into this repository or compiled directly into launcher distributions unless their licenses explicitly authorize redistribution.
- **Modrinth Integration**: All third-party mods are declared inside our JSON pack manifests (`pack.json`) using official Modrinth project IDs and specific version constraints. Mods are dynamically downloaded at runtime to the user's local directory.
- **Attribution and Licenses**: Every third-party mod declared in the manifest must include clear `license` (name and licensing URL) and `attribution` fields. This metadata should be displayed in the launcher UI to provide proper recognition to original developers.

---

## 3. Strict Authentication & Credential Security

- **No Password Storage**: Under no circumstances may Microsoft/Mojang account passwords be recorded, captured, or cached by the launcher.
- **OAuth Authentication**: User login must employ standard **Microsoft OAuth 2.0 and Device Authorization Flow** implementations, communicating directly with Microsoft's secure authentication endpoints.
- **Secure Token Storage**: Received session tokens (Refresh tokens, access tokens) must be stored in secure operating system credentials manager systems (such as Windows Credential Manager, macOS Keychain, or Linux Secret Service/Keyring APIs) via a well-maintained library (e.g., node-keytar). They must never be stored in plain text configuration files.
