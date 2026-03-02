# ---
description: How to build and package the Hatai extension
---

### Prerequisites
- Ensure you have **Node.js** and **npm** installed.
- Ensure you have the `vsce` (VS Code Extension Manager) tool available.

### Steps
1. Open your terminal in the project root directory.
2. Run `npm install` to install all necessary dependencies.
// turbo
3. Run `npm run compile` to build the TypeScript source code into the `out` folder.
4. Run `npx vsce package` to generate the [.vsix](cci:7://file:///f:/Project/Extension/IDE/Hatai/Hatai-1.0.0.vsix:0:0-0:0) installer.
5. (Optional) To install it immediately, run:
   `code --install-extension Hatai-1.0.0.vsix`
