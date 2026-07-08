; Kingfall Windows installer (Inno Setup 6).
; Build the player first (Kingfall > Build Windows Player), then:
;   ISCC.exe Tools\Installer\kingfall.iss
; Output: Builds\Kingfall-Setup.exe (gitignored — distribute via the
; desktop-releases branch / a release page, never through master).
;
; Per-user install (PrivilegesRequired=lowest): no admin prompt, lands in
; %LocalAppData%\Programs\Kingfall — the "grandma can install it" path.
; The exe is unsigned, so SmartScreen will interject once ("More info →
; Run anyway"); code-signing is a later, paid step.

[Setup]
AppId={{8C2D7A11-9C41-4E1B-A57D-3B1E20F6B7D9}
AppName=Kingfall
AppVersion=0.1.7-alpha
AppPublisher=LL Games
DefaultDirName={autopf}\Kingfall
DefaultGroupName=Kingfall
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
OutputDir=..\..\Builds
OutputBaseFilename=Kingfall-Setup
Compression=lzma2
SolidCompression=yes
ArchitecturesInstallIn64BitMode=x64compatible
ArchitecturesAllowed=x64compatible
UninstallDisplayIcon={app}\Kingfall.exe
WizardStyle=modern

[Tasks]
Name: "desktopicon"; Description: "Create a &desktop icon"; GroupDescription: "Additional icons:"

[Files]
Source: "..\..\Builds\Windows\*"; DestDir: "{app}"; Flags: recursesubdirs ignoreversion

[Icons]
Name: "{group}\Kingfall"; Filename: "{app}\Kingfall.exe"
Name: "{autodesktop}\Kingfall"; Filename: "{app}\Kingfall.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\Kingfall.exe"; Description: "Play Kingfall now"; Flags: nowait postinstall skipifsilent
