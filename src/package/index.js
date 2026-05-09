/**
 * nuxScript Package Loader (Package Manager)
 * Provides package installation, listing, and removal capabilities.
 * Simulates downloading packages from a registry.
 */

// Mock package registry (in real implementation, this would be fetched from npm or similar)
const packageRegistry = new Map([
  ['lodash', { name: 'lodash', versions: ['4.17.21', '4.17.20'], description: 'A modern JavaScript utility library delivering modularity, performance, & extras.' }],
  ['express', { name: 'express', versions: ['4.18.2', '4.18.1'], description: 'Fast, unopinionated, minimalist web framework for Node.js.' }],
  ['axios', { name: 'axios', versions: ['1.4.0', '1.3.5'], description: 'Promise based HTTP client for the browser and node.js.' }],
  ['moment', { name: 'moment', versions: ['2.29.4', '2.29.3'], description: 'Parse, validate, manipulate, and display dates in JavaScript.' }]
]);

// Mock package files content (simulating downloaded package content)
const packageFiles = new Map([
  ['lodash', '// Lodash package (simulated)\\n// A modern JavaScript utility library delivering modularity, performance, & extras.'],
  ['express', '// Express package (simulated)\\n// Fast, unopinionated, minimalist web framework for Node.js.'],
  ['axios', '// Axios package (simulated)\\n// Promise based HTTP client for the browser and node.js.'],
  ['moment', '// Moment package (simulated)\\n// Parse, validate, manipulate, and display dates in JavaScript.']
]);

// Installed packages storage
const installedPackages = new Map();

/**
 * Install a package (simulates downloading from registry)
 * @param {string} name - Package name
 * @param {string} version - Version specifier (optional, defaults to "latest")
 * @returns {Object} Installation result
 */
function install(name, version = "latest") {
  if (installedPackages.has(name)) {
    return { success: false, message: `Package ${name} is already installed` };
  }
  
  // Check if package exists in registry
  const pkgInfo = packageRegistry.get(name);
  if (!pkgInfo) {
    // Try to fetch from remote registry (simulated)
    return fetchFromRemoteRegistry(name, version);
  }
  
  // Determine version to install
  let targetVersion = version;
  if (version === "latest" || !pkgInfo.versions.includes(version)) {
    targetVersion = pkgInfo.versions[pkgInfo.versions.length - 1]; // Latest version
  }
  
  // Simulate downloading and installing
  try {
    // In a real implementation, this would download and extract the package
    // For simulation, we'll just store the package info
    installedPackages.set(name, { 
      name, 
      version: targetVersion, 
      installedAt: Date.now(),
      files: packageFiles.get(name) || `// Package ${name} v${targetVersion}\n// Downloaded from registry\n`,
      registryInfo: pkgInfo
    });
    
    return { 
      success: true, 
      message: `Installed ${name}@${targetVersion}`,
      package: { name, version: targetVersion }
    };
  } catch (error) {
    return { 
      success: false, 
      message: `Failed to install ${name}: ${error.message}` 
    };
  }
}

/**
 * Fetch package from remote registry (simulated network operation)
 * @param {string} name - Package name
 * @param {string} version - Version specifier
 * @returns {Object} Installation result
 */
function fetchFromRemoteRegistry(name, version) {
  // Simulate network delay (synchronously for simplicity)
  
  // Simulate sometimes package not found
  if (Math.random() > 0.7) { // 30% chance of not found
    return { 
      success: false, 
      message: `Package ${name} not found in registry` 
    };
  }
  
  // Simulate fetching package info
  const mockPkgInfo = {
    name,
    versions: ["1.0.0", "0.9.0"],
    description: `Package ${name} fetched from remote registry`
  };
  
  const mockFiles = `// ${name} v1.0.0\n// Fetched from remote registry\n\nexport function main() {\n  return "Hello from ${name}";\n}`;
  
  const targetVersion = version === "latest" ? "1.0.0" : version;
  
  installedPackages.set(name, { 
    name, 
    version: targetVersion, 
    installedAt: Date.now(),
    files: mockFiles,
    registryInfo: mockPkgInfo
  });
  
  return { 
    success: true, 
    message: `Installed ${name}@${targetVersion} (from remote registry)`,
    package: { name, version: targetVersion }
  };
}

/**
 * List installed packages
 * @returns {Array} List of installed packages
 */
function list() {
  return Array.from(installedPackages.values());
}

/**
 * Remove a package
 * @param {string} name - Package name to remove
 * @returns {Object} Removal result
 */
function remove(name) {
  if (!installedPackages.has(name)) {
    return { success: false, message: `Package ${name} is not installed` };
  }
  
  installedPackages.delete(name);
  return { success: true, message: `Removed ${name}` };
}

module.exports = { install, list, remove };