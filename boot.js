/**
 * Custom Ghost boot — extends Ghost with Construct OAuth
 *
 * Sets up content directories (same as docker-entrypoint.sh),
 * then patches Ghost's Express app to add /auth/* routes.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Ensure content directories exist (entrypoint skips this for custom CMD)
const ghostInstall = process.env.GHOST_INSTALL || '/var/lib/ghost';
const ghostContent = process.env.GHOST_CONTENT || path.join(ghostInstall, 'content');
const origContent = path.join(ghostInstall, 'content.orig');

if (fs.existsSync(origContent)) {
  const entries = fs.readdirSync(origContent);
  for (const entry of entries) {
    const src = path.join(origContent, entry);
    const target = path.join(ghostContent, entry);
    if (!fs.existsSync(target)) {
      fs.mkdirSync(target, { recursive: true });
      try {
        execSync(`cp -r "${src}/." "${target}/"`, { stdio: 'ignore' });
      } catch {}
    }
  }
  // Also copy theme subdirs
  const themesOrig = path.join(origContent, 'themes');
  if (fs.existsSync(themesOrig)) {
    const themes = fs.readdirSync(themesOrig);
    for (const theme of themes) {
      const src = path.join(themesOrig, theme);
      const target = path.join(ghostContent, 'themes', theme);
      if (!fs.existsSync(target)) {
        fs.mkdirSync(target, { recursive: true });
        try {
          execSync(`cp -r "${src}/." "${target}/"`, { stdio: 'ignore' });
        } catch {}
      }
    }
  }
}

// Ensure data and logs dirs exist
fs.mkdirSync(path.join(ghostContent, 'data'), { recursive: true });
fs.mkdirSync(path.join(ghostContent, 'logs'), { recursive: true });

// Set working directory to Ghost install
process.chdir(ghostInstall);

// Load OAuth bridge
const oauth = require(path.join(ghostInstall, 'oauth'));

// Patch Ghost's app factory to mount OAuth routes
const appModulePath = require.resolve(path.join(ghostInstall, 'current/core/app'));
const origAppFactory = require(appModulePath);

require.cache[appModulePath] = {
  id: appModulePath,
  filename: appModulePath,
  loaded: true,
  exports: function () {
    const app = origAppFactory();

    // Mount OAuth routes
    oauth.mount(app);


    return app;
  }
};

// Boot Ghost
require(path.join(ghostInstall, 'current/ghost'));
