package main

import (
	"embed"
	"flag"
	"fmt"
	"io"
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
	"unsafe"
)

//go:embed all:payload
var payloadFS embed.FS

const (
	appName       = "Launch Quality"
	installRelDir = "LaunchQuality"
	exeName       = "LaunchQuality.exe"
	versionFile   = "version.txt"
	defaultVer    = "49.1.0"
)

func main() {
	silent := false
	for _, a := range os.Args[1:] {
		u := strings.ToUpper(a)
		if u == "/VERYSILENT" || u == "/SILENT" || u == "/S" || u == "--SILENT" || u == "-S" {
			silent = true
		}
	}
	_ = flag.CommandLine.Parse(os.Args[1:])

	if err := runInstall(silent); err != nil {
		if !silent {
			messageBox(appName+" Setup", "فشل التثبيت:\n"+err.Error())
		}
		os.Exit(1)
	}
	if !silent {
		messageBox(appName+" Setup", "تم التثبيت بنجاح.\nيمكنك فتح التطبيق من سطح المكتب أو قائمة ابدأ.")
	}
}

func runInstall(silent bool) error {
	installDir, err := resolveInstallDir()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(installDir, 0755); err != nil {
		return fmt.Errorf("create install dir: %w", err)
	}
	updaterDir := filepath.Join(installDir, "updater")
	if err := os.MkdirAll(updaterDir, 0755); err != nil {
		return fmt.Errorf("create updater dir: %w", err)
	}

	if err := extractPayload(installDir, updaterDir); err != nil {
		return err
	}

	version := readEmbeddedVersion()
	programData := os.Getenv("ProgramData")
	if programData == "" {
		programData = `C:\ProgramData`
	}
	lqData := filepath.Join(programData, "LaunchQuality")
	if err := os.MkdirAll(lqData, 0755); err != nil {
		return fmt.Errorf("create ProgramData: %w", err)
	}
	if err := os.WriteFile(filepath.Join(lqData, versionFile), []byte(version+"\n"), 0644); err != nil {
		return fmt.Errorf("write version: %w", err)
	}
	_ = os.WriteFile(filepath.Join(installDir, versionFile), []byte(version+"\n"), 0644)

	exePath := filepath.Join(installDir, exeName)
	if err := createShortcuts(exePath, installDir); err != nil && !silent {
		// non-fatal for silent updates
		_ = err
	}

	enableScript := filepath.Join(updaterDir, "Enable-LaunchQuality-AutoUpdate.ps1")
	if fileExists(enableScript) {
		cmd := exec.Command("powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", enableScript)
		cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
		_ = cmd.Run()
	}

	if !silent {
		cmd := exec.Command(exePath)
		cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
		_ = cmd.Start()
	}
	return nil
}

func resolveInstallDir() (string, error) {
	pf := os.Getenv("ProgramFiles")
	if pf == "" {
		pf = `C:\Program Files`
	}
	preferred := filepath.Join(pf, installRelDir)
	if err := os.MkdirAll(preferred, 0755); err == nil {
		test := filepath.Join(preferred, ".write-test")
		if werr := os.WriteFile(test, []byte("ok"), 0644); werr == nil {
			_ = os.Remove(test)
			return preferred, nil
		}
	}
	local := os.Getenv("LOCALAPPDATA")
	if local == "" {
		local = filepath.Join(os.Getenv("USERPROFILE"), "AppData", "Local")
	}
	fallback := filepath.Join(local, installRelDir)
	if err := os.MkdirAll(fallback, 0755); err != nil {
		return "", fmt.Errorf("cannot create install directory: %w", err)
	}
	return fallback, nil
}

func extractPayload(installDir, updaterDir string) error {
	return fs.WalkDir(payloadFS, "payload", func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}
		rel, err := filepath.Rel("payload", path)
		if err != nil {
			return err
		}
		rel = filepath.FromSlash(rel)
		var dest string
		switch {
		case strings.EqualFold(filepath.Base(rel), "Update-LaunchQuality.ps1"),
			strings.EqualFold(filepath.Base(rel), "Enable-LaunchQuality-AutoUpdate.ps1"):
			dest = filepath.Join(updaterDir, filepath.Base(rel))
		default:
			dest = filepath.Join(installDir, rel)
		}
		if err := os.MkdirAll(filepath.Dir(dest), 0755); err != nil {
			return err
		}
		in, err := payloadFS.Open(path)
		if err != nil {
			return err
		}
		defer in.Close()
		out, err := os.OpenFile(dest, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, 0755)
		if err != nil {
			return err
		}
		defer out.Close()
		_, err = io.Copy(out, in)
		return err
	})
}

func readEmbeddedVersion() string {
	b, err := payloadFS.ReadFile("payload/version.txt")
	if err != nil {
		return defaultVer
	}
	v := strings.TrimSpace(string(b))
	if v == "" {
		return defaultVer
	}
	return v
}

func createShortcuts(exePath, installDir string) error {
	ps := fmt.Sprintf(`
$ErrorActionPreference = 'Stop'
$exe = '%s'
$installDir = '%s'
$icon = $exe
$wsh = New-Object -ComObject WScript.Shell
$desktop = [Environment]::GetFolderPath('Desktop')
$startMenu = Join-Path ([Environment]::GetFolderPath('StartMenu')) 'Programs\Launch Quality'
New-Item -ItemType Directory -Force -Path $startMenu | Out-Null
$desk = $wsh.CreateShortcut((Join-Path $desktop 'Launch Quality.lnk'))
$desk.TargetPath = $exe
$desk.WorkingDirectory = $installDir
$desk.IconLocation = $icon
$desk.Save()
$start = $wsh.CreateShortcut((Join-Path $startMenu 'Launch Quality.lnk'))
$start.TargetPath = $exe
$start.WorkingDirectory = $installDir
$start.IconLocation = $icon
$start.Save()
`, escapePS(exePath), escapePS(installDir))

	cmd := exec.Command("powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("shortcuts: %w (%s)", err, strings.TrimSpace(string(out)))
	}
	return nil
}

func escapePS(s string) string {
	return strings.ReplaceAll(s, "'", "''")
}

func fileExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && !info.IsDir()
}

func messageBox(title, text string) {
	user32 := syscall.NewLazyDLL("user32.dll")
	proc := user32.NewProc("MessageBoxW")
	titlePtr, _ := syscall.UTF16PtrFromString(title)
	textPtr, _ := syscall.UTF16PtrFromString(text)
	proc.Call(0, uintptr(unsafe.Pointer(textPtr)), uintptr(unsafe.Pointer(titlePtr)), 0)
}
