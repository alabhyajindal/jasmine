(module
 (type $0 (func (param i32 i32 i32 i32) (result i32)))
 (type $1 (func))
 (import "wasi_snapshot_preview1" "fd_write" (func $fd_write (param i32 i32 i32 i32) (result i32)))
 (memory $0 1 1)
 (export "memory" (memory $0))
 (export "_start" (func $_start))
 (func $_start
  (drop
   (i32.const 5)
  )
 )
)
