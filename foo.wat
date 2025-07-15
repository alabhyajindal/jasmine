(module
 (import "wasi_snapshot_preview1" "fd_write" (func $write (param i32 i32 i32 i32) (result i32)))
 (memory $0 1 2)
 (export "memory" (memory $0))
;;   (data $0 (i32.const 66) "ligma johnson\n")
(export "_start" (func $main))
(func $main
  ;; Write "hello\n" at memory offset 66
;;   (i32.store8 (i32.const 66) (i32.const 104)) ;; 'h'
;;   (i32.store8 (i32.const 67) (i32.const 101)) ;; 'e'
;;   (i32.store8 (i32.const 68) (i32.const 108)) ;; 'l'
;;   (i32.store8 (i32.const 69) (i32.const 108)) ;; 'l'
;;   (i32.store8 (i32.const 70) (i32.const 111)) ;; 'o'
;;   (i32.store8 (i32.const 71) (i32.const 10))  ;; '\n'


    (i32.store (i32.const 200) (i32.add (i32.const 40) (i32.const 2)))

  (i32.store
   (i32.const 0)
   (i32.const 200)
  )
  (i32.store
   (i32.const 4)
   (i32.const 50)
  )
  (drop
   (call $write
    (i32.const 1)
    (i32.const 0)
    (i32.const 1)
    (i32.const 92)
   )
  )

))