cd %~dp0
npx tsc 2> compile_errors.txt
type compile_errors.txt