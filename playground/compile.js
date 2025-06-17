let wasmBinary = Bun.file('a.wasm');
wasmBinary = await wasmBinary.arrayBuffer();

// Define the imports that WebAssembly expects
const imports = {
  console: {
    log: (value) => {
      console.log(`${value}`);
    },
  },
};

// Example usage with the WebAssembly API
const compiled = new WebAssembly.Module(wasmBinary);
const instance = new WebAssembly.Instance(compiled, imports);

console.log(instance.exports.main());
