(module
 (type $0 (func (param i32)))
 (type $1 (func (param i32 i32 i32 i32) (result i32)))
 (type $2 (func))
 (import "console" "i32" (func $print (param i32)))
 (import "wasi_snapshot_preview1" "fd_write" (func $fd_write (param i32 i32 i32 i32) (result i32)))
 (memory $0 1 1)
 (export "memory" (memory $0))
 (export "main" (func $main))
 (func $main
  (call $print
   (i32.const 5)
  )
 )
)
