(module
(type $0 (func (param i32 i32 i32 i32) (result i32)))
(type $1 (func))
(import "wasi_snapshot_preview1" "fd_write" (func $write (param i32 i32 i32 i32) (result i32)))
(memory $0 1 2)
(global $write_ptr (mut i32) (i32.const 72))
(export "memory" (memory $0))
(export "_start" (func $_start))
(func $_start

 
 ;; Add "hello" after init
 (i32.store8 (global.get $write_ptr) (i32.const 104)) ;; 'h'
 (i32.store8 (i32.add (global.get $write_ptr) (i32.const 1)) (i32.const 101)) ;; 'e'
 (i32.store8 (i32.add (global.get $write_ptr) (i32.const 2)) (i32.const 108)) ;; 'l'
 (i32.store8 (i32.add (global.get $write_ptr) (i32.const 3)) (i32.const 108)) ;; 'l'
 (i32.store8 (i32.add (global.get $write_ptr) (i32.const 4)) (i32.const 111)) ;; 'o'
 (i32.store8 (i32.add (global.get $write_ptr) (i32.const 5)) (i32.const 10))  ;; '\n'
 
 ;; Print "hello\n"
 (i32.store (i32.const 0) (global.get $write_ptr))
 (i32.store (i32.const 4) (i32.const 6))
 (drop (call $write (i32.const 1) (i32.const 0) (i32.const 1) (i32.const 92)))
 
 ;; Update write pointer for next string
 (global.set $write_ptr (i32.add (global.get $write_ptr) (i32.const 6)))
)
)