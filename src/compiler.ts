import type { Stmt } from './Stmt'

let functionDeclarations = ``
let main = ``

let program = `#include <stdio.h>

int main() {

  return 0;
}`

export default function compile(statements: Stmt[]) {
  console.log(statements)

  return program
}
