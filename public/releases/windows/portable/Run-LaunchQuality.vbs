Set sh = CreateObject("WScript.Shell")
url = "https://web-production-08d73.up.railway.app/app.html"
edge86 = sh.ExpandEnvironmentStrings("%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe")
edge64 = sh.ExpandEnvironmentStrings("%ProgramFiles%\Microsoft\Edge\Application\msedge.exe")
chrome = sh.ExpandEnvironmentStrings("%ProgramFiles%\Google\Chrome\Application\chrome.exe")

If CreateObject("Scripting.FileSystemObject").FileExists(edge86) Then
  sh.Run """" & edge86 & """ --new-window --start-maximized " & url, 1, False
ElseIf CreateObject("Scripting.FileSystemObject").FileExists(edge64) Then
  sh.Run """" & edge64 & """ --new-window --start-maximized " & url, 1, False
ElseIf CreateObject("Scripting.FileSystemObject").FileExists(chrome) Then
  sh.Run """" & chrome & """ --new-window --start-maximized " & url, 1, False
Else
  sh.Run url, 1, False
End If
