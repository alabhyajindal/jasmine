set up the tests for qbe, so you track progress

using wasm binary to link the util file resulted in a faster compilation speed over using a wat file

following are the time difference the two different commands at the end of the compilation phase. surprisingly the difference is not noticeable when the commands are run in isolation.

wasm-merge build/main.wat main lib/utils.wat utils -o build/a.wat --enable-multimemory --emit-text

➜  jasmine git:(main) ✗ time bun compile __.jas
$ bun src/main.ts __.jas

________________________________________________________
Executed in    1.49 secs    fish           external
   usr time    2.02 secs    0.01 millis    2.02 secs
   sys time    0.62 secs    1.03 millis    0.62 secs

wasm-merge build/main.wat main lib/utils.wasm utils -o build/a.wat --enable-multimemory

➜  jasmine git:(main) time bun compile __.jas
$ bun src/main.ts __.jas

________________________________________________________
Executed in  868.27 millis    fish           external
   usr time    1.11 secs    545.00 micros    1.11 secs
   sys time    0.46 secs    491.00 micros    0.46 secs

➜  jasmine git:(main) ✗ 
