;; if (true) {
;;   return 100
;; } else {
;;   return 0
;; }

;; for the sake of convinience - the top level code can return value. actually it must! because the above is a top level code in the source language, converting it to wat will mean organizing it inside the main function. and the main function will return a value. returning main inside wat is not the same as calling return on the top level of the source language

(module
  (func $main (result i32)

    i32.const 1
    (if (result i32)
      (then
        i32.const 100
      )
      (else
        i32.const 0
      )
    )
  )

  (export "main" (func $main))
)