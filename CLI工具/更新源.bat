@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

set "注册文件=src\源注册.js"
set "源目录=src\源"

echo 扫描 %源目录% ...

REM 读取已有的 import 行
set "已导入="
for /f "tokens=*" %%a in ('findstr /r "from.*源/.*\.js" "%注册文件%"') do (
    for %%b in (%%a) do (
        echo %%b | findstr /r "\.js" >nul && set "已导入=!已导入! %%b"
    )
)

REM 扫描源目录
set "新增=0"
for %%f in ("%源目录%\*.js") do (
    set "文件名=%%~nxf"
    echo !已导入! | findstr /i "源/!文件名!" >nul
    if errorlevel 1 (
        echo 发现新源: !文件名!
        REM 生成变量名（去掉.js，替换特殊字符）
        set "变量名=%%~nf源"
        set "变量名=!变量名: =_!"

        REM 在 export 行前插入 import
        powershell -Command "
            $file = '%注册文件%';
            $content = Get-Content $file -Raw -Encoding UTF8;
            $varName = '%变量名%';
            $fileName = '%文件名%';
            $import = \"import { 源 as $varName } from './源/$fileName';\";
            $content = $content -replace '(export const 源注册表)', \"$import`n`n`$1\";
            $content = $content -replace '\[([^\]]+)\]', \"[$1, $varName]\";
            Set-Content $file $content -Encoding UTF8 -NoNewline;
        "
        set /a 新增+=1
    )
)

if %新增%==0 (
    echo 没有发现新源
) else (
    echo 已添加 %新增% 个源到 %注册文件%
)

pause
