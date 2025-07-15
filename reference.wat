(module
 (type $0 (func (param i32 i32 i32 i32) (result i32)))
 (type $1 (func))
 (import "wasi_snapshot_preview1" "fd_write" (func $write (param i32 i32 i32 i32) (result i32)))
 (memory $0 1 2)
 (export "memory" (memory $0))
 (export "_start" (func $_start))
 
 ;; Convert integer to ASCII string, returns string length
 ;; param 0: number to convert
 ;; param 1: buffer address to store the string
 (func $int_to_ascii (param $num i32) (param $buffer i32) (result i32)
  ;; Local variables we'll use
  (local $length i32)    ;; Will store how many digits the number has
  (local $temp i32)      ;; Temporary variable for calculations
  (local $digit i32)     ;; Current digit position we're working on
  
  ;; Handle the special case where input is 0
  (if (i32.eqz (local.get $num))   ;; if $num == 0
   (then
    ;; Store ASCII '0' (which is 48) at the buffer address
    (i32.store8 (local.get $buffer) (i32.const 48)) ;; '0'
    ;; Return 1 (string length is 1 character)
    (return (i32.const 1))
   )
  )
  
  ;; PHASE 1: Count how many digits the number has
  ;; We need to know this so we can write digits from right to left
  (local.set $temp (local.get $num))    ;; Copy $num to $temp for counting
  (local.set $length (i32.const 0))     ;; Start digit count at 0
  (loop $count_loop                      ;; Start counting loop
   ;; Increment digit count by 1
   (local.set $length (i32.add (local.get $length) (i32.const 1)))
   ;; Divide by 10 to remove the rightmost digit
   (local.set $temp (i32.div_u (local.get $temp) (i32.const 10)))
   ;; If $temp is not 0, we have more digits to count, so loop again
   (br_if $count_loop (i32.ne (local.get $temp) (i32.const 0)))
  )
  
  ;; PHASE 2: Convert each digit to ASCII and store in memory
  ;; We write from right to left (last digit first)
  (local.set $temp (local.get $num))      ;; Reset $temp to original number
  (local.set $digit (local.get $length))  ;; Start at the rightmost position
  (loop $convert_loop                      ;; Start conversion loop
   ;; Move one position to the left (we write right-to-left)
   (local.set $digit (i32.sub (local.get $digit) (i32.const 1)))
   
   ;; Extract the rightmost digit and convert to ASCII
   (i32.store8 
    ;; Store at: buffer + current digit position
    (i32.add (local.get $buffer) (local.get $digit))
    ;; Store value: 48 + (rightmost digit)
    ;; 48 is ASCII '0', so 48+3 = 51 which is ASCII '3'
    (i32.add (i32.const 48) (i32.rem_u (local.get $temp) (i32.const 10)))
   )
   
   ;; Remove the rightmost digit by dividing by 10
   (local.set $temp (i32.div_u (local.get $temp) (i32.const 10)))
   ;; If $temp is not 0, we have more digits to convert, so loop again
   (br_if $convert_loop (i32.ne (local.get $temp) (i32.const 0)))
  )
  
  ;; Return the length of the string we created
  (local.get $length)
 )
 
 (func $_start
  ;; Local variable to store the length of our converted string
  (local $str_len i32)
  (block
   ;; Call our conversion function
   (local.set $str_len
    (call $int_to_ascii 
     (i32.add (i32.const 32) (i32.const 1))  ;; Convert the number 33 (32+1)
     (i32.const 66)                          ;; Store result at memory address 66
    )
   )
   
   ;; Set up the iovec structure for fd_write
   ;; iov_base: pointer to our string data
   (i32.store (i32.const 0) (i32.const 66))      ;; Store address 66 at memory address 0
   ;; iov_len: length of our string (returned from conversion function)
   (i32.store (i32.const 4) (local.get $str_len)) ;; Store string length at memory address 4
   
   ;; Call fd_write to output our string
   (drop                                    ;; Ignore the return value
    (call $write
     (i32.const 1)                          ;; File descriptor 1 (stdout)
     (i32.const 0)                          ;; Address of iovec structure
     (i32.const 1)                          ;; Number of iovec structures (we have 1)
     (i32.const 92)                         ;; Address to store number of bytes written
    )
   )
  )
 )
)