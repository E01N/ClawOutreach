@echo off
powershell -Command "$s=(New-Object -COM WScript.Shell).CreateShortcut([Environment]::GetFolderPath('Desktop')+'\ClawOutreach Dashboard.lnk');$s.TargetPath='%~f0\..\start-dashboard.bat';$s.WorkingDirectory='%~dp0';$s.Description='Open ClawOutreach Dashboard';$s.Save()"
echo Desktop shortcut created!
timeout /t 2 /nobreak >nul
