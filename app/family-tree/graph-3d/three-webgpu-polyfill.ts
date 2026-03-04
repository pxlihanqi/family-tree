const globalScope = typeof globalThis !== "undefined" ? (globalThis as any) : undefined;

if (globalScope && !globalScope.GPUShaderStage) {
  globalScope.GPUShaderStage = { VERTEX: 1, FRAGMENT: 2, COMPUTE: 4 };
}
