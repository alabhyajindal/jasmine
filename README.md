# Jasmine

Jasmine is a statically-typed programming language that supports two backends for code generation, [Binaryen](https://github.com/WebAssembly/binaryen) and [QBE](https://c9x.me/compile/). Here's what it looks like!

```
fn fib(n: int) -> int {
    if n <= 0 {
        return 0;
    } else if n == 1 {
        return 1;
    } 

    let a: int = 0;
    let b: int = 1;

    for i in 1..n {
        let temp: int = a;
        a = b;
        b = temp + b;
    }
    
    return b;
}

println(fib(10));
```

## Prerequisites

1. [Bun](https://bun.com/)
2. [Wasmtime](https://wasmtime.dev/)
3. QBE


## Setup

Jasmine uses Bun to compile TypeScript. Bun by itself does not provide type checking. You would need an [editor](https://github.com/microsoft/Typescript/wiki/TypeScript-Editor-Support) that supports TypeScript to get around this.

```shell
git clone git@github.com:alabhyajindal/jasmine.git
cd jasmine
bun install
```
