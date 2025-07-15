(module
 (type $0 (func (param i32 i32 i32 i32) (result i32)))
 (type $1 (func))
 (import "wasi_snapshot_preview1" "fd_write" (func $write (param i32 i32 i32 i32) (result i32)))
 (memory $0 1 2)
 (export "memory" (memory $0))
 (export "_start" (func $_start))

(func $int_to_ascii (param i32) (result i32)
    (i32.add (i32.const 48) local.get 0)
)

 (func $_start
  (block
   (i32.store8
    (i32.const 66)
(    call $int_to_ascii 
    (i32.add (i32.const 1) (i32.const 5)
    ))
    ;; (i32.add (i32.const 32) (i32.const 1))
   )
   (i32.store
    (i32.const 0)
    (i32.const 66)
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
  )
 )
)
