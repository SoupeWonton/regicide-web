namespace Regicide.Unity
{
    /// <summary>
    /// Single source of truth for the client version. The installer duplicates it
    /// (Tools/Installer/kingfall.iss → AppVersion) — bump BOTH when shipping.
    /// Compared against the published latest.json by the boot update check.
    /// </summary>
    public static class GameVersion
    {
        public const string Current = "0.1.8-alpha";

        /// <summary>
        /// True when <paramref name="remote"/> is strictly newer than the running
        /// build. Versions read "major.minor.patch[-tag]"; tags are ignored for
        /// ordering (0.2.0-alpha > 0.1.9-beta). Unparseable input = not newer —
        /// a garbled manifest must never nag anyone to update.
        /// </summary>
        public static bool IsNewer(string remote)
        {
            var a = Parse(remote);
            var b = Parse(Current);
            if (a == null || b == null) return false;
            for (int i = 0; i < 3; i++)
            {
                if (a[i] > b[i]) return true;
                if (a[i] < b[i]) return false;
            }
            return false;
        }

        private static int[] Parse(string v)
        {
            if (string.IsNullOrEmpty(v)) return null;
            int dash = v.IndexOf('-');
            if (dash >= 0) v = v.Substring(0, dash);
            var parts = v.Trim().TrimStart('v').Split('.');
            if (parts.Length != 3) return null;
            var nums = new int[3];
            for (int i = 0; i < 3; i++)
                if (!int.TryParse(parts[i], out nums[i])) return null;
            return nums;
        }
    }
}
