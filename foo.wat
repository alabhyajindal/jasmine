(module
 (import "wasi_snapshot_preview1" "fd_write" (func $write (param i32 i32 i32 i32) (result i32)))
 (memory $0 1 2)
 (export "memory" (memory $0))
(export "_start" (func $main))
(func $main

    (i32.store8 (i32.const 200) (i32.add (i32.const 40) (i32.const 2)))

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