; Inno Setup script template
; Output: LaunchQuality-Setup.exe

#define MyAppName "Launch Quality"
#define MyAppVersion "49.0"
#define MyAppPublisher "Launch Quality LLC"
#define MyAppExeName "LaunchQuality.exe"

[Setup]
AppId={{B38B17BA-9681-4E0F-B8F0-2AA5B7E7D5F3}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\LaunchQuality
DefaultGroupName=Launch Quality
OutputDir=.
OutputBaseFilename=LaunchQuality-Setup
Compression=lzma
SolidCompression=yes
ArchitecturesInstallIn64BitMode=x64compatible

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a desktop icon"; GroupDescription: "Additional icons:"
Name: "startupicon"; Description: "Start Launch Quality with Windows"; GroupDescription: "Additional icons:"

[Files]
; Put only packaged app binaries/resources here
; Exclude database/source/session/cache files by policy.
Source: "..\dist\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "*.sqlite;*.sqlite3;*.db;*.py;*.pyc;__pycache__\*;*.log;*.cache;*.tmp;data\*;backups\*;uploads\*;sessions\*"

[Icons]
Name: "{group}\Launch Quality"; Filename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\Launch Quality"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon
Name: "{userstartup}\Launch Quality"; Filename: "{app}\{#MyAppExeName}"; Tasks: startupicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Launch Quality"; Flags: nowait postinstall skipifsilent
