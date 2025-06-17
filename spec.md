# Variable declaration
let name: string	= "Alice" # this is a comment!
let age: int    	= 30
const PI: float 	= 3.14159

# Reserved keywords
let const and not if else while for return break fn

# Arithmetic operators
let sum: int    	= a + b
let diff: int   	= a - b
let product: int	= a * b
let quotient: int   = a / b
let remainder: int  = a % b

# Comparison operators
let equal: bool     	= a == b
let not_equal: bool 	= a != b
let greater: bool   	= a > b
let less: bool      	= a < b
let greater_equal: bool = a >= b
let less_equal: bool	= a <= b

# Logical operators
let and_result: bool	= a and b
let or_result: bool 	= a or b
let not_result: bool	= !a

# Types
let i: int  	= 42
let l: long 	= 9876543210
let f: float	= 3.14
let d: double   = 3.14159265359
let b: bool 	= true
let s: string   = "hello world"
let n: nil  	= nil

# If
if (x > 5) {
  print("Greater than 5")
} else if (x == 5) {
  print("Equal to 5")
} else {
  print("Less than 5")
}

# While loop
while (count > 0) {
  print(count)
  count = count - 1
}

# For loop
for (let i: int = 0; i < 5; i = i + 1) {
  print(i)
}

# Functions
fn add(a: int, b: int): int {
  return a + b
}