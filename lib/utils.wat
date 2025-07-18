(module
 (type $0 (func (param i32 i32 i32 i32) (result i32)))
 (type $1 (func))
(import "main" "memory" (memory $0 1 2))

(export "itoa" (func $itoa))
(func $itoa (param $num i32) (param $buffer i32) (result i32)
    (local $length i32)
    (local $temp i32)
    (local $digit i32)

    ;; if input is zero then return 48
    (if (i32.eqz (local.get $num))
    (then
    (i32.store8 (local.get $buffer) (i32.const 48))

    ;; add a new line character at the end
    (i32.store8 (i32.add (local.get $buffer) (i32.const 1)) (i32.const 10))
    ;; length of the string, 1 for the char 0 +1 for the newline char
    (return (i32.const 2))
    ))

    ;; count digit length
    (local.set $temp (local.get $num))
    (local.set $length (i32.const 0))
    (loop $count_loop
        (local.set $length (i32.add (local.get $length) (i32.const 1)))
        (local.set $temp (i32.div_u (local.get $temp) (i32.const 10)))
        (br_if $count_loop (i32.ne (local.get $temp) (i32.const 0)))
    )

    ;; convert to ascii
    (local.set $temp (local.get $num))
    (local.set $digit (local.get $length))
    (loop $convert_loop
        (local.set $digit (i32.sub (local.get $digit) (i32.const 1)))    

        (i32.store8
            (i32.add (local.get $buffer) (local.get $digit))
            (i32.add (i32.const 48) (i32.rem_u (local.get $temp) (i32.const 10)))
        )
    
        (local.set $temp (i32.div_u (local.get $temp) (i32.const 10)))
        (br_if $convert_loop (i32.ne (local.get $temp) (i32.const 0)))
    )

    ;; add a newline character at the end
    (i32.store8 (i32.add (local.get $buffer) (local.get $length)) (i32.const 10))
    ;; return the length of the string + 1 for the newline char
    (i32.add (local.get $length) (i32.const 1))
)
)
