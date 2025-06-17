;; fun add(a, b) {
;;   return a + b
;; }

;; let second_number = 1
;; add(41, second_number)

;; all the above code is in the top level - add is a function so we transform that into a function in wat. the two lines where we declare second_number and call add are top level so they go inside main. this whole sequence evaluates the result returned by the add function since that is the last line of the file. the way this is represented in wat is that we return the value of the add function - this is fine! calling return inside main in wat is different from calling return in the source language in the top level. in the source language calling return in the top level is a syntax error. whereas in the latter, having the main function have a result type means that is the value of the final expression in the file.


(module
  ;; Function: add(a, b) -> a + b
  (func $add (param $a i32) (param $b i32) (result i32)
    local.get $a
    local.get $b
    i32.add
  )

  ;; Main function that executes the script
  (func $main (result i32)
    (local $second_number i32)
    (local $result i32)

    ;; let second_number = 1
    i32.const 22
    local.set $second_number

    ;; add(41, second_number)
    i32.const 20
    local.get $second_number
    call $add
  )

  ;; Export the main function so it can be called form JavaScript
  (export "main" (func $main))
)