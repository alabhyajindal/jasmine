# Sphere

Sphere is a statically-typed programming language that compiles to WebAssembly. It is implemented in TypeScript and utilizes [Binaryen](https://github.com/WebAssembly/binaryen) for code generation.

Here's what it looks like!

```
fn add(a: int, b: int): int {
    return a + b
}
```

## Goals

The project's goal is to get an understanding of the developer experience when targeting WebAssembly. It's part of my dissertation where I'm evaluating if WebAssembly is suitable as a general purpose compilation target.

## Setup

Sphere uses [Bun](https://bun.sh/) to compile TypeScript. Bun by itself does not provide type checking. You would need an [editor](https://github.com/microsoft/Typescript/wiki/TypeScript-Editor-Support) that supports TypeScript to get around this.

```shell
git clone git@github.com:alabhyajindal/sphere-ts.git
cd sphere-ts
bun src/main.ts
```

## Status

Sphere is under active development and is not a working compiler yet.