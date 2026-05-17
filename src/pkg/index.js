const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const NUX_MODULES_DIR = 'nux_modules';

const DEFAULT_REGISTRY = 'https://raw.githubusercontent.com/Sldark23/nux-pacotes/master';
const REGISTRY_API = 'https://api.github.com/repos/Sldark23/nux-pacotes';

const PACKAGE_CACHE = new Map();

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    const srcPath = path.join(src, entry);
    const destPath = path.join(dest, entry);
    if (fs.statSync(srcPath).isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function httpGet(url, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

const npmToNux = new Map([
  ['lodash', { name: 'lodash-nux', description: 'Lodash utilities for nuxScript', version: '1.0.0' }],
  ['express', { name: 'express-nux', description: 'Web framework for nuxScript', version: '0.5.0' }],
  ['axios', { name: 'axios-nux', description: 'HTTP client for nuxScript', version: '0.8.0' }],
  ['moment', { name: 'moment-nux', description: 'Date library for nuxScript', version: '1.2.0' }],
  ['react', { name: 'react-nux', description: 'UI library for nuxScript', version: '0.1.0' }],
  ['vue', { name: 'vue-nux', description: 'Reactive UI framework for nuxScript', version: '0.1.0' }],
]);

// Registry package cache
const registryPackages = null; // Lazy-loaded

function resolveProjectRoot(startDir) {
  let dir = startDir || process.cwd();
  while (true) {
    if (fs.existsSync(path.join(dir, 'nuxpackage.json'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function readManifest(dir) {
  const p = path.join(dir, 'nuxpackage.json');
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch { return null; }
}

function writeManifest(dir, manifest) {
  fs.writeFileSync(path.join(dir, 'nuxpackage.json'), JSON.stringify(manifest, null, 2));
}

function ensureModulesDir(projectRoot) {
  const d = path.join(projectRoot, NUX_MODULES_DIR);
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  return d;
}

function parseVersionConstraint(constraint) {
  if (!constraint || constraint === '*') return { type: 'any', value: null };
  if (constraint.startsWith('^')) return { type: 'caret', value: constraint.slice(1) };
  if (constraint.startsWith('~')) return { type: 'tilde', value: constraint.slice(1) };
  if (constraint.startsWith('>=')) return { type: 'gte', value: constraint.slice(2) };
  if (constraint.startsWith('<=')) return { type: 'lte', value: constraint.slice(2) };
  if (constraint.startsWith('>')) return { type: 'gt', value: constraint.slice(1) };
  if (constraint.startsWith('<')) return { type: 'lt', value: constraint.slice(1) };
  return { type: 'exact', value: constraint };
}

function satisfiesVersion(version, constraint) {
  const v = version.split('.').map(Number);
  const c = (constraint.value || version).split('.').map(Number);
  switch (constraint.type) {
    case 'any': return true;
    case 'exact': return version === constraint.value;
    case 'caret': {
      if (c[0] === 0 && c[1] === 0) return version === constraint.value;
      if (c[0] === 0) return v[0] === 0 && v[1] === c[1];
      return v[0] === c[0] && v[1] >= c[1];
    }
    case 'tilde': return v[0] === c[0] && v[1] === c[1] && v[2] >= c[2];
    case 'gte': return compareVersions(version, constraint.value) >= 0;
    case 'lte': return compareVersions(version, constraint.value) <= 0;
    case 'gt': return compareVersions(version, constraint.value) > 0;
    case 'lt': return compareVersions(version, constraint.value) < 0;
    default: return false;
  }
}

function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
}

function searchRegistry(packageName) {
  return npmToNux.get(packageName) || null;
}

function fetchRegistryIndex() {
  return new Promise((resolve, reject) => {
    const url = `${DEFAULT_REGISTRY}/api-packages.json`;
    https.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', reject);
  });
}

function fetchPackageManifest(namespace, name) {
  return new Promise((resolve, reject) => {
    const url = `${DEFAULT_REGISTRY}/packages/${namespace}/${name}/nuxpackage.json`;
    https.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', reject);
  });
}

function fetchPackageFile(namespace, name, filename) {
  return new Promise((resolve, reject) => {
    const url = `${DEFAULT_REGISTRY}/packages/${namespace}/${name}/${filename}`;
    https.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function installPackageFromRegistry(projectRoot, namespace, packageName, version) {
  return new Promise(async (resolve, reject) => {
    try {
      const manifest = readManifest(projectRoot);
      if (!manifest) {
        resolve({ success: false, message: 'No nuxpackage.json found. Run nux init first.' });
        return;
      }

      const modulesDir = ensureModulesDir(projectRoot);
      const fullName = `${namespace}::${packageName}`;
      const installedDir = path.join(modulesDir, fullName);

      if (fs.existsSync(installedDir)) {
        resolve({ success: false, message: `Package ${fullName} is already installed` });
        return;
      }

      // Fetch package manifest from registry
      const pkgManifest = await fetchPackageManifest(namespace, packageName);
      if (!pkgManifest) {
        resolve({ success: false, message: `Package ${fullName} not found in registry` });
        return;
      }

      fs.mkdirSync(installedDir, { recursive: true });

      // Download main.nux
      const mainContent = await fetchPackageFile(namespace, packageName, pkgManifest.main || 'main.nux');
      if (mainContent) {
        fs.writeFileSync(path.join(installedDir, pkgManifest.main || 'main.nux'), mainContent);
      }

      // Save manifest
      pkgManifest.installedAt = new Date().toISOString();
      fs.writeFileSync(path.join(installedDir, 'nuxpackage.json'), JSON.stringify(pkgManifest, null, 2));

      // Update project manifest
      manifest.dependencies = manifest.dependencies || {};
      manifest.dependencies[fullName] = `^${pkgManifest.version}`;
      writeManifest(projectRoot, manifest);

      resolve({
        success: true,
        message: `Installed ${fullName}@${pkgManifest.version} from registry`,
        package: { name: fullName, version: pkgManifest.version }
      });
    } catch (e) {
      resolve({ success: false, message: `Failed to install from registry: ${e.message}` });
    }
  });
}

function searchRegistryPackages(query) {
  return new Promise(async (resolve) => {
    try {
      const index = await fetchRegistryIndex();
      if (index && index.packages) {
        const results = index.packages.filter(p =>
          p.name.includes(query) || p.description.includes(query)
        );
        resolve(results);
      } else {
        resolve([]);
      }
    } catch (e) {
      resolve([]);
    }
  });
}

function fetchPackageInfo(name, version) {
  const local = searchRegistry(name);
  if (local) {
    return {
      name,
      resolvedName: local.name,
      version: version || local.version,
      description: local.description,
      source: 'registry'
    };
  }

  // Check API-based registry if available
  if (PACKAGE_CACHE.has(name)) {
    const cached = PACKAGE_CACHE.get(name);
    return {
      name,
      resolvedName: cached.name || name,
      version: version || cached.version || '1.0.0',
      description: cached.description || `Package ${name}`,
      source: 'cache'
    };
  }

  return {
    name,
    resolvedName: name,
    version: version || '1.0.0',
    description: `Package ${name}`,
    source: 'remote'
  };
}

async function searchRemoteRegistry(query) {
  try {
    const url = `${DEFAULT_REGISTRY}/api/search?q=${encodeURIComponent(query)}`;
    const results = await httpGet(url);
    if (Array.isArray(results)) {
      for (const pkg of results) {
        PACKAGE_CACHE.set(pkg.name, pkg);
      }
      return results;
    }
  } catch (e) {
    // Fallback to local search
  }
  return null;
}

function generatePackageCode(name, version) {
  const baseName = path.basename(name);
  const safeName = baseName.replace(/[^a-zA-Z0-9_]/g, '_');
  return `# ${baseName} v${version}
# Package for nuxScript
# Add your functions below and export them

fn ${safeName}_version() -> String
  "${version}"
end

export ${safeName}_version
`;
}

function generatePackageTemplate(packageName, description) {
  const baseName = path.basename(packageName);
  const safeName = baseName.replace(/[^a-zA-Z0-9_]/g, '_');
  return `# ${baseName}
# ${description || 'A nuxScript package'}

# --- Public API ---

fn ${safeName}_hello(name) -> String
  "Hello, " + name + "! Welcome to ${baseName}."
end

fn ${safeName}_add(a, b)
  a + b
end

# Export the functions you want to expose
export ${safeName}_hello
export ${safeName}_add
`;
}

function isLocalPackagePath(name) {
  if (fs.existsSync(name)) {
    const stat = fs.statSync(name);
    if (stat.isDirectory()) return true;
    if (stat.isFile() && name.endsWith('.nux')) return true;
  }
  if (name.startsWith('./') || name.startsWith('../') || name.startsWith('/')) return true;
  return false;
}

function installPackage(projectRoot, packageName, version) {
  const manifest = readManifest(projectRoot);
  if (!manifest) {
    return { success: false, message: 'No nuxpackage.json found. Run nux init first.' };
  }

  const modulesDir = ensureModulesDir(projectRoot);
  const installedDir = path.join(modulesDir, packageName);

  if (fs.existsSync(installedDir)) {
    return { success: false, message: `Package ${packageName} is already installed` };
  }

  if (isLocalPackagePath(packageName)) {
    const sourcePath = path.resolve(projectRoot, packageName);
    if (!fs.existsSync(sourcePath)) {
      return { success: false, message: `Package path not found: ${sourcePath}` };
    }

    const localName = path.basename(sourcePath, '.nux').replace(/[^a-zA-Z0-9_\-]/g, '_');
    const localInstalledDir = path.join(modulesDir, localName);

    if (fs.existsSync(localInstalledDir)) {
      return { success: false, message: `Package ${localName} is already installed` };
    }

    const stat = fs.statSync(sourcePath);
    if (stat.isDirectory()) {
      copyDirSync(sourcePath, localInstalledDir);
    } else if (stat.isFile() && sourcePath.endsWith('.nux')) {
      const pkgDir = path.dirname(sourcePath);
      if (fs.existsSync(path.join(pkgDir, 'nuxpackage.json'))) {
        copyDirSync(pkgDir, localInstalledDir);
      } else {
        fs.mkdirSync(localInstalledDir, { recursive: true });
        fs.copyFileSync(sourcePath, path.join(localInstalledDir, 'main.nux'));
        const pkgManifest = {
          name: localName,
          version: '0.1.0',
          main: 'main.nux',
          installedAt: new Date().toISOString()
        };
        fs.writeFileSync(path.join(localInstalledDir, 'nuxpackage.json'), JSON.stringify(pkgManifest, null, 2));
      }
    }

    const installedManifest = readManifest(localInstalledDir);
    const installedVersion = installedManifest ? installedManifest.version : '0.1.0';
    manifest.dependencies = manifest.dependencies || {};
    manifest.dependencies[localName] = `^${installedVersion}`;
    writeManifest(projectRoot, manifest);

    return {
      success: true,
      message: `Installed ${localName}@${installedVersion} (from local path)`,
      package: { name: localName, version: installedVersion }
    };
  }

  const info = fetchPackageInfo(packageName, version);
  const targetVersion = version || info.version;

  fs.mkdirSync(installedDir, { recursive: true });

  const mainContent = generatePackageCode(info.resolvedName || packageName, targetVersion);
  fs.writeFileSync(path.join(installedDir, 'main.nux'), mainContent);

  const pkgManifest = {
    name: packageName,
    version: targetVersion,
    main: 'main.nux',
    description: info.description,
    installedAt: new Date().toISOString()
  };
  fs.writeFileSync(path.join(installedDir, 'nuxpackage.json'), JSON.stringify(pkgManifest, null, 2));

  manifest.dependencies = manifest.dependencies || {};
  manifest.dependencies[packageName] = `^${targetVersion}`;
  writeManifest(projectRoot, manifest);

  return {
    success: true,
    message: `Installed ${packageName}@${targetVersion}`,
    package: { name: packageName, version: targetVersion }
  };
}

function removePackage(projectRoot, packageName) {
  const manifest = readManifest(projectRoot);
  if (!manifest) {
    return { success: false, message: 'No nuxpackage.json found' };
  }

  const modulesDir = path.join(projectRoot, NUX_MODULES_DIR);
  const installedDir = path.join(modulesDir, packageName);

  if (!fs.existsSync(installedDir)) {
    return { success: false, message: `Package ${packageName} is not installed` };
  }

  fs.rmSync(installedDir, { recursive: true, force: true });

  if (manifest.dependencies) {
    delete manifest.dependencies[packageName];
  }
  writeManifest(projectRoot, manifest);

  return { success: true, message: `Removed ${packageName}` };
}

function listPackages(projectRoot) {
  const modulesDir = path.join(projectRoot, NUX_MODULES_DIR);
  if (!fs.existsSync(modulesDir)) return [];

  const packages = [];
  for (const entry of fs.readdirSync(modulesDir)) {
    const pkgPath = path.join(modulesDir, entry);
    if (fs.statSync(pkgPath).isDirectory()) {
      const pkgManifest = path.join(pkgPath, 'nuxpackage.json');
      if (fs.existsSync(pkgManifest)) {
        try {
          packages.push(JSON.parse(fs.readFileSync(pkgManifest, 'utf-8')));
        } catch { packages.push({ name: entry, version: 'unknown' }); }
      } else {
        packages.push({ name: entry, version: 'unknown' });
      }
    }
  }
  return packages;
}

function updatePackages(projectRoot) {
  const manifest = readManifest(projectRoot);
  if (!manifest || !manifest.dependencies) {
    return { success: false, message: 'No dependencies to update' };
  }

  const results = [];
  for (const [name, constraint] of Object.entries(manifest.dependencies)) {
    const modulesDir = path.join(projectRoot, NUX_MODULES_DIR);
    const installedDir = path.join(modulesDir, name);
    if (!fs.existsSync(installedDir)) continue;

    const installedPkg = path.join(installedDir, 'nuxpackage.json');
    if (!fs.existsSync(installedPkg)) continue;
    const current = JSON.parse(fs.readFileSync(installedPkg, 'utf-8'));

    const info = fetchPackageInfo(name, null);
    if (info.version !== current.version) {
      fs.rmSync(installedDir, { recursive: true, force: true });
      fs.mkdirSync(installedDir, { recursive: true });
      fs.writeFileSync(path.join(installedDir, 'main.nux'), generatePackageCode(name, info.version));
      current.version = info.version;
      current.installedAt = new Date().toISOString();
      fs.writeFileSync(installedPkg, JSON.stringify(current, null, 2));
      results.push({ name, from: current.version, to: info.version });
    }
  }

  return {
    success: true,
    updated: results,
    message: results.length > 0 ? `Updated ${results.length} packages` : 'All packages up to date'
  };
}

function searchPackagesSync(query) {
  const results = [];
  for (const [name, info] of npmToNux) {
    if (name.includes(query) || info.name.includes(query) || info.description.includes(query)) {
      results.push({ name, resolvedName: info.name, version: info.version, description: info.description });
    }
  }
  return results;
}

function searchPackages(query) {
  const results = searchPackagesSync(query);
  return results;
}

async function searchPackagesAsync(query) {
  const results = searchPackagesSync(query);
  try {
    const remote = await searchRemoteRegistry(query);
    if (remote) {
      for (const pkg of remote) {
        if (!results.find(r => r.name === pkg.name)) {
          results.push(pkg);
        }
      }
    }
  } catch (e) {}
  try {
    const registryPkgs = await searchRegistryPackages(query);
    for (const pkg of registryPkgs) {
      if (!results.find(r => r.name === pkg.name)) {
        results.push({ name: pkg.name, resolvedName: pkg.name, version: pkg.version, description: pkg.description });
      }
    }
  } catch (e) {}
  return results;
}

function getPackageInfo(projectRoot, packageName) {
  const modulesDir = path.join(projectRoot, NUX_MODULES_DIR);
  const pkgPath = path.join(modulesDir, packageName, 'nuxpackage.json');
  if (fs.existsSync(pkgPath)) {
    return JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  }
  return null;
}

function resolveModulePath(projectRoot, moduleName) {
  const direct = path.join(projectRoot, NUX_MODULES_DIR, moduleName, 'main.nux');
  if (fs.existsSync(direct)) return direct;

  const index = path.join(projectRoot, NUX_MODULES_DIR, moduleName, 'index.nux');
  if (fs.existsSync(index)) return index;

  const relative = path.resolve(projectRoot, moduleName);
  if (fs.existsSync(relative)) return relative;

  return null;
}

module.exports = {
  installPackage,
  installPackageFromRegistry,
  removePackage,
  listPackages,
  updatePackages,
  searchPackages,
  searchPackagesAsync,
  getPackageInfo,
  resolveModulePath,
  readManifest,
  writeManifest,
  resolveProjectRoot,
  generatePackageCode,
  generatePackageTemplate,
  fetchRegistryIndex,
  fetchPackageManifest,
  DEFAULT_REGISTRY,
  REGISTRY_API
};
