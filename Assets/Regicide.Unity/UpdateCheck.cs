using System;
using UnityEngine;

namespace Regicide.Unity
{
    /// <summary>
    /// Hassle-free update check: one manifest GET at boot; when it advertises a
    /// newer version the main menu grows an update banner, otherwise nothing ever
    /// shows. The install path is one click: download the installer to temp,
    /// launch it silently, quit. Every failure mode is a quiet no-op.
    /// </summary>
    public static class UpdateCheck
    {
        private const string ManifestUrl =
            "https://raw.githubusercontent.com/SoupeWonton/regicide-web/desktop-releases/latest.json";

        /// <summary>Set only when the manifest advertises a strictly newer build.</summary>
        public static string AvailableVersion;
        public static string InstallerUrl;
        public static bool UpdateReady => AvailableVersion != null;

        [Serializable]
        private class Manifest
        {
            public string version;
            public string installer;
        }

        /// <summary>Check once at boot; onFound fires only when an update exists
        /// (use it to re-render the menu). Silent no-op on any failure.</summary>
        public static void Run(Action onFound)
        {
            Net.GetJson(ManifestUrl, body =>
            {
                if (string.IsNullOrEmpty(body)) return;
                Manifest m;
                try { m = JsonUtility.FromJson<Manifest>(body); }
                catch { return; }
                if (m == null || string.IsNullOrEmpty(m.version) || string.IsNullOrEmpty(m.installer)) return;
                if (!GameVersion.IsNewer(m.version)) return;
                AvailableVersion = m.version;
                InstallerUrl = m.installer;
                if (onFound != null) onFound();
            });
        }

        /// <summary>Download the installer to temp, launch it silently and quit.
        /// onFailed(false) fires on download or launch failure; success never
        /// returns — the app exits so the installer can replace it.</summary>
        public static void DownloadAndInstall(Action<bool> onFailed)
        {
            if (string.IsNullOrEmpty(InstallerUrl))
            {
                if (onFailed != null) onFailed(false);
                return;
            }
            string path = System.IO.Path.Combine(System.IO.Path.GetTempPath(), "Kingfall-Setup.exe");
            Net.GetFile(InstallerUrl, path, ok =>
            {
                if (!ok)
                {
                    if (onFailed != null) onFailed(false);
                    return;
                }
                try
                {
                    System.Diagnostics.Process.Start(path, "/SILENT /CLOSEAPPLICATIONS");
                    Application.Quit();
                }
                catch
                {
                    if (onFailed != null) onFailed(false);
                }
            });
        }
    }
}
