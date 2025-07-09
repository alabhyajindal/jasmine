(module
 (type $0 (func (param i32 i32 i32 i32) (result i32)))
 (type $1 (func))
 (import "wasi_snapshot_preview1" "fd_write" (func $fd_write (param i32 i32 i32 i32) (result i32)))
 (memory $0 1 1)
 (export "memory" (memory $0))
 (export "main" (func $main))
 (func $main
  (drop
   (i32.add
    (i32.const 5)
    (i32.const 2)
   )
  )
 )
)
