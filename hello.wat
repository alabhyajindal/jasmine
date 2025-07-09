(module
  (type $write_type (func (param i32 i32 i32 i32) (result i32)))
  (import "wasi_snapshot_preview1" "fd_write" (func $fd_write (type $write_type)))
  (memory (export "memory") 1)

  ;; Write "Hello, World!\n"
  (data (i32.const 8) "Hello, World!\n")

  ;; Prepare the iovec struct at offset 0
  ;; iovec = { ptr: i32, len: i32 }

  (func $_start (export "_start")
    ;; Store ptr (8) at offset 0
    i32.const 0
    i32.const 8
    i32.store

    ;; Store len (14) at offset 4
    i32.const 4
    i32.const 14
    i32.store

    ;; Parameters for fd_write:
    i32.const 1      ;; fd = stdout
    i32.const 0      ;; iovs = offset to our iovec struct
    i32.const 1      ;; iovs_len = 1
    i32.const 20     ;; where to store number of bytes written

    call $fd_write
    drop
  )
)
