import scan from './scanner';
import parse from './parser';
import generate from './generator';

const args = Bun.argv;

if (args.length == 2) {
  const prompt = '> ';
  process.stdout.write(prompt);

  for await (const line of console) {
    if (line) {
      run(line);
      process.stdout.write(prompt);
    }
  }
} else if (args.length == 3) {
  const filePath = Bun.argv[2]!;
  const sourceFile = Bun.file(filePath);
  const fileExists = await sourceFile.exists();
  if (!fileExists) {
    console.error(`File not found: ${filePath}.`);
    process.exit();
  }
  const sourceText = await sourceFile.text();
  run(sourceText);
}

function run(source: string) {
  const tokens = scan(source);
  // console.log(tokens);
  // return;

  const ast = parse(tokens);
  console.log(ast);
  const wasmBinary = generate(ast);

  if (!wasmBinary) {
    throw Error('Failed to generate binary.');
  }

  // Example usage with the WebAssembly API
  const compiled = new WebAssembly.Module(wasmBinary);
  const instance = new WebAssembly.Instance(compiled, {});

  // @ts-expect-error: Exported functions are available under exports
  console.log(instance.exports.main());
}
